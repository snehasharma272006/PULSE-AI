/**
 * Nearby-places lookup for the emergency locator, backed by OpenStreetMap's
 * Overpass API (https://overpass-api.de). No API key or billing account
 * required — this is a public endpoint with fair-use rate limits, which is
 * why this wrapper is safe to call directly from the client.
 *
 * Trade-off vs. Google Places: data completeness varies by region (dense in
 * most cities, patchier in rural areas), and there's no first-party phone
 * number lookup — phone/address come from whatever OSM tags exist.
 */

export type PlaceType = "hospital" | "pharmacy" | "clinic" | "doctors";

export type NearbyPlace = {
  id: string;
  name: string;
  type: PlaceType | "other";
  lat: number;
  lng: number;
  distanceMeters: number;
  address: string | null;
  phone: string | null;
};

export type NearbyPlacesQuery = {
  lat: number;
  lng: number;
  /** Search radius in meters. Defaults to 5km. */
  radiusMeters?: number;
  /** Which amenity tags to include. Defaults to hospital + pharmacy + clinic. */
  types?: PlaceType[];
};

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const DEFAULT_RADIUS_METERS = 5000;
const DEFAULT_TYPES: PlaceType[] = ["hospital", "pharmacy", "clinic"];
const KNOWN_TYPES: readonly PlaceType[] = ["hospital", "pharmacy", "clinic", "doctors"];

type OverpassElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements: OverpassElement[];
};

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function buildQuery(lat: number, lng: number, radiusMeters: number, types: PlaceType[]): string {
  const amenityFilter = types.join("|");
  // Query both nodes and ways: some hospitals are mapped as building
  // outlines (ways) rather than single points, so "out center" gives us a
  // representative point for those too.
  return `
    [out:json][timeout:15];
    (
      node["amenity"~"^(${amenityFilter})$"](around:${radiusMeters},${lat},${lng});
      way["amenity"~"^(${amenityFilter})$"](around:${radiusMeters},${lat},${lng});
    );
    out center tags;
  `;
}

function normalize(el: OverpassElement, origin: { lat: number; lng: number }): NearbyPlace | null {
  const tags = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat === undefined || lng === undefined) return null;

  const amenity = tags.amenity as PlaceType | undefined;
  const type: PlaceType | "other" = amenity && KNOWN_TYPES.includes(amenity) ? amenity : "other";
  const name = tags.name ?? `Unnamed ${amenity ?? "location"}`;

  const addressParts = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(
    Boolean
  );

  return {
    id: `${el.id}`,
    name,
    type,
    lat,
    lng,
    distanceMeters: Math.round(haversineMeters(origin, { lat, lng })),
    address: addressParts.length ? addressParts.join(", ") : null,
    phone: tags.phone ?? tags["contact:phone"] ?? null,
  };
}

/**
 * Finds nearby emergency-relevant places (hospitals, pharmacies, clinics) via
 * OpenStreetMap's Overpass API, sorted nearest-first.
 */
export async function findNearbyPlaces(query: NearbyPlacesQuery): Promise<NearbyPlace[]> {
  const { lat, lng, radiusMeters = DEFAULT_RADIUS_METERS, types = DEFAULT_TYPES } = query;

  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: buildQuery(lat, lng, radiusMeters, types),
  });

  if (!response.ok) {
    throw new Error(`Overpass API request failed with status ${response.status}`);
  }

  const data: OverpassResponse = await response.json();
  const origin = { lat, lng };

  return data.elements
    .map((el) => normalize(el, origin))
    .filter((p): p is NearbyPlace => p !== null)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}
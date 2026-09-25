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

// ---------------------------------------------------------------------------
// Offline / rate-limit fallback: cache the last-known results for a location
// in Supabase (emergency_contacts_cache) so the locator still shows *something*
// if Overpass is unreachable or rate-limited when it matters most.
// ---------------------------------------------------------------------------

import { supabase } from "@/lib/supabase";

export type NearbyPlacesResult = {
  places: NearbyPlace[];
  source: "live" | "cache";
  /** Set when source is "cache" — when that cached data was originally fetched. */
  cachedAt?: string;
};

// Rounding lat/lng to 2 decimal places buckets nearby requests into the same
// ~1.1km grid cell, so repeat visits to roughly the same spot hit the cache
// instead of writing a near-duplicate row every time.
const CACHE_GRID_PRECISION = 2;

function cacheKey(lat: number, lng: number): { lat: number; lng: number } {
  const factor = 10 ** CACHE_GRID_PRECISION;
  return { lat: Math.round(lat * factor) / factor, lng: Math.round(lng * factor) / factor };
}

async function cachePlaces(lat: number, lng: number, radiusMeters: number, places: NearbyPlace[]) {
  const key = cacheKey(lat, lng);
  try {
    await supabase.from("emergency_contacts_cache").insert({
      lat: key.lat,
      lng: key.lng,
      radius_meters: radiusMeters,
      places,
    });
  } catch {
    // Caching is best-effort — a failed write should never break the live result.
  }
}

async function readCachedPlaces(
  lat: number,
  lng: number
): Promise<{ places: NearbyPlace[]; cachedAt: string } | null> {
  const key = cacheKey(lat, lng);

  const { data } = await supabase
    .from("emergency_contacts_cache")
    .select("places, fetched_at")
    .eq("lat", key.lat)
    .eq("lng", key.lng)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data) return { places: data.places as NearbyPlace[], cachedAt: data.fetched_at as string };

  // Nothing cached for this exact grid cell — fall back to whatever was most
  // recently cached anywhere, so the user sees *something* rather than a dead end.
  const { data: latest } = await supabase
    .from("emergency_contacts_cache")
    .select("places, fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest) return null;
  return { places: latest.places as NearbyPlace[], cachedAt: latest.fetched_at as string };
}

/**
 * Same as findNearbyPlaces, but falls back to the Supabase cache if the live
 * Overpass call fails (offline, rate-limited, etc.), and best-effort caches
 * successful results for next time. Use this from the UI instead of calling
 * findNearbyPlaces directly.
 */
export async function findNearbyPlacesWithCache(query: NearbyPlacesQuery): Promise<NearbyPlacesResult> {
  try {
    const places = await findNearbyPlaces(query);
    void cachePlaces(query.lat, query.lng, query.radiusMeters ?? DEFAULT_RADIUS_METERS, places);
    return { places, source: "live" };
  } catch (err) {
    const cached = await readCachedPlaces(query.lat, query.lng);
    if (cached) return { places: cached.places, source: "cache", cachedAt: cached.cachedAt };
    throw err;
  }
}
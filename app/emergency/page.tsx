"use client";

import { useEffect, useState } from "react";
import { Instrument_Serif } from "next/font/google";
import { useGeolocation } from "@/lib/geolocation";
import { findNearbyPlacesWithCache, type NearbyPlace } from "@/lib/places";
import EmergencyCallButton from "@/components/EmergencyCallButton";
import LocationShareButton from "@/components/LocationShareButton";

// Same font as the "Health Chat" heading on app/chat/page.tsx, for a
// consistent look across the two health-feature pages.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
});

// India's pan-emergency-services number — swap if you're demoing elsewhere.
const NATIONAL_EMERGENCY_NUMBER = "112";

export default function EmergencyPage() {
  const { coords, error: geoError, loading: geoLoading, refresh } = useGeolocation();

  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [source, setSource] = useState<"live" | "cache" | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!coords) return;

    let cancelled = false;
    setPlacesLoading(true);
    setPlacesError(null);

    findNearbyPlacesWithCache({ lat: coords.lat, lng: coords.lng })
      .then((result) => {
        if (cancelled) return;
        setPlaces(result.places);
        setSource(result.source);
        setCachedAt(result.cachedAt ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setPlacesError(err instanceof Error ? err.message : "Couldn't load nearby places.");
      })
      .finally(() => {
        if (!cancelled) setPlacesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coords]);

  return (
    <main style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1
        className={instrumentSerif.className}
        style={{
          fontSize: "1.9rem",
          fontWeight: 700,
          color: "var(--foreground)",
          marginBottom: "0.25rem",
        }}
      >
        Nearby Emergency Help
      </h1>
      <p style={{ fontSize: "0.85rem", color: "var(--foreground)", opacity: 0.6, marginBottom: "1.25rem" }}>
        Hospitals, pharmacies, and clinics near your current location.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <EmergencyCallButton
          phone={null}
          fallbackNumber={NATIONAL_EMERGENCY_NUMBER}
          label={`Call ${NATIONAL_EMERGENCY_NUMBER}`}
        />
        {coords && <LocationShareButton lat={coords.lat} lng={coords.lng} label="Share my location" />}
      </div>

      {geoLoading && (
        <p style={{ fontSize: "0.85rem", color: "var(--foreground)", opacity: 0.6 }}>
          Finding your location...
        </p>
      )}

      {geoError && (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "0.9rem 1rem",
            marginBottom: "1rem",
          }}
        >
          <p style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>{geoError.message}</p>
          <button
            onClick={refresh}
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "var(--foreground)",
              background: "var(--primary-dim)",
              border: "1px solid var(--border)",
              borderRadius: "999px",
              padding: "0.35rem 0.75rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      )}

      {coords && placesLoading && (
        <p style={{ fontSize: "0.85rem", color: "var(--foreground)", opacity: 0.6 }}>
          Looking for nearby help...
        </p>
      )}

      {placesError && (
        <p style={{ fontSize: "0.85rem", color: "#B3452C" }}>{placesError}</p>
      )}

      {source === "cache" && (
        <p style={{ fontSize: "0.75rem", color: "var(--foreground)", opacity: 0.55, marginBottom: "0.75rem" }}>
          Live lookup failed — showing cached results
          {cachedAt ? ` from ${new Date(cachedAt).toLocaleString()}` : ""}.
        </p>
      )}

      {!placesLoading && !placesError && coords && places.length === 0 && (
        <p style={{ fontSize: "0.85rem", color: "var(--foreground)", opacity: 0.6 }}>
          No hospitals, pharmacies, or clinics found nearby. Try the emergency number above.
        </p>
      )}

      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {places.map((place) => (
          <li
            key={place.id}
            style={{
              border: "1px solid var(--border)",
              background: "var(--card)",
              borderRadius: "10px",
              padding: "0.9rem 1rem",
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--foreground)" }}>{place.name}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--foreground)", opacity: 0.6, marginBottom: "0.6rem" }}>
              {place.type} · {place.address ?? "Address unavailable"} · {(place.distanceMeters / 1000).toFixed(1)} km
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <EmergencyCallButton phone={place.phone} />
              <LocationShareButton lat={place.lat} lng={place.lng} label="Share this location" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
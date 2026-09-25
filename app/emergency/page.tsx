"use client";

// Day 1 scaffold: static placeholder list only, no UI polish yet.
// Day 2 wires this up to useGeolocation() + findNearbyPlaces() for live results.

type StaticPlace = {
  id: string;
  name: string;
  type: string;
  distanceMeters: number;
  address: string;
};

const STATIC_PLACES: StaticPlace[] = [
  {
    id: "placeholder-1",
    name: "City General Hospital",
    type: "hospital",
    distanceMeters: 850,
    address: "12 MG Road",
  },
  {
    id: "placeholder-2",
    name: "Apollo Pharmacy",
    type: "pharmacy",
    distanceMeters: 1200,
    address: "45 Church Street",
  },
  {
    id: "placeholder-3",
    name: "Sunrise Clinic",
    type: "clinic",
    distanceMeters: 1600,
    address: "8 Park Lane",
  },
];

export default function EmergencyPage() {
  return (
    <main style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <h1
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "1.6rem",
          fontWeight: 700,
          color: "var(--foreground)",
          marginBottom: "0.25rem",
        }}
      >
        Nearby Emergency Help
      </h1>
      <p style={{ fontSize: "0.85rem", color: "var(--foreground)", opacity: 0.6, marginBottom: "1.5rem" }}>
        Placeholder data — live results wire in on Day 2.
      </p>

      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {STATIC_PLACES.map((place) => (
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
            <div style={{ fontSize: "0.8rem", color: "var(--foreground)", opacity: 0.6 }}>
              {place.type} · {place.address} · {(place.distanceMeters / 1000).toFixed(1)} km
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
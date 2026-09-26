/**
 * Supabase wrapper for the `doctors` table — same pattern as
 * lib/consultations.ts. The UI should never write raw column names or
 * Supabase query syntax; it just calls a function with a clear name.
 */

import { supabase } from "@/lib/supabase";

export type AvailabilitySlot = {
  day: string; // "Mon" | "Tue" | ... — matches how it's stored in Supabase
  start: string;
  end: string;
};

export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  region: string;
  yearsExperience: number;
  rating: number;
  phone: string | null;
  email: string | null;
  availability: AvailabilitySlot[];
  verified: boolean;
  createdAt: string;
};

// Shape of a row exactly as Postgres/Supabase returns it (snake_case).
type DoctorRow = {
  id: string;
  name: string;
  specialty: string;
  region: string;
  years_experience: number;
  rating: number;
  phone: string | null;
  email: string | null;
  availability: AvailabilitySlot[];
  verified: boolean;
  created_at: string;
};

function fromRow(row: DoctorRow): Doctor {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    region: row.region,
    yearsExperience: row.years_experience,
    rating: row.rating,
    phone: row.phone,
    email: row.email,
    availability: row.availability,
    verified: row.verified,
    createdAt: row.created_at,
  };
}

export type DoctorFilters = {
  specialty?: string;
  region?: string;
  availableToday?: boolean;
};

/**
 * True if this doctor has an availability slot for today's weekday.
 * "Mon"/"Tue"/etc. matches exactly how the seed data stores it, so no
 * extra parsing library is needed — one less dependency to maintain.
 */
export function isAvailableToday(doctor: Doctor): boolean {
  const today = new Date().toLocaleDateString("en-US", { weekday: "short" }); // e.g. "Mon"
  return doctor.availability.some((slot) => slot.day === today);
}

/**
 * Fetches doctors matching the given filters, best-rated first.
 * `availableToday` is filtered client-side after the fetch, since
 * querying inside a JSON column in Postgres isn't worth the complexity
 * at this table size — a demo doesn't need that kind of optimization yet.
 */
export async function getDoctors(filters: DoctorFilters = {}): Promise<Doctor[]> {
  let query = supabase.from("doctors").select("*").order("rating", { ascending: false });

  if (filters.specialty) query = query.eq("specialty", filters.specialty);
  if (filters.region) query = query.eq("region", filters.region);

  const { data, error } = await query;
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to load doctors");
  }

  let doctors = (data as DoctorRow[]).map(fromRow);
  if (filters.availableToday) {
    doctors = doctors.filter(isAvailableToday);
  }
  return doctors;
}

/**
 * Records the match: updates the consultation row so `matched_doctor_id`
 * and `status` reflect the choice. This is what closes the loop between
 * Day 4's schema and Day 5's UI.
 */
export async function matchDoctorToConsultation(
  consultationId: string,
  doctorId: string
): Promise<void> {
  const { error } = await supabase
    .from("consultations")
    .update({ matched_doctor_id: doctorId, status: "matched" })
    .eq("id", consultationId);

  if (error) {
    throw new Error(error.message);
  }
}
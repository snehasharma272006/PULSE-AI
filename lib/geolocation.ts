"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Coordinates = {
  lat: number;
  lng: number;
  accuracy: number;
};

export type GeolocationErrorReason =
  | "unsupported"
  | "permission-denied"
  | "position-unavailable"
  | "timeout";

export type GeolocationError = {
  reason: GeolocationErrorReason;
  message: string;
};

export type UseGeolocationResult = {
  coords: Coordinates | null;
  error: GeolocationError | null;
  loading: boolean;
  /** Re-runs the location request (e.g. after the user grants permission or taps "retry"). */
  refresh: () => void;
};

const ERROR_MESSAGES: Record<GeolocationErrorReason, string> = {
  unsupported: "This browser doesn't support location access.",
  "permission-denied":
    "Location access was denied. Enable it in your browser settings to find nearby help.",
  "position-unavailable": "We couldn't determine your location right now.",
  timeout: "Finding your location took too long. Check your connection and try again.",
};

function toGeolocationError(err: GeolocationPositionError): GeolocationError {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return { reason: "permission-denied", message: ERROR_MESSAGES["permission-denied"] };
    case err.POSITION_UNAVAILABLE:
      return { reason: "position-unavailable", message: ERROR_MESSAGES["position-unavailable"] };
    case err.TIMEOUT:
      return { reason: "timeout", message: ERROR_MESSAGES.timeout };
    default:
      return { reason: "position-unavailable", message: ERROR_MESSAGES["position-unavailable"] };
  }
}

/**
 * Browser geolocation hook. Requests the user's position on mount and exposes
 * `refresh()` to retry — e.g. after the user grants permission from a prompt,
 * or taps a "try again" button.
 *
 * Usage:
 *   const { coords, error, loading, refresh } = useGeolocation();
 */
export function useGeolocation(
  options: PositionOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
): UseGeolocationResult {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [loading, setLoading] = useState(true);

  // Keep the latest options available to the callback without retriggering
  // the effect below every render (callers often pass an inline object).
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError({ reason: "unsupported", message: ERROR_MESSAGES.unsupported });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLoading(false);
      },
      (err) => {
        setError(toGeolocationError(err));
        setLoading(false);
      },
      optionsRef.current
    );
  }, []);

  useEffect(() => {
    request();
  }, [request]);

  return { coords, error, loading, refresh: request };
}
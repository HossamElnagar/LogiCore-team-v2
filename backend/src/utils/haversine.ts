/**
 * haversine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Native Haversine Formula implementation for calculating the great-circle
 * distance between two points on Earth's surface given their latitude and
 * longitude coordinates. This eliminates any dependency on Google Maps APIs
 * or paid geocoding services ($0 cost).
 *
 * Formula:
 *   a = sin²(Δlat/2) + cos(lat₁) · cos(lat₂) · sin²(Δlng/2)
 *   c = 2 · atan2(√a, √(1−a))
 *   d = R · c
 *
 * Where R = 6,371,000 metres (mean Earth radius).
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Mean radius of Earth in metres */
const EARTH_RADIUS_METRES = 6_371_000;

/** Convert degrees to radians */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculates the great-circle distance in metres between two geographic points.
 *
 * @param point1 - Source coordinates (e.g., driver's current position)
 * @param point2 - Target coordinates (e.g., client's delivery location)
 * @returns Distance in metres (floating point)
 */
export function haversineDistance(point1: Coordinates, point2: Coordinates): number {
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);

  const lat1Rad = toRadians(point1.lat);
  const lat2Rad = toRadians(point2.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METRES * c;
}

/**
 * Validates whether the driver is within the allowed geo-fence radius
 * of the target delivery location.
 *
 * @param driverCoords   - Driver's GPS coordinates
 * @param deliveryCoords - Client's delivery coordinates
 * @param maxRadiusMetres - Maximum allowed distance (default: 150m)
 * @returns Object containing validation result and computed distance
 */
export function validateGeoFence(
  driverCoords: Coordinates,
  deliveryCoords: Coordinates,
  maxRadiusMetres: number = 150
): { withinFence: boolean; distanceMetres: number; maxRadiusMetres: number } {
  const distanceMetres = haversineDistance(driverCoords, deliveryCoords);

  return {
    withinFence: distanceMetres <= maxRadiusMetres,
    distanceMetres: Math.round(distanceMetres * 100) / 100, // Round to 2 decimal places
    maxRadiusMetres,
  };
}

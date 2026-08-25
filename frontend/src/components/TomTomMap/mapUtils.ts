/**
 * TomTom Maps Utility Functions
 * 
 * Helper functions for common map operations and coordinate conversions
 */

/**
 * Haversine formula to calculate distance between two coordinates
 * Returns distance in kilometers
 * 
 * @param lat1 - Latitude of point 1
 * @param lng1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lng2 - Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert Leaflet coordinates [lat, lng] to TomTom format [lng, lat]
 * 
 * @param leafletCoords - [lat, lng] array
 * @returns [lng, lat] array for TomTom
 */
export function leafletToTomTom(
  leafletCoords: [number, number]
): [number, number] {
  return [leafletCoords[1], leafletCoords[0]];
}

/**
 * Convert TomTom coordinates [lng, lat] to Leaflet format [lat, lng]
 * 
 * @param tomtomCoords - [lng, lat] array
 * @returns [lat, lng] array for Leaflet
 */
export function tomTomToLeaflet(
  tomtomCoords: [number, number]
): [number, number] {
  return [tomtomCoords[1], tomtomCoords[0]];
}

/**
 * Validate if coordinates are within valid ranges
 * 
 * @param lat - Latitude (-90 to 90)
 * @param lng - Longitude (-180 to 180)
 * @returns true if valid
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Calculate bounding box that contains all markers
 * Useful for auto-fitting the map to show all markers
 * 
 * @param markers - Array of markers with lat/lng
 * @returns Bounding box as [minLng, minLat, maxLng, maxLat]
 */
export function calculateBoundingBox(
  markers: Array<{ lat: number; lng: number }>
): [number, number, number, number] {
  if (markers.length === 0) {
    return [0, 0, 0, 0];
  }

  const lngs = markers.map((m) => m.lng);
  const lats = markers.map((m) => m.lat);

  return [
    Math.min(...lngs),
    Math.min(...lats),
    Math.max(...lngs),
    Math.max(...lats),
  ];
}

/**
 * Format coordinates for display
 * 
 * @param lat - Latitude
 * @param lng - Longitude
 * @param decimals - Number of decimal places (default: 4)
 * @returns Formatted string "lat, lng"
 */
export function formatCoordinates(
  lat: number,
  lng: number,
  decimals: number = 4
): string {
  return `${lat.toFixed(decimals)}, ${lng.toFixed(decimals)}`;
}

/**
 * Generate a color based on a string ID
 * Useful for assigning consistent colors to markers
 * 
 * @param id - String identifier
 * @returns Hex color string
 */
export function getColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
  ];

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Determine zoom level based on number of markers
 * Useful for auto-zoom when markers change
 * 
 * @param markerCount - Number of markers on map
 * @returns Recommended zoom level
 */
export function getRecommendedZoom(markerCount: number): number {
  if (markerCount === 0) return 12;
  if (markerCount === 1) return 16;
  if (markerCount <= 3) return 14;
  if (markerCount <= 10) return 12;
  if (markerCount <= 30) return 10;
  if (markerCount <= 100) return 8;
  return 5;
}

/**
 * Create a geohash for clustering markers
 * Useful for grouping nearby markers
 * 
 * @param lat - Latitude
 * @param lng - Longitude
 * @param precision - Hash precision (1-9, default: 6)
 * @returns Geohash string
 */
export function getGeohash(
  lat: number,
  lng: number,
  precision: number = 6
): string {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let idx = 0;
  let bit = 0;
  let evenBit = true;
  let geohash = '';

  const latMin = -90,
    latMax = 90;
  const lngMin = -180,
    lngMax = 180;

  while (geohash.length < precision) {
    if (evenBit) {
      const lngMid = (lngMin + lngMax) / 2;
      if (lng > lngMid) {
        idx = (idx << 1) + 1;
        lngMin = lngMid;
      } else {
        idx = idx << 1;
        lngMax = lngMid;
      }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat > latMid) {
        idx = (idx << 1) + 1;
        latMin = latMid;
      } else {
        idx = idx << 1;
        latMax = latMid;
      }
    }

    evenBit = !evenBit;

    if (bit < 4) {
      bit++;
    } else {
      geohash += base32[idx];
      bit = 0;
      idx = 0;
    }
  }

  return geohash;
}

/**
 * Parse a coordinate string in various formats
 * Supports: "30.0444, 31.2357" or "30.0444|31.2357" or "30.0444 31.2357"
 * 
 * @param coordinateString - Coordinate string
 * @returns [lat, lng] or null if invalid
 */
export function parseCoordinates(
  coordinateString: string
): [number, number] | null {
  const separators = [',', '|', ' '];
  let parts: string[] | null = null;

  for (const sep of separators) {
    if (coordinateString.includes(sep)) {
      parts = coordinateString.split(sep);
      break;
    }
  }

  if (!parts || parts.length !== 2) {
    return null;
  }

  const lat = parseFloat(parts[0].trim());
  const lng = parseFloat(parts[1].trim());

  if (isValidCoordinates(lat, lng)) {
    return [lat, lng];
  }

  return null;
}

/**
 * Calculate bearing (direction) between two points
 * Returns degrees (0-360, where 0=North, 90=East, 180=South, 270=West)
 * 
 * @param lat1 - Starting latitude
 * @param lng1 - Starting longitude
 * @param lat2 - Ending latitude
 * @param lng2 - Ending longitude
 * @returns Bearing in degrees
 */
export function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLng);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Format distance for display
 * 
 * @param distanceKm - Distance in kilometers
 * @returns Formatted string with appropriate unit
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${(distanceKm * 1000).toFixed(0)}m`;
  }
  return `${distanceKm.toFixed(2)}km`;
}

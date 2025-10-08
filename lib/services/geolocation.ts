/**
 * Geolocation Service
 *
 * Provides robust geolocation functionality with comprehensive error handling,
 * permission management, and fallback strategies.
 *
 * Features:
 * - Browser Geolocation API integration
 * - Permission status checking
 * - Configurable timeout and accuracy
 * - Fallback to IP-based geolocation
 * - Denver metro area default fallback
 */

export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeolocationResult {
  coordinates: GeolocationCoordinates | null;
  error: GeolocationError | null;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unavailable';
}

export type GeolocationError =
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout'
  | 'not_supported'
  | 'unknown';

const DENVER_COORDINATES: GeolocationCoordinates = {
  latitude: 39.7392,
  longitude: -104.9903,
  accuracy: 5000,
};

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 300000, // 5 minutes
};

/**
 * Check if geolocation is supported in the browser
 */
export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator;
}

/**
 * Check current permission status for geolocation
 */
export async function checkGeolocationPermission(): Promise<PermissionState | 'unavailable'> {
  if (!('permissions' in navigator)) {
    return 'unavailable';
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return result.state;
  } catch (error) {
    console.warn('Permission API not available:', error);
    return 'unavailable';
  }
}

/**
 * Get user's current location with comprehensive error handling
 */
export async function getCurrentLocation(
  options: PositionOptions = GEOLOCATION_OPTIONS
): Promise<GeolocationResult> {
  if (!isGeolocationSupported()) {
    return {
      coordinates: null,
      error: 'not_supported',
      permissionStatus: 'unavailable',
    };
  }

  const permissionStatus = await checkGeolocationPermission();

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          },
          error: null,
          permissionStatus: permissionStatus === 'unavailable' ? 'granted' : permissionStatus,
        });
      },
      (error) => {
        let errorType: GeolocationError;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorType = 'permission_denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorType = 'position_unavailable';
            break;
          case error.TIMEOUT:
            errorType = 'timeout';
            break;
          default:
            errorType = 'unknown';
        }

        resolve({
          coordinates: null,
          error: errorType,
          permissionStatus: errorType === 'permission_denied' ? 'denied' : permissionStatus,
        });
      },
      options
    );
  });
}

/**
 * Get location with automatic fallback strategies
 * 1. Try browser geolocation
 * 2. Fall back to IP-based geolocation (if configured)
 * 3. Fall back to Denver coordinates
 */
export async function getLocationWithFallback(): Promise<{
  coordinates: GeolocationCoordinates;
  source: 'geolocation' | 'ip' | 'default';
  error?: GeolocationError;
}> {
  // Try browser geolocation first
  const result = await getCurrentLocation();

  if (result.coordinates) {
    return {
      coordinates: result.coordinates,
      source: 'geolocation',
    };
  }

  // If permission denied, don't try other methods
  if (result.error === 'permission_denied') {
    return {
      coordinates: DENVER_COORDINATES,
      source: 'default',
      error: result.error,
    };
  }

  // Try IP-based geolocation
  try {
    const ipLocation = await getLocationFromIP();
    if (ipLocation) {
      return {
        coordinates: ipLocation,
        source: 'ip',
      };
    }
  } catch (error) {
    console.warn('IP geolocation failed:', error);
  }

  // Fall back to Denver default
  return {
    coordinates: DENVER_COORDINATES,
    source: 'default',
    error: result.error || undefined,
  };
}

/**
 * Get approximate location from IP address using ipapi.co
 * This is a fallback when geolocation is unavailable
 */
async function getLocationFromIP(): Promise<GeolocationCoordinates | null> {
  try {
    const response = await fetch('https://ipapi.co/json/', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.latitude && data.longitude) {
      return {
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        accuracy: 10000, // IP-based location is less accurate
      };
    }

    return null;
  } catch (error) {
    console.error('IP geolocation error:', error);
    return null;
  }
}

/**
 * Watch user's location for updates (useful for real-time features)
 */
export function watchLocation(
  onSuccess: (coordinates: GeolocationCoordinates) => void,
  onError: (error: GeolocationError) => void,
  options: PositionOptions = GEOLOCATION_OPTIONS
): (() => void) | null {
  if (!isGeolocationSupported()) {
    onError('not_supported');
    return null;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onSuccess({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    },
    (error) => {
      let errorType: GeolocationError;

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorType = 'permission_denied';
          break;
        case error.POSITION_UNAVAILABLE:
          errorType = 'position_unavailable';
          break;
        case error.TIMEOUT:
          errorType = 'timeout';
          break;
        default:
          errorType = 'unknown';
      }

      onError(errorType);
    },
    options
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  coord1: GeolocationCoordinates,
  coord2: GeolocationCoordinates
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

import Geolocation, { PositionError, type GeoError, type GeoPosition } from 'react-native-geolocation-service';
import { RESULTS } from 'react-native-permissions';
import { permissionService } from '{{IMPORT:permissions.service}}';
import { logger } from '{{IMPORT:utils.logger}}';

export interface Coordinates {
  latitude: number;
  longitude: number;
  /** Metres. */
  accuracy: number;
}

/** Why there is no position – each one has its own message (locationErrorKey) and fix. */
export type LocationErrorCode = 'permission_denied' | 'permission_blocked' | 'services_disabled' | 'timeout' | 'unavailable';

export class LocationError extends Error {
  constructor(
    readonly code: LocationErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = 'LocationError';
  }
}

/** The `common` translation key of an error (the user sees this). */
export function locationErrorKey(code: LocationErrorCode) {
  const keys = {
    permission_denied: 'locationPermissionDenied',
    permission_blocked: 'locationPermissionBlocked',
    services_disabled: 'locationServicesDisabled',
    timeout: 'locationTimeout',
    unavailable: 'locationUnavailable',
  } as const;
  return keys[code];
}

const toCoordinates = ({ coords }: GeoPosition): Coordinates => ({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy });

function toLocationError(error: GeoError): LocationError {
  switch (error.code) {
    case PositionError.PERMISSION_DENIED:
      return new LocationError('permission_denied', error.message);
    case PositionError.TIMEOUT:
      return new LocationError('timeout', error.message);
    case PositionError.SETTINGS_NOT_SATISFIED:
      return new LocationError('services_disabled', error.message);
    default:
      // POSITION_UNAVAILABLE, PLAY_SERVICE_NOT_AVAILABLE (no Google Play Services), INTERNAL_ERROR
      return new LocationError('unavailable', error.message);
  }
}

/** Asks for "while using the app" location access. Throws a LocationError when it's refused. */
async function ensurePermission(): Promise<void> {
  if (await permissionService.ensure('location')) return;
  const status = await permissionService.check('location');
  // blocked: "Don't ask again" / denied on iOS – only Settings can change it (permissionService.openSettings()).
  if (status === RESULTS.BLOCKED) throw new LocationError('permission_blocked');
  if (status === RESULTS.UNAVAILABLE) throw new LocationError('services_disabled');
  throw new LocationError('permission_denied');
}

/**
 * Google Location SDK: the device position through Google Play Services' Fused Location Provider
 * on Android (CoreLocation on iOS), with the permission flow in front.
 */
export const locationService = {
  ensurePermission,

  /** The current position (asks for the permission first; Android offers to turn on location). */
  async getCurrentPosition(): Promise<Coordinates> {
    await ensurePermission();
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => resolve(toCoordinates(position)),
        error => {
          logger.warn('Getting the current position failed', error);
          reject(toLocationError(error));
        },
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000, showLocationDialog: true },
      );
    });
  },

  /**
   * Position updates (e.g. while a map is open) – every `distanceFilter` metres. Resolves the
   * function that stops them; call it when the screen closes.
   */
  async watchPosition(onChange: (coordinates: Coordinates) => void, onError?: (error: LocationError) => void, distanceFilter = 50): Promise<() => void> {
    await ensurePermission();
    const watchId = Geolocation.watchPosition(
      position => onChange(toCoordinates(position)),
      error => onError?.(toLocationError(error)),
      { enableHighAccuracy: true, distanceFilter, showLocationDialog: true },
    );
    return () => Geolocation.clearWatch(watchId);
  },
};

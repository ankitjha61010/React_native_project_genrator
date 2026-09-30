import { env } from '{{IMPORT:config.env}}';
import { logger } from '{{IMPORT:utils.logger}}';
import type { Coordinates } from './locationService';

/** One suggestion of the Places search, e.g. "Pune" · "Maharashtra, India". */
export interface PlaceSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  /** "Pune, Maharashtra, India" */
  description: string;
}

export type PlacesErrorCode = 'missing_key' | 'denied' | 'quota' | 'request_failed';

export class PlacesError extends Error {
  constructor(
    readonly code: PlacesErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = 'PlacesError';
  }
}

/** The `common` translation key of an error. */
export function placesErrorKey(code: PlacesErrorCode) {
  const keys = { missing_key: 'placesNotConfigured', denied: 'placesNotConfigured', quota: 'placesQuota', request_failed: 'placesFailed' } as const;
  return keys[code];
}

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

function apiKey(): string {
  const key = env.googleMapsApiKey;
  if (!key || key.startsWith('YOUR_')) throw new PlacesError('missing_key', 'GOOGLE_MAPS_API_KEY is not set in .env');
  return key;
}

/** Google's endpoints directly (not the app's backend / API client – no auth, no encryption). */
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new PlacesError('request_failed', String(error));
  }
  if (response.status === 403) throw new PlacesError('denied', 'The API key is not allowed to use this API');
  if (response.status === 429) throw new PlacesError('quota');
  if (!response.ok) throw new PlacesError('request_failed', `HTTP ${response.status}`);
  return (await response.json()) as T;
}

interface AutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: { placeId: string; text?: { text: string }; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } };
  }>;
}

interface GeocodeResponse {
  status: 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';
  error_message?: string;
  results: Array<{ formatted_address: string; address_components: Array<{ long_name: string; types: string[] }> }>;
}

/** A new token per search: Google bills the keystrokes of one search + its pick as one session. */
export function newSessionToken(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

/** Google Places API (New) + Geocoding API – enable both for GOOGLE_MAPS_API_KEY. */
export const placesService = {
  /** Cities / regions matching what the user typed (in `language`). */
  async autocomplete(input: string, options: { sessionToken: string; language: string; near?: Coordinates }): Promise<PlaceSuggestion[]> {
    const body = {
      input,
      sessionToken: options.sessionToken,
      languageCode: options.language,
      includedPrimaryTypes: ['(cities)'],
      ...(options.near ? { locationBias: { circle: { center: { latitude: options.near.latitude, longitude: options.near.longitude }, radius: 50_000 } } } : {}),
    };
    const data = await request<AutocompleteResponse>(AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey() },
      body: JSON.stringify(body),
    });
    return (data.suggestions ?? []).flatMap(({ placePrediction: p }) =>
      p
        ? [
            {
              placeId: p.placeId,
              primaryText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
              secondaryText: p.structuredFormat?.secondaryText?.text ?? '',
              description: p.text?.text ?? p.structuredFormat?.mainText?.text ?? '',
            },
          ]
        : [],
    );
  },

  /** "Pune, India" for a position – null when Google knows no place there. */
  async reverseGeocode({ latitude, longitude }: Coordinates, language: string): Promise<string | null> {
    const params = `latlng=${latitude},${longitude}&language=${encodeURIComponent(language)}&result_type=locality|administrative_area_level_1|country&key=${encodeURIComponent(apiKey())}`;
    const data = await request<GeocodeResponse>(`${GEOCODE_URL}?${params}`);
    if (data.status === 'ZERO_RESULTS') return null;
    if (data.status === 'REQUEST_DENIED') throw new PlacesError('denied', data.error_message);
    if (data.status === 'OVER_QUERY_LIMIT') throw new PlacesError('quota', data.error_message);
    if (data.status !== 'OK' || !data.results[0]) {
      logger.warn('Reverse geocoding failed', data.status, data.error_message);
      throw new PlacesError('request_failed', data.error_message ?? data.status);
    }
    const parts = data.results[0].address_components;
    const find = (type: string) => parts.find(c => c.types.includes(type))?.long_name;
    const city = find('locality') ?? find('administrative_area_level_2') ?? find('administrative_area_level_1');
    const country = find('country');
    return [city, country].filter(Boolean).join(', ') || data.results[0].formatted_address;
  },
};

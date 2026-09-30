import { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '{{IMPORT:i18n.index}}';
import { logger } from '{{IMPORT:utils.logger}}';
import { LocationError, locationErrorKey, locationService } from './locationService';
import { newSessionToken, PlacesError, placesErrorKey, placesService, type PlaceSuggestion } from './placesService';

/** Search after a short pause in typing, from this many characters. */
const DEBOUNCE_MS = 300;
const MIN_QUERY = 2;

/** A `common` translation key for any location / places error. */
function errorKey(error: unknown) {
  if (error instanceof LocationError) return locationErrorKey(error.code);
  if (error instanceof PlacesError) return placesErrorKey(error.code);
  return 'locationUnavailable' as const;
}

/**
 * A location text field with Google Places suggestions and "Use current location"
 * (position → "City, Country"). UI-free – LocationPicker renders it.
 */
export function useLocationSearch(value: string, onChange: (value: string) => void) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<ReturnType<typeof errorKey> | null>(null);
  /** Only typing searches – not a picked suggestion or the current location. */
  const typed = useRef(false);
  const sessionToken = useRef(newSessionToken());

  useEffect(() => {
    const query = value.trim();
    if (!typed.current || query.length < MIN_QUERY) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await placesService.autocomplete(query, { sessionToken: sessionToken.current, language: i18n.language });
        if (!cancelled) {
          setSuggestions(results);
          setError(null);
        }
      } catch (searchError) {
        logger.warn('Places search failed', searchError);
        if (!cancelled) setError(errorKey(searchError));
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  const type = useCallback(
    (text: string) => {
      typed.current = true;
      onChange(text);
    },
    [onChange],
  );

  const select = useCallback(
    (suggestion: PlaceSuggestion) => {
      typed.current = false;
      setSuggestions([]);
      // The pick ends this billing session.
      sessionToken.current = newSessionToken();
      onChange(suggestion.description);
    },
    [onChange],
  );

  const useCurrentLocation = useCallback(async () => {
    setLocating(true);
    setError(null);
    try {
      const position = await locationService.getCurrentPosition();
      const place = await placesService.reverseGeocode(position, i18n.language);
      if (place) {
        typed.current = false;
        setSuggestions([]);
        onChange(place);
      } else {
        setError('locationUnavailable');
      }
    } catch (locateError) {
      setError(errorKey(locateError));
    } finally {
      setLocating(false);
    }
  }, [onChange]);

  return { suggestions, searching, locating, error, type, select, useCurrentLocation };
}

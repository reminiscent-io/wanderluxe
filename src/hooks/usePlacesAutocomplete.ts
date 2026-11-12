import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import {
  searchPlaces,
  getPlaceDetails,
  type AutocompleteResult,
  type PlaceResult,
} from '@/utils/googleMapsLoader';

interface UsePlacesAutocompleteOptions {
  /** Google Places `types` filter ('geocode', 'establishment', 'airport'…). Omit for Google's default. */
  searchType?: string;
  /** Runs with the chosen place's details, before the dropdown closes. */
  onSelect: (details: PlaceResult, suggestion: AutocompleteResult) => void;
  /** Runs when the details lookup throws, then the dropdown closes. Without it the dropdown stays open. */
  onDetailsError?: (suggestion: AutocompleteResult) => void;
  /** Told when a selection starts and finishes (details lookup in flight). */
  onSelectingChange?: (selecting: boolean) => void;
  /** Swallow Enter while the dropdown is closed, so it can't submit the surrounding form. */
  blockEnterWhenClosed?: boolean;
  /** Track the input's viewport rect for a fixed, portalled dropdown. */
  trackPosition?: boolean;
  autoFocus?: boolean;
}

/**
 * State and behaviour shared by every Places search box: the 2-character
 * search threshold, prediction fetch, details lookup on select, arrow/Enter/
 * Escape navigation, and dropdown positioning. Markup and blur handling stay
 * with each component, since they differ.
 */
export function usePlacesAutocomplete({
  searchType,
  onSelect,
  onDetailsError,
  onSelectingChange,
  blockEnterWhenClosed = false,
  trackPosition = true,
  autoFocus,
}: UsePlacesAutocompleteOptions) {
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showSuggestions && trackPosition && containerRef.current) {
      const updatePosition = () => {
        const rect = containerRef.current!.getBoundingClientRect();
        setDropdownPosition({ top: rect.bottom, left: rect.left, width: rect.width });
      };
      updatePosition();

      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [showSuggestions, trackPosition]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const search = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchPlaces(query, searchType);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error searching places:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, [searchType]);

  const close = () => {
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const clearSuggestions = () => {
    setSuggestions([]);
    setShowSuggestions(false);
  };

  /** Re-open the last results when the input regains focus with a usable query. */
  const reopen = (query: string) => {
    if (query.length >= 2 && suggestions.length > 0) setShowSuggestions(true);
  };

  const selectSuggestion = async (suggestion: AutocompleteResult) => {
    onSelectingChange?.(true);
    setIsLoading(true);
    try {
      const details = await getPlaceDetails(suggestion.place_id);
      if (details) {
        onSelect(details, suggestion);
        close();
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      if (onDetailsError) {
        onDetailsError(suggestion);
        close();
      }
    } finally {
      setIsLoading(false);
      onSelectingChange?.(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      if (blockEnterWhenClosed && e.key === 'Enter') e.preventDefault();
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        close();
        break;
    }
  };

  return {
    suggestions,
    isLoading,
    showSuggestions,
    selectedIndex,
    setSelectedIndex,
    dropdownPosition,
    inputRef,
    containerRef,
    dropdownRef,
    search,
    selectSuggestion,
    handleKeyDown,
    close,
    clearSuggestions,
    reopen,
  };
}

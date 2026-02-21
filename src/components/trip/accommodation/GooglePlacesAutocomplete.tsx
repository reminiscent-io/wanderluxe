import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Input } from "@/components/ui/input";
import { searchPlaces, getPlaceDetails, type AutocompleteResult, type PlaceResult } from '@/utils/googleMapsLoader';
import { ChevronDown } from 'lucide-react';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (name: string, details?: PlaceResult) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  locationContext?: string; // e.g., "Paris, France" to bias search results
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  value,
  onChange,
  className,
  placeholder = "Search for hotels, addresses...",
  autoFocus,
  locationContext
}) => {
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false); // Track if user is selecting from dropdown

  // Update dropdown position when showing suggestions
  useEffect(() => {
    if (showSuggestions && containerRef.current) {
      const updatePosition = () => {
        const rect = containerRef.current!.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom,
          left: rect.left,
          width: rect.width
        });
      };
      updatePosition();

      // Update position on scroll/resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [showSuggestions]);

  const searchHotels = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchPlaces(query, '', locationContext);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error searching hotels:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, [locationContext]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    searchHotels(newValue);
  };

  const handleSuggestionSelect = async (suggestion: AutocompleteResult) => {
    setIsLoading(true);
    try {
      const details = await getPlaceDetails(suggestion.place_id);
      if (details) {
        onChange(details.name, details);
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Don't close if user is actively selecting from dropdown
    if (isSelectingRef.current) {
      return;
    }
    // Longer timeout for mobile devices where touch events take longer to process
    setTimeout(() => {
      if (!isSelectingRef.current && !dropdownRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    }, 200);
  };

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const dropdownContent = showSuggestions && suggestions.length > 0 && (
    <div
      ref={dropdownRef}
      className="bg-white border border-sand-200 rounded-md shadow-warm-xl max-h-60 overflow-y-auto pointer-events-auto"
      style={{
        position: 'fixed',
        top: dropdownPosition.top + 4,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 99999
      }}
      onMouseDown={() => {
        isSelectingRef.current = true;
      }}
      onMouseUp={() => {
        setTimeout(() => { isSelectingRef.current = false; }, 100);
      }}
      onTouchStart={() => {
        isSelectingRef.current = true;
      }}
      onTouchEnd={() => {
        setTimeout(() => { isSelectingRef.current = false; }, 100);
      }}
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion.place_id}
          type="button"
          className={`w-full px-3 py-2 text-left hover:bg-sand-50 active:bg-sand-100 border-b border-sand-100 last:border-b-0 touch-manipulation ${
            index === selectedIndex ? 'bg-sand-100' : ''
          }`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleSuggestionSelect(suggestion)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div className="font-medium text-sm">
            {suggestion.structured_formatting.main_text}
          </div>
          <div className="text-xs text-sand-600">
            {suggestion.structured_formatting.secondary_text}
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative" ref={containerRef}>
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => value.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
        className={`${className} pr-8`}
        placeholder={placeholder}
        autoComplete="off"
      />
      {isLoading && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-sand-600 border-t-transparent"></div>
        </div>
      )}
      {!isLoading && showSuggestions && (
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-sand-500" />
      )}

      {dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
};

export default GooglePlacesAutocomplete;
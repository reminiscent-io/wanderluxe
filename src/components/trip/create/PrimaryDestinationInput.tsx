import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchPlaces, getPlaceDetails, type AutocompleteResult, type PlaceResult } from '@/utils/googleMapsLoader';
import { ChevronDown, MapPin, X } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface PrimaryDestinationInputProps {
  value: string;
  placeId: string;
  onChange: (destination: string, placeId: string) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  showLabel?: boolean;
  usePortal?: boolean;
}

const PrimaryDestinationInput: React.FC<PrimaryDestinationInputProps> = ({
  value,
  placeId,
  onChange,
  className,
  placeholder = "Search for a city or place...",
  autoFocus,
  showLabel = true,
  usePortal = true
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<AutocompleteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update dropdown position when showing suggestions with portal
  useEffect(() => {
    if (showSuggestions && usePortal && containerRef.current) {
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
  }, [showSuggestions, usePortal]);

  // Sync input value with prop value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const searchCities = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      // Use '(cities)' type to search for cities and regions
      const results = await searchPlaces(query, '(cities)');
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error searching cities:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    searchCities(newValue);
  };

  const handleSuggestionSelect = async (suggestion: AutocompleteResult) => {
    setIsLoading(true);
    try {
      const details = await getPlaceDetails(suggestion.place_id);
      if (details) {
        // Use the formatted address for cities/regions
        const displayName = details.formatted_address || details.name;
        setInputValue(displayName);
        onChange(displayName, suggestion.place_id);
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      // Fallback to description if details fail
      setInputValue(suggestion.description);
      onChange(suggestion.description, suggestion.place_id);
      setShowSuggestions(false);
      setSelectedIndex(-1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setInputValue('');
    onChange('', '');
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
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
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    }, 150);
  };

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const dropdownContent = showSuggestions && suggestions.length > 0 && (
    <div
      ref={dropdownRef}
      className="bg-white border border-gray-200 rounded-md shadow-xl max-h-60 overflow-y-auto"
      style={usePortal ? {
        position: 'fixed',
        top: dropdownPosition.top + 4,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 9999
      } : undefined}
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion.place_id}
          type="button"
          className={`w-full px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-gray-900 ${
            index === selectedIndex ? 'bg-gray-100' : ''
          }`}
          onClick={() => handleSuggestionSelect(suggestion)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <div className="min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate">
                {suggestion.structured_formatting.main_text}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {suggestion.structured_formatting.secondary_text}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label className="text-earth-600 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Primary destination (optional)
        </Label>
      )}
      <div className="relative" ref={containerRef}>
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => inputValue.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
          className={`${className || ''} relative z-50 pr-16 bg-white text-gray-900 placeholder:text-gray-500`}
          placeholder={placeholder}
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {inputValue && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-sand-100"
              onClick={handleClear}
            >
              <X className="h-3 w-3 text-sand-500" />
            </Button>
          )}
          {isLoading && (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-sand-600 border-t-transparent"></div>
          )}
          {!isLoading && showSuggestions && (
            <ChevronDown className="h-4 w-4 text-sand-500" />
          )}
        </div>

        {usePortal
          ? dropdownContent && createPortal(dropdownContent, document.body)
          : <div className="absolute z-[9999] w-full mt-1">{dropdownContent}</div>
        }
      </div>
    </div>
  );
};

export default PrimaryDestinationInput;

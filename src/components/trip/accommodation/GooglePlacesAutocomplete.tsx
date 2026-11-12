import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Input } from "@/components/ui/input";
import { type PlaceResult } from '@/utils/googleMapsLoader';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import { ChevronDown } from 'lucide-react';

interface GooglePlacesAutocompleteProps {
  value: string;
  onChange: (name: string, details?: PlaceResult) => void;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** Google Places `types` filter; omit for Google's default mix. */
  searchType?: string;
  id?: string;
  /** Wraps the field in an extra div with this class. */
  wrapperClassName?: string;
  /** Swallow Enter while no suggestions are showing (default), so it can't submit the form. */
  blockEnterWhenClosed?: boolean;
}

const GooglePlacesAutocomplete: React.FC<GooglePlacesAutocompleteProps> = ({
  value,
  onChange,
  className,
  placeholder = "Search for a hotel name or address...",
  autoFocus,
  searchType,
  id,
  wrapperClassName,
  blockEnterWhenClosed = true
}) => {
  const isSelectingRef = useRef(false); // Track if user is selecting from dropdown
  const {
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
    reopen,
  } = usePlacesAutocomplete({
    searchType,
    onSelect: (details) => onChange(details.name, details),
    blockEnterWhenClosed,
    autoFocus,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    search(newValue);
  };

  const handleBlur = () => {
    // Don't close if user is actively selecting from dropdown
    if (isSelectingRef.current) {
      return;
    }
    // Longer timeout for mobile devices where touch events take longer to process
    setTimeout(() => {
      if (!isSelectingRef.current && !dropdownRef.current?.contains(document.activeElement)) {
        close();
      }
    }, 200);
  };

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
          onClick={() => selectSuggestion(suggestion)}
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

  const field = (
    <div className="relative" ref={containerRef}>
      <Input
        ref={inputRef}
        type="text"
        id={id}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => reopen(value)}
        className={className ? `${className} pr-8` : 'pr-8'}
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

  return wrapperClassName ? <div className={wrapperClassName}>{field}</div> : field;
};

export default GooglePlacesAutocomplete;

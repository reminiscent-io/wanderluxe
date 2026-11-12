import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import { ChevronDown, MapPin, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PrimaryDestinationInputProps {
  value: string;
  placeId: string;
  onChange: (destination: string, placeId: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  autoFocus?: boolean;
  showLabel?: boolean;
  usePortal?: boolean;
}

const PrimaryDestinationInput: React.FC<PrimaryDestinationInputProps> = ({
  value,
  onChange,
  className,
  inputClassName,
  placeholder = "Search for a city or place...",
  autoFocus,
  showLabel = true,
  usePortal = true
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [isSelecting, setIsSelecting] = useState(false); // Flag to prevent blur during selection
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
    clearSuggestions,
    reopen,
  } = usePlacesAutocomplete({
    // 'geocode' admits any geographic result (hamlets, neighbourhoods,
    // landmarks, addresses) and leaves out businesses. '(cities)' dropped
    // hamlets like Elmau (part of Krün, Bavaria) and let Google autocorrect
    // them to a same-sounding town (Ellmau, Austria)
    searchType: 'geocode',
    onSelect: (details, suggestion) => {
      // Use the formatted address for cities/regions
      const displayName = details.formatted_address || details.name;
      setInputValue(displayName);
      onChange(displayName, suggestion.place_id);
    },
    // Fall back to the prediction's description if details fail
    onDetailsError: (suggestion) => {
      setInputValue(suggestion.description);
      onChange(suggestion.description, suggestion.place_id);
    },
    onSelectingChange: setIsSelecting,
    blockEnterWhenClosed: true,
    trackPosition: usePortal,
    autoFocus,
  });

  // Sync input value with prop value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    search(newValue);
  };

  const handleClear = () => {
    setInputValue('');
    onChange('', '');
    clearSuggestions();
    inputRef.current?.focus();
  };

  const handleBlur = () => {
    // Longer timeout for mobile devices where touch events take longer to process
    setTimeout(() => {
      // Don't close if we're in the middle of selecting a suggestion
      if (isSelecting) return;
      if (!dropdownRef.current?.contains(document.activeElement)) {
        close();
      }
    }, 350); // Slightly longer timeout for iOS
  };

  const dropdownContent = showSuggestions && suggestions.length > 0 && (
    <div
      ref={dropdownRef}
      className="bg-background border border-[hsl(var(--border))] rounded-md shadow-warm-xl max-h-60 overflow-y-auto text-foreground"
      style={usePortal ? {
        position: 'fixed',
        top: dropdownPosition.top + 4, // 4px vertical offset
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 99999, // Higher z-index to ensure it's above dialog overlay (250)
        pointerEvents: 'auto'
      } : undefined}
      onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking dropdown
      onTouchStart={(e) => {
        // Stop propagation but don't prevent default to allow touch events to work
        e.stopPropagation();
      }}
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion.place_id}
          type="button"
          className={`w-full px-4 py-3 text-left hover:bg-secondary active:bg-muted border-b border-[hsl(var(--border))] last:border-b-0 touch-manipulation select-none ${
            index === selectedIndex ? 'bg-muted' : ''
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            selectSuggestion(suggestion);
          }}
          onTouchEnd={(e) => {
            // Use a small delay to ensure the touch is registered properly
            e.preventDefault();
            e.stopPropagation();
            // Set selecting flag immediately to prevent blur from closing dropdown
            setIsSelecting(true);
            // Slight delay for iOS touch event handling
            setTimeout(() => {
              selectSuggestion(suggestion);
            }, 10);
          }}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm !text-foreground truncate">
                {suggestion.structured_formatting.main_text}
              </div>
              <div className="text-xs text-muted-foreground truncate">
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
          Primary destination<span className="text-red-500"> *</span>
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
          onFocus={() => reopen(inputValue)}
          className={cn(
            "pr-16 !bg-background !text-foreground placeholder:!text-muted-foreground",
            className || "",
            inputClassName || ""
          )}
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
          : <div className="absolute z-[9999] w-full mt-1.5">{dropdownContent}</div>
        }
      </div>
    </div>
  );
};

export default PrimaryDestinationInput;

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { isValidCost } from '@/utils/costUtils';
import { ActivityFormData } from '@/types/trip';
import { CURRENCIES, CURRENCY_SYMBOLS, Currency } from '@/utils/currencyConstants';
import { Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import TravelersTagMultiSelect from './travelers/TravelersTagMultiSelect';
import { getJunctionTravelerIds, setJunctionTravelers } from '@/services/travelers';
import GooglePlacesAutocomplete from './accommodation/GooglePlacesAutocomplete';
import type { PlaceResult } from '@/utils/googleMapsLoader';
import RestaurantContactInfo from './dining/form/RestaurantContactInfo';

interface ActivityFormProps {
  activity: ActivityFormData;
  onActivityChange: (activity: ActivityFormData) => void;
  onSubmit: (activity: ActivityFormData) => void;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  submitLabel: string;
  eventId: string;
  tripDates?: { arrival_date: string; departure_date: string };
  preselectedDate?: string;
  tripId: string;
  activityId?: string | null; // Add activity ID for edit mode
  destination?: string; // Trip destination to bias Google Places results
}

const DEFAULT_START_TIME = '08:00'; // Default to 8:00 AM for activities

// Duration presets in minutes
const DURATION_PRESETS = [
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
  { label: 'Half day', minutes: 240 },
  { label: 'Full day', minutes: 480 },
] as const;

// Helper to add minutes to a time string (HH:MM format)
const addMinutesToTime = (time: string, minutes: number): string => {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
};

// Helper to calculate duration in minutes between two times
const calculateDuration = (start: string, end: string): number | null => {
  if (!start || !end) return null;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return endMinutes >= startMinutes ? endMinutes - startMinutes : null;
};

// Helper to format duration for display
const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const ActivityForm: React.FC<ActivityFormProps> = ({
  activity,
  onActivityChange,
  onSubmit,
  onCancel,
  onDelete,
  submitLabel,
  eventId,
  tripDates,
  preselectedDate,
  tripId,
  activityId,
  destination,
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useCustomEndTime, setUseCustomEndTime] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [locationSearch, setLocationSearch] = useState(activity.location_address || '');

  // Load existing travelers for edit mode
  useEffect(() => {
    if (activityId && tripId && (!activity.travelers || activity.travelers.length === 0)) {
      getJunctionTravelerIds("activity", tripId, activityId)
        .then(({ data }) => {
          if (data && data.length > 0) {
            onActivityChange({ ...activity, travelers: data });
          }
        })
        .catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId, tripId]);

  // Local UI state for time values
  const [startTime, setStartTime] = useState(activity.start_time || "");
  const [endTime, setEndTime] = useState(activity.end_time || "");

  // Generate trip date options with timezone-safe handling
  const tripDateOptions = React.useMemo(() => {
    if (!tripDates) return [];

    const dates = [];
    const [startYear, startMonth, startDay] = tripDates.arrival_date.split('-').map(Number);
    const [endYear, endMonth, endDay] = tripDates.departure_date.split('-').map(Number);

    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      dates.push({
        value: dateString,
        label: `${dayName}, ${monthDay}`
      });
    }
    return dates;
  }, [tripDates]);

  // Handle date preselection on component mount
  React.useEffect(() => {
    if (preselectedDate && !activity.date) {
      onActivityChange({ ...activity, date: preselectedDate });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedDate, activity.date]);

  // Update local state when activity prop changes (e.g., editing existing)
  useEffect(() => {
    if (activity.start_time) setStartTime(activity.start_time);
    if (activity.end_time) setEndTime(activity.end_time);

    // Determine if existing activity uses a preset duration or custom end time
    if (activity.start_time && activity.end_time) {
      const duration = calculateDuration(activity.start_time, activity.end_time);
      const matchingPreset = DURATION_PRESETS.find(p => p.minutes === duration);
      if (matchingPreset) {
        setSelectedDuration(matchingPreset.minutes);
        setUseCustomEndTime(false);
      } else if (duration !== null) {
        setSelectedDuration(null);
        setUseCustomEndTime(true);
      }
    }
  }, [activity.start_time, activity.end_time]);

  // Sync local startTime with parent activity
  useEffect(() => {
    if (activity.start_time !== startTime) {
      onActivityChange({ ...activity, start_time: startTime });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime]);

  // Sync local endTime with parent activity
  useEffect(() => {
    if (activity.end_time !== endTime) {
      onActivityChange({ ...activity, end_time: endTime });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endTime]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!activity.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (tripDateOptions.length > 0 && !activity.date) {
      newErrors.date = 'Date is required';
    }

    if (activity.start_time && activity.end_time) {
      if (activity.start_time > activity.end_time) {
        newErrors.time = 'End time must be after start time';
      }
    }

    if (activity.cost && !isValidCost(activity.cost)) {
      newErrors.cost = 'Please enter a valid cost';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setIsSubmitting(true);
    try {
      const { travelers, ...activityData } = activity;

      const result = await onSubmit(activityData);

      if (travelers && travelers.length > 0) {
        const actId = (activity as any).id || (result as any)?.id;
        if (actId) {
          await setJunctionTravelers("activity", tripId, actId, travelers);
        }
      }

      onCancel();
    } catch (error) {
      toast.error('Failed to save activity');
      console.error('Error saving activity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCostChange = (value: string) => {
    const numericValue = Number(value.replace(/,/g, ''));
    onActivityChange({ ...activity, cost: Number.isNaN(numericValue) ? '' : numericValue.toString() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title Field */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-earth-700">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={activity.title}
          onChange={(e) => onActivityChange({ ...activity, title: e.target.value })}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border border-[hsl(var(--border))] p-2 focus:border-earth-500 focus:ring-earth-500 ${errors.title ? 'border-red-500' : ''}`}
          required
        />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
      </div>

      {/* Location Field - Google Places Search */}
      <div>
        <label className="block text-sm font-medium text-earth-700">
          Location
        </label>
        <div className="mt-1">
          <GooglePlacesAutocomplete
            value={locationSearch}
            placeholder="Search for a location..."
            onChange={(name, details?: PlaceResult) => {
              setLocationSearch(name);
              if (details) {
                onActivityChange({
                  ...activity,
                  location_address: details.formatted_address || null,
                  location_place_id: details.place_id || null,
                  location_phone: details.formatted_phone_number || null,
                  location_website: details.website || null,
                  location_rating: details.rating || null,
                });
              } else {
                // User is typing freely — clear place details
                onActivityChange({
                  ...activity,
                  location_address: null,
                  location_place_id: null,
                  location_phone: null,
                  location_website: null,
                  location_rating: null,
                });
              }
            }}
          />
        </div>
        {/* Show place details when a location is selected */}
        {(activity.location_address || activity.location_phone || activity.location_website || activity.location_rating) && (
          <div className="mt-2">
            <RestaurantContactInfo
              address={activity.location_address || undefined}
              phone={activity.location_phone || undefined}
              website={activity.location_website || undefined}
              rating={activity.location_rating || undefined}
            />
          </div>
        )}
      </div>

      {/* Description Field */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-earth-700">
          Description
        </label>
        <textarea
          id="description"
          value={activity.description || ''}
          onChange={(e) => onActivityChange({ ...activity, description: e.target.value })}
          className="mt-1 block w-full rounded-md border border-[hsl(var(--border))] p-2 shadow-sm focus:border-earth-500 focus:ring-earth-500 sm:text-sm"
          rows={1}
        />
      </div>

      {/* Date Selection */}
      {tripDateOptions.length > 0 && (
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-earth-700">
            Date <span className="text-red-500">*</span>
          </label>
          <Select onValueChange={(value) => onActivityChange({ ...activity, date: value })} value={activity.date || ''}>
            <SelectTrigger className={`mt-1 ${errors.date ? 'border-red-500' : ''}`}>
              <SelectValue placeholder="Select a date" />
            </SelectTrigger>
            <SelectContent className="z-[999]">
              {tripDateOptions.map((option) => {
                const [year, month, day] = option.value.split('-').map(Number);
                const safeDate = new Date(year, month - 1, day);
                return (
                  <SelectItem key={option.value} value={option.value}>
                    {format(safeDate, 'EEEE, MMMM d, yyyy')}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
        </div>
      )}

      {/* Time Fields - Compact Design */}
      <div className="space-y-3">
        {/* Start Time - Compact */}
        <div className="flex items-center gap-3">
          <label htmlFor="start-time" className="text-sm font-medium text-earth-700 w-16 shrink-0">
            Start
          </label>
          <Input
            id="start-time"
            type="time"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              // Auto-update end time if duration is selected
              if (selectedDuration && e.target.value) {
                setEndTime(addMinutesToTime(e.target.value, selectedDuration));
              }
            }}
            onFocus={() => {
              if (!startTime) setStartTime(DEFAULT_START_TIME);
            }}
            step="300"
            className="w-28 bg-white border-sand-300 focus:ring-sand-500 focus:border-sand-500 text-center"
          />
          {startTime && endTime && !useCustomEndTime && (
            <span className="text-sm text-sand-600">
              {formatDuration(calculateDuration(startTime, endTime) || 0)}
            </span>
          )}
        </div>

        {/* Duration Presets */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-earth-700">Duration</label>
          <div className="flex flex-wrap gap-2">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset.minutes}
                type="button"
                onClick={() => {
                  setSelectedDuration(preset.minutes);
                  setUseCustomEndTime(false);
                  const start = startTime || DEFAULT_START_TIME;
                  if (!startTime) setStartTime(start);
                  setEndTime(addMinutesToTime(start, preset.minutes));
                }}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  selectedDuration === preset.minutes && !useCustomEndTime
                    ? 'bg-sand-500 text-white border-sand-500'
                    : 'bg-white text-sand-700 border-sand-300 hover:border-sand-400 hover:bg-sand-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setUseCustomEndTime(true);
                setSelectedDuration(null);
              }}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                useCustomEndTime
                  ? 'bg-sand-500 text-white border-sand-500'
                  : 'bg-white text-sand-700 border-sand-300 hover:border-sand-400 hover:bg-sand-50'
              }`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Custom End Time - Only shown when custom is selected */}
        {useCustomEndTime && (
          <div className="flex items-center gap-3">
            <label htmlFor="end-time" className="text-sm font-medium text-earth-700 w-16 shrink-0">
              End
            </label>
            <Input
              id="end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              onFocus={() => {
                if (!endTime) {
                  // Default to 1 hour after start time, or 9:00 AM
                  const start = startTime || DEFAULT_START_TIME;
                  setEndTime(addMinutesToTime(start, 60));
                }
              }}
              step="300"
              className="w-28 bg-white border-sand-300 focus:ring-sand-500 focus:border-sand-500 text-center"
            />
            {startTime && endTime && (
              <span className="text-sm text-sand-600">
                {formatDuration(calculateDuration(startTime, endTime) || 0)}
              </span>
            )}
          </div>
        )}

        {errors.time && (
          <p className="text-xs text-red-500">{errors.time}</p>
        )}
      </div>

      {/* Cost and Currency */}
      <div className="space-y-2">
        <label htmlFor="cost" className="block text-sm font-medium text-earth-700">
          Cost
        </label>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              id="cost"
              type="text"
              value={
                activity.cost !== undefined && activity.cost !== null && activity.cost !== ''
                  ? new Intl.NumberFormat('en-US').format(Number(activity.cost))
                  : ''
              }
              onChange={(e) => handleCostChange(e.target.value)}
              placeholder="0"
              className={`block w-full rounded-md shadow-sm sm:text-sm border p-2 focus:border-earth-500 focus:ring-earth-500 bg-white ${errors.cost ? 'border-red-500' : 'border-[hsl(var(--border))]'}`}
            />
            {errors.cost && <p className="mt-1 text-xs text-red-500">{errors.cost}</p>}
          </div>
          <div className="w-[110px] shrink-0">
            <Select onValueChange={(value) => onActivityChange({ ...activity, currency: value as Currency })} value={activity.currency || ''}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="USD" />
              </SelectTrigger>
              <SelectContent className="z-[999] max-h-48 overflow-y-auto">
                {CURRENCIES.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    <span className="font-medium">{currency}</span>
                    <span className="ml-1 text-sand-600 text-sm">
                      {CURRENCY_SYMBOLS[currency]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Travelers */}
      <div>
        <label className="block text-sm font-medium text-earth-700">
          Travelers
        </label>
        <div className="mt-1">
          <TravelersTagMultiSelect
            tripId={tripId}
            value={activity.travelers || []}
            onChange={(travelers) => onActivityChange({ ...activity, travelers })}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="sticky bottom-0 z-10 bg-background flex justify-between items-center pt-4 -mt-px border-t border-sand-200">
        <div>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isSubmitting}
              className="flex items-center justify-center w-9 h-9 text-red-500 hover:text-red-600 hover:bg-red-50 bg-transparent border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            onClick={onCancel}
            variant="ghost"
            className="px-5 py-2 text-sm font-medium text-sand-600 hover:text-sand-700 hover:bg-sand-50"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="px-6 py-2 text-sm font-semibold text-white bg-earth-600 hover:bg-earth-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-earth-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting || !activity.title.trim()}
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ActivityForm;

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { isValidCost } from '@/utils/costUtils';
import { ActivityFormData } from '@/types/trip';
import { CURRENCIES, CURRENCY_NAMES, CURRENCY_SYMBOLS, Currency } from '@/utils/currencyConstants';
import { Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import TravelersTagMultiSelect from './travelers/TravelersTagMultiSelect';
import { getDayActivityTravelerIds, setDayActivityTravelers } from '@/services/travelers';

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
}

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
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing travelers for edit mode
  useEffect(() => {
    if ((activity as any).id && tripId && !activity.travelers) {
      getDayActivityTravelerIds(tripId, (activity as any).id)
        .then(({ data }) => {
          if (data && data.length > 0) {
            onActivityChange({ ...activity, travelers: data });
          }
        })
        .catch(console.error);
    }
  }, [(activity as any).id, tripId]);

  // New local state for time values
  const [startTime, setStartTime] = useState(activity.start_time || "");
  const [endTime, setEndTime] = useState(activity.end_time || "");

  // Generate trip date options with timezone-safe handling
  const tripDateOptions = React.useMemo(() => {
    if (!tripDates) return [];

    const dates = [];

    // Parse dates safely without timezone issues
    const [startYear, startMonth, startDay] = tripDates.arrival_date.split('-').map(Number);
    const [endYear, endMonth, endDay] = tripDates.departure_date.split('-').map(Number);

    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      // Safe date formatting without timezone shifts
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
  }, [preselectedDate, activity.date]);

  // Update local state when activity prop changes
  useEffect(() => {
    if (activity.start_time) setStartTime(activity.start_time);
    if (activity.end_time) setEndTime(activity.end_time);
  }, [activity.start_time, activity.end_time]);

  // Sync local startTime with parent activity
  useEffect(() => {
    if (activity.start_time !== startTime) {
      onActivityChange({ ...activity, start_time: startTime });
    }
  }, [startTime]);

  // Sync local endTime with parent activity
  useEffect(() => {
    if (activity.end_time !== endTime) {
      onActivityChange({ ...activity, end_time: endTime });
    }
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
      // Remove travelers from form data as it's handled separately
      const { travelers, ...activityData } = activity;

      const result = await onSubmit(activityData);

      // Save traveler tags if we have travelers selected
      if (travelers && travelers.length > 0) {
        // For edit mode, we might have an existing activity ID, or we get it from the result
        const activityId = (activity as any).id || (result as any)?.id;
        if (activityId) {
          await setDayActivityTravelers(tripId, activityId, travelers);
        }
      }

      toast.success('Activity saved successfully');
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
    onActivityChange({ ...activity, cost: Number.isNaN(numericValue) ? undefined : numericValue });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title Field */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={activity.title}
          onChange={(e) => onActivityChange({ ...activity, title: e.target.value })}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 p-2 focus:border-earth-500 focus:ring-earth-500 ${errors.title ? 'border-red-500' : ''}`}
          required
        />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
      </div>

      {/* Description Field */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={activity.description || ''}
          onChange={(e) => onActivityChange({ ...activity, description: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-earth-500 focus:ring-earth-500 sm:text-sm"
          rows={1}
        />
      </div>

      {/* Date Selection */}
      {tripDateOptions.length > 0 && (
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            Date <span className="text-red-500">*</span>
          </label>
          <Select onValueChange={(value) => onActivityChange({ ...activity, date: value })} value={activity.date || ''}>
            <SelectTrigger className={`mt-1 ${errors.date ? 'border-red-500' : ''}`}>
              <SelectValue placeholder="Select a date" />
            </SelectTrigger>
            <SelectContent className="z-[999]">
              {tripDateOptions.map((option) => {
                // Parse date safely without timezone issues for better formatting
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

      {/* Time Fields */}
      <div className="grid grid-cols-2 gap-4">
        {/* Start Time */}
        <div>
          <label htmlFor="start-time" className="block text-sm font-medium text-gray-700">
            Start Time
          </label>
          <input
            id="start-time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            step="300" // 5-minute increments (300 seconds)
            className="w-full p-2 border rounded-md"
          />
        </div>

        {/* End Time */}
        <div>
          <label htmlFor="end-time" className="block text-sm font-medium text-gray-700">
            End Time
          </label>
          <input
            id="end-time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            step="300" // 5-minute increments
            className="w-full p-2 border rounded-md"
          />
        </div>
        {errors.time && (
          <p className="col-span-2 text-xs text-red-500">{errors.time}</p>
        )}
      </div>

      {/* Cost and Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
            Cost
          </label>
          <input
            id="cost"
            type="text"
            value={activity.cost !== undefined && activity.cost !== null ? new Intl.NumberFormat('en-US').format(activity.cost) : ''}
            onChange={(e) => handleCostChange(e.target.value)}
            onBlur={(e) => {
              // The field value is already set by onChange, this ensures visual formatting
            }}
            placeholder="0"
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border p-2 focus:border-earth-500 focus:ring-earth-500 ${errors.cost ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.cost && <p className="mt-1 text-xs text-red-500">{errors.cost}</p>}
        </div>
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
            Currency
          </label>
          <Select onValueChange={(value) => onActivityChange({ ...activity, currency: value as Currency })} value={activity.currency || ''}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select currency" />
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

      {/* Travelers */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Tag Travelers
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
      <div className="flex justify-between items-center pt-4">
        <div>
          {submitLabel === 'Save Changes' && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={isSubmitting}
              className="flex items-center justify-center w-8 h-8 text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={onCancel}
            variant="ghost"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-earth-500"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-sand-500 hover:bg-sand-600 border-2 border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sand-500 disabled:opacity-50"
            disabled={isSubmitting || !activity.title.trim()}
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ActivityForm;

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { isValidCost } from '@/utils/costUtils';
import { ActivityFormData } from '@/types/trip';

interface ActivityFormProps {
  activity: ActivityFormData;
  onActivityChange: (activity: ActivityFormData) => void;
  onSubmit: (activity: ActivityFormData) => void;
  onCancel: () => void;
  submitLabel: string;
  eventId: string;
}

// Include a null option for "no selection" (displayed as a dash)
const hours = [null, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const minutes = [null, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const ampmOptions = [null, 'AM', 'PM'];

/**
 * Converts a 12-hour selection to a 24-hour "HH:MM" string.
 * If any part is null, returns an empty string to indicate no time selected.
 */
function to24HourString(
  h: number | null,
  m: number | null,
  ampm: string | null
): string {
  if (h === null || m === null || ampm === null) {
    return "";
  }
  let hour24 = h;
  if (ampm === 'PM' && h !== 12) hour24 += 12;
  if (ampm === 'AM' && h === 12) hour24 = 0;
  const hh = String(hour24).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Parses a "HH:MM" or "HH:MM:SS" 24-hour string into { hour, minute, ampm }.
 * If invalid, returns all nulls.
 */
function parse24HourString(timeStr: string | null | undefined): { hour: number | null, minute: number | null, ampm: string | null } {
  // Return all nulls if timeStr is null, undefined, or empty
  if (!timeStr) {
    return { hour: null, minute: null, ampm: null };
  }

  try {
    // Parse HH:MM or HH:MM:SS format
    const parts = timeStr.split(':');
    if (parts.length < 2) {
      return { hour: null, minute: null, ampm: null };
    }

    const hour24 = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);

    // Determine 12-hour format
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';

    return {
      hour: hour12,
      minute,
      ampm
    };
  } catch (error) {
    console.error("Error parsing time string:", error);
    return { hour: null, minute: null, ampm: null };
  }
}

const ActivityForm: React.FC<ActivityFormProps> = ({
  activity,
  onActivityChange,
  onSubmit,
  onCancel,
  submitLabel,
  eventId
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local states for start/end times
  const [startHour, setStartHour] = useState<number | null>(null);
  const [startMinute, setStartMinute] = useState<number | null>(null);
  const [startAmPm, setStartAmPm] = useState<string | null>(null);

  const [endHour, setEndHour] = useState<number | null>(null);
  const [endMinute, setEndMinute] = useState<number | null>(null);
  const [endAmPm, setEndAmPm] = useState<string | null>(null);

  // On mount or when activity times change, parse them into local state
  useEffect(() => {
    const start = parse24HourString(activity.start_time);
    setStartHour(start.hour);
    setStartMinute(start.minute);
    setStartAmPm(start.ampm);

    const end = parse24HourString(activity.end_time);
    setEndHour(end.hour);
    setEndMinute(end.minute);
    setEndAmPm(end.ampm);
  }, [activity.start_time, activity.end_time]);

  // Whenever local start-time state changes, update the parent activity object
  useEffect(() => {
    const newStart = to24HourString(startHour, startMinute, startAmPm);
    onActivityChange({ ...activity, start_time: newStart });
  }, [startHour, startMinute, startAmPm]);

  // Whenever local end-time state changes, update the parent activity object
  useEffect(() => {
    const newEnd = to24HourString(endHour, endMinute, endAmPm);
    onActivityChange({ ...activity, end_time: newEnd });
  }, [endHour, endMinute, endAmPm]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!activity.title.trim()) {
      newErrors.title = 'Title is required';
    }

    // If both times exist, ensure start <= end
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

    try {
      setIsSubmitting(true);
      await onSubmit(activity);
    } catch (error) {
      console.error('Error submitting activity form:', error);
      toast.error('Failed to save activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title Field */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title *
        </label>
        <input
          id="title"
          type="text"
          value={activity.title || ''}
          onChange={(e) => onActivityChange({ ...activity, title: e.target.value })}
          className={`mt-1 block w-full rounded-md border ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          } p-2 shadow-sm focus:border-earth-500 focus:ring-earth-500 sm:text-sm`}
          required
        />
        {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
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
          rows={2}
        />
      </div>

      {/* Time Fields */}
      <div className="grid grid-cols-2 gap-4">
        {/* Start Time */}
        <div>
          <label htmlFor="start-hour" className="block text-sm font-medium text-gray-700">
            Start Time
          </label>
          <div className="flex items-center gap-2 mt-1">
            {/* Hour */}
            <select
              id="start-hour"
              className="rounded-md border border-gray-300 p-1 focus:border-earth-500 focus:ring-earth-500"
              value={startHour !== null ? startHour : ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : Number(e.target.value);
                setStartHour(val);
              }}
            >
              <option value="">–</option>
              {hours.slice(1).map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>

            <span>:</span>

            {/* Minute */}
            <select
              id="start-minute"
              className="rounded-md border border-gray-300 p-1 focus:border-earth-500 focus:ring-earth-500"
              value={startMinute !== null ? startMinute : ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : Number(e.target.value);
                setStartMinute(val);
              }}
            >
              <option value="">–</option>
              {minutes.slice(1).map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, '0')}
                </option>
              ))}
            </select>

            {/* AM/PM */}
            <select
              id="start-ampm"
              className="rounded-md border border-gray-300 p-1 focus:border-earth-500 focus:ring-earth-500"
              value={startAmPm || ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : e.target.value;
                setStartAmPm(val);
              }}
            >
              <option value="">–</option>
              {ampmOptions.slice(1).map((ap) => (
                <option key={ap} value={ap}>
                  {ap}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* End Time */}
        <div>
          <label htmlFor="end-hour" className="block text-sm font-medium text-gray-700">
            End Time
          </label>
          <div className="flex items-center gap-2 mt-1">
            {/* Hour */}
            <select
              id="end-hour"
              className="rounded-md border border-gray-300 p-1 focus:border-earth-500 focus:ring-earth-500"
              value={endHour !== null ? endHour : ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : Number(e.target.value);
                setEndHour(val);
              }}
            >
              <option value="">–</option>
              {hours.slice(1).map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>

            <span>:</span>

            {/* Minute */}
            <select
              id="end-minute"
              className="rounded-md border border-gray-300 p-1 focus:border-earth-500 focus:ring-earth-500"
              value={endMinute !== null ? endMinute : ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : Number(e.target.value);
                setEndMinute(val);
              }}
            >
              <option value="">–</option>
              {minutes.slice(1).map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, '0')}
                </option>
              ))}
            </select>

            {/* AM/PM */}
            <select
              id="end-ampm"
              className="rounded-md border border-gray-300 p-1 focus:border-earth-500 focus:ring-earth-500"
              value={endAmPm || ''}
              onChange={(e) => {
                const val = e.target.value === '' ? null : e.target.value;
                setEndAmPm(val);
              }}
            >
              <option value="">–</option>
              {ampmOptions.slice(1).map((ap) => (
                <option key={ap} value={ap}>
                  {ap}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Cost Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
            Cost
          </label>
          <input
            id="cost"
            type="text"
            placeholder="0.00"
            value={activity.cost || ''}
            onChange={(e) => onActivityChange({ ...activity, cost: e.target.value })}
            className={`mt-1 block w-full rounded-md border ${
              errors.cost ? 'border-red-500' : 'border-gray-300'
            } p-2 shadow-sm focus:border-earth-500 focus:ring-earth-500 sm:text-sm`}
          />
          {errors.cost && <p className="mt-1 text-sm text-red-500">{errors.cost}</p>}
        </div>

        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
            Currency
          </label>
          <select
            id="currency"
            value={activity.currency || 'USD'}
            onChange={(e) => onActivityChange({ ...activity, currency: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-earth-500 focus:ring-earth-500 sm:text-sm"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="JPY">JPY</option>
            <option value="CAD">CAD</option>
            <option value="AUD">AUD</option>
          </select>
        </div>
      </div>

      {errors.time && <p className="mt-1 text-sm text-red-500">{errors.time}</p>}

      {/* Buttons */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-earth-500"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-sand-500 hover:bg-sand-600 border-2 border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sand-500 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default ActivityForm;

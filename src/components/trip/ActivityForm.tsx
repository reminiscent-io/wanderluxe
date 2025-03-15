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

const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const ampmOptions = ['AM', 'PM'];

/** 
 * Converts a 12-hour time selection to a "HH:MM" 24-hour string.
 */
function to24HourString(h: number, m: number, ampm: string): string {
  let hour24 = h;
  if (ampm === 'PM' && h !== 12) hour24 += 12;
  if (ampm === 'AM' && h === 12) hour24 = 0;
  const hh = String(hour24).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** 
 * Parses a 24-hour "HH:MM" string into [hour, minute, ampm].
 * Returns defaults if the string is empty or invalid.
 */
function parse24HourString(timeStr?: string) {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) {
    // default to 12:00 AM
    return { hour: 12, minute: 0, ampm: 'AM' };
  }
  const [hh, mm] = timeStr.split(':').map(Number);
  let hour = hh;
  let ampm = 'AM';

  if (hh === 0) {
    hour = 12;
    ampm = 'AM';
  } else if (hh === 12) {
    hour = 12;
    ampm = 'PM';
  } else if (hh > 12) {
    hour = hh - 12;
    ampm = 'PM';
  }
  return { hour, minute: mm, ampm };
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

  // Local states for start time
  const [startHour, setStartHour] = useState<number>(12);
  const [startMinute, setStartMinute] = useState<number>(0);
  const [startAmPm, setStartAmPm] = useState<string>('AM');

  // Local states for end time
  const [endHour, setEndHour] = useState<number>(12);
  const [endMinute, setEndMinute] = useState<number>(0);
  const [endAmPm, setEndAmPm] = useState<string>('AM');

  // On mount or when activity changes, parse the start/end time into local states.
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

  // Whenever local time states change, update the activity
  useEffect(() => {
    const newStart = to24HourString(startHour, startMinute, startAmPm);
    onActivityChange({ ...activity, start_time: newStart });
  }, [startHour, startMinute, startAmPm]);

  useEffect(() => {
    const newEnd = to24HourString(endHour, endMinute, endAmPm);
    onActivityChange({ ...activity, end_time: newEnd });
  }, [endHour, endMinute, endAmPm]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!activity.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (activity.start_time && activity.end_time) {
      // Compare "HH:MM" strings directly might be tricky, but it works if they're zero-padded.
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
      await onSubmit(activity);
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
    onActivityChange({
      ...activity,
      cost: value
    });
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
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 p-2 focus:border-earth-500 focus:ring-earth-500 ${
            errors.title ? 'border-red-500' : ''
          }`}
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
          rows={2}
        />
      </div>

      {/* Time Fields */}
      <div className="grid grid-cols-2 gap-4">
        {/* Start Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Start Time</label>
          <div className="flex items-center gap-2 mt-1">
            <select
              className="rounded-md border border-gray-300 p-1 focus:border-earth-500 focus:ring-earth-500"
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
            >
              {hours.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span>:</span>
            <select
              className="rounded-md border border-gray-300 p-1 focus:border-earth-500 focus:ring-earth-500"
              value={startMinute}
              onChange={(e) => setStartMinute(Number(e.target.value))}
            >
              {minutes.map(m => (
                <option key={m} value={m}>
                  {m.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-gray-300 p-1 focus:border-earth-500 focus:ring-earth-500"
              value={startAmPm}
              onChange={(e) => setStartAmPm(e.target.value)}
            >
              {ampmOptions.map(ampm => (
                <option key={ampm} value={ampm}>{ampm}</option>
              ))}
            </select>
          </div>
        </div>

        {/* End Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700">End Time</label>
          <div className="flex items-center gap-2 mt-1">
            <select
              className="rounded-md border border-gray-300 p-1 focus:border-earth-500 focus:ring-earth-500"
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
            >
              {hours.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span>:</span>
            <select
              className="rounded-md border border-gray-300 p-1 focus:border-earth-500 focus:ring-earth-500"
              value={endMinute}
              onChange={(e) => setEndMinute(Number(e.target.value))}
            >
              {minutes.map(m => (
                <option key={m} value={m}>
                  {m.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-gray-300 p-1 focus:border-earth-500 focus:ring-earth-500"
              value={endAmPm}
              onChange={(e) => setEndAmPm(e.target.value)}
            >
              {ampmOptions.map(ampm => (
                <option key={ampm} value={ampm}>{ampm}</option>
              ))}
            </select>
          </div>
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
            value={activity.cost || ''}
            onChange={(e) => handleCostChange(e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border p-2 focus:border-earth-500 focus:ring-earth-500 ${
              errors.cost ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.cost && <p className="mt-1 text-xs text-red-500">{errors.cost}</p>}
        </div>
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
            Currency
          </label>
          <select
            id="currency"
            value={activity.currency}
            onChange={(e) => onActivityChange({ ...activity, currency: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-earth-500 focus:ring-earth-500 sm:text-sm"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
      </div>

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

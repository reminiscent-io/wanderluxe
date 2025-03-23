import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ActivityFormData } from '@/types/trip';
import { formatTimeForDisplay } from '@/utils/dateUtils';

// Define handleTimeInput function directly since the module is missing
const handleTimeInput = (value: string): string | null => {
  if (!value) return null;

  // Remove any non-digit or non-colon characters
  const cleanValue = value.replace(/[^\d:]/g, '');

  // Simple validation for HH:MM format
  const parts = cleanValue.split(':');
  if (parts.length === 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);

    if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  // Return the cleaned input if it doesn't match the format
  return cleanValue;
};

interface ActivityFormProps {
  activity: ActivityFormData;
  onActivityChange: (activity: ActivityFormData) => void;
  onSubmit: (activity: ActivityFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
  eventId: string;
}

const ActivityForm: React.FC<ActivityFormProps> = ({
  activity,
  onActivityChange,
  onSubmit,
  onCancel,
  submitLabel = 'Save Activity',
  eventId,
}) => {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset errors when activity changes
  useEffect(() => {
    setErrors({});
  }, [activity]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!activity.title.trim()) {
      newErrors.title = 'Title is required';
    }

    // Validate time format if provided
    if (activity.start_time && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(activity.start_time)) {
      newErrors.start_time = 'Please use format HH:MM (24h)';
    }

    if (activity.end_time && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(activity.end_time)) {
      newErrors.end_time = 'Please use format HH:MM (24h)';
    }

    // Check if end time is after start time if both are provided
    if (activity.start_time && activity.end_time) {
      const startParts = activity.start_time.split(':').map(Number);
      const endParts = activity.end_time.split(':').map(Number);

      if (startParts.length === 2 && endParts.length === 2) {
        const startMinutes = startParts[0] * 60 + startParts[1];
        const endMinutes = endParts[0] * 60 + endParts[1];

        if (endMinutes <= startMinutes) {
          newErrors.end_time = 'End time must be after start time';
        }
      }
    }

    // Validate cost if provided
    if (activity.cost && (isNaN(parseFloat(activity.cost)) || parseFloat(activity.cost) < 0)) {
      newErrors.cost = 'Cost must be a positive number';
    }

    // If currency is selected, cost is required
    if (activity.currency && !activity.cost) {
      newErrors.cost = 'Cost is required when currency is selected';
    }

    // If cost is provided, currency is required
    if (activity.cost && !activity.currency) {
      newErrors.currency = 'Currency is required when cost is provided';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
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
    <form id="activity-form" onSubmit={handleSubmit} className="space-y-6">
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
          rows={3}
          className="mt-1 block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 p-2 focus:border-earth-500 focus:ring-earth-500"
        />
      </div>

      {/* Time Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">
            Start Time
          </label>
          <input
            id="start_time"
            type="text"
            placeholder="HH:MM"
            value={formatTimeForDisplay(activity.start_time)}
            onChange={(e) => onActivityChange({ 
              ...activity, 
              start_time: handleTimeInput(e.target.value)
            })}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 p-2 focus:border-earth-500 focus:ring-earth-500 ${
              errors.start_time ? 'border-red-500' : ''
            }`}
          />
          {errors.start_time && <p className="mt-1 text-xs text-red-500">{errors.start_time}</p>}
        </div>
        <div>
          <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">
            End Time
          </label>
          <input
            id="end_time"
            type="text"
            placeholder="HH:MM"
            value={formatTimeForDisplay(activity.end_time)}
            onChange={(e) => onActivityChange({ 
              ...activity, 
              end_time: handleTimeInput(e.target.value)
            })}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 p-2 focus:border-earth-500 focus:ring-earth-500 ${
              errors.end_time ? 'border-red-500' : ''
            }`}
          />
          {errors.end_time && <p className="mt-1 text-xs text-red-500">{errors.end_time}</p>}
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
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={activity.cost || ''}
            onChange={(e) => handleCostChange(e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 p-2 focus:border-earth-500 focus:ring-earth-500 ${
              errors.cost ? 'border-red-500' : ''
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
            value={activity.currency || ''}
            onChange={(e) => onActivityChange({ ...activity, currency: e.target.value })}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 p-2 bg-white focus:border-earth-500 focus:ring-earth-500 ${
              errors.currency ? 'border-red-500' : ''
            }`}
          >
            <option value="">Select currency</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
            <option value="AUD">AUD</option>
            <option value="JPY">JPY</option>
            <option value="CHF">CHF</option>
          </select>
          {errors.currency && <p className="mt-1 text-xs text-red-500">{errors.currency}</p>}
        </div>
      </div>

      {/* Form Footer */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default ActivityForm;
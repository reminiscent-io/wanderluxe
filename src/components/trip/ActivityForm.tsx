
import { useState } from 'react';
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!activity.title.trim()) {
      newErrors.title = 'Title is required';
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title <span className="text-red-500">*</span></label>
        <input
          id="title"
          type="text"
          value={activity.title}
          onChange={(e) => onActivityChange({ ...activity, title: e.target.value })}
          className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border-2 py-4 px-6 ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          } focus:border-earth-500 focus:ring-earth-500`}
          required
        />
        {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
        <input
          id="description"
          type="text"
          value={activity.description || ''}
          onChange={(e) => onActivityChange({ ...activity, description: e.target.value })}
          className="mt-1 block w-full rounded-md border-2 border-gray-300 h-[1.5rem] px-6 shadow-sm focus:border-earth-500 focus:ring-earth-500 sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">Start Time</label>
          <input
            id="start_time"
            type="time"
            value={activity.start_time || ''}
            onChange={(e) => onActivityChange({ ...activity, start_time: e.target.value })}
            className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-earth-500 focus:ring-earth-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">End Time</label>
          <input
            id="end_time"
            type="time"
            value={activity.end_time || ''}
            onChange={(e) => onActivityChange({ ...activity, end_time: e.target.value })}
            className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-earth-500 focus:ring-earth-500 sm:text-sm"
          />
        </div>
        {errors.time && <p className="col-span-2 text-xs text-red-500">{errors.time}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="cost" className="block text-sm font-medium text-gray-700">Cost</label>
          <input
            id="cost"
            type="text"
            value={activity.cost || ''}
            onChange={(e) => handleCostChange(e.target.value)}
            className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm border-2 ${
              errors.cost ? 'border-red-500' : 'border-gray-300'
            } focus:border-earth-500 focus:ring-earth-500`}
          />
          {errors.cost && <p className="mt-1 text-xs text-red-500">{errors.cost}</p>}
        </div>
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700">Currency</label>
          <select
            id="currency"
            value={activity.currency}
            onChange={(e) => onActivityChange({ ...activity, currency: e.target.value })}
            className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-earth-500 focus:ring-earth-500 sm:text-sm"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
      </div>

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

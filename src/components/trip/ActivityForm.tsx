
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AccommodationFormData } from '@/services/accommodation/types';

// Props interface for the Activity Form
interface ActivityFormProps {
  activity: {
    title: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost: string;
    currency: string;
  };
  onActivityChange: (activity: ActivityFormProps['activity']) => void;
  onSubmit: (activity: ActivityFormProps['activity']) => void;
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(activity);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          value={activity.title}
          onChange={(e) => onActivityChange({ ...activity, title: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-earth-500 focus:ring-earth-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={activity.description || ''}
          onChange={(e) => onActivityChange({ ...activity, description: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-earth-500 focus:ring-earth-500 sm:text-sm"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Start Time</label>
          <input
            type="time"
            value={activity.start_time || ''}
            onChange={(e) => onActivityChange({ ...activity, start_time: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-earth-500 focus:ring-earth-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">End Time</label>
          <input
            type="time"
            value={activity.end_time || ''}
            onChange={(e) => onActivityChange({ ...activity, end_time: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-earth-500 focus:ring-earth-500 sm:text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Cost</label>
          <input
            type="number"
            value={activity.cost}
            onChange={(e) => onActivityChange({ ...activity, cost: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-earth-500 focus:ring-earth-500 sm:text-sm"
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Currency</label>
          <select
            value={activity.currency}
            onChange={(e) => onActivityChange({ ...activity, currency: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-earth-500 focus:ring-earth-500 sm:text-sm"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            {/* Add more currency options as needed */}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-earth-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-sand-500 hover:bg-sand-600 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sand-500"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
};

export default ActivityForm;

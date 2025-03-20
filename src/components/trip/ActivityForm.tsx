
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { TimeInput } from '@/components/ui/time-input';
import { DayActivity, ActivityFormData } from '@/types/trip';

interface ActivityFormProps {
  activity: ActivityFormData;
  onActivityChange: (activity: ActivityFormData) => void;
  onSubmit: (activity: ActivityFormData) => Promise<void>;
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
  eventId,
}) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(activity);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="title" className="block text-sm font-medium">
          Activity Title
        </label>
        <Input
          id="title"
          value={activity.title}
          onChange={(e) =>
            onActivityChange({ ...activity, title: e.target.value })
          }
          placeholder="Enter activity title"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="block text-sm font-medium">
          Description
        </label>
        <Textarea
          id="description"
          value={activity.description}
          onChange={(e) =>
            onActivityChange({ ...activity, description: e.target.value })
          }
          placeholder="Enter activity description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="start_time" className="block text-sm font-medium">
            Start Time
          </label>
          <TimeInput
            id="start_time"
            value={activity.start_time}
            onChange={(value) =>
              onActivityChange({ ...activity, start_time: value })
            }
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="end_time" className="block text-sm font-medium">
            End Time
          </label>
          <TimeInput
            id="end_time"
            value={activity.end_time}
            onChange={(value) =>
              onActivityChange({ ...activity, end_time: value })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="cost" className="block text-sm font-medium">
            Cost
          </label>
          <Input
            id="cost"
            type="number"
            value={activity.cost}
            onChange={(e) =>
              onActivityChange({ ...activity, cost: e.target.value })
            }
            placeholder="Enter cost"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="currency" className="block text-sm font-medium">
            Currency
          </label>
          <Input
            id="currency"
            value={activity.currency}
            onChange={(e) =>
              onActivityChange({ ...activity, currency: e.target.value })
            }
            placeholder="USD"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
};

export default ActivityForm;

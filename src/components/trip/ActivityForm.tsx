import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActivityFormProps {
  activity: {
    text: string;
    cost: string;
    currency: string;
  };
  onActivityChange: (activity: { text: string; cost: string; currency: string }) => void;
  onSubmit: () => void;
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
    
    if (!eventId) {
      toast.error('No event ID provided');
      return;
    }

    try {
      const { error } = await supabase
        .from('day_activities')  // Changed from activities to day_activities
        .insert([{
          day_id: eventId,  // Changed from event_id to day_id
          title: activity.text,  // Changed from text to title
          cost: activity.cost ? Number(activity.cost) : null,
          currency: activity.currency,
          order_index: 0  // Added required field
        }]);

      if (error) throw error;

      toast.success('Activity saved successfully');
      onSubmit();
    } catch (error) {
      console.error('Error saving activity:', error);
      toast.error('Failed to save activity');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="text">Activity</Label>
        <Input
          id="text"
          value={activity.text}
          onChange={(e) => onActivityChange({ ...activity, text: e.target.value })}
          placeholder="Enter activity details"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cost">Cost (optional)</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            value={activity.cost}
            onChange={(e) => onActivityChange({ ...activity, cost: e.target.value })}
            placeholder="Enter cost"
          />
        </div>

        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={activity.currency}
            onValueChange={(value) => onActivityChange({ ...activity, currency: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="JPY">JPY</SelectItem>
              <SelectItem value="AUD">AUD</SelectItem>
              <SelectItem value="CAD">CAD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-earth-500 hover:bg-earth-600 text-white">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default ActivityForm;
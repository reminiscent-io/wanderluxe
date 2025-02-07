import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActivityFormProps {
  activity: {
    title: string;      // Changed from text to match schema
    description?: string;  // Add this from schema
    start_time?: string;  // Add this from schema
    end_time?: string;    // Add this from schema
    cost: number;
    currency: string;
  };
  onActivityChange: (activity: { 
    title: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost: number;
    currency: string;
  }) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  eventId: string;  // This represents day_id in the schema
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
  .from('day_activities')
  .insert([{
    day_id: eventId,
    title: activity.title,  // Changed from text
    description: activity.description,  // Add this
    start_time: activity.start_time,    // Add this
    end_time: activity.end_time,        // Add this
    cost: activity.cost ? Number(activity.cost) : null,
    currency: activity.currency,
    order_index: 0,
    created_at: new Date().toISOString()  // Add this required field
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
        <Label htmlFor="title">Activity Title</Label>
        <Input
          id="title"
          value={activity.title}
          onChange={(e) => onActivityChange({ ...activity, title: e.target.value })}
          placeholder="Enter activity title"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={activity.description}
          onChange={(e) => onActivityChange({ ...activity, description: e.target.value })}
          placeholder="Enter activity description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_time">Start Time</Label>
          <Input
            id="start_time"
            type="time"
            value={activity.start_time}
            onChange={(e) => onActivityChange({ ...activity, start_time: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="end_time">End Time</Label>
          <Input
            id="end_time"
            type="time"
            value={activity.end_time}
            onChange={(e) => onActivityChange({ ...activity, end_time: e.target.value })}
          />
        </div>
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

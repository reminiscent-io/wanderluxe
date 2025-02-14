
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import DiningList from '../DiningList';
import { useQuery } from '@tanstack/react-query';
import { DayActivity } from '@/types/trip';
import ImageGenerationSection from './dialogs/ImageGenerationSection';
import DayActivitiesSection from './dialogs/DayActivitiesSection';

interface DayEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  dayId: string;
  currentTitle: string;
  date: string;
  activities: DayActivity[];
  formatTime: (time?: string) => string;
}

const DayEditDialog: React.FC<DayEditDialogProps> = ({
  isOpen,
  onOpenChange,
  dayId,
  currentTitle,
  date,
  activities,
  formatTime,
}) => {
  const [title, setTitle] = useState(currentTitle);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [localActivities, setLocalActivities] = useState<DayActivity[]>(activities);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);

  // Fetch restaurant reservations
  const { data: reservations = [] } = useQuery({
    queryKey: ['reservations', dayId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_reservations')
        .select('*')
        .eq('day_id', dayId)
        .order('order_index');

      if (error) {
        console.error('Error fetching reservations:', error);
        throw error;
      }
      return data;
    },
    enabled: !!dayId && isOpen,
  });

  // Get the trip_id from the first activity or fetch it from trip_days
  const { data: tripData } = useQuery({
    queryKey: ['trip_id', dayId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_days')
        .select('trip_id')
        .eq('day_id', dayId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!dayId,
  });

  const handleActivitySubmit = async (activity: any) => {
    try {
      if (!tripData?.trip_id) {
        throw new Error('Trip ID not found');
      }

      const newActivity = {
        day_id: dayId,
        trip_id: tripData.trip_id,
        title: activity.title,
        description: activity.description || null,
        start_time: activity.start_time || null,
        end_time: activity.end_time || null,
        cost: activity.cost ? Number(activity.cost) : null,
        currency: activity.currency || 'USD',
        order_index: localActivities.length,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('day_activities')
        .insert([newActivity])
        .select()
        .single();

      if (error) throw error;

      setLocalActivities(prev => [...prev, data]);
      setIsAddingActivity(false);
      toast.success('Activity added successfully');
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to add activity');
    }
  };

  const handleUpdateActivity = async (activity: any) => {
    if (!editingActivityId || !tripData?.trip_id) return;

    try {
      const updateData = {
        title: activity.title,
        description: activity.description || null,
        start_time: activity.start_time || null,
        end_time: activity.end_time || null,
        cost: activity.cost ? Number(activity.cost) : null,
        currency: activity.currency || 'USD',
        trip_id: tripData.trip_id
      };

      const { error } = await supabase
        .from('day_activities')
        .update(updateData)
        .eq('id', editingActivityId);

      if (error) throw error;

      setLocalActivities(prev =>
        prev.map(act =>
          act.id === editingActivityId
            ? { ...act, ...updateData }
            : act
        )
      );
      setEditingActivityId(null);
      toast.success('Activity updated successfully');
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error('Failed to update activity');
    }
  };

  const handleSave = async () => {
    try {
      const updateData: { title: string; image_url?: string } = { title };
      if (selectedImage) updateData.image_url = selectedImage;

      const { error } = await supabase
        .from('trip_days')
        .update(updateData)
        .eq('day_id', dayId);

      if (error) throw error;

      toast.success('Day updated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating day:', error);
      toast.error('Failed to update day');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Day Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Day Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter day title"
            />
          </div>

          <ImageGenerationSection
            onImageSelect={setSelectedImage}
            selectedImage={selectedImage}
          />

          <DayActivitiesSection
            activities={localActivities}
            isAddingActivity={isAddingActivity}
            setIsAddingActivity={setIsAddingActivity}
            editingActivityId={editingActivityId}
            setEditingActivityId={setEditingActivityId}
            onAddActivity={handleActivitySubmit}
            onUpdateActivity={handleUpdateActivity}
            formatTime={formatTime}
            dayId={dayId}
          />

          <div>
            <DiningList
              reservations={reservations}
              formatTime={formatTime}
              dayId={dayId}
              onAddReservation={() => {}}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-sand-500 hover:bg-sand-600 text-white">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DayEditDialog;

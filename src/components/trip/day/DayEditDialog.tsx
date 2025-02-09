import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ActivitiesList from '../ActivitiesList';
import DiningList from '../DiningList';
import ActivityForm from '../ActivityForm';
import { useQuery } from '@tanstack/react-query';
import { DayActivity } from '@/types/trip';
import { Plus } from 'lucide-react'; // Assumed import


interface DayEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  dayId: string;
  currentTitle: string;
  date: string;
  activities: Array<{
    id: string;
    title: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost?: number;
    currency?: string;
  }>;
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
  const [imagePrompt, setImagePrompt] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [localActivities, setLocalActivities] = useState(activities);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [isAddingActivity, setIsAddingActivity] = useState(false);

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

  // Initialize empty activity for the form
  const emptyActivity = {
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD'
  };

  const handleGenerateImages = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Please enter a prompt first');
      return;
    }

    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('generate-image', {
        body: { keywords: imagePrompt }
      });

      if (error) {
        console.error('Error generating images:', error);
        throw error;
      }

      if (!response?.images?.length) {
        toast.error('No images found for this prompt');
        return;
      }

      setImages(response.images.map((img: any) => img.url));
    } catch (error) {
      console.error('Error generating images:', error);
      toast.error('Failed to generate images');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddActivity = () => {
    setIsAddingActivity(true);
  };

  const handleActivitySubmit = async (activity: typeof emptyActivity) => {
    try {
      const { data, error } = await supabase
        .from('day_activities')
        .insert([{
          day_id: dayId,
          title: activity.title,
          description: activity.description,
          start_time: activity.start_time,
          end_time: activity.end_time,
          cost: activity.cost ? Number(activity.cost) : null,
          currency: activity.currency,
          order_index: localActivities.length,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setLocalActivities([...localActivities, data]);
      setIsAddingActivity(false);
      toast.success('Activity added successfully');
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to add activity');
    }
  };

  const handleEditActivity = (id: string) => {
    setEditingActivityId(id);
  };

  const handleUpdateActivity = async (activity: typeof emptyActivity) => {
    if (!editingActivityId) return;

    try {
      const { error } = await supabase
        .from('day_activities')
        .update({
          title: activity.title,
          description: activity.description,
          start_time: activity.start_time,
          end_time: activity.end_time,
          cost: activity.cost ? Number(activity.cost) : null,
          currency: activity.currency
        })
        .eq('id', editingActivityId);

      if (error) throw error;

      setLocalActivities(prev =>
        prev.map(act =>
          act.id === editingActivityId
            ? { ...act, ...activity, cost: activity.cost ? Number(activity.cost) : null }
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

  // Find the activity being edited
  const activityBeingEdited = editingActivityId
    ? localActivities.find(act => act.id === editingActivityId)
    : null;

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

          <div>
            <label className="text-sm font-medium mb-2 block">Generate Image</label>
            <div className="flex gap-2">
              <Input
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Where will you be today?"
              />
              <Button
                onClick={handleGenerateImages}
                disabled={isLoading || !imagePrompt.trim()}
              >
                {isLoading ? (
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ImageIcon className="h-4 w-4 mr-2" />
                )}
                Generate
              </Button>
            </div>
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((image, index) => (
                <div
                  key={index}
                  className={`relative aspect-video cursor-pointer rounded-lg overflow-hidden ${
                    selectedImage === image ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedImage(image)}
                >
                  <img
                    src={image}
                    alt={`Option ${index + 1}`}
                    className="object-cover w-full h-full"
                  />
                </div>
              ))}
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-base font-semibold text-earth-700">Activities</h4>
              <Button
                onClick={handleAddActivity}
                variant="ghost"
                size="sm"
                className="text-earth-600 hover:text-earth-700 hover:bg-earth-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </div>

            {/* Activity Form Dialog */}
            <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Activity</DialogTitle>
                </DialogHeader>
                <ActivityForm
                  activity={emptyActivity}
                  onActivityChange={() => { }}
                  onSubmit={handleActivitySubmit}
                  onCancel={() => setIsAddingActivity(false)}
                  submitLabel="Add Activity"
                  eventId={dayId}
                />
              </DialogContent>
            </Dialog>

            {/* Edit Activity Dialog */}
            <Dialog open={!!editingActivityId} onOpenChange={() => setEditingActivityId(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Activity</DialogTitle>
                </DialogHeader>
                {activityBeingEdited && (
                  <ActivityForm
                    activity={{
                      title: activityBeingEdited.title,
                      description: activityBeingEdited.description || '',
                      start_time: activityBeingEdited.start_time || '',
                      end_time: activityBeingEdited.end_time || '',
                      cost: activityBeingEdited.cost?.toString() || '',
                      currency: activityBeingEdited.currency || 'USD'
                    }}
                    onActivityChange={() => { }}
                    onSubmit={handleUpdateActivity}
                    onCancel={() => setEditingActivityId(null)}
                    submitLabel="Update Activity"
                    eventId={dayId}
                  />
                )}
              </DialogContent>
            </Dialog>

            {/* Activities List */}
            <div className="space-y-2">
              {localActivities.sort((a, b) => {
                const timeA = a.start_time || '';
                const timeB = b.start_time || '';
                if (timeA === '' && timeB === '') return 0;
                if (timeA === '') return 1;
                if (timeB === '') return -1;
                return new Date(timeA).getTime() - new Date(timeB).getTime();
              }).map((activity) => (
                <div
                  key={activity.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{activity.title}</h4>
                    {activity.start_time && (
                      <p className="text-sm text-gray-500">
                        {formatTime(activity.start_time)}
                        {activity.end_time && ` - ${formatTime(activity.end_time)}`}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditActivity(activity.id)}
                  >
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <DiningList
              reservations={reservations}
              onAddReservation={() => { }}
              formatTime={formatTime}
              dayId={dayId}
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
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import HotelInfo from './HotelInfo';
import ActivitiesList from './ActivitiesList';
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ActivityForm from './ActivityForm';

interface DayCardProps {
  id: string;
  date: string;
  title?: string;
  description?: string;
  activities: Array<{
    id: string;
    title: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost?: number;
    currency?: string;
  }>;
  onAddActivity: () => void;
  index: number;
  hotelDetails?: {
    name: string;
    details: string;
    imageUrl?: string;
  };
  onDelete: (id: string) => void;
}

const DayCard: React.FC<DayCardProps> = ({
  id,
  date,
  title,
  activities,
  index,
  hotelDetails,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title || '');
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState({ text: "", cost: "", currency: "USD" });
  const [activityEdit, setActivityEdit] = useState({ text: "", cost: "", currency: "USD" });

  const formatTime = (time?: string) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const handleUpdateTitle = async () => {
    try {
      const { error } = await supabase
        .from('trip_days')
        .update({ title: editTitle })
        .eq('id', id);

      if (error) throw error;
      toast.success('Day title updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating day title:', error);
      toast.error('Failed to update day title');
    }
  };

  const handleDeleteDay = async () => {
    try {
      const { error } = await supabase
        .from('trip_days')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Day deleted successfully');
      onDelete(id);
    } catch (error) {
      console.error('Error deleting day:', error);
      toast.error('Failed to delete day');
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.text.trim()) return;

    try {
      const { data, error } = await supabase
        .from('day_activities')
        .insert([{
          day_id: id,
          title: newActivity.text.trim(),
          cost: newActivity.cost ? Number(newActivity.cost) : null,
          currency: newActivity.currency,
          order_index: activities.length
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Activity added successfully');
      setIsAddingActivity(false);
      setNewActivity({ text: "", cost: "", currency: "USD" });
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to add activity');
    }
  };

  const handleEditActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('day_activities')
        .update({
          title: activityEdit.text,
          cost: activityEdit.cost ? Number(activityEdit.cost) : null,
          currency: activityEdit.currency
        })
        .eq('id', activityId);

      if (error) throw error;

      toast.success('Activity updated successfully');
      setEditingActivity(null);
      setActivityEdit({ text: "", cost: "", currency: "USD" });
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error('Failed to update activity');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="space-y-4"
    >
      <div className="text-center text-sm font-medium text-earth-500 mb-2">
        {new Date(date).toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </div>

      <Card className="overflow-hidden relative">
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/80 hover:bg-white/90"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-white/80 hover:bg-white/90 hover:text-red-500"
            onClick={handleDeleteDay}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid md:grid-cols-2 h-full">
          <div className="h-64 md:h-full">
            <img
              src="https://images.unsplash.com/photo-1533606688076-b6683a5f59f1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3270&q=80"
              alt="Positano coastal view"
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-semibold mb-2">
                  Day {index + 1}{title && `: ${title}`}
                </h3>
              </div>

              {hotelDetails && (
                <HotelInfo
                  name={hotelDetails.name}
                  details={hotelDetails.details}
                />
              )}

              <ActivitiesList
                activities={activities}
                onAddActivity={() => setIsAddingActivity(true)}
                onEditActivity={(id) => {
                  const activity = activities.find(a => a.id === id);
                  if (activity) {
                    setActivityEdit({
                      text: activity.title,
                      cost: activity.cost?.toString() || "",
                      currency: activity.currency || "USD"
                    });
                    setEditingActivity(id);
                  }
                }}
                formatTime={formatTime}
              />
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Day Title</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Enter day title"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTitle}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Activity</DialogTitle>
          </DialogHeader>
          <ActivityForm
            activity={newActivity}
            onActivityChange={setNewActivity}
            onSubmit={handleAddActivity}
            onCancel={() => setIsAddingActivity(false)}
            submitLabel="Add Activity"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingActivity} onOpenChange={() => setEditingActivity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
          </DialogHeader>
          <ActivityForm
            activity={activityEdit}
            onActivityChange={setActivityEdit}
            onSubmit={() => editingActivity && handleEditActivity(editingActivity)}
            onCancel={() => setEditingActivity(null)}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default DayCard;
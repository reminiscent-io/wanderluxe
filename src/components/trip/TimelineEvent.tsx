import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import EventImage from './event/EventImage';
import EventContent from './event/EventContent';
import EventEditDialog from './event/EventEditDialog';

interface TimelineEventProps {
  id: string;
  date: string;
  title: string;
  description: string;
  image: string;
  hotel: string;
  hotel_details: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
  hotel_url: string;
  activities: { id: string; text: string; cost?: number; currency?: string }[];
  index: number;
  onEdit: (id: string, data: any) => void;
  onDelete: (id: string) => void;
}

const TimelineEvent: React.FC<TimelineEventProps> = ({ 
  id,
  date, 
  title, 
  description, 
  image, 
  hotel, 
  hotel_details,
  hotel_checkin_date,
  hotel_checkout_date,
  hotel_url,
  activities,
  index,
  onEdit,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    date,
    title,
    description,
    hotel,
    hotel_details,
    hotel_checkin_date,
    hotel_checkout_date,
    hotel_url,
    expense_type: "",
    expense_cost: "",
    expense_currency: "USD",
  });
  const [newActivity, setNewActivity] = useState({ text: "", cost: "", currency: "USD" });
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [activityEdit, setActivityEdit] = useState({ text: "", cost: "", currency: "USD" });

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    onEdit(id, {
      ...editData,
      expense_cost: editData.expense_cost ? Number(editData.expense_cost) : null,
    });
    setIsEditing(false);
  };

  const handleAddActivity = async () => {
    if (!newActivity.text.trim()) return;

    try {
      const { data, error } = await supabase
        .from('activities')
        .insert([{
          event_id: id,
          text: newActivity.text.trim(),
          cost: newActivity.cost ? Number(newActivity.cost) : null,
          currency: newActivity.currency
        }])
        .select()
        .single();

      if (error) throw error;

      onEdit(id, {
        ...editData,
        activities: [...activities, data]
      });

      setNewActivity({ text: "", cost: "", currency: "USD" });
      setIsAddingActivity(false);
      toast.success("Activity added successfully");
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error("Failed to add activity");
    }
  };

  const handleEditActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({
          text: activityEdit.text,
          cost: activityEdit.cost ? Number(activityEdit.cost) : null,
          currency: activityEdit.currency
        })
        .eq('id', activityId);

      if (error) throw error;

      onEdit(id, {
        ...editData,
        activities: activities.map(a => 
          a.id === activityId 
            ? { 
                ...a, 
                text: activityEdit.text,
                cost: activityEdit.cost ? Number(activityEdit.cost) : null,
                currency: activityEdit.currency
              }
            : a
        )
      });

      setEditingActivity(null);
      toast.success("Activity updated successfully");
    } catch (error) {
      console.error('Error updating activity:', error);
      toast.error("Failed to update activity");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.2 }}
      viewport={{ once: true }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="grid md:grid-cols-2 gap-4">
            <EventImage title={title} imageUrl={image} />
            <EventContent
              date={date}
              title={title}
              description={description}
              hotel={hotel}
              hotelDetails={hotel_details}
              hotelUrl={hotel_url}
              hotelCheckinDate={hotel_checkin_date}
              hotelCheckoutDate={hotel_checkout_date}
              activities={activities}
              onEdit={() => setIsEditing(true)}
              isAddingActivity={isAddingActivity}
              onAddingActivityChange={setIsAddingActivity}
              newActivity={newActivity}
              onNewActivityChange={setNewActivity}
              handleAddActivity={handleAddActivity}
              editingActivity={editingActivity}
              onEditingActivityChange={setEditingActivity}
              activityEdit={activityEdit}
              onActivityEditChange={setActivityEdit}
              handleEditActivity={handleEditActivity}
            />
          </div>
        </CardContent>
      </Card>

      <EventEditDialog
        isOpen={isEditing}
        onOpenChange={setIsEditing}
        editData={editData}
        onEditDataChange={setEditData}
        onSubmit={handleEdit}
      />
    </motion.div>
  );
};

export default TimelineEvent;
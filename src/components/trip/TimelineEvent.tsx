import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import EventHeader from './event/EventHeader';
import EventAccommodation from './event/EventAccommodation';
import EventActivitiesList from './event/EventActivitiesList';
import EventEditDialog from './event/EventEditDialog';

interface TimelineEventProps {
  id: string;
  date: string;
  title: string;
  description: string;
  image: string;
  hotel: string;
  hotelDetails: string;
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
  hotelDetails,
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
    hotelDetails,
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

  const getImageUrl = () => {
    if (title.toLowerCase().includes('naples')) {
      return "https://images.unsplash.com/photo-1516483638261-f4dbaf036963"; 
    } else if (title.toLowerCase().includes('positano')) {
      return "https://images.unsplash.com/photo-1533606688076-b6683a5f59f1"; 
    }
    return image;
  };

  const isCheckoutDay = hotel && hotel_checkout_date === date;

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
            <div className="h-64 md:h-auto">
              <img 
                src={getImageUrl()} 
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 flex flex-col justify-between">
              <div>
                <EventHeader
                  date={date}
                  title={title}
                  onEdit={() => setIsEditing(true)}
                />
                
                <p className="text-gray-600 mb-4">{description}</p>
                
                {(hotel && date >= hotel_checkin_date && date < hotel_checkout_date) && (
                  <EventAccommodation
                    hotel={hotel}
                    hotelDetails={hotelDetails}
                    hotelUrl={hotel_url}
                  />
                )}
                
                <EventActivitiesList
                  activities={activities}
                  isCheckoutDay={isCheckoutDay}
                  hotel={hotel}
                  onAddActivity={() => setIsAddingActivity(true)}
                  onEditActivity={(activity) => {
                    setEditingActivity(activity.id);
                    setActivityEdit({
                      text: activity.text,
                      cost: activity.cost?.toString() || "",
                      currency: activity.currency || "USD"
                    });
                  }}
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
            </div>
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
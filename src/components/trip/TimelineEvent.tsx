import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Pencil, Plus, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ActivityForm from './ActivityForm';
import EventEditForm from './EventEditForm';

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

const TimelineEvent = ({ 
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
}: TimelineEventProps) => {
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
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-sm font-semibold text-earth-500 mb-2">
                      {date}
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{title}</h3>
                  </div>
                  <Dialog open={isEditing} onOpenChange={setIsEditing}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Event</DialogTitle>
                      </DialogHeader>
                      <EventEditForm
                        editData={editData}
                        onEditDataChange={setEditData}
                        onSubmit={handleEdit}
                        onCancel={() => setIsEditing(false)}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
                <p className="text-gray-600 mb-4">{description}</p>
                
                {(hotel && date >= hotel_checkin_date && date < hotel_checkout_date) && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-earth-500">Accommodation</h4>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{hotel}</p>
                      {hotel_url && (
                        <a 
                          href={hotel_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-earth-500 hover:text-earth-600"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{hotelDetails}</p>
                  </div>
                )}
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-earth-500">Activities</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsAddingActivity(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Activity
                    </Button>
                  </div>
                  
                  {isCheckoutDay && (
                    <div className="text-sm text-gray-400 p-2 bg-gray-50 rounded-md mb-2">
                      Check-out of {hotel}
                    </div>
                  )}

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

                  <ul className="space-y-2">
                    {activities.map((activity) => (
                      <li 
                        key={activity.id} 
                        className="flex justify-between items-center text-sm text-gray-600 p-2 hover:bg-gray-50 rounded-md"
                      >
                        {editingActivity === activity.id ? (
                          <Dialog open={true} onOpenChange={() => setEditingActivity(null)}>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Activity</DialogTitle>
                              </DialogHeader>
                              <ActivityForm
                                activity={activityEdit}
                                onActivityChange={setActivityEdit}
                                onSubmit={() => handleEditActivity(activity.id)}
                                onCancel={() => setEditingActivity(null)}
                                submitLabel="Save Changes"
                              />
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <>
                            <div>
                              <span>{activity.text}</span>
                              {activity.cost && (
                                <span className="ml-2 text-earth-500">
                                  {activity.cost} {activity.currency}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingActivity(activity.id);
                                setActivityEdit({
                                  text: activity.text,
                                  cost: activity.cost?.toString() || "",
                                  currency: activity.currency || "USD"
                                });
                              }}
                            >
                              <Pencil className="h-4 w-4 text-earth-500" />
                            </Button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TimelineEvent;

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Pencil, Trash2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TimelineEventProps {
  id: string;
  date: string;
  title: string;
  description: string;
  image: string;
  hotel: string;
  hotelDetails: string;
  activities: { id: string; text: string }[];
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
  });
  const [newActivity, setNewActivity] = useState("");
  const [isAddingActivity, setIsAddingActivity] = useState(false);

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    onEdit(id, editData);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      onDelete(id);
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.trim()) return;

    try {
      const { data, error } = await supabase
        .from('activities')
        .insert([
          { event_id: id, text: newActivity.trim() }
        ])
        .select()
        .single();

      if (error) throw error;

      // Update the local state through the parent component
      onEdit(id, {
        ...editData,
        activities: [...activities, data]
      });

      setNewActivity("");
      setIsAddingActivity(false);
      toast.success("Activity added successfully");
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error("Failed to add activity");
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;

      // Update the local state through the parent component
      onEdit(id, {
        ...editData,
        activities: activities.filter(a => a.id !== activityId)
      });

      toast.success("Activity deleted successfully");
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error("Failed to delete activity");
    }
  };

  // Determine the correct image URL based on the title
  const getImageUrl = () => {
    if (title.toLowerCase().includes('naples')) {
      return "https://images.unsplash.com/photo-1516483638261-f4dbaf036963"; // Naples cityscape
    } else if (title.toLowerCase().includes('positano')) {
      return "https://images.unsplash.com/photo-1533606688076-b6683a5f59f1"; // Classic Positano view
    }
    return image;
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
                  <div className="flex gap-2">
                    <Dialog open={isEditing} onOpenChange={setIsEditing}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Event</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleEdit} className="space-y-4">
                          <div>
                            <Label htmlFor="date">Date</Label>
                            <Input
                              id="date"
                              value={editData.date}
                              onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="title">Title</Label>
                            <Input
                              id="title"
                              value={editData.title}
                              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={editData.description}
                              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="hotel">Hotel</Label>
                            <Input
                              id="hotel"
                              value={editData.hotel}
                              onChange={(e) => setEditData({ ...editData, hotel: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="hotelDetails">Hotel Details</Label>
                            <Textarea
                              id="hotelDetails"
                              value={editData.hotelDetails}
                              onChange={(e) => setEditData({ ...editData, hotelDetails: e.target.value })}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                              Cancel
                            </Button>
                            <Button type="submit">Save Changes</Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" size="icon" onClick={handleDelete}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">{description}</p>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-earth-500">Accommodation</h4>
                  <p className="font-medium">{hotel}</p>
                  <p className="text-sm text-gray-600">{hotelDetails}</p>
                </div>
                
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
                  
                  <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Activity</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="activity">Activity Description</Label>
                          <Input
                            id="activity"
                            value={newActivity}
                            onChange={(e) => setNewActivity(e.target.value)}
                            placeholder="Enter activity description"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsAddingActivity(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="button"
                            onClick={handleAddActivity}
                          >
                            Add Activity
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <ul className="space-y-2">
                    {activities.map((activity) => (
                      <li 
                        key={activity.id} 
                        className="flex justify-between items-center text-sm text-gray-600"
                      >
                        <span>{activity.text}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteActivity(activity.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
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
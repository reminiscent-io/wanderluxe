import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Pencil, Plus } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimelineEventProps {
  id: string;
  date: string;
  title: string;
  description: string;
  image: string;
  hotel: string;
  hotelDetails: string;
  activities: { id: string; text: string; cost?: number; currency?: string }[];
  index: number;
  onEdit: (id: string, data: any) => void;
  onDelete: (id: string) => void;
}

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD"];

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
    accommodation_cost: "",
    accommodation_currency: "USD",
    transportation_cost: "",
    transportation_currency: "USD",
  });
  const [newActivity, setNewActivity] = useState({ text: "", cost: "", currency: "USD" });
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [activityEdit, setActivityEdit] = useState({ text: "", cost: "", currency: "USD" });

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    onEdit(id, {
      ...editData,
      accommodation_cost: editData.accommodation_cost ? Number(editData.accommodation_cost) : null,
      transportation_cost: editData.transportation_cost ? Number(editData.transportation_cost) : null,
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

      // Update the local state through the parent component
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
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="accommodation_cost">Accommodation Cost</Label>
                            <Input
                              id="accommodation_cost"
                              type="number"
                              step="0.01"
                              value={editData.accommodation_cost}
                              onChange={(e) => setEditData({ ...editData, accommodation_cost: e.target.value })}
                              placeholder="Enter cost"
                            />
                          </div>
                          <div>
                            <Label htmlFor="accommodation_currency">Currency</Label>
                            <Select
                              value={editData.accommodation_currency}
                              onValueChange={(value) => setEditData({ ...editData, accommodation_currency: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                              <SelectContent>
                                {CURRENCIES.map((currency) => (
                                  <SelectItem key={currency} value={currency}>
                                    {currency}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="transportation_cost">Transportation Cost</Label>
                            <Input
                              id="transportation_cost"
                              type="number"
                              step="0.01"
                              value={editData.transportation_cost}
                              onChange={(e) => setEditData({ ...editData, transportation_cost: e.target.value })}
                              placeholder="Enter cost"
                            />
                          </div>
                          <div>
                            <Label htmlFor="transportation_currency">Currency</Label>
                            <Select
                              value={editData.transportation_currency}
                              onValueChange={(value) => setEditData({ ...editData, transportation_currency: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                              <SelectContent>
                                {CURRENCIES.map((currency) => (
                                  <SelectItem key={currency} value={currency}>
                                    {currency}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
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
                            value={newActivity.text}
                            onChange={(e) => setNewActivity({ ...newActivity, text: e.target.value })}
                            placeholder="Enter activity description"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="cost">Cost</Label>
                            <Input
                              id="cost"
                              type="number"
                              step="0.01"
                              value={newActivity.cost}
                              onChange={(e) => setNewActivity({ ...newActivity, cost: e.target.value })}
                              placeholder="Enter cost"
                            />
                          </div>
                          <div>
                            <Label htmlFor="currency">Currency</Label>
                            <Select
                              value={newActivity.currency}
                              onValueChange={(value) => setNewActivity({ ...newActivity, currency: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                              <SelectContent>
                                {CURRENCIES.map((currency) => (
                                  <SelectItem key={currency} value={currency}>
                                    {currency}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
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
                        className="flex justify-between items-center text-sm text-gray-600 p-2 hover:bg-gray-50 rounded-md"
                      >
                        {editingActivity === activity.id ? (
                          <Dialog open={true} onOpenChange={() => setEditingActivity(null)}>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Activity</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="edit-activity">Activity Description</Label>
                                  <Input
                                    id="edit-activity"
                                    value={activityEdit.text}
                                    onChange={(e) => setActivityEdit({ ...activityEdit, text: e.target.value })}
                                    placeholder="Enter activity description"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor="edit-cost">Cost</Label>
                                    <Input
                                      id="edit-cost"
                                      type="number"
                                      step="0.01"
                                      value={activityEdit.cost}
                                      onChange={(e) => setActivityEdit({ ...activityEdit, cost: e.target.value })}
                                      placeholder="Enter cost"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-currency">Currency</Label>
                                    <Select
                                      value={activityEdit.currency}
                                      onValueChange={(value) => setActivityEdit({ ...activityEdit, currency: value })}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select currency" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {CURRENCIES.map((currency) => (
                                          <SelectItem key={currency} value={currency}>
                                            {currency}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setEditingActivity(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    type="button"
                                    onClick={() => handleEditActivity(activity.id)}
                                  >
                                    Save Changes
                                  </Button>
                                </div>
                              </div>
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
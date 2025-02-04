import { useState } from 'react';
import { Tables } from '@/integrations/supabase/types';

type TransportationEvent = Tables<'transportation_events'>;

export const useEventState = (
  date: string,
  title: string,
  description: string,
  hotel: string,
  hotel_details: string,
  hotel_checkin_date: string,
  hotel_checkout_date: string,
  hotel_url: string
) => {
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

  return {
    isEditing,
    setIsEditing,
    editData,
    setEditData,
    newActivity,
    setNewActivity,
    isAddingActivity,
    setIsAddingActivity,
    editingActivity,
    setEditingActivity,
    activityEdit,
    setActivityEdit,
  };
};
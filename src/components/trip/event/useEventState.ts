
import { useState } from 'react';
import { ActivityData } from '@/types/trip';

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

  // Updated to match the new ActivityData interface which uses 'title' instead of 'text'
  const [newActivity, setNewActivity] = useState<ActivityData>({
    title: "",
    cost: "",
    currency: "USD"
  });

  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [activityEdit, setActivityEdit] = useState<ActivityData>({
    title: "",
    cost: "",
    currency: "USD"
  });

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

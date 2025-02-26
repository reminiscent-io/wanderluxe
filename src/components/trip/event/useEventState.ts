
import { useState } from 'react';
import { ActivityFormData } from '@/types/trip';

interface EventStateParams {
  date: string;
  title: string;
  description: string;
  hotel: string;
  hotelDetails: string;
  hotelCheckinDate: string;
  hotelCheckoutDate: string;
  hotelUrl: string;
}

export const useEventState = ({
  date,
  title,
  description,
  hotel,
  hotelDetails,
  hotelCheckinDate,
  hotelCheckoutDate,
  hotelUrl
}: EventStateParams) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    date,
    title,
    description,
    hotel,
    hotel_details: hotelDetails,
    hotel_checkin_date: hotelCheckinDate,
    hotel_checkout_date: hotelCheckoutDate,
    hotel_url: hotelUrl,
    expense_type: "",
    expense_cost: "",
    expense_currency: "USD",
  });

  // Using ActivityFormData type for form state
  const [newActivity, setNewActivity] = useState<ActivityFormData>({
    title: "",
    cost: "",
    currency: "USD"
  });

  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [activityEdit, setActivityEdit] = useState<ActivityFormData>({
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

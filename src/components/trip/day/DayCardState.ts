
import { useState } from 'react';

interface ActivityData {
  title: string;
  description?: string;  // Optional
  start_time?: string;  // Made optional to match usage
  end_time?: string;    // Made optional to match usage
  cost: string;
  currency: string;
}

export const useDayCardState = (title: string = '') => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState<ActivityData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD'
  });
  const [activityEdit, setActivityEdit] = useState<ActivityData>({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    cost: '',
    currency: 'USD'
  });

  return {
    isEditing,
    setIsEditing,
    editTitle,
    setEditTitle,
    isAddingActivity,
    setIsAddingActivity,
    editingActivity,
    setEditingActivity,
    newActivity,
    setNewActivity,
    activityEdit,
    setActivityEdit,
  };
};

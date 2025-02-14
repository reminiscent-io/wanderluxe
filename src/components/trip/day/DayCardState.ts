
import { useState } from 'react';

export const useDayCardState = (initialTitle: string = '') => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(initialTitle);
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState({ title: "", cost: "", currency: "USD" });
  const [activityEdit, setActivityEdit] = useState({ title: "", cost: "", currency: "USD" });

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

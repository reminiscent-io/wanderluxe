const handleEditSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (editingActivity && typeof onEditActivity === 'function') {
      console.log("Submitting edit for activity:", editingActivity);
      onEditActivity(editingActivity);
      setEditingActivity(null);
    } else {
      console.error("Cannot submit edit: missing activity ID or handler");
    }
  };
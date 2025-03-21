import React, { useCallback, useState } from 'react';
import { DayActivity, HotelStay } from '@/types/trip';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { formatToTime } from '@/utils/dateUtils';
import { activityService } from '@/services/activity/activityService';
import DayCardContent from './DayCardContent';
import { toast } from 'sonner';
import DayEditDialog from './DayEditDialog';
import DayImage from './DayImage';
import { motion } from 'framer-motion';

interface DayCardProps {
  index: number;
  id: string;
  eventId: string;
  title: string;
  date: string;
  activities: DayActivity[];
  onTitleChange: (title: string) => void;
  onImageChange: (imageUrl: string) => void;
  imageUrl?: string | null;
  defaultImageUrl?: string;
  accommodations: any[] | HotelStay[];
}

const DayCard: React.FC<DayCardProps> = ({
  index,
  id,
  eventId,
  title,
  date,
  activities,
  onTitleChange,
  onImageChange,
  imageUrl,
  defaultImageUrl,
  accommodations,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [selectedImage, setSelectedImage] = useState<string | null>(imageUrl || null);

  // Format time to a more readable format
  const formatTime = useCallback((time?: string) => {
    if (!time || time.trim() === '') return '';
    return formatToTime(time);
  }, []);

  // Add a new activity to this day
  const handleAddActivity = async (activity: any) => {
    try {
      await activityService.addActivity({
        ...activity,
        day_id: id,
        event_id: eventId,
      });
      toast.success('Activity added successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('Error adding activity:', error);
      toast.error('Failed to add activity');
      return Promise.reject(error);
    }
  };

  // Edit an existing activity
  const handleEditActivity = (activity: DayActivity) => {
    // Just pass the activity to the editor dialog
    console.log('Activity item clicked:', activity);
  };

  // Handle the save of the day title and image
  const handleSave = useCallback(
    async (newTitle: string, newImage: string | null) => {
      try {
        onTitleChange(newTitle);
        if (newImage) {
          onImageChange(newImage);
        }
        setIsEditing(false);
      } catch (error) {
        console.error('Error saving day changes:', error);
        toast.error('Failed to save changes');
      }
    },
    [onTitleChange, onImageChange]
  );

  // Find the accommodation for this day, if any
  const findAccommodationForDay = () => {
    if (!accommodations || accommodations.length === 0) return null;

    // Find an accommodation where the day's date falls between check-in and check-out dates
    return accommodations.find(accommodation => {
      if (!accommodation.hotel_checkin_date || !accommodation.hotel_checkout_date) return false;

      // Check if this day's date is within the accommodation stay dates
      return date >= accommodation.hotel_checkin_date && date <= accommodation.hotel_checkout_date;
    }) || null;
  };

  const dayAccommodation = findAccommodationForDay();
  console.log(`DayCard for date ${date}:`, { dayAccommodation, allAccommodations: accommodations });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.4, 0, 0.2, 1], 
      }}
      className="w-full"
    >
      <Card className="overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 bg-white">
        <DayImage 
          dayId={id} 
          title={title} 
          imageUrl={imageUrl || null} 
          defaultImageUrl={defaultImageUrl}
        />

        <CardHeader className="flex flex-row items-center justify-between p-4 pb-0">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button 
            onClick={() => setIsEditing(true)} 
            variant="outline" 
            size="sm" 
            className="h-8 w-8 p-0"
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
        </CardHeader>

        <DayCardContent
          index={index}
          title={title}
          activities={activities}
          onAddActivity={handleAddActivity}
          onEditActivity={handleEditActivity}
          formatTime={formatTime}
          dayId={id}
          eventId={eventId}
          date={date}
          accommodation={dayAccommodation}
        />
      </Card>

      <DayEditDialog
        isOpen={isEditing}
        onOpenChange={setIsEditing}
        title={editTitle}
        setTitle={setEditTitle}
        selectedImage={selectedImage}
        setSelectedImage={setSelectedImage}
        onTitleChange={onTitleChange}
        onSave={(title) => handleSave(title, selectedImage)}
      />
    </motion.div>
  );
};

export default DayCard;
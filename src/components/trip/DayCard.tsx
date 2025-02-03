import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock, DollarSign, Hotel, Pencil } from "lucide-react";
import { motion } from "framer-motion";

interface DayCardProps {
  date: string;
  title?: string;
  description?: string;
  activities: Array<{
    id: string;
    title: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cost?: number;
    currency?: string;
  }>;
  onAddActivity: () => void;
  index: number;
  hotelDetails?: {
    name: string;
    details: string;
    imageUrl?: string;
  };
}

const DayCard: React.FC<DayCardProps> = ({
  date,
  title,
  description,
  activities,
  onAddActivity,
  index,
  hotelDetails
}) => {
  const formatTime = (time?: string) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getImageUrl = () => {
    if (hotelDetails?.imageUrl) return hotelDetails.imageUrl;
    
    // Default city/location images based on hotel name or details
    if (hotelDetails?.name.toLowerCase().includes('naples')) {
      return "https://images.unsplash.com/photo-1516483638261-f4dbaf036963";
    } else if (hotelDetails?.name.toLowerCase().includes('positano')) {
      return "https://images.unsplash.com/photo-1533606688076-b6683a5f59f1";
    }
    // Default image for when no specific location is matched
    return "https://images.unsplash.com/photo-1496307653780-42ee777d4833";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="space-y-4"
    >
      <div className="text-center text-sm font-semibold text-earth-500">
        {new Date(date).toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-3 h-full">
          <div className="h-48 md:h-full">
            <img
              src={getImageUrl()}
              alt={hotelDetails?.name || "Location"}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="col-span-2">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Day {index + 1}{title && `: ${title}`}</h3>
                  {description && <p className="text-gray-600 mb-4">{description}</p>}
                </div>

                {hotelDetails && (
                  <div className="p-4 bg-sand-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Hotel className="h-5 w-5 text-earth-500" />
                      <h4 className="font-semibold">{hotelDetails.name}</h4>
                    </div>
                    <p className="text-sm text-gray-600">{hotelDetails.details}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-earth-500">Activities</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onAddActivity}
                      className="text-earth-500"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Activity
                    </Button>
                  </div>

                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-4 bg-sand-50 rounded-lg space-y-2 group relative"
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold">{activity.title}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Pencil className="h-4 w-4 text-earth-500" />
                        </Button>
                      </div>
                      {activity.description && (
                        <p className="text-sm text-gray-600">{activity.description}</p>
                      )}
                      <div className="flex gap-4 text-sm text-gray-500">
                        {(activity.start_time || activity.end_time) && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>
                              {activity.start_time && formatTime(activity.start_time)}
                              {activity.end_time && ` - ${formatTime(activity.end_time)}`}
                            </span>
                          </div>
                        )}
                        {activity.cost && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span>
                              {activity.cost} {activity.currency || 'USD'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default DayCard;
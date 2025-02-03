import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Clock, DollarSign } from "lucide-react";
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
}

const DayCard: React.FC<DayCardProps> = ({
  date,
  title,
  description,
  activities,
  onAddActivity,
  index
}) => {
  const formatTime = (time?: string) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="mb-4">
            <div className="text-sm font-semibold text-earth-500 mb-2">
              {new Date(date).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            {title && <h3 className="text-2xl font-bold mb-2">{title}</h3>}
            {description && <p className="text-gray-600 mb-4">{description}</p>}
          </div>

          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="p-4 bg-sand-50 rounded-lg space-y-2"
              >
                <h4 className="font-semibold">{activity.title}</h4>
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

            <Button
              variant="outline"
              className="w-full"
              onClick={onAddActivity}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DayCard;
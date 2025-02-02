import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

interface Activity {
  id: number;
  text: string;
}

interface TimelineEventProps {
  date: string;
  title: string;
  description: string;
  image: string;
  hotel: string;
  hotelDetails: string;
  activities: string[];
  index: number;
}

const TimelineEvent = ({ date, title, description, image, hotel, hotelDetails, activities, index }: TimelineEventProps) => {
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
                src={image} 
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 flex flex-col justify-between">
              <div>
                <div className="text-sm font-semibold text-earth-500 mb-2">
                  {date}
                </div>
                <h3 className="text-2xl font-bold mb-2">{title}</h3>
                <p className="text-gray-600 mb-4">{description}</p>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-earth-500">Accommodation</h4>
                  <p className="font-medium">{hotel}</p>
                  <p className="text-sm text-gray-600">{hotelDetails}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-earth-500">Activities</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {activities.map((activity, i) => (
                      <li key={i}>{activity}</li>
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
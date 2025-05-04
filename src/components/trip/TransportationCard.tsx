
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Car, Plane, LogOut } from "lucide-react";

interface TransportationCardProps {
  type: "car" | "plane" | "hotel-checkout";
  details: string;
  duration: string;
  index: number;
}

const TransportationCard = ({ type, details, duration, index }: TransportationCardProps) => {
  // Extract icon selection logic to a more readable format
  const getIcon = () => {
    switch (type) {
      case "car":
        return Car;
      case "plane":
        return Plane;
      default:
        return LogOut;
    }
  };
  
  const Icon = getIcon();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.2 }}
      viewport={{ once: true }}
      className="my-4"
    >
      <Card className={`max-w-md mx-auto ${type === 'hotel-checkout' ? 'bg-gray-50' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Icon className="h-6 w-6 text-earth-500" />
            <div>
              <p className="font-medium">{details}</p>
              {duration && <p className="text-sm text-gray-600">Duration: {duration}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TransportationCard;

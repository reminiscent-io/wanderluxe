
import React from 'react';
import { Button } from "@/components/ui/button";
import { Utensils, MapPin, Phone, Link as LinkIcon, Star, Clock, Users, Edit, Trash2 } from "lucide-react";

interface RestaurantCardProps {
  reservation: {
    id: string;
    restaurant_name: string;
    address?: string;
    phone_number?: string;
    website?: string;
    rating?: number;
    reservation_time?: string;
    number_of_people?: number;
    cost?: number;
    currency?: string;
    notes?: string;
  };
  formatTime: (time?: string) => string;
  onEdit: (reservation: any) => void;
  onDelete: () => void;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  reservation,
  formatTime,
  onEdit,
  onDelete
}) => {
  return (
    <div className="p-4 bg-sand-50 rounded-lg space-y-3 hover:bg-sand-100 transition-colors">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h5 className="font-medium flex items-center gap-2">
            <Utensils className="h-4 w-4 text-earth-500" />
            {reservation.restaurant_name}
            {reservation.rating && (
              <span className="flex items-center text-sm text-earth-400">
                <Star className="h-4 w-4 fill-earth-400 mr-1" />
                {reservation.rating}
              </span>
            )}
          </h5>
          
          {reservation.address && (
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-earth-400" />
              {reservation.address}
            </p>
          )}
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {reservation.phone_number && (
              <a 
                href={`tel:${reservation.phone_number}`}
                className="flex items-center gap-1 hover:text-earth-500"
              >
                <Phone className="h-4 w-4" />
                {reservation.phone_number}
              </a>
            )}
            
            {reservation.website && (
              <a 
                href={reservation.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-earth-500"
              >
                <LinkIcon className="h-4 w-4" />
                Website
              </a>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(reservation)}
            className="text-earth-500"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-600 border-t border-sand-200 pt-2">
        {reservation.reservation_time && (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-earth-400" />
            <span>{formatTime(reservation.reservation_time)}</span>
          </div>
        )}
        
        {reservation.number_of_people && (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-earth-400" />
            <span>{reservation.number_of_people} people</span>
          </div>
        )}
        
        {reservation.cost && (
          <div className="flex items-center gap-1">
            <span className="font-medium">
              {reservation.cost} {reservation.currency || 'USD'}
            </span>
          </div>
        )}
      </div>

      {reservation.notes && (
        <p className="text-sm text-gray-600 border-t border-sand-200 pt-2">
          {reservation.notes}
        </p>
      )}
    </div>
  );
};

export default RestaurantCard;

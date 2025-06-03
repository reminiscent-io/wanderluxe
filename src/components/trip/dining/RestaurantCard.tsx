
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

// Reusable component for links with icons
const IconLink: React.FC<{
  href: string;
  icon: React.ReactNode;
  text: string;
  className?: string;
}> = ({ href, icon, text, className = "" }) => (
  <a 
    href={href}
    target={href.startsWith('tel:') ? undefined : "_blank"}
    rel={href.startsWith('tel:') ? undefined : "noopener noreferrer"}
    className={`flex items-center gap-1 hover:text-earth-500 ${className}`}
  >
    {icon}
    {text}
  </a>
);

// Reusable component for info items with icons
const InfoItem: React.FC<{
  icon: React.ReactNode;
  text: string | number;
  className?: string;
}> = ({ icon, text, className = "" }) => (
  <div className={`flex items-center gap-1 ${className}`}>
    {icon}
    <span>{text}</span>
  </div>
);

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  reservation,
  formatTime,
  onEdit,
  onDelete
}) => {
  return (
    <div className="p-3 bg-sand-50 rounded-lg space-y-2 hover:bg-sand-100 transition-colors">
      {/* Header section */}
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
            <InfoItem
              icon={<MapPin className="h-4 w-4 text-earth-400" />}
              text={reservation.address}
              className="text-sm text-gray-600"
            />
          )}
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {reservation.phone_number && (
              <IconLink
                href={`tel:${reservation.phone_number}`}
                icon={<Phone className="h-4 w-4" />}
                text={reservation.phone_number}
              />
            )}
            
            {reservation.website && (
              <IconLink
                href={reservation.website}
                icon={<LinkIcon className="h-4 w-4" />}
                text="Website"
              />
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

      {/* Details section */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600 border-t border-sand-200 pt-2">
        {reservation.reservation_time && (
          <InfoItem
            icon={<Clock className="h-4 w-4 text-earth-400" />}
            text={formatTime(reservation.reservation_time)}
          />
        )}
        
        {reservation.number_of_people && (
          <InfoItem
            icon={<Users className="h-4 w-4 text-earth-400" />}
            text={`${reservation.number_of_people} people`}
          />
        )}
        
        {reservation.cost && (
          <InfoItem
            icon={null}
            text={`${reservation.cost} ${reservation.currency || 'USD'}`}
            className="font-medium"
          />
        )}
      </div>

      {/* Notes section */}
      {reservation.notes && (
        <p className="text-sm text-gray-600 border-t border-sand-200 pt-2">
          {reservation.notes}
        </p>
      )}
    </div>
  );
};

export default RestaurantCard;

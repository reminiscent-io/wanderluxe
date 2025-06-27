import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  X,
  Plus,
  Edit,
  Calendar,
  MapPin,
  DollarSign,
  Phone,
  Globe,
  Car,
  Plane,
  Train,
  Building
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Trip, Transportation } from '@/types/trip';
import { useTransportationEvents } from '@/hooks/use-transportation-events';

interface SecondarySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: string | null;
  tripId?: string;
  displayData: Trip;
}

export default function SecondarySidebar({ 
  isOpen, 
  onClose, 
  activeSection, 
  tripId, 
  displayData 
}: SecondarySidebarProps) {
  const { transportations } = useTransportationEvents(tripId || '');

  const renderTripDatesContent = () => (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-earth-700">Trip Dates</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-earth-600" />
            <span className="font-medium text-sand-700">Arrival Date</span>
          </div>
          <p className="text-earth-600">
            {displayData?.arrival_date ? new Date(displayData.arrival_date).toLocaleDateString() : 'Not set'}
          </p>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-earth-600" />
            <span className="font-medium text-sand-700">Departure Date</span>
          </div>
          <p className="text-earth-600">
            {displayData?.departure_date ? new Date(displayData.departure_date).toLocaleDateString() : 'Not set'}
          </p>
        </div>
        
        <Button className="w-full bg-earth-600 hover:bg-earth-700">
          <Edit className="h-4 w-4 mr-2" />
          Edit Trip Dates
        </Button>
      </div>
    </div>
  );

  const renderAccommodationsContent = () => (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-earth-700">Accommodations</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-4">
        <Button className="w-full bg-earth-600 hover:bg-earth-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Accommodation
        </Button>
        
        <Separator />
        
        {displayData?.accommodations && displayData.accommodations.length > 0 ? (
          <div className="space-y-3">
            {displayData.accommodations.map((accommodation, index) => (
              <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-earth-600">{accommodation.hotel}</h4>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="space-y-2 text-sm text-sand-600">
                  {accommodation.hotel_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{accommodation.hotel_address}</span>
                    </div>
                  )}
                  
                  {accommodation.hotel_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      <span>{accommodation.hotel_phone}</span>
                    </div>
                  )}
                  
                  {accommodation.cost && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3 w-3 flex-shrink-0" />
                      <span>{accommodation.cost} {accommodation.currency}</span>
                    </div>
                  )}
                  
                  {accommodation.hotel_website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3 flex-shrink-0" />
                      <a 
                        href={accommodation.hotel_website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-earth-600 hover:underline"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-sand-600">
            <Building className="h-8 w-8 mx-auto mb-2 text-sand-400" />
            <p>No accommodations added yet</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTransportationContent = () => {
    const getTransportIcon = (type: string) => {
      switch (type.toLowerCase()) {
        case 'flight':
          return <Plane className="h-3 w-3 flex-shrink-0" />;
        case 'train':
          return <Train className="h-3 w-3 flex-shrink-0" />;
        default:
          return <Car className="h-3 w-3 flex-shrink-0" />;
      }
    };

    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-earth-700">Transportation</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <Button className="w-full bg-earth-600 hover:bg-earth-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Transportation
          </Button>
          
          <Separator />
          
          {transportations && transportations.length > 0 ? (
            <div className="space-y-3">
              {transportations.map((transport, index) => (
                <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getTransportIcon(transport.type)}
                      <h4 className="font-medium text-earth-600">
                        {transport.type.charAt(0).toUpperCase() + transport.type.slice(1)}
                      </h4>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2 text-sm text-sand-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span>
                        {transport.departure_location || 'Not specified'} → {transport.arrival_location || 'Not specified'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span>{new Date(transport.start_date).toLocaleDateString()}</span>
                    </div>
                    
                    {transport.provider && (
                      <div className="flex items-center gap-2">
                        <Building className="h-3 w-3 flex-shrink-0" />
                        <span>{transport.provider}</span>
                      </div>
                    )}
                    
                    {transport.cost && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3 flex-shrink-0" />
                        <span>{transport.cost} {transport.currency}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sand-600">
              <Car className="h-8 w-8 mx-auto mb-2 text-sand-400" />
              <p>No transportation added yet</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'trip-dates':
        return renderTripDatesContent();
      case 'accommodations':
        return renderAccommodationsContent();
      case 'transportation':
        return renderTransportationContent();
      default:
        return null;
    }
  };

  if (!isOpen || !activeSection) {
    return null;
  }

  return (
    <aside
      className={cn(
        "fixed top-0 right-0 h-screen w-[320px] bg-sand-50 shadow-lg ring-1 ring-sand-200/40 transition-transform z-[200]",
        "translate-x-0"
      )}
    >
      <ScrollArea className="h-full">
        {renderContent()}
      </ScrollArea>
    </aside>
  );
}
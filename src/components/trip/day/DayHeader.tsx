import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import DayImage from "./DayImage";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, ChevronDown } from "lucide-react";

interface DayHeaderProps {
  title: string;
  date: string;
  isOpen?: boolean;
  onEdit: () => void;
  onToggle?: () => void;
  dayId: string;
  imageUrl?: string | null;
  defaultImageUrl?: string;
}

const DayHeader: React.FC<DayHeaderProps> = ({
  title,
  date,
  isOpen = false,
  onEdit,
  onToggle,
  dayId,
  imageUrl,
  defaultImageUrl,
}) => {
  const [imagePosition, setImagePosition] = useState<string>("center 50%");
  
  // Load image position from localStorage when component mounts
  useEffect(() => {
    // First check if there's a position in localStorage
    const savedPosition = localStorage.getItem(`day_image_position_${dayId}`);
    if (savedPosition) {
      console.log(`DayHeader: Using position from localStorage for day ${dayId}:`, savedPosition);
      setImagePosition(savedPosition);

      // Force reflow to ensure the position is applied
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 20);
    } else {
      // If not in localStorage, get it from the database
      const fetchImagePosition = async () => {
        try {
          const { data, error } = await supabase
            .from('trip_days')
            .select('image_position')
            .eq('day_id', dayId)
            .single();
            
          if (!error && data && data.image_position) {
            console.log(`DayHeader: Using position from DB for day ${dayId}:`, data.image_position);
            setImagePosition(data.image_position);
            
            // Also save to localStorage for future quick access
            localStorage.setItem(`day_image_position_${dayId}`, data.image_position);
            
            // Force reflow to ensure the position is applied
            setTimeout(() => {
              window.dispatchEvent(new Event('resize'));
            }, 20);
          }
        } catch (err) {
          console.error('Error loading image position from DB:', err);
        }
      };
      
      fetchImagePosition();
    }
  }, [dayId]);
  
  // Safely format the date
  let formattedDate = "Invalid date";
  try {
    formattedDate = format(parseISO(date), "EEEE, MMMM d");
  } catch (err) {
    console.warn("Invalid date prop in DayHeader:", date);
  }

  return (
    <div className="relative w-full h-48 md:h-64 overflow-hidden">
      {/* Toggle Button: wrapping the image and overlay */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onToggle?.();
        }}
        className="w-full h-full cursor-pointer select-none relative overflow-hidden"
      >
        <DayImage
          dayId={dayId}
          title={title}
          imageUrl={imageUrl}
          defaultImageUrl={defaultImageUrl}
          className="w-full h-full object-cover"
          objectPosition={imagePosition}
        />
        <div
          className={cn(
            "absolute bottom-0 left-0 w-full px-4 py-3 flex items-center justify-between",
            "bg-gray-800/30 backdrop-blur-sm hover:bg-gray-800/50 transition-colors"
          )}
        >
          {/* Left side: edit button, date & title */}
          <div className="flex items-center gap-2 text-white">
            {/* Edit Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // Prevents toggle button from triggering
                onEdit();
              }}
              className="h-8 w-8 text-white hover:bg-white/20 flex items-center justify-center rounded"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <span className="text-lg font-medium">{formattedDate}</span>
          </div>
          {/* Right side: chevron only */}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200 text-white",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>
    </div>
  );
};

export default DayHeader;

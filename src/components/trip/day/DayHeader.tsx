import React from "react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import DayImage from "./DayImage";
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
  // Safely format the date
  let formattedDate = "Invalid date";
  try {
    formattedDate = format(parseISO(date), "EEEE, MMMM d");
  } catch (err) {
    console.warn("Invalid date prop in DayHeader:", date);
  }

  return (
    <div className="relative w-full">
      {/* 
        Mobile-only image at the top 
        (No overlay button on the image itself).
      */}
      <div className="md:hidden">
        <DayImage
          dayId={dayId}
          title={title}
          imageUrl={imageUrl}
          defaultImageUrl={defaultImageUrl}
          className="w-full h-48 object-cover"
        />
      </div>

      {/* 
        The partially transparent "grey" header bar
        (clickable to expand/collapse the day).
      */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggle?.()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && onToggle) {
            e.preventDefault();
            onToggle();
          }
        }}
        className={cn(
          "flex items-center justify-between px-4 py-3 cursor-pointer",
          "bg-gray-800/30 backdrop-blur-sm hover:bg-gray-800/50",
          "transition-colors"
        )}
      >
        {/* Left side: date & title */}
        <div className="flex flex-col gap-1 text-white">
          <span className="text-lg font-medium">{formattedDate}</span>  
        </div>

        {/* Right side: edit button & chevron */}
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Edit button on the grey header (visible on mobile & desktop) */}
          <button
            onClick={onEdit}
            className="h-8 w-8 text-white hover:bg-white/20 flex items-center justify-center rounded"
          >
            <Pencil className="h-4 w-4" />
          </button>

          {/* Collapse arrow */}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200 text-white",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default DayHeader;

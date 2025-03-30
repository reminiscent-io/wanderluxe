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
    // Attach the onClick on the outer container so the whole header is clickable
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle?.();
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onToggle) {
          e.preventDefault();
          onToggle();
        }
      }}
      className="relative w-full cursor-pointer select-none"
    >
      {/* Render the image */}
      <DayImage
        dayId={dayId}
        title={title}
        imageUrl={imageUrl}
        defaultImageUrl={defaultImageUrl}
        className="w-full h-full object-cover"
      />

      {/* Blurred overlay bar at the bottom */}
      <div
        className={cn(
          "absolute bottom-0 left-0 w-full px-4 py-3 flex items-center justify-between",
          "bg-gray-800/30 backdrop-blur-sm hover:bg-gray-800/50 transition-colors"
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
          <button
            onClick={onEdit}
            className="h-8 w-8 text-white hover:bg-white/20 flex items-center justify-center rounded"
          >
            <Pencil className="h-4 w-4" />
          </button>
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
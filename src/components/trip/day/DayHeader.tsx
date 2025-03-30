import React from "react";
import { format, parseISO } from "date-fns";
import { Pencil, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DayImage from "./DayImage";

interface DayHeaderProps {
  title: string;
  date: string;
  isOpen?: boolean;
  onEdit: () => void;
  onToggle?: () => void;
  // NEW: add these props so we can show the image on mobile
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
  // new props
  dayId,
  imageUrl,
  defaultImageUrl
}) => {
  const formattedDate = format(parseISO(date), "EEEE, MMMM d");

  return (
    <div className="relative">
      {/* 
        MOBILE IMAGE: only visible on small screens.
        If you want a certain height, adjust "h-48" or 
        add your own classes. 
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

      {/* Existing clickable header area */}
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
        className="w-full px-4 py-3 flex items-center justify-between 
                   bg-black/20 backdrop-blur-sm hover:bg-black/30 
                   transition-colors cursor-pointer"
      >
        <div className="flex flex-col gap-2">
          <span className="text-lg font-medium text-white">{formattedDate}</span>
          <h3 className="font-medium text-base text-white">{title}</h3>
        </div>

        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
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

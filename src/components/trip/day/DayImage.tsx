
import React from "react";
import { format, parseISO } from "date-fns";
import { Pencil, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DayHeaderProps {
  title: string;
  date?: string;
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
  const formattedDate = date ? format(parseISO(date), "EEEE, MMMM d") : null;

  return (
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
      className="relative w-full cursor-pointer"
    >
      <img
        src={imageUrl || defaultImageUrl}
        alt={title}
        className="w-full h-48 md:h-64 object-cover"
      />

      <div
        className={cn(
          "absolute inset-0 flex items-start justify-between px-4 py-3",
          "bg-black/30 hover:bg-black/40 transition-colors"
        )}
      >
        <div className="flex flex-col gap-1 text-white">
          {formattedDate && <span className="text-lg font-medium">{formattedDate}</span>}
          <h3 className="text-base font-medium">{title}</h3>
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

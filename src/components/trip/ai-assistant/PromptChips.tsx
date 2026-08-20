import React from 'react';
import { Button } from '@/components/ui/button';
import { CalendarClock, Utensils, Backpack, MapPin, Car } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PromptChip } from '@/types/ai-assistant';

interface PromptChipsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

const DEFAULT_PROMPTS: PromptChip[] = [
  {
    id: 'restaurants',
    label: 'Restaurant ideas',
    prompt: 'Where should I eat near my hotel tonight?',
    icon: 'utensils'
  },
  {
    id: 'packing',
    label: 'Packing tips',
    prompt: "What should I pack based on the activities I've planned?",
    icon: 'backpack'
  },
  {
    id: 'day-trip',
    label: 'Day trip ideas',
    prompt: 'Suggest day trips I could add to this itinerary.',
    icon: 'map'
  },
  {
    id: 'transport',
    label: 'Getting around',
    prompt: "What's the best way to get around between my activities?",
    icon: 'car'
  }
];

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'calendar':
      return CalendarClock;
    case 'utensils':
      return Utensils;
    case 'backpack':
      return Backpack;
    case 'map':
      return MapPin;
    case 'car':
      return Car;
    default:
      return CalendarClock;
  }
};

const PromptChips: React.FC<PromptChipsProps> = ({ onSelect, disabled = false }) => {
  return (
    // Mobile: single horizontal scroll rail with snap, signaling more content
    // beyond the viewport edge. sm+: wrap and center as before.
    <div
      className={cn(
        'w-full -mx-4 px-4 sm:mx-0 sm:px-0',
        'flex gap-2 overflow-x-auto snap-x snap-mandatory',
        'sm:flex-wrap sm:justify-center sm:overflow-visible',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      )}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {DEFAULT_PROMPTS.map((chip) => {
        const Icon = getIcon(chip.icon || 'calendar');
        return (
          <Button
            key={chip.id}
            variant="outline"
            size="sm"
            onClick={() => onSelect(chip.prompt)}
            disabled={disabled}
            className="h-9 px-4 text-[13px] tracking-tight bg-background border-border text-earth-600 hover:bg-sand-50 hover:border-earth-300 hover:text-foreground rounded-full transition-colors flex-shrink-0 snap-start"
          >
            <Icon className="w-3.5 h-3.5 mr-1.5" />
            {chip.label}
          </Button>
        );
      })}
    </div>
  );
};

export default PromptChips;

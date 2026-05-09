import React from 'react';
import { Button } from '@/components/ui/button';
import { CalendarClock, Utensils, Backpack, MapPin, Car } from 'lucide-react';
import type { PromptChip } from '@/types/ai-assistant';

interface PromptChipsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

const DEFAULT_PROMPTS: PromptChip[] = [
  {
    id: 'optimize',
    label: 'Optimize schedule',
    prompt: "Can you help me optimize today's schedule to minimize travel time between activities?",
    icon: 'calendar'
  },
  {
    id: 'restaurants',
    label: 'Restaurant ideas',
    prompt: 'What are some great restaurant recommendations near my hotel for dinner tonight?',
    icon: 'utensils'
  },
  {
    id: 'packing',
    label: 'Packing tips',
    prompt: "What should I pack for this trip based on the destination and activities I've planned?",
    icon: 'backpack'
  },
  {
    id: 'day-trip',
    label: 'Day trip ideas',
    prompt: 'What are some interesting day trip options from my destination that I could add to my itinerary?',
    icon: 'map'
  },
  {
    id: 'transport',
    label: 'Getting around',
    prompt: "What's the best way to get around between my planned activities? Should I use public transit, taxi, or walking?",
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
    <div className="flex flex-wrap justify-center gap-2 w-full">
      {DEFAULT_PROMPTS.map((chip) => {
        const Icon = getIcon(chip.icon || 'calendar');
        return (
          <Button
            key={chip.id}
            variant="outline"
            size="sm"
            onClick={() => onSelect(chip.prompt)}
            disabled={disabled}
            className="h-8 px-3.5 text-[13px] tracking-tight bg-background border-border text-earth-600 hover:bg-sand-50 hover:border-earth-300 hover:text-foreground rounded-full transition-colors"
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

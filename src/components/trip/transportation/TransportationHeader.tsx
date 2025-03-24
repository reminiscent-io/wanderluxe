
import { Button } from "@/components/ui/button";
import { Plane, Plus } from "lucide-react";

interface TransportationHeaderProps {
  isExpanded: boolean;
  onToggle: () => void;
}

const TransportationHeader = ({ isExpanded, onToggle }: TransportationHeaderProps) => {
  return (
    <Button
      onClick={onToggle}
      variant="ghost"
      className="w-full justify-between p-6 hover:bg-sand-100 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Plane className="h-5 w-5" />
        <span className="text-lg font-medium">Transportation</span>
      </div>
      <Plus className="h-5 w-5" />
    </Button>
  );
};

export default TransportationHeader;
import React from 'react';
import { Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TransportationHeaderProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export const TransportationHeader: React.FC<TransportationHeaderProps> = ({
  isExpanded,
  onToggle,
}) => {
  return (
    <div className="border-b border-gray-200">
      <Button
        variant="ghost"
        onClick={onToggle}
        className="w-full flex justify-between items-center p-4 hover:bg-sand-100"
      >
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-earth-600" />
          <span className="text-lg font-semibold">Transportation</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
};

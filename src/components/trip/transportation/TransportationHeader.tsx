import React from 'react';
import { Button } from '@/components/ui/button';
import { Car, Plus } from 'lucide-react';

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
        className="w-full flex justify-between items-center p-6 hover:bg-sand-100"
      >
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-earth-600" />
          <span className="text-lg font-medium">Transportation</span>
        </div>
        {/* plain Plus icon, same in both states */}
        <Plus className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default TransportationHeader;

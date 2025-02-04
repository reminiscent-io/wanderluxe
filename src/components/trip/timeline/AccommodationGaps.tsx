import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface AccommodationGapsProps {
  gaps: Array<{
    startDate: string;
    endDate: string;
  }>;
  onAddAccommodation: (dates: { startDate: string; endDate: string }) => void;
}

const AccommodationGaps: React.FC<AccommodationGapsProps> = ({
  gaps,
  onAddAccommodation,
}) => {
  if (gaps.length === 0) return null;

  return (
    <div className="space-y-4 mt-8">
      <h3 className="text-lg font-semibold text-earth-500">Missing Accommodations</h3>
      <div className="space-y-2">
        {gaps.map((gap, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 bg-sand-50 rounded-lg"
          >
            <div>
              <p className="text-sm text-earth-500">
                {new Date(gap.startDate).toLocaleDateString()} -{' '}
                {new Date(gap.endDate).toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddAccommodation({ startDate: gap.startDate, endDate: gap.endDate })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Accommodation
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccommodationGaps;
import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface Gap {
  startDate: string;
  endDate: string;
}

interface AccommodationGapsProps {
  gaps: Gap[];
}

const AccommodationGaps: React.FC<AccommodationGapsProps> = ({ gaps }) => {
  if (gaps.length === 0) return null;

  return (
    <div className="space-y-4">
      {gaps.map((gap, index) => (
        <Alert key={index} variant="destructive" className="bg-orange-50 border-orange-200">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-700">
            No accommodation planned between {new Date(gap.startDate).toLocaleDateString()} and{' '}
            {new Date(gap.endDate).toLocaleDateString()}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};

export default AccommodationGaps;
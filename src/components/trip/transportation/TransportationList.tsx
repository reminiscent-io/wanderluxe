import React from 'react';
import TransportationListItem from './TransportationListItem';
import { Card } from '@/components/ui/card';

interface TransportationListProps {
  transportations: any[]; // Replace with your transportation type
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const TransportationList: React.FC<TransportationListProps> = ({
  transportations,
  onEdit,
  onDelete
}) => {
  if (!transportations || transportations.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No transportation added yet.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {transportations.map((transportation, index) =>
        transportation && transportation.id ? (
          <TransportationListItem 
            key={transportation.id} 
            transportation={transportation}
            onEdit={() => onEdit(transportation.id)}
            onDelete={() => onDelete(transportation.id)}
          />
        ) : (
          <Card key={`incomplete-${index}`} className="p-4 bg-white">
            <p className="text-gray-500">Transportation data is incomplete.</p>
          </Card>
        )
      )}

    </div>
  );
};

export default TransportationList;

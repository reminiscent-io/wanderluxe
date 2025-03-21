
import React from 'react';
import TransportationListItem from './TransportationListItem';

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
  if (transportations.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No transportation added yet.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {transportations.map((transportation) => (
        <TransportationListItem 
          key={transportation.id} 
          transportation={transportation}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default TransportationList;

import React from 'react';

interface HotelInfoProps {
  name: string;
  details?: string;
}

const HotelInfo: React.FC<HotelInfoProps> = ({ name, details }) => {
  return (
    <div>
      <h4 className="text-sm font-medium text-earth-500 mb-2">Accommodation</h4>
      <p className="text-lg font-medium">{name}</p>
      {details && (
        <p className="text-sm text-gray-600 mt-1">{details}</p>
      )}
    </div>
  );
};

export default HotelInfo;
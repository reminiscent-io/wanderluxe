import React from 'react';
import { HotelStay, Transportation } from '@/types/trip';
import { Bed, Plane, Train, Car, MapPin, Calendar } from 'lucide-react';
import { formatDate, formatToTime } from '@/utils/dateUtils';

interface TripSummaryPanelProps {
  accommodations: HotelStay[];
  transportation: Transportation[];
}

const TripSummaryPanel: React.FC<TripSummaryPanelProps> = ({
  accommodations,
  transportation,
}) => {
  // Sort accommodations by check-in date
  const sortedAccommodations = [...accommodations].sort((a, b) =>
    new Date(a.hotel_checkin_date).getTime() - new Date(b.hotel_checkin_date).getTime()
  );

  // Sort transportation by start date
  const sortedTransportation = [...transportation].sort((a, b) =>
    new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  const getTransportIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('flight') || lowerType.includes('plane')) return Plane;
    if (lowerType.includes('train')) return Train;
    if (lowerType.includes('car') || lowerType.includes('rental')) return Car;
    return MapPin;
  };

  return (
    <div
      className="hidden md:block md:w-1/3 md:sticky md:top-0 md:overflow-y-auto bg-sand-50 border-r border-sand-200 p-4"
      style={{ height: "calc(var(--app-height, 1vh) * 100)" }}
    >
      <div className="space-y-6">
        {/* Accommodations Section */}
        {sortedAccommodations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bed className="h-4 w-4 text-earth-500" />
              <h3 className="text-sm font-semibold text-earth-600 uppercase tracking-wide">
                Accommodations
              </h3>
            </div>
            <div className="space-y-3">
              {sortedAccommodations.map((stay) => (
                <div
                  key={stay.stay_id}
                  className="bg-background rounded-lg p-3 border border-sand-200 shadow-warm-sm hover:shadow-warm transition-shadow"
                >
                  <div className="font-medium text-earth-700 text-sm mb-2 line-clamp-1">
                    {stay.hotel}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-earth-600">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span className="flex-1">
                        {formatDate(stay.hotel_checkin_date)}
                        {stay.checkin_time && (
                          <span className="text-earth-500 ml-1">
                            {formatToTime(stay.checkin_time)}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-earth-600">
                      <span className="w-3 h-3 flex-shrink-0" />
                      <span className="flex-1">
                        → {formatDate(stay.hotel_checkout_date)}
                        {stay.checkout_time && (
                          <span className="text-earth-500 ml-1">
                            {formatToTime(stay.checkout_time)}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  {stay.hotel_address && (
                    <div className="flex items-start gap-2 text-xs text-earth-500 mt-2 pt-2 border-t border-sand-100">
                      <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{stay.hotel_address}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transportation Section */}
        {sortedTransportation.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Plane className="h-4 w-4 text-earth-500" />
              <h3 className="text-sm font-semibold text-earth-600 uppercase tracking-wide">
                Transportation
              </h3>
            </div>
            <div className="space-y-3">
              {sortedTransportation.map((transport) => {
                const Icon = getTransportIcon(transport.type);
                return (
                  <div
                    key={transport.id}
                    className="bg-background rounded-lg p-3 border border-sand-200 shadow-warm-sm hover:shadow-warm transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-3.5 w-3.5 text-earth-600 flex-shrink-0" />
                      <span className="font-medium text-earth-700 text-sm">
                        {transport.type}
                      </span>
                      {transport.provider && (
                        <span className="text-xs text-earth-500 ml-auto">
                          {transport.provider}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {/* Departure */}
                      <div className="text-xs text-earth-600">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium">
                              {transport.departure_location || 'Departure'}
                            </div>
                            <div className="text-earth-500">
                              {formatDate(transport.start_date)}
                              {transport.start_time && (
                                <span className="ml-1">
                                  {formatToTime(transport.start_time)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="pl-5 text-earth-400 text-xs">↓</div>

                      {/* Arrival */}
                      <div className="text-xs text-earth-600">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium">
                              {transport.arrival_location || 'Arrival'}
                            </div>
                            {transport.end_date && (
                              <div className="text-earth-500">
                                {formatDate(transport.end_date)}
                                {transport.end_time && (
                                  <span className="ml-1">
                                    {formatToTime(transport.end_time)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {transport.confirmation_number && (
                      <div className="text-xs text-earth-500 mt-2 pt-2 border-t border-sand-100">
                        Conf: {transport.confirmation_number}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {sortedAccommodations.length === 0 && sortedTransportation.length === 0 && (
          <div className="text-center py-8 text-earth-400 text-sm">
            <p>No accommodations or transportation added yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripSummaryPanel;

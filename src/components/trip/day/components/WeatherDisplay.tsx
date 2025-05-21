import React from 'react';
import { WeatherDayDTO } from '@/types/Weather';

interface WeatherDisplayProps {
  weatherData: WeatherDayDTO;
  className?: string;
}

/**
 * Displays weather information for a day in the trip itinerary
 */
const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ weatherData, className = '' }) => {
  if (!weatherData) {
    return null;
  }

  // Map weather icon to appropriate display
  const getIconUrl = (icon: string) => {
    return `https://openweathermap.org/img/wn/${icon}@2x.png`;
  };

  // Map weather source to user-friendly label
  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'openweather':
        return 'Forecast';
      case 'accuweather':
        return 'Extended';
      case 'openweather18m':
        return 'Long-term';
      case 'climateNormals':
        return 'Seasonal Avg';
      default:
        return 'Weather';
    }
  };

  return (
    <div className={`rounded-md p-2 ${className} ${weatherData.confidence === 'low' ? 'opacity-80' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <img 
            src={getIconUrl(weatherData.icon)} 
            alt="Weather condition" 
            className="w-10 h-10 mr-2"
          />
          <div>
            <div className="text-sm font-medium">
              {Math.round(weatherData.hiC)}° / {Math.round(weatherData.loC)}°C
            </div>
            {weatherData.precipMM > 0 && (
              <div className="text-xs text-blue-600">
                {Math.round(weatherData.precipMM)}mm
              </div>
            )}
          </div>
        </div>
        
        <div className={`
          text-xs font-medium px-2 py-1 rounded-full 
          ${weatherData.source === 'openweather' ? 'bg-green-100 text-green-800' : 
            weatherData.source === 'accuweather' ? 'bg-yellow-100 text-yellow-800' : 
            weatherData.source === 'openweather18m' ? 'bg-orange-100 text-orange-800' : 
            'bg-purple-100 text-purple-800'}
        `}>
          {getSourceLabel(weatherData.source)}
        </div>
      </div>
    </div>
  );
};

export default WeatherDisplay;
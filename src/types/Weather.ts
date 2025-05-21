export type WeatherSource = 'none' | 'openweather' | 'accuweather' | 'openweather18m' | 'climateNormals';

export type WeatherConfidence = 'high' | 'medium' | 'low';

export type WeatherDayDTO = {
  isoDate: string;     // YYYY-MM-DD
  source: WeatherSource;
  hiC: number;         // degrees C
  loC: number;
  precipMM: number;    // total precip
  icon: string;        // weather condition code
  confidence: WeatherConfidence;
} | null;

export type WeatherResponse = {
  [isoDate: string]: WeatherDayDTO;
};
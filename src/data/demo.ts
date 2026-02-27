export type Airport = {
  code: 'DEL' | 'BOM' | 'BLR';
  city: string;
  flightsMonitored: number;
};

export type ForecastPoint = { time: string; value: number };

export type FlightRow = {
  time: string;
  airline: string;
  aircraft: string;
  business: number;
  premium: number;
  economy: number;
};

export type LoungeStatus = {
  occupancyPercent: number;
  peopleInLounge: number;
  flightsNext3Hours: number;
};

export const demoAirports: Airport[] = [
  { code: 'DEL', city: 'Delhi', flightsMonitored: 42 },
  { code: 'BOM', city: 'Mumbai', flightsMonitored: 38 },
  { code: 'BLR', city: 'Bengaluru', flightsMonitored: 35 },
];

export const demoStatus: LoungeStatus = {
  occupancyPercent: 63,
  peopleInLounge: 95,
  flightsNext3Hours: 12,
};

export const demoForecast: ForecastPoint[] = [
  { time: '2PM', value: 28 },
  { time: '3PM', value: 45 },
  { time: '4PM', value: 63 },
  { time: '5PM', value: 79 },
  { time: '6PM', value: 95 },
  { time: '7PM', value: 92 },
];

export const demoFlights: FlightRow[] = [
  { time: '2PM', airline: 'IndiGo', aircraft: 'A320', business: 12, premium: 24, economy: 144 },
  { time: '3PM', airline: 'Air India', aircraft: 'B787', business: 30, premium: 40, economy: 150 },
  { time: '4PM', airline: 'SpiceJet', aircraft: 'B737', business: 8, premium: 16, economy: 136 },
  { time: '5PM', airline: 'Vistara', aircraft: 'A321', business: 24, premium: 32, economy: 144 },
  { time: '6PM', airline: 'IndiGo', aircraft: 'A320', business: 12, premium: 24, economy: 144 },
  { time: '7PM', airline: 'Air India', aircraft: 'B787', business: 30, premium: 40, economy: 150 },
];


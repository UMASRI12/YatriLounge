import { insforge } from '../lib/insforgeClient';
import type { Airport, ForecastPoint, FlightRow, LoungeStatus } from '../data/demo';

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string };

export type DashboardData = {
  airports: Airport[];
  status: LoungeStatus;
  forecast: ForecastPoint[];
  flights: FlightRow[];
};

const safeString = (v: unknown) => (typeof v === 'string' ? v : '');
const safeNumber = (v: unknown) => (typeof v === 'number' ? v : Number(v));

export async function fetchDashboardData(airportCode: string): Promise<Ok<DashboardData> | Err> {
  if (!insforge) {
    return { ok: false, error: 'InsForge is not configured. Set VITE_INSFORGE_BASE_URL.' };
  }

  const [airportsRes, statusRes, forecastRes, flightsRes] = await Promise.all([
    insforge.database
      .from('airports')
      .select('code, city, flights_monitored')
      .order('code', { ascending: true }),
    insforge.database
      .from('lounge_status')
      .select('occupancy_percent, people, flights_next_3_hours, updated_at')
      .eq('airport_code', airportCode)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    insforge.database
      .from('occupancy_forecast')
      .select('time_label, value, sort_order')
      .eq('airport_code', airportCode)
      .order('sort_order', { ascending: true }),
    insforge.database
      .from('flight_schedule')
      .select('time_label, airline, aircraft, business, premium, economy, sort_order')
      .eq('airport_code', airportCode)
      .order('sort_order', { ascending: true }),
  ]);

  if (airportsRes.error) return { ok: false, error: airportsRes.error.message ?? 'Failed to load airports' };
  if (statusRes.error) return { ok: false, error: statusRes.error.message ?? 'Failed to load lounge status' };
  if (forecastRes.error) return { ok: false, error: forecastRes.error.message ?? 'Failed to load forecast' };
  if (flightsRes.error) return { ok: false, error: flightsRes.error.message ?? 'Failed to load flights' };

  const airports: Airport[] = (airportsRes.data ?? []).map((row: any) => ({
    code: safeString(row.code) as Airport['code'],
    city: safeString(row.city),
    flightsMonitored: safeNumber(row.flights_monitored) || 0,
  }));

  const status: LoungeStatus = statusRes.data
    ? {
        occupancyPercent: safeNumber((statusRes.data as any).occupancy_percent) || 0,
        peopleInLounge: safeNumber((statusRes.data as any).people) || 0,
        flightsNext3Hours: safeNumber((statusRes.data as any).flights_next_3_hours) || 0,
      }
    : { occupancyPercent: 0, peopleInLounge: 0, flightsNext3Hours: 0 };

  const forecast: ForecastPoint[] = (forecastRes.data ?? []).map((row: any) => ({
    time: safeString(row.time_label),
    value: safeNumber(row.value) || 0,
  }));

  const flights: FlightRow[] = (flightsRes.data ?? []).map((row: any) => ({
    time: safeString(row.time_label),
    airline: safeString(row.airline),
    aircraft: safeString(row.aircraft),
    business: safeNumber(row.business) || 0,
    premium: safeNumber(row.premium) || 0,
    economy: safeNumber(row.economy) || 0,
  }));

  return { ok: true, data: { airports, status, forecast, flights } };
}


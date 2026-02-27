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
  const apiBase = (import.meta.env.VITE_YATRILOUNGE_API_URL as string | undefined) ?? 'http://127.0.0.1:8000';
  const normalizedBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
  const url = `${normalizedBase}/api/dashboard?airport=${encodeURIComponent(airportCode)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text || `Backend request failed (${res.status})` };
    }

    const json = (await res.json()) as any;

    const airports: Airport[] = (json.airports ?? []).map((row: any) => ({
      code: safeString(row.code) as Airport['code'],
      city: safeString(row.city),
      flightsMonitored: safeNumber(row.flightsMonitored) || 0,
    }));

    const status: LoungeStatus = json.status
      ? {
          occupancyPercent: safeNumber(json.status.occupancyPercent) || 0,
          peopleInLounge: safeNumber(json.status.peopleInLounge) || 0,
          flightsNext3Hours: safeNumber(json.status.flightsNext3Hours) || 0,
        }
      : { occupancyPercent: 0, peopleInLounge: 0, flightsNext3Hours: 0 };

    const forecast: ForecastPoint[] = (json.forecast ?? []).map((row: any) => ({
      time: safeString(row.time),
      value: safeNumber(row.value) || 0,
    }));

    const flights: FlightRow[] = (json.flights ?? []).map((row: any) => ({
      time: safeString(row.time),
      airline: safeString(row.airline),
      aircraft: safeString(row.aircraft),
      business: safeNumber(row.business) || 0,
      premium: safeNumber(row.premium) || 0,
      economy: safeNumber(row.economy) || 0,
    }));

    return { ok: true, data: { airports, status, forecast, flights } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to reach backend' };
  }
}


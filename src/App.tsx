import React, { useEffect, useMemo, useState } from 'react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceArea,
} from 'recharts';
import { motion } from 'framer-motion';
import { PlaneTakeoff, Gauge, Users, Clock, ChevronRight } from 'lucide-react';

import {
  demoAirports,
  demoFlights,
  demoForecast,
  demoStatus,
  type Airport,
  type ForecastPoint,
  type FlightRow,
  type LoungeStatus,
} from './data/demo';
import { fetchDashboardData } from './services/dashboardData';
import { isInsforgeConfigured } from './lib/insforgeClient';

type Zone = 'success' | 'warning' | 'danger';

const getZone = (value: number): Zone => {
  if (value < 50) return 'success';
  if (value < 80) return 'warning';
  return 'danger';
};

const zoneToColor: Record<Zone, string> = {
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

const App: React.FC = () => {
  const [activeAirport, setActiveAirport] = useState<Airport['code']>('DEL');
  const [airports, setAirports] = useState<Airport[]>(demoAirports);
  const [status, setStatus] = useState<LoungeStatus>(demoStatus);
  const [forecast, setForecast] = useState<ForecastPoint[]>(demoForecast);
  const [flights, setFlights] = useState<FlightRow[]>(demoFlights);
  const [isLoading, setIsLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  const occupancyZone = useMemo(() => getZone(status.occupancyPercent), [status.occupancyPercent]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setBackendError(null);

      if (!isInsforgeConfigured) {
        setIsLive(false);
        return;
      }

      setIsLoading(true);
      const res = await fetchDashboardData(activeAirport);
      if (cancelled) return;

      if (!res.ok) {
        setBackendError(res.error);
        setIsLive(false);
        setIsLoading(false);
        return;
      }

      setAirports(res.data.airports.length ? res.data.airports : demoAirports);
      setStatus(res.data.status.occupancyPercent ? res.data.status : demoStatus);
      setForecast(res.data.forecast.length ? res.data.forecast : demoForecast);
      setFlights(res.data.flights.length ? res.data.flights : demoFlights);
      setIsLive(true);
      setIsLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [activeAirport]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* Header */}
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Predictive Analytics • Real-time
              </div>
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-2xl md:text-3xl">✈️</span>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                      YatriLounge
                    </h1>
                    <p className="text-sm text-slate-500">आपका यात्रा साथी</p>
                  </div>
                </motion.div>
              </div>
            </div>
            <nav className="flex items-center gap-4 text-sm text-slate-500">
              <button className="hidden md:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-medium text-slate-700 shadow-sm hover:border-brand hover:text-brand transition-colors">
                <Gauge className="h-3 w-3" />
                Crowding Engine
              </button>
              <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-xs font-medium text-slate-700 shadow-sm hover:border-brand hover:text-brand transition-colors">
                <PlaneTakeoff className="h-3 w-3" />
                Airports
              </button>
              <button className="inline-flex items-center gap-2 rounded-full bg-brand text-white px-4 py-2 text-xs font-medium shadow-soft hover:bg-teal-700 transition-colors">
                <Clock className="h-3 w-3" />
                {isLive ? 'Live now' : 'Demo'}
              </button>
            </nav>
          </header>

          {backendError && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 border border-amber-200 bg-amber-50/70"
            >
              <p className="text-sm font-medium text-amber-900">Backend not ready</p>
              <p className="mt-1 text-xs text-amber-800/90">
                {backendError}
              </p>
              <p className="mt-1 text-[11px] text-amber-800/80">
                Tip: set <code className="font-mono">VITE_INSFORGE_BASE_URL</code> and (optionally){' '}
                <code className="font-mono">VITE_INSFORGE_ANON_KEY</code> in <code className="font-mono">.env.local</code>.
              </p>
            </motion.div>
          )}

          {/* Airport selector */}
          <section className="grid gap-4 md:grid-cols-3">
            {airports.map((airport) => {
              const isActive = airport.code === activeAirport;
              return (
              <motion.button
                key={airport.code}
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setActiveAirport(airport.code)}
                className={`glass-card flex items-center justify-between p-4 text-left transition-all ${
                  isActive
                    ? 'border-brand shadow-soft ring-2 ring-brand/10'
                    : 'hover:border-brand/40 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-widest text-slate-400">
                      AIRPORT
                    </span>
                    {isActive && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-100">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tracking-tight text-slate-900">
                      {airport.code}
                    </span>
                    <span className="text-sm text-slate-500">{airport.city}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {airport.flightsMonitored} flights monitored
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Users className="h-3 w-3" />
                    <span>CX score</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </motion.button>
            );
            })}
          </section>

          {/* Main grid */}
          <main className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            {/* Left column */}
            <div className="space-y-6">
              {/* Main status card */}
              <section className="glass-card p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-8">
                <div className="flex-1 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 border border-slate-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live lounge occupancy
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                    {activeAirport} International Lounge · Terminal
                  </h2>
                  <p className="text-sm text-slate-500">
                    Smart predictions from upcoming departures, historical patterns, and live footfall.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-xl bg-slate-50/80 px-3 py-2">
                      <p className="text-xs text-slate-500">Next 3 hours</p>
                      <p className="mt-1 font-medium text-slate-900">
                        {status.flightsNext3Hours} flights monitored
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50/80 px-3 py-2">
                      <p className="text-xs text-slate-500">Model confidence</p>
                      <p className="mt-1 font-medium text-slate-900">{isLoading ? '…' : '92%'} </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center">
                  <RadialGauge
                    percent={status.occupancyPercent}
                    zone={occupancyZone}
                    people={status.peopleInLounge}
                    flightsNext3Hours={status.flightsNext3Hours}
                    isLoading={isLoading}
                  />
                </div>
              </section>

              {/* Stats grid */}
              <section className="grid gap-4 md:grid-cols-3">
                <SegmentCard
                  title="Business"
                  people={45}
                  eligible={95}
                  tone="success"
                  description="Most guests eligible via premium cards."
                />
                <SegmentCard
                  title="Premium"
                  people={28}
                  eligible={40}
                  tone="warning"
                  description="Moderate upgrade and card traffic."
                />
                <SegmentCard
                  title="Economy"
                  people={12}
                  eligible={5}
                  tone="danger"
                  description="Minor direct-pay entries expected."
                />
              </section>

              {/* Line chart */}
              <section className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-slate-900">
                      Predicted Crowding - Next 6 Hours
                    </h3>
                    <p className="text-xs text-slate-500">
                      Combined signal from departures, gate mix, aircraft types, and local patterns.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-medium text-slate-600 border border-slate-100">
                    Model v1.0 · 5 min latency
                  </span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={forecast} margin={{ left: -18, right: 4, top: 10 }}>
                      <XAxis
                        dataKey="time"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        unit="%"
                        domain={[0, 100]}
                      />
                      <ReferenceArea y1={0} y2={50} fill="#10b98111" />
                      <ReferenceArea y1={50} y2={80} fill="#f59e0b11" />
                      <ReferenceArea y1={80} y2={100} fill="#ef444411" />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid rgba(148, 163, 184, 0.3)',
                          boxShadow: '0 18px 45px rgba(15, 23, 42, 0.12)',
                          padding: '10px 12px',
                        }}
                        labelStyle={{ fontSize: 11, color: '#64748b' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={zoneToColor[getZone(status.occupancyPercent)]}
                        strokeWidth={2.5}
                        dot={{ r: 3, strokeWidth: 1, stroke: '#e2e8f0', fill: '#0f766e' }}
                        activeDot={{ r: 5 }}
                        isAnimationActive
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Flight schedule */}
              <section className="glass-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-900">Flight Schedule Drivers</h3>
                  <span className="text-[11px] text-slate-500">Local time · IST</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-100/70">
                  <div className="max-h-72 overflow-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-50/80 text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Time</th>
                          <th className="px-3 py-2 text-left font-medium">Airline</th>
                          <th className="px-3 py-2 text-left font-medium">Aircraft</th>
                          <th className="px-3 py-2 text-right font-medium">Business</th>
                          <th className="px-3 py-2 text-right font-medium">Premium</th>
                          <th className="px-3 py-2 text-right font-medium">Economy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flights.map((flight, idx) => (
                          <tr
                            key={`${flight.time}-${flight.airline}-${idx}`}
                            className="odd:bg-white/70 even:bg-slate-50/40 hover:bg-teal-50/60 transition-colors"
                          >
                            <td className="px-3 py-2 text-slate-700 font-medium">{flight.time}</td>
                            <td className="px-3 py-2 text-slate-700">{flight.airline}</td>
                            <td className="px-3 py-2 text-slate-500">{flight.aircraft}</td>
                            <td className="px-3 py-2 text-right text-slate-700">
                              {flight.business}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-700">
                              {flight.premium}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-700">
                              {flight.economy}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              {/* Hourly forecast strip */}
              <section className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-900">Hourly forecast</h3>
                  <span className="text-[11px] text-slate-500">Scroll for details</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {forecast.map((slot) => {
                    const zone = getZone(slot.value);
                    const emoji =
                      zone === 'success' ? '🟢' : zone === 'warning' ? '🟡' : '🔴';
                    return (
                      <motion.div
                        key={slot.time}
                        whileHover={{ y: -3 }}
                        className="min-w-[110px] rounded-2xl border border-slate-100 bg-white/70 px-3 py-2 shadow-sm"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-800">{slot.time}</span>
                          <span className="text-lg">{emoji}</span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {slot.value}%
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {zone === 'success'
                            ? 'Easy access'
                            : zone === 'warning'
                            ? 'Building up'
                            : 'Peak crowding'}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </section>

              {/* Recommendations */}
              <section className="glass-card p-5 space-y-4">
                <h3 className="text-sm font-medium text-slate-900">Smart recommendations</h3>
                <div className="grid gap-3">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-2xl bg-emerald-50/80 border border-emerald-100 px-4 py-3"
                  >
                    <p className="text-xs font-semibold text-emerald-800">
                      ✨ Best lounge visit
                    </p>
                    <p className="mt-1 text-sm text-emerald-900">2PM - 4PM</p>
                    <p className="mt-1 text-xs text-emerald-700/80">
                      Short queues, high seat availability, optimal dwell time.
                    </p>
                  </motion.div>
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-2xl bg-amber-50/80 border border-amber-100 px-4 py-3"
                  >
                    <p className="text-xs font-semibold text-amber-800">⚡ Peak hours</p>
                    <p className="mt-1 text-sm text-amber-900">6PM - 8PM</p>
                    <p className="mt-1 text-xs text-amber-700/80">
                      Highest overlap of widebody departures and business travel.
                    </p>
                  </motion.div>
                </div>

                {/* Alternatives (conditional) */}
                {status.occupancyPercent > 80 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 rounded-2xl bg-rose-50/90 border border-rose-200 px-4 py-3"
                  >
                    <p className="text-xs font-semibold text-rose-800">
                      Lounge near capacity 🔴
                    </p>
                    <p className="mt-1 text-sm text-rose-900">
                      Try: Lounge B at Gate 15 - 30% full
                    </p>
                    <p className="mt-1 text-xs text-rose-700/80">
                      Next low crowd: 8PM · Smart reroute based on gate proximity and dwell time.
                    </p>
                  </motion.div>
                )}
              </section>
            </div>
          </main>

          {/* Footer */}
          <footer className="flex flex-col items-start justify-between gap-2 border-t border-slate-200/60 pt-4 text-[11px] text-slate-500 md:flex-row md:items-center">
            <p>Data updated live • Predictive Analytics Engine v1.0</p>
            <p>Built for HackWithAI 24hr • YatriLounge</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

interface RadialGaugeProps {
  percent: number;
  zone: Zone;
  people: number;
  flightsNext3Hours: number;
  isLoading: boolean;
}

const RadialGauge: React.FC<RadialGaugeProps> = ({
  percent,
  zone,
  people,
  flightsNext3Hours,
  isLoading,
}) => {
  const radius = 80;
  const strokeWidth = 14;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  const size = radius * 2;

  const color = zoneToColor[zone];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="relative h-48 w-48 md:h-56 md:w-56"
    >
      <div className="absolute inset-6 rounded-full bg-gradient-to-br from-white/80 to-slate-50/80 shadow-soft" />
      <svg
        className="h-full w-full rotate-[-90deg]"
        viewBox={`0 0 ${size} ${size}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          strokeLinecap="round"
        />
        <motion.circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center rotate-0">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Occupancy</p>
        <p className="mt-1 text-3xl font-semibold text-slate-900">{isLoading ? '…' : `${percent}%`}</p>
        <p className="mt-1 text-xs text-slate-500">{isLoading ? 'Updating…' : `${people} people in lounge`}</p>
        <p className="mt-2 text-[11px] text-slate-400">
          Based on {isLoading ? '…' : flightsNext3Hours} flights in next 3 hours
        </p>
      </div>
    </motion.div>
  );
};

interface SegmentCardProps {
  title: string;
  people: number;
  eligible: number;
  tone: Zone;
  description: string;
}

const SegmentCard: React.FC<SegmentCardProps> = ({
  title,
  people,
  eligible,
  tone,
  description,
}) => {
  const color = zoneToColor[tone];
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="glass-card p-4 flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{people} people</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: `${color}11`, color }}
          >
            {eligible}% eligible
          </span>
          <span className="h-1 w-10 rounded-full bg-slate-100 overflow-hidden">
            <span
              className="block h-full rounded-full"
              style={{ width: `${Math.min(eligible, 100)}%`, backgroundColor: color }}
            />
          </span>
        </div>
      </div>
      <p className="text-[11px] text-slate-500 leading-snug">{description}</p>
    </motion.div>
  );
};

export default App;


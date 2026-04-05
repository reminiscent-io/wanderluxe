import React, { useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format, getDay } from 'date-fns';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';
import type { DailyActivity, DailyTripInfo } from '@/hooks/useTravelStats';
import { DEFAULT_TRIP_IMAGE } from '@/constants/unsplash';

interface MonthlyActivityChartProps {
  data: DailyActivity[];
  className?: string;
}

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function TripMiniCard({ trip, onClick }: { trip: DailyTripInfo; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-2.5 w-full text-left rounded-lg hover:bg-sand-50 p-1.5 -m-1.5 transition-colors"
    >
      <img
        src={trip.coverImageUrl || DEFAULT_TRIP_IMAGE}
        alt={trip.destination}
        className="w-10 h-10 rounded-md object-cover flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-earth-800 truncate">{trip.destination}</p>
        <div className="flex items-center gap-1 text-[11px] text-earth-500 mt-0.5">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span>
            {format(new Date(trip.arrivalDate + 'T00:00:00'), 'MMM d')} – {format(new Date(trip.departureDate + 'T00:00:00'), 'MMM d')}
          </span>
        </div>
      </div>
    </button>
  );
}

export function MonthlyActivityChart({
  data,
  className,
}: MonthlyActivityChartProps) {
  const navigate = useNavigate();

  const { weeks, monthLabels, yearLabels, todayColIndex } = useMemo(() => {
    if (!data || data.length === 0) {
      return { weeks: [], monthLabels: [], yearLabels: [] };
    }

    const weeksArr: (DailyActivity | null)[][] = [];
    let currentWeek: (DailyActivity | null)[] = [];

    // Pad the first week so column 0 starts on Sunday
    const firstDayOfWeek = getDay(data[0].date);
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }

    for (const day of data) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeksArr.push(currentWeek);
    }

    // Month labels at the first week each month appears
    const labels: { label: string; colIndex: number; endColIndex: number }[] = [];
    let lastMonth = -1;
    weeksArr.forEach((week, colIdx) => {
      const firstDay = week.find(d => d !== null);
      if (firstDay) {
        const month = firstDay.date.getMonth();
        if (month !== lastMonth) {
          if (labels.length > 0) {
            labels[labels.length - 1].endColIndex = colIdx - 1;
          }
          labels.push({ label: format(firstDay.date, 'MMM'), colIndex: colIdx, endColIndex: weeksArr.length - 1 });
          lastMonth = month;
        }
      }
    });

    // Year labels — one per calendar year, positioned at the first week of that year
    const yearLabelsArr: { year: string; colIndex: number; endColIndex: number }[] = [];
    let lastYear = -1;
    weeksArr.forEach((week, colIdx) => {
      const firstDay = week.find(d => d !== null);
      if (firstDay) {
        const year = firstDay.date.getFullYear();
        if (year !== lastYear) {
          if (yearLabelsArr.length > 0) {
            yearLabelsArr[yearLabelsArr.length - 1].endColIndex = colIdx - 1;
          }
          yearLabelsArr.push({ year: String(year), colIndex: colIdx, endColIndex: weeksArr.length - 1 });
          lastYear = year;
        }
      }
    });

    // Find the column index for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let todayCol = -1;
    for (let colIdx = 0; colIdx < weeksArr.length; colIdx++) {
      for (const day of weeksArr[colIdx]) {
        if (day && day.date.getTime() === today.getTime()) {
          todayCol = colIdx;
          break;
        }
      }
      if (todayCol >= 0) break;
    }

    return { weeks: weeksArr, monthLabels: labels, yearLabels: yearLabelsArr, todayColIndex: todayCol };
  }, [data]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const CELL_SIZE = 11;
  const CELL_GAP = 2;
  const LABEL_WIDTH = 28;
  const totalCellSize = CELL_SIZE + CELL_GAP;

  // Scroll to center today's column on mount
  useEffect(() => {
    if (scrollRef.current && todayColIndex >= 0) {
      const todayX = LABEL_WIDTH + todayColIndex * totalCellSize;
      const containerWidth = scrollRef.current.clientWidth;
      scrollRef.current.scrollLeft = todayX - containerWidth / 2;
    }
  }, [todayColIndex, totalCellSize]);

  if (!data || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "rounded-xl p-4 bg-gradient-to-br from-sand-50 to-earth-50 border border-sand-200/50",
          className
        )}
      >
        <div className="text-xs font-medium text-earth-600 mb-2">Travel Activity</div>
        <div className="flex items-center justify-center text-earth-400 text-sm h-20">
          No travel data yet
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "rounded-xl p-4 bg-gradient-to-br from-sand-50/50 to-earth-50/50 border border-sand-200/50 backdrop-blur-sm",
        className
      )}
    >
      <div className="text-xs font-medium text-earth-600 mb-3">Travel Activity</div>
      <div ref={scrollRef} className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Year row — sticky labels */}
        <div className="flex" style={{ width: LABEL_WIDTH + weeks.length * totalCellSize }}>
          {/* Left padding to align with grid */}
          <div style={{ minWidth: LABEL_WIDTH, width: LABEL_WIDTH }} className="flex-shrink-0" />
          {yearLabels.map(({ year, colIndex, endColIndex }, idx) => {
            const width = (endColIndex - colIndex + 1) * totalCellSize;
            return (
              <div
                key={`year-${year}`}
                className="flex-shrink-0 relative"
                style={{ width }}
              >
                <div className="absolute bg-earth-200/60" style={{ left: 0, right: 0, bottom: 0, height: 1 }} />
                <div className="sticky left-0 w-fit z-10 pb-1">
                  <span className="text-[11px] font-semibold text-earth-500 leading-none bg-sand-50 pr-1.5">{year}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Month row — sticky labels */}
        <div className="flex mb-1" style={{ width: LABEL_WIDTH + weeks.length * totalCellSize }}>
          <div style={{ minWidth: LABEL_WIDTH, width: LABEL_WIDTH }} className="flex-shrink-0" />
          {monthLabels.map(({ label, colIndex, endColIndex }) => {
            const width = (endColIndex - colIndex + 1) * totalCellSize;
            return (
              <div
                key={`month-${colIndex}`}
                className="flex-shrink-0"
                style={{ width }}
              >
                <div className="sticky left-0 w-fit z-10">
                  <span className="text-[11px] text-earth-500 leading-none bg-sand-50 pr-1">{label}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="relative"
          style={{
            width: LABEL_WIDTH + weeks.length * totalCellSize,
            height: 7 * totalCellSize,
          }}
        >
          {/* Day labels */}
          {DAY_LABELS.map((label, rowIdx) =>
            label ? (
              <span
                key={`day-${rowIdx}`}
                className="absolute text-[11px] text-earth-500 leading-none"
                style={{
                  left: 0,
                  top: rowIdx * totalCellSize + CELL_SIZE - 3,
                }}
              >
                {label}
              </span>
            ) : null
          )}

          {/* Grid cells */}
          {weeks.map((week, colIdx) =>
            week.map((day, rowIdx) => {
              if (!day) return null;

              const left = LABEL_WIDTH + colIdx * totalCellSize;
              const top = rowIdx * totalCellSize;

              const cell = (
                <div
                  className={cn(
                    "absolute rounded-[2px] transition-colors",
                    day.traveling
                      ? 'bg-sunset-500 hover:bg-sunset-600'
                      : 'bg-sand-200 hover:bg-sand-300'
                  )}
                  style={{
                    left,
                    top,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                  }}
                />
              );

              if (!day.traveling) {
                return (
                  <div key={`${colIdx}-${rowIdx}`} title={format(day.date, 'MMM d, yyyy')}>
                    {cell}
                  </div>
                );
              }

              return (
                <HoverCard key={`${colIdx}-${rowIdx}`} openDelay={150} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    {cell}
                  </HoverCardTrigger>
                  <HoverCardContent
                    side="top"
                    align="center"
                    className="w-56 p-3"
                    sideOffset={6}
                    collisionPadding={8}
                    avoidCollisions
                  >
                    <p className="text-[11px] font-medium text-earth-500 mb-2">
                      {format(day.date, 'EEEE, MMM d, yyyy')}
                    </p>
                    <div className="space-y-2">
                      {day.trips.map((trip) => (
                        <TripMiniCard
                          key={trip.tripId}
                          trip={trip}
                          onClick={() => navigate(`/trip/${trip.tripId}`)}
                        />
                      ))}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-2 text-[11px] text-earth-500">
        <span className="inline-block w-[11px] h-[11px] rounded-sm bg-sand-200" />
        <span>No plans</span>
        <span className="inline-block w-[11px] h-[11px] rounded-sm bg-sunset-500 ml-1.5" />
        <span>Trip day</span>
      </div>
    </motion.div>
  );
}

export default MonthlyActivityChart;

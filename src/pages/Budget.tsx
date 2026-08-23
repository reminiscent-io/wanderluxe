import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Navigation from "../components/Navigation";
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrencyWithSymbol } from '../components/trip/budget/utils/budgetCalculations';
import CurrencySelector from '../components/trip/budget/CurrencySelector';
import { getConversionRate, useCurrencyRates } from '../components/trip/budget/utils/currencyConverter';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area
} from 'recharts';
import {
  Plane,
  Utensils,
  Hotel,
  Ticket,
  Receipt,
  Sparkles,
  MapPin
} from 'lucide-react';

// --- Types ---

interface CombinedExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  location: string;
  tripId: string;
  currency: string;
}

// --- Constants ---

const CATEGORY_COLORS: Record<string, string> = {
  accommodation: '#8B7355',  // earth/sand-600
  transportation: '#FB923C', // sunset-400
  food: '#FBBF24',          // amber-400
  entertainment: '#F9A8D4', // rose-300
  other: '#A8A29E',         // sand-400
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  transportation: <Plane className="w-4 h-4" />,
  accommodation: <Hotel className="w-4 h-4" />,
  food: <Utensils className="w-4 h-4" />,
  entertainment: <Ticket className="w-4 h-4" />,
  other: <Receipt className="w-4 h-4" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  transportation: 'Transportation',
  accommodation: 'Accommodation',
  food: 'Food & Dining',
  entertainment: 'Activities',
  other: 'Other',
};

// --- Skeleton components ---

const StatSkeleton = () => (
  <div className="rounded-card bg-card shadow-warm-sm p-5 animate-pulse">
    <div className="h-3 bg-sand-200 rounded w-20 mb-3" />
    <div className="h-8 bg-sand-200 rounded w-28" />
  </div>
);

const ChartSkeleton = ({ height = 'h-64' }: { height?: string }) => (
  <Card className="rounded-card shadow-warm-sm">
    <CardContent className="p-5">
      <div className="h-5 bg-sand-200 rounded w-32 mb-4 animate-pulse" />
      <div className={`${height} bg-sand-100 rounded animate-pulse`} />
    </CardContent>
  </Card>
);

const ListSkeleton = () => (
  <Card className="rounded-card shadow-warm-sm">
    <CardContent className="p-5">
      <div className="h-5 bg-sand-200 rounded w-36 mb-4 animate-pulse" />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-sand-200" />
          <div className="flex-1">
            <div className="h-4 bg-sand-200 rounded w-40 mb-1" />
            <div className="h-3 bg-sand-100 rounded w-24" />
          </div>
          <div className="h-5 bg-sand-200 rounded w-16" />
        </div>
      ))}
    </CardContent>
  </Card>
);

// --- Custom Recharts Tooltip ---

type RechartsTooltipPayload = {
  name?: string;
  value?: number;
  payload?: { name?: string };
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: RechartsTooltipPayload[];
  selectedCurrency: string;
}

const CustomTooltip = ({ active, payload, selectedCurrency }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-sand-200 rounded-lg px-3 py-2 shadow-warm-sm text-sm">
      <p className="text-earth-700 font-medium">{payload[0].name || payload[0].payload?.name}</p>
      <p className="text-earth-600">{formatCurrencyWithSymbol(payload[0].value ?? 0, selectedCurrency)}</p>
    </div>
  );
};

// --- Main Component ---

const Budget = () => {
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const { user } = useAuth();
  const { rates, isLoading: ratesLoading } = useCurrencyRates();

  // Fetch all user trips and their expenses across 5 batched queries
  // (instead of 5 queries per trip).
  const { data: result, isLoading } = useQuery({
    queryKey: ['all-expenses', user?.id],
    queryFn: async () => {
      if (!user) return { expenses: [], tripMap: {} as Record<string, string> };

      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('trip_id, destination')
        .eq('user_id', user.id);

      if (tripsError || !trips || trips.length === 0) {
        return { expenses: [], tripMap: {} as Record<string, string> };
      }

      const tripMap: Record<string, string> = {};
      const tripIds: string[] = [];
      trips.forEach((t) => {
        tripMap[t.trip_id] = t.destination;
        tripIds.push(t.trip_id);
      });

      const [
        { data: activities },
        { data: accommodations },
        { data: transportation },
        { data: restaurants },
        { data: otherExpenses },
      ] = await Promise.all([
        supabase
          .from('day_activities')
          .select('id, trip_id, title, cost, currency, created_at')
          .in('trip_id', tripIds),
        supabase
          .from('accommodations')
          .select('stay_id, trip_id, title, hotel, cost, currency, hotel_checkin_date, created_at')
          .in('trip_id', tripIds),
        supabase
          .from('transportation')
          .select('id, trip_id, type, cost, currency, start_date, created_at')
          .in('trip_id', tripIds),
        supabase
          .from('reservations')
          .select('id, trip_id, restaurant_name, cost, currency, created_at')
          .in('trip_id', tripIds),
        supabase
          .from('other_expenses')
          .select('id, trip_id, description, cost, currency, date, created_at')
          .in('trip_id', tripIds),
      ]);

      const expenses: CombinedExpense[] = [];

      (accommodations ?? []).forEach((acc) => {
        if (!acc.cost) return;
        expenses.push({
          id: acc.stay_id,
          description: acc.title || acc.hotel || 'Accommodation',
          amount: acc.cost,
          category: 'accommodation',
          date: acc.hotel_checkin_date || acc.created_at,
          location: tripMap[acc.trip_id] ?? '',
          tripId: acc.trip_id,
          currency: acc.currency || 'USD',
        });
      });

      (activities ?? []).forEach((act) => {
        if (!act.cost) return;
        expenses.push({
          id: act.id,
          description: act.title,
          amount: act.cost,
          category: 'entertainment',
          date: act.created_at,
          location: tripMap[act.trip_id] ?? '',
          tripId: act.trip_id,
          currency: act.currency || 'USD',
        });
      });

      (transportation ?? []).forEach((trans) => {
        if (!trans.cost) return;
        expenses.push({
          id: trans.id,
          description: trans.type || 'Transport',
          amount: trans.cost,
          category: 'transportation',
          date: trans.start_date || trans.created_at,
          location: tripMap[trans.trip_id] ?? '',
          tripId: trans.trip_id,
          currency: trans.currency || 'USD',
        });
      });

      (restaurants ?? []).forEach((rest) => {
        if (!rest.cost) return;
        expenses.push({
          id: rest.id,
          description: rest.restaurant_name,
          amount: rest.cost,
          category: 'food',
          date: rest.created_at,
          location: tripMap[rest.trip_id] ?? '',
          tripId: rest.trip_id,
          currency: rest.currency || 'USD',
        });
      });

      (otherExpenses ?? []).forEach((expense) => {
        if (!expense.cost) return;
        expenses.push({
          id: expense.id,
          description: expense.description,
          amount: expense.cost,
          category: 'other',
          date: expense.date || expense.created_at,
          location: tripMap[expense.trip_id] ?? '',
          tripId: expense.trip_id,
          currency: expense.currency || 'USD',
        });
      });

      return { expenses, tripMap };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // --- Currency conversion ---

  // Every amount is aggregated in the selected currency. Anything we can't
  // reach a rate for is left out rather than added in as if it were already
  // in that currency — a yen figure counted as dollars would silently blow
  // the totals apart.
  const { expensesInSelectedCurrency, unconvertedCurrencies } = useMemo(() => {
    const source = result?.expenses ?? [];
    const converted: CombinedExpense[] = [];
    const missing = new Set<string>();

    for (const expense of source) {
      const from = (expense.currency || 'USD').toUpperCase();
      const rate = getConversionRate(from, selectedCurrency, rates);
      if (rate === null) {
        if (expense.amount) missing.add(from);
        continue;
      }
      converted.push({ ...expense, amount: expense.amount * rate, currency: selectedCurrency });
    }

    return {
      expensesInSelectedCurrency: converted,
      unconvertedCurrencies: [...missing].sort(),
    };
  }, [result?.expenses, selectedCurrency, rates]);

  // --- Derived data (single-pass aggregation) ---

  const aggregates = useMemo(() => {
    const expenses = expensesInSelectedCurrency;
    const tripMap = result?.tripMap ?? {};

    let totalSpent = 0;
    const tripIds = new Set<string>();
    const byCategory: Record<string, number> = {};
    const byTrip: Record<string, number> = {};
    const byMonth: Record<string, number> = {};

    // Maintain top-5 with insertion sort — O(n) instead of O(n log n) full sort.
    const topN = 5;
    const top: CombinedExpense[] = [];

    for (let i = 0; i < expenses.length; i++) {
      const e = expenses[i];
      totalSpent += e.amount;
      tripIds.add(e.tripId);
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
      byTrip[e.tripId] = (byTrip[e.tripId] || 0) + e.amount;

      if (e.date) {
        const d = new Date(e.date);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          byMonth[key] = (byMonth[key] || 0) + e.amount;
        }
      }

      if (top.length < topN) {
        top.push(e);
        if (top.length === topN) top.sort((a, b) => b.amount - a.amount);
      } else if (e.amount > top[topN - 1].amount) {
        top[topN - 1] = e;
        // Bubble up
        for (let j = topN - 1; j > 0 && top[j].amount > top[j - 1].amount; j--) {
          const tmp = top[j];
          top[j] = top[j - 1];
          top[j - 1] = tmp;
        }
      }
    }

    if (top.length < topN) top.sort((a, b) => b.amount - a.amount);

    const categoryData = Object.entries(byCategory)
      .map(([name, value]) => ({ name, value, label: CATEGORY_LABELS[name] || name }))
      .sort((a, b) => b.value - a.value);

    const tripBarData = Object.entries(byTrip)
      .map(([id, total]) => {
        const dest = tripMap[id] || 'Unknown';
        return {
          name: dest.length > 20 ? dest.slice(0, 18) + '…' : dest,
          total,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const monthlyData = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => {
        const [year, month] = key.split('-');
        const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        });
        return { name: label, total };
      });

    return {
      totalSpent,
      tripsWithExpenses: tripIds.size,
      categoryData,
      tripBarData,
      monthlyData,
      topExpenses: top,
      // Based on what the user actually recorded, not on what converted, so a
      // missing rate never masquerades as "no expenses yet".
      hasExpenses: (result?.expenses?.length ?? 0) > 0,
    };
  }, [expensesInSelectedCurrency, result?.expenses, result?.tripMap]);

  const {
    totalSpent,
    tripsWithExpenses,
    categoryData,
    tripBarData,
    monthlyData,
    topExpenses,
    hasExpenses,
  } = aggregates;
  const avgPerTrip = tripsWithExpenses > 0 ? totalSpent / tripsWithExpenses : 0;
  const largestCategory = categoryData[0];

  // --- Render ---

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-24">

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-display text-earth-600">Trip Spend</h1>
            <p className="text-sm text-sand-500">All trips</p>
          </div>
          <CurrencySelector
            value={selectedCurrency}
            onValueChange={setSelectedCurrency}
            className="w-[100px]"
          />
        </motion.div>

        {!isLoading && !ratesLoading && unconvertedCurrencies.length > 0 && (
          <p className="text-xs text-sand-500">
            No exchange rate available for {unconvertedCurrencies.join(', ')} — spending in
            {unconvertedCurrencies.length > 1 ? ' those currencies is' : ' that currency is'} not
            included below.
          </p>
        )}

        {/* Loading State */}
        {isLoading && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <StatSkeleton /><StatSkeleton /><StatSkeleton />
            </div>
            <ChartSkeleton />
            <ChartSkeleton height="h-48" />
            <ChartSkeleton height="h-36" />
            <ListSkeleton />
          </>
        )}

        {/* Empty State */}
        {!isLoading && !hasExpenses && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="rounded-card shadow-warm">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-sunset-100 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-sunset-500" />
                </div>
                <h3 className="text-xl font-display text-earth-600 mb-2">Start tracking your spend</h3>
                <p className="text-sand-500 mb-6 max-w-sm mx-auto">
                  Add expenses to any trip to see your spending patterns here.
                </p>
                <a href="/my-trips">
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-sunset-400 to-sunset-500 text-white font-medium shadow-warm-sm hover:shadow-warm transition-shadow">
                    <MapPin className="w-4 h-4" />
                    View your trips
                  </button>
                </a>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Dashboard Content */}
        {!isLoading && hasExpenses && (
          <>
            {/* Hero Stats */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="grid grid-cols-3 gap-3"
            >
              <div className="rounded-card bg-card shadow-warm-sm p-4 sm:p-5">
                <p className="text-xs text-sand-500 mb-1">Total Spent</p>
                <p className="text-lg sm:text-2xl font-display text-sunset-500 leading-tight">
                  {formatCurrencyWithSymbol(totalSpent, selectedCurrency)}
                </p>
              </div>
              <div className="rounded-card bg-card shadow-warm-sm p-4 sm:p-5">
                <p className="text-xs text-sand-500 mb-1">Trips</p>
                <p className="text-lg sm:text-2xl font-display text-earth-600 leading-tight">
                  {tripsWithExpenses}
                </p>
              </div>
              <div className="rounded-card bg-card shadow-warm-sm p-4 sm:p-5">
                <p className="text-xs text-sand-500 mb-1">Avg / Trip</p>
                <p className="text-lg sm:text-2xl font-display text-earth-600 leading-tight">
                  {formatCurrencyWithSymbol(avgPerTrip, selectedCurrency)}
                </p>
              </div>
            </motion.div>

            {/* Category Donut */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card className="rounded-card shadow-warm">
                <CardContent className="p-5">
                  <h2 className="text-lg font-display text-earth-600 mb-4">By category</h2>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* Donut Chart */}
                    <div className="relative w-[200px] h-[200px] sm:w-[240px] sm:h-[240px] flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius="60%"
                            outerRadius="90%"
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="label"
                            stroke="none"
                          >
                            {categoryData.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={CATEGORY_COLORS[entry.name] || '#A8A29E'}
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<CustomTooltip selectedCurrency={selectedCurrency} />} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center label */}
                      {largestCategory && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <p className="text-xs text-sand-500">{CATEGORY_LABELS[largestCategory.name]}</p>
                          <p className="text-sm font-display text-earth-600">
                            {totalSpent > 0 ? Math.round((largestCategory.value / totalSpent) * 100) : 0}%
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Legend */}
                    <div className="flex-1 w-full space-y-3">
                      {categoryData.map((cat) => {
                        const pct = totalSpent > 0 ? ((cat.value / totalSpent) * 100).toFixed(1) : '0';
                        return (
                          <div key={cat.name} className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: CATEGORY_COLORS[cat.name] || '#A8A29E' }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-earth-700">{CATEGORY_LABELS[cat.name] || cat.name}</span>
                                <span className="text-sm font-medium text-earth-600">
                                  {formatCurrencyWithSymbol(cat.value, selectedCurrency)}
                                </span>
                              </div>
                              <div className="w-full bg-sand-100 rounded-full h-1.5 mt-1">
                                <div
                                  className="h-1.5 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: CATEGORY_COLORS[cat.name] || '#A8A29E'
                                  }}
                                />
                              </div>
                            </div>
                            <span className="text-xs text-sand-500 w-10 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Spend by Trip - Horizontal Bars */}
            {tripBarData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <Card className="rounded-card shadow-warm-sm">
                  <CardContent className="p-5">
                    <h2 className="text-lg font-display text-earth-600 mb-4">By trip</h2>
                    <ResponsiveContainer width="100%" height={tripBarData.length * 48 + 20}>
                      <BarChart
                        data={tripBarData}
                        layout="vertical"
                        margin={{ top: 0, right: 80, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#E7E5E4" />
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={120}
                          tick={{ fontSize: 13, fill: '#57534E' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip content={<CustomTooltip selectedCurrency={selectedCurrency} />} />
                        <Bar
                          dataKey="total"
                          fill="#FB923C"
                          radius={[0, 6, 6, 0]}
                          barSize={24}
                          label={{
                            position: 'right',
                            formatter: (val: number) => formatCurrencyWithSymbol(val, selectedCurrency),
                            style: { fontSize: 12, fill: '#78716C' }
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Spending Over Time */}
            {monthlyData.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <Card className="rounded-card shadow-warm-sm bg-card/60">
                  <CardContent className="p-5">
                    <h2 className="text-lg font-display text-earth-600 mb-3">Over time</h2>
                    <ResponsiveContainer width="100%" height={140}>
                      <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FB923C" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#FB923C" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: '#A8A29E' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip content={<CustomTooltip selectedCurrency={selectedCurrency} />} />
                        <Area
                          type="monotone"
                          dataKey="total"
                          stroke="#FB923C"
                          strokeWidth={2}
                          fill="url(#areaGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Top Expenses - Biggest Splurges */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <Card className="rounded-card shadow-warm-sm">
                <CardContent className="p-5">
                  <h2 className="text-lg font-display text-earth-600 mb-3">Biggest splurges</h2>
                  <div className="divide-y divide-sand-100">
                    {topExpenses.map((expense, i) => (
                      <div key={expense.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        {/* Category icon */}
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[expense.category] || '#A8A29E'}20`,
                            color: CATEGORY_COLORS[expense.category] || '#A8A29E'
                          }}
                        >
                          {CATEGORY_ICONS[expense.category] || <Receipt className="w-4 h-4" />}
                        </div>
                        {/* Description */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-earth-700 truncate">
                            {expense.description}
                          </p>
                          <p className="text-xs text-sand-500 truncate">{expense.location}</p>
                        </div>
                        {/* Amount */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-display text-earth-600">
                            {formatCurrencyWithSymbol(expense.amount, selectedCurrency)}
                          </p>
                          {expense.date && (
                            <p className="text-xs text-sand-400">
                              {new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

export default Budget;

import React from 'react';
import { DayActivity, HotelStay, Transportation, RestaurantReservation } from '@/types/trip';
import { formatCurrencyWithSymbol } from '../../budget/utils/budgetCalculations';
import { convertCurrency } from '../../budget/utils/currencyConverter';
import { Hotel, Plane, Star, TrendingUp, Utensils, Wallet } from 'lucide-react';

type Props = {
  activities: DayActivity[];
  hotelStays: HotelStay[];
  transportations: Transportation[];
  reservations: RestaurantReservation[];
  tripCurrency?: string;
  exchangeRates?: Record<string, Record<string, number>>;
};

interface CategoryCost {
  category: string;
  amount: number;
  currency: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const DaySummaryCard: React.FC<Props> = ({
  activities,
  hotelStays,
  transportations,
  reservations,
  tripCurrency = 'USD',
  exchangeRates = {},
}) => {
  const categoryData: CategoryCost[] = [];

  // Activities
  const activitiesCost = activities.reduce((sum, a) => sum + (a.cost || 0), 0);
  if (activitiesCost > 0) {
    categoryData.push({
      category: 'Activities',
      amount: activitiesCost,
      currency: activities[0]?.currency || 'USD',
      Icon: Star,
    });
  }

  // Accommodations (today's check-in/out)
  const accCost = hotelStays.reduce((sum, h) => sum + (h.cost || 0), 0);
  if (accCost > 0) {
    categoryData.push({
      category: 'Accommodations',
      amount: accCost,
      currency: hotelStays[0]?.currency || 'USD',
      Icon: Hotel,
    });
  }

  // Transportation
  const transCost = transportations.reduce((sum, t) => sum + (t.cost || 0), 0);
  if (transCost > 0) {
    categoryData.push({
      category: 'Transportation',
      amount: transCost,
      currency: transportations[0]?.currency || 'USD',
      Icon: Plane,
    });
  }

  // Dining
  const diningCost = reservations.reduce((sum, r) => sum + (r.cost || 0), 0);
  if (diningCost > 0) {
    categoryData.push({
      category: 'Dining',
      amount: diningCost,
      currency: reservations[0]?.currency || 'USD',
      Icon: Utensils,
    });
  }

  if (categoryData.length === 0) return null;

  // Detect if mixed currencies
  const allCurrencies = new Set(categoryData.map(c => c.currency));
  const hasMixedCurrencies = allCurrencies.size > 1;
  const hasRates = Object.keys(exchangeRates).length > 0;

  // Calculate total, converting to trip currency if mixed
  let total: number;
  let displayCurrency: string;
  const convertedFrom: string[] = [];

  if (hasMixedCurrencies && hasRates) {
    total = categoryData.reduce((sum, c) => {
      if (c.currency === tripCurrency) return sum + c.amount;
      convertedFrom.push(c.currency);
      return sum + convertCurrency(c.amount, c.currency, tripCurrency, exchangeRates);
    }, 0);
    displayCurrency = tripCurrency;
  } else {
    total = categoryData.reduce((sum, c) => sum + c.amount, 0);
    displayCurrency = categoryData[0]?.currency || 'USD';
  }

  return (
    <div className="bg-card rounded-card p-4 border border-border mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-earth-600" />
          <h3 className="font-semibold text-earth-800 text-sm">Daily Breakdown</h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-earth-900">
            {formatCurrencyWithSymbol(total, displayCurrency)}
          </div>
          <div className="text-xs text-earth-500">
            {hasMixedCurrencies && hasRates && convertedFrom.length > 0
              ? `Includes conversions from ${[...new Set(convertedFrom)].join(', ')}`
              : 'Total spend'}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {categoryData.map((cat) => (
          <div key={cat.category} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <cat.Icon className="h-3.5 w-3.5 text-earth-500" strokeWidth={1.5} />
              <span className="text-xs text-earth-700">{cat.category}</span>
            </div>
            <span className="text-xs font-medium text-foreground tabular-nums">
              {formatCurrencyWithSymbol(cat.amount, cat.currency)}
            </span>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border text-xs text-earth-600">
          <TrendingUp className="h-3 w-3" />
          <span>Track your spending in the Budget tab</span>
        </div>
      )}
    </div>
  );
};

export default React.memo(DaySummaryCard);

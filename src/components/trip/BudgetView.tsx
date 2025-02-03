import React, { useState, useEffect } from 'react';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface BudgetViewProps {
  tripId: string | undefined;
}

interface ExchangeRate {
  currency_from: string;
  currency_to: string;
  rate: number;
  last_updated: string;
}

const BudgetView: React.FC<BudgetViewProps> = ({ tripId }) => {
  const { events } = useTimelineEvents(tripId);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const fetchExchangeRates = async () => {
      const usedCurrencies = new Set<string>();
      events?.forEach(event => {
        if (event.accommodation_currency) usedCurrencies.add(event.accommodation_currency);
        if (event.transportation_currency) usedCurrencies.add(event.transportation_currency);
        event.activities?.forEach(activity => {
          if (activity.currency) usedCurrencies.add(activity.currency);
        });
      });

      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .in('currency_from', Array.from(usedCurrencies))
        .eq('currency_to', selectedCurrency);

      if (error) {
        console.error('Error fetching exchange rates:', error);
      } else if (data && data.length > 0) {
        setExchangeRates(data);
        setLastUpdated(data[0].last_updated);
      }
    };

    fetchExchangeRates();
  }, [events, selectedCurrency]);

  const convertAmount = (amount: number, fromCurrency: string) => {
    if (fromCurrency === selectedCurrency) return amount;
    const rate = exchangeRates.find(r => r.currency_from === fromCurrency)?.rate || 1;
    return amount * rate;
  };

  const calculateTotals = () => {
    let accommodationTotal = 0;
    let transportationTotal = 0;
    let activitiesTotal = 0;

    events?.forEach(event => {
      if (event.accommodation_cost && event.accommodation_currency) {
        accommodationTotal += convertAmount(Number(event.accommodation_cost), event.accommodation_currency);
      }
      if (event.transportation_cost && event.transportation_currency) {
        transportationTotal += convertAmount(Number(event.transportation_cost), event.transportation_currency);
      }
      event.activities?.forEach(activity => {
        if (activity.cost && activity.currency) {
          activitiesTotal += convertAmount(Number(activity.cost), activity.currency);
        }
      });
    });

    return {
      accommodation: accommodationTotal,
      transportation: transportationTotal,
      activities: activitiesTotal,
      total: accommodationTotal + transportationTotal + activitiesTotal
    };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-earth-500">Trip Budget</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Display in:</span>
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </div>
        {lastUpdated && (
          <p className="text-sm text-gray-500">
            Exchange rates last updated: {format(new Date(lastUpdated), 'PPpp')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500">Accommodation</h3>
          <p className="text-2xl font-bold">{selectedCurrency} {totals.accommodation.toFixed(2)}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500">Transportation</h3>
          <p className="text-2xl font-bold">{selectedCurrency} {totals.transportation.toFixed(2)}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500">Activities</h3>
          <p className="text-2xl font-bold">{selectedCurrency} {totals.activities.toFixed(2)}</p>
        </Card>
        <Card className="p-6 bg-earth-50">
          <h3 className="text-sm font-medium text-earth-500">Total</h3>
          <p className="text-2xl font-bold text-earth-500">{selectedCurrency} {totals.total.toFixed(2)}</p>
        </Card>
      </div>

      <div className="mt-8">
        {/* We'll implement the detailed expense list and add expense form in the next iteration */}
      </div>
    </div>
  );
};

export default BudgetView;
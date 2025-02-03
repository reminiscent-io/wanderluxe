import React, { useState, useEffect } from 'react';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, ChevronRight, Edit2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface BudgetViewProps {
  tripId: string | undefined;
}

const BudgetView: React.FC<BudgetViewProps> = ({ tripId }) => {
  const { events } = useTimelineEvents(tripId);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [exchangeRates, setExchangeRates] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);

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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleUpdateCost = async (eventId: string, field: string, value: number, currency: string) => {
    try {
      const { error } = await supabase
        .from('timeline_events')
        .update({ [`${field}_cost`]: value, [`${field}_currency`]: currency })
        .eq('id', eventId);

      if (error) throw error;
      toast.success('Cost updated successfully');
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating cost:', error);
      toast.error('Failed to update cost');
    }
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

  const renderExpenseDetails = (type: 'accommodation' | 'transportation' | 'activities') => {
    return events?.map(event => {
      if (type === 'activities') {
        return event.activities?.map(activity => (
          <div key={activity.id} className="pl-4 py-2 flex justify-between items-center">
            <span>{activity.text}</span>
            {editingItem === activity.id ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={activity.cost}
                  onChange={(e) => {/* Handle cost update */}}
                  className="w-24"
                />
                <Select value={activity.currency}>
                  <SelectTrigger className="w-24">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {["USD", "EUR", "GBP", "JPY", "AUD", "CAD"].map(curr => (
                      <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => setEditingItem(null)}>Save</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>{activity.cost} {activity.currency}</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setEditingItem(activity.id)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ));
      }

      const cost = type === 'accommodation' ? event.accommodation_cost : event.transportation_cost;
      const currency = type === 'accommodation' ? event.accommodation_currency : event.transportation_currency;

      if (!cost) return null;

      return (
        <div key={`${event.id}-${type}`} className="pl-4 py-2 flex justify-between items-center">
          <span>{event.date} - {event.title}</span>
          {editingItem === `${event.id}-${type}` ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={cost}
                onChange={(e) => {/* Handle cost update */}}
                className="w-24"
              />
              <Select value={currency}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  {["USD", "EUR", "GBP", "JPY", "AUD", "CAD"].map(curr => (
                    <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => setEditingItem(null)}>Save</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>{cost} {currency}</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setEditingItem(`${event.id}-${type}`)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      );
    });
  };

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
        <Card 
          className="p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => toggleSection('accommodation')}
        >
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-500">Accommodation</h3>
            {expandedSections.includes('accommodation') ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </div>
          <p className="text-2xl font-bold">{selectedCurrency} {totals.accommodation.toFixed(2)}</p>
          {expandedSections.includes('accommodation') && (
            <div className="mt-4 border-t pt-4">
              {renderExpenseDetails('accommodation')}
            </div>
          )}
        </Card>

        <Card 
          className="p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => toggleSection('transportation')}
        >
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-500">Transportation</h3>
            {expandedSections.includes('transportation') ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </div>
          <p className="text-2xl font-bold">{selectedCurrency} {totals.transportation.toFixed(2)}</p>
          {expandedSections.includes('transportation') && (
            <div className="mt-4 border-t pt-4">
              {renderExpenseDetails('transportation')}
            </div>
          )}
        </Card>

        <Card 
          className="p-6 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => toggleSection('activities')}
        >
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-500">Activities</h3>
            {expandedSections.includes('activities') ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </div>
          <p className="text-2xl font-bold">{selectedCurrency} {totals.activities.toFixed(2)}</p>
          {expandedSections.includes('activities') && (
            <div className="mt-4 border-t pt-4">
              {renderExpenseDetails('activities')}
            </div>
          )}
        </Card>

        <Card className="p-6 bg-earth-50">
          <h3 className="text-sm font-medium text-earth-500">Total</h3>
          <p className="text-2xl font-bold text-earth-500">
            {selectedCurrency} {totals.total.toFixed(2)}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default BudgetView;
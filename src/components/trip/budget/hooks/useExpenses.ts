
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

// Define table types
type DayActivity = Tables<'day_activities'>;
type Accommodation = Tables<'accommodations'>;
type Transportation = Tables<'transportation'>;
type RestaurantReservation = Tables<'reservations'>;
type OtherExpense = Tables<'other_expenses'>;

// Define the base expense item type
export type ExpenseItem = {
  id: string;
  trip_id: string;
  category: string;
  description: string;
  cost: number | null;
  currency: string | null;
  is_paid: boolean;
  created_at: string;
  activity_id?: string;
  accommodation_id?: string;
  transportation_id?: string;
};

// Define the query result type
export type ExpensesQueryResult = {
  items: ExpenseItem[];
  exchangeRates: any[]; // Simplified for now
};

// Helper functions to map different expense types
const mapActivityToExpense = (act: DayActivity): ExpenseItem => ({
  id: act.id,
  trip_id: act.trip_id,
  category: 'Activities',
  description: act.title,
  cost: act.cost,
  currency: act.currency,
  is_paid: act.is_paid || false,
  created_at: act.created_at,
  activity_id: act.id
});

const mapAccommodationToExpense = (acc: Accommodation): ExpenseItem => ({
  id: acc.stay_id,
  trip_id: acc.trip_id,
  category: 'Accommodations',
  description: acc.title,
  cost: acc.cost,
  currency: acc.currency,
  is_paid: acc.is_paid || false,
  created_at: acc.created_at,
  accommodation_id: acc.stay_id
});

const mapTransportationToExpense = (trans: Transportation): ExpenseItem => ({
  id: trans.id,
  trip_id: trans.trip_id,
  category: 'Transportation',
  description: trans.type,
  cost: trans.cost,
  currency: trans.currency,
  is_paid: trans.is_paid || false,
  created_at: trans.created_at,
  transportation_id: trans.id
});

const mapRestaurantToExpense = (rest: RestaurantReservation): ExpenseItem => ({
  id: rest.id,
  trip_id: rest.trip_id,
  category: 'Dining',
  description: rest.restaurant_name,
  cost: rest.cost,
  currency: rest.currency,
  is_paid: rest.is_paid || false,
  created_at: rest.created_at
});

const mapOtherExpenseToExpense = (expense: OtherExpense): ExpenseItem => ({
  id: expense.id,
  trip_id: expense.trip_id,
  category: 'Other',
  description: expense.description,
  cost: expense.cost,
  currency: expense.currency,
  is_paid: expense.is_paid || false,
  created_at: expense.created_at
});

export const useExpenses = (tripId: string) => {
  return useQuery<ExpensesQueryResult>({
    queryKey: ['expenses', tripId],
    queryFn: async () => {
      const [
        { data: activities },
        { data: accommodations },
        { data: transportation },
        { data: restaurants },
        { data: otherExpenses }
      ] = await Promise.all([
        supabase.from('day_activities').select('*').eq('trip_id', tripId),
        supabase.from('accommodations').select('*').eq('trip_id', tripId),
        supabase.from('transportation').select('*').eq('trip_id', tripId),
        supabase.from('reservations').select('*').eq('trip_id', tripId),
        supabase.from('other_expenses').select('*').eq('trip_id', tripId),
      ]);

      const mappedExpenses: ExpenseItem[] = [
        ...((activities || []) as DayActivity[]).map(mapActivityToExpense),
        ...((accommodations || []) as Accommodation[]).map(mapAccommodationToExpense),
        ...((transportation || []) as Transportation[]).map(mapTransportationToExpense),
        ...((restaurants || []) as RestaurantReservation[]).map(mapRestaurantToExpense),
        ...((otherExpenses || []) as OtherExpense[]).map(mapOtherExpenseToExpense)
      ];

      return {
        items: mappedExpenses,
        exchangeRates: [] // Simplified for now
      };
    },
    enabled: !!tripId
  });
};

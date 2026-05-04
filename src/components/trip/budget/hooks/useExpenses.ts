import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type DayActivity = Tables<'day_activities'>;
type Accommodation = Tables<'accommodations'>;
type Transportation = Tables<'transportation'>;
type RestaurantReservation = Tables<'reservations'>;
type OtherExpense = Tables<'other_expenses'>;
type ExchangeRate = Tables<'exchange_rates'>;

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
  date: string;
};

export type ExpensesQueryResult = {
  items: ExpenseItem[];
  exchangeRates: ExchangeRate[];
};

export const useExpenses = (tripId: string) => {
  return useQuery<ExpensesQueryResult>({
    queryKey: ['expenses', tripId],
    queryFn: async () => {
      const [
        { data: tripDays },
        { data: activities },
        { data: accommodations },
        { data: transportation },
        { data: restaurants },
        { data: otherExpenses },
      ] = await Promise.all([
        supabase.from('trip_days').select('day_id, date').eq('trip_id', tripId),
        supabase.from('day_activities').select('*').eq('trip_id', tripId),
        supabase.from('accommodations').select('*').eq('trip_id', tripId),
        supabase.from('transportation').select('*').eq('trip_id', tripId),
        supabase.from('reservations').select('*').eq('trip_id', tripId),
        supabase.from('other_expenses').select('*').eq('trip_id', tripId),
      ]);

      const dayDateById = new Map<string, string>();
      (tripDays ?? []).forEach((d) => {
        if (d.day_id && d.date) dayDateById.set(d.day_id, d.date);
      });

      const items: ExpenseItem[] = [];

      ((activities ?? []) as DayActivity[]).forEach((act) => {
        items.push({
          id: act.id,
          trip_id: act.trip_id,
          category: 'Activities',
          description: act.title,
          cost: act.cost,
          currency: act.currency,
          is_paid: false,
          created_at: act.created_at,
          activity_id: act.id,
          date: dayDateById.get(act.day_id) ?? '',
        });
      });

      ((accommodations ?? []) as Accommodation[]).forEach((acc) => {
        items.push({
          id: acc.stay_id,
          trip_id: acc.trip_id,
          category: 'accommodation',
          description: acc.title,
          cost: acc.cost,
          currency: acc.currency,
          is_paid: acc.is_paid ?? false,
          created_at: acc.created_at,
          accommodation_id: acc.stay_id,
          date: acc.hotel_checkin_date || acc.created_at,
        });
      });

      ((transportation ?? []) as Transportation[]).forEach((trans) => {
        items.push({
          id: trans.id,
          trip_id: trans.trip_id,
          category: 'Transportation',
          description: trans.type,
          cost: trans.cost,
          currency: trans.currency,
          is_paid: false,
          created_at: trans.created_at,
          transportation_id: trans.id,
          date: trans.start_date || trans.created_at,
        });
      });

      ((restaurants ?? []) as RestaurantReservation[]).forEach((rest) => {
        items.push({
          id: rest.id,
          trip_id: rest.trip_id,
          category: 'Dining',
          description: rest.restaurant_name,
          cost: rest.cost,
          currency: rest.currency,
          is_paid: false,
          created_at: rest.created_at,
          date: dayDateById.get(rest.day_id) ?? '',
        });
      });

      ((otherExpenses ?? []) as OtherExpense[]).forEach((expense) => {
        items.push({
          id: expense.id,
          trip_id: expense.trip_id,
          category: 'Other',
          description: expense.description,
          cost: expense.cost,
          currency: expense.currency,
          is_paid: false,
          created_at: expense.created_at,
          date: expense.expense_date || expense.created_at,
        });
      });

      return { items, exchangeRates: [] };
    },
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000,
  });
};

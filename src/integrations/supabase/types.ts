export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      activities: {
        Row: {
          cost: number | null
          created_at: string
          currency: string | null
          event_id: string
          id: string
          text: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          currency?: string | null
          event_id: string
          id?: string
          text: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          currency?: string | null
          event_id?: string
          id?: string
          text?: string
        }
      }
      day_activities: {
        Row: {
          cost: number | null
          created_at: string
          currency: string | null
          day_id: string
          description: string | null
          end_time: string | null
          id: string
          order_index: number
          start_time: string | null
          title: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          currency?: string | null
          day_id: string
          description?: string | null
          end_time?: string | null
          id?: string
          order_index: number
          start_time?: string | null
          title: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          currency?: string | null
          day_id?: string
          description?: string | null
          end_time?: string | null
          id?: string
          order_index?: number
          start_time?: string | null
          title?: string
        }
      }
      exchange_rates: {
        Row: {
          currency_from: string
          currency_to: string
          id: string
          last_updated: string | null
          rate: number
        }
        Insert: {
          currency_from: string
          currency_to: string
          id?: string
          last_updated?: string | null
          rate: number
        }
        Update: {
          currency_from?: string
          currency_to?: string
          id?: string
          last_updated?: string | null
          rate?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          home_location: string | null
          id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          home_location?: string | null
          id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          home_location?: string | null
          id?: string
          username?: string | null
        }
        Relationships: []
      }
      timeline_events: {
        Row: {
          created_at: string
          date: string
          description: string | null
          expense_cost: number | null
          expense_currency: string | null
          expense_date: string | null
          expense_paid: boolean | null
          expense_type: string | null
          final_accommodation_day: string | null
          hotel: string | null
          hotel_checkin_date: string | null
          hotel_checkout_date: string | null
          hotel_details: string | null
          hotel_url: string | null
          id: string
          image_url: string | null
          order_index: number
          title: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          expense_cost?: number | null
          expense_currency?: string | null
          expense_date?: string | null
          expense_paid?: boolean | null
          expense_type?: string | null
          final_accommodation_day?: string | null
          hotel?: string | null
          hotel_checkin_date?: string | null
          hotel_checkout_date?: string | null
          hotel_details?: string | null
          hotel_url?: string | null
          id?: string
          image_url?: string | null
          order_index: number
          title: string
          trip_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          expense_cost?: number | null
          expense_currency?: string | null
          expense_date?: string | null
          expense_paid?: boolean | null
          expense_type?: string | null
          final_accommodation_day?: string | null
          hotel?: string | null
          hotel_checkin_date?: string | null
          hotel_checkout_date?: string | null
          hotel_details?: string | null
          hotel_url?: string | null
          id?: string
          image_url?: string | null
          order_index?: number
          title?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_days: {
        Row: {
          created_at: string
          date: string
          description: string | null
          id: string
          title: string | null
          trip_id: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          id?: string
          title?: string | null
          trip_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          title?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          cover_image_url: string | null
          created_at: string
          destination: string
          end_date: string
          hidden: boolean | null
          id: string
          start_date: string
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          destination: string
          end_date: string
          hidden?: boolean | null
          id?: string
          start_date: string
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          destination?: string
          end_date?: string
          hidden?: boolean | null
          id?: string
          start_date?: string
          user_id?: string
        }
        Relationships: []
      }
      transportation_events: {
        Row: {
          id: string;
          trip_id: string;
          type: 'flight' | 'train' | 'car_service' | 'shuttle' | 'ferry' | 'rental_car';
          provider?: string;
          details?: string;
          confirmation_number?: string;
          start_date: string;
          start_time?: string;
          end_date?: string;
          end_time?: string;
          departure_location?: string;
          arrival_location?: string;
          cost?: number;
          currency?: string;
          created_at: string;
        }
        Insert: {
          id?: string;
          trip_id: string;
          type: 'flight' | 'train' | 'car_service' | 'shuttle' | 'ferry' | 'rental_car';
          provider?: string;
          details?: string;
          confirmation_number?: string;
          start_date: string;
          start_time?: string;
          end_date?: string;
          end_time?: string;
          departure_location?: string;
          arrival_location?: string;
          cost?: number;
          currency?: string;
          created_at?: string;
        }
        Update: {
          id?: string;
          trip_id?: string;
          type?: 'flight' | 'train' | 'car_service' | 'shuttle' | 'ferry' | 'rental_car';
          provider?: string;
          details?: string;
          confirmation_number?: string;
          start_date?: string;
          start_time?: string;
          end_date?: string;
          end_time?: string;
          departure_location?: string;
          arrival_location?: string;
          cost?: number;
          currency?: string;
          created_at?: string;
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

export type TransportationEvent = {
  id: string;
  trip_id: string;
  type: 'flight' | 'train' | 'car_service' | 'shuttle' | 'ferry' | 'rental_car';
  provider?: string;
  details?: string;
  confirmation_number?: string;
  start_date: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  departure_location?: string;
  arrival_location?: string;
  cost?: number;
  currency?: string;
  created_at: string;
}

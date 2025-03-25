/*
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accommodations: {
        Row: {
          stay_id: string
          trip_id: string
          title: string
          description: string | null
          image_url: string | null
          hotel: string | null
          hotel_details: string | null
          created_at: string
          order_index: number
          expense_type: string | null
          expense_cost: number | null
          currency: string | null
          expense_paid: boolean
          hotel_checkin_date: string | null
          hotel_checkout_date: string | null
          checkin_time: string | null
          checkout_time: string | null          
          hotel_url: string | null
          final_accommodation_day: string | null
          expense_date: string | null
          hotel_address: string | null
          hotel_phone: string | null
          hotel_place_id: string | null
          hotel_website: string | null
        }
        Insert: {
          stay_id?: string
          trip_id: string
          title: string
          description?: string | null
          image_url?: string | null
          hotel?: string | null
          hotel_details?: string | null
          created_at?: string
          order_index: number
          expense_type?: string | null
          expense_cost?: number | null
          currency?: string | null
          expense_paid?: boolean
          hotel_checkin_date?: string | null
          hotel_checkout_date?: string | null
          checkin_time?: string | null
          checkout_time?: string | null
          hotel_url?: string | null
          final_accommodation_day?: string | null
          expense_date?: string | null
          hotel_address?: string | null
          hotel_phone?: string | null
          hotel_place_id?: string | null
          hotel_website?: string | null
        }
        Update: {
          stay_id?: string
          trip_id?: string
          title?: string
          description?: string | null
          image_url?: string | null
          hotel?: string | null
          hotel_details?: string | null
          created_at?: string
          order_index?: number
          expense_type?: string | null
          expense_cost?: number | null
          currency?: string | null
          expense_paid?: boolean
          hotel_checkin_date?: string | null
          hotel_checkout_date?: string | null
          checkin_time?: string | null
          checkout_time?: string | null
          hotel_url?: string | null
          final_accommodation_day?: string | null
          expense_date?: string | null
          hotel_address?: string | null
          hotel_phone?: string | null
          hotel_place_id?: string | null
          hotel_website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accommodations_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["currency"]
          },
          {
            foreignKeyName: "accommodations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          }
        ]
      }
      accommodations_days: {
        Row: {
          id: string
          stay_id: string
          day_id: string
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          stay_id: string
          day_id: string
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          stay_id?: string
          day_id?: string
          date?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodations_days_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "trip_days"
            referencedColumns: ["day_id"]
          },
          {
            foreignKeyName: "accommodations_days_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "accommodations"
            referencedColumns: ["stay_id"]
          }
        ]
      }
      currencies: {
        Row: {
          currency: string
          currency_name: string | null
          symbol: string | null
        }
        Insert: {
          currency: string
          currency_name?: string | null
          symbol?: string | null
        }
        Update: {
          currency?: string
          currency_name?: string | null
          symbol?: string | null
        }
        Relationships: []
      }
      day_activities: {
        Row: {
          id: string
          day_id: string
          title: string
          description: string | null
          start_time: string | null
          end_time: string | null
          cost: number | null
          currency: string
          created_at: string
          order_index: number
        }
        Insert: {
          id?: string
          day_id: string
          title: string
          description?: string | null
          start_time?: string | null
          end_time?: string | null
          cost?: number | null
          currency?: string
          created_at?: string
          order_index: number
        }
        Update: {
          id?: string
          day_id?: string
          title?: string
          description?: string | null
          start_time?: string | null
          end_time?: string | null
          cost?: number | null
          currency?: string
          created_at?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "day_activities_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["currency"]
          },
          {
            foreignKeyName: "day_activities_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "trip_days"
            referencedColumns: ["day_id"]
          }
        ]
      }
      exchange_rates: {
        Row: {
          id: string
          currency_from: string
          currency_to: string
          rate: number
          last_updated: string | null
        }
        Insert: {
          id?: string
          currency_from: string
          currency_to: string
          rate: number
          last_updated?: string | null
        }
        Update: {
          id?: string
          currency_from?: string
          currency_to?: string
          rate?: number
          last_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_currency_from_fkey"
            columns: ["currency_from"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["currency"]
          },
          {
            foreignKeyName: "exchange_rates_currency_to_fkey"
            columns: ["currency_to"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["currency"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          home_location: string | null
        }
        Insert: {
          id: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          home_location?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          home_location?: string | null
        }
        Relationships: []
      }
      reservations: {
        Row: {
          id: string;
          day_id: string;
          trip_id: string; // added trip_id
          restaurant_name: string;
          reservation_time: string | null;
          number_of_people: number | null;
          confirmation_number: string | null;
          notes: string | null;
          cost: number | null;
          currency: string;
          created_at: string;
          order_index: number;
          address: string | null;
          phone_number: string | null;
          website: string | null;
          place_id: string | null;
          rating: number | null;
        };
        Insert: {
          id?: string;
          day_id: string;
          trip_id: string; // added trip_id (required)
          restaurant_name: string;
          reservation_time?: string | null;
          number_of_people?: number | null;
          confirmation_number?: string | null;
          notes?: string | null;
          cost?: number | null;
          currency?: string;
          created_at?: string;
          order_index: number;
          address?: string | null;
          phone_number?: string | null;
          website?: string | null;
          place_id?: string | null;
          rating?: number | null;
        };
        Update: {
          id?: string;
          day_id?: string;
          trip_id?: string; // added trip_id (optional)
          restaurant_name?: string;
          reservation_time?: string | null;
          number_of_people?: number | null;
          confirmation_number?: string | null;
          notes?: string | null;
          cost?: number | null;
          currency?: string;
          created_at?: string;
          order_index?: number;
          address?: string | null;
          phone_number?: string | null;
          website?: string | null;
          place_id?: string | null;
          rating?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_currency_fkey";
            columns: ["currency"];
            isOneToOne: false;
            referencedRelation: "currencies";
            referencedColumns: ["currency"];
          },
          {
            foreignKeyName: "reservations_day_id_fkey";
            columns: ["day_id"];
            isOneToOne: false;
            referencedRelation: "trip_days";
            referencedColumns: ["day_id"];
          },
          {
            foreignKeyName: "reservations_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["trip_id"];
          }
        ]
      }
      transportation: {
        Row: {
          id: string
          trip_id: string
          type: Database["public"]["Enums"]["transportation_type"]
          provider: string | null
          details: string | null
          confirmation_number: string | null
          start_date: string
          start_time: string | null
          end_date: string | null
          end_time: string | null
          departure_location: string | null
          arrival_location: string | null
          cost: number | null
          currency: string
          created_at: string
          is_arrival: boolean
          is_departure: boolean
        }
        Insert: {
          id?: string
          trip_id: string
          type: Database["public"]["Enums"]["transportation_type"]
          provider?: string | null
          details?: string | null
          confirmation_number?: string | null
          start_date: string
          start_time?: string | null
          end_date?: string | null
          end_time?: string | null
          departure_location?: string | null
          arrival_location?: string | null
          cost?: number | null
          currency?: string
          created_at?: string
          is_arrival?: boolean
          is_departure?: boolean
        }
        Update: {
          id?: string
          trip_id?: string
          type?: Database["public"]["Enums"]["transportation_type"]
          provider?: string | null
          details?: string | null
          confirmation_number?: string | null
          start_date?: string
          start_time?: string | null
          end_date?: string | null
          end_time?: string | null
          departure_location?: string | null
          arrival_location?: string | null
          cost?: number | null
          currency?: string
          created_at?: string
          is_arrival?: boolean
          is_departure?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "transportation_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["currency"]
          },
          {
            foreignKeyName: "transportation_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          }
        ]
      }
      trip_days: {
        Row: {
          day_id: string
          trip_id: string
          date: string
          title: string | null
          description: string | null
          created_at: string
          image_url: string | null
        }
        Insert: {
          day_id?: string
          trip_id: string
          date: string
          title?: string | null
          description?: string | null
          created_at?: string
          image_url?: string | null
        }
        Update: {
          day_id?: string
          trip_id?: string
          date?: string
          title?: string | null
          description?: string | null
          created_at?: string
          image_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          }
        ]
      }
      trips: {
        Row: {
          trip_id: string
          user_id: string
          destination: string
          start_date: string
          end_date: string
          cover_image_url: string | null
          created_at: string
          hidden: boolean
          arrival_date: string
          departure_date: string
        }
        Insert: {
          trip_id?: string
          user_id: string
          destination: string
          start_date: string
          end_date: string
          cover_image_url?: string | null
          created_at?: string
          hidden?: boolean
          arrival_date: string
          departure_date: string
        }
        Update: {
          trip_id?: string
          user_id?: string
          destination?: string
          start_date?: string
          end_date?: string
          cover_image_url?: string | null
          created_at?: string
          hidden?: boolean
          arrival_date?: string
          departure_date?: string
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
      transportation_type: "flight" | "train" | "car_service" | "shuttle" | "ferry" | "rental_car"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

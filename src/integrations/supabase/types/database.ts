export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accommodation_travelers: {
        Row: {
          created_at: string
          id: string
          stay_id: string
          traveler_id: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          stay_id: string
          traveler_id: string
          trip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          stay_id?: string
          traveler_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_travelers_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "accommodations"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "accommodation_travelers_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "trip_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accommodation_travelers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
        ]
      }
      accommodations: {
        Row: {
          amount_paid: number | null
          checkin_time: string | null
          checkout_time: string | null
          cost: number | null
          created_at: string
          currency: string | null
          description: string | null
          expense_date: string | null
          expense_type: string | null
          final_accommodation_day: string | null
          hotel: string | null
          hotel_address: string | null
          hotel_checkin_date: string | null
          hotel_checkout_date: string | null
          hotel_details: string | null
          hotel_phone: string | null
          hotel_place_id: string | null
          hotel_url: string | null
          hotel_website: string | null
          image_url: string | null
          is_paid: boolean | null
          order_index: number
          stay_id: string
          timezone: string | null
          title: string
          trip_id: string
        }
        Insert: {
          amount_paid?: number | null
          checkin_time?: string | null
          checkout_time?: string | null
          cost?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          expense_date?: string | null
          expense_type?: string | null
          final_accommodation_day?: string | null
          hotel?: string | null
          hotel_address?: string | null
          hotel_checkin_date?: string | null
          hotel_checkout_date?: string | null
          hotel_details?: string | null
          hotel_phone?: string | null
          hotel_place_id?: string | null
          hotel_url?: string | null
          hotel_website?: string | null
          image_url?: string | null
          is_paid?: boolean | null
          order_index: number
          stay_id?: string
          timezone?: string | null
          title: string
          trip_id: string
        }
        Update: {
          amount_paid?: number | null
          checkin_time?: string | null
          checkout_time?: string | null
          cost?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          expense_date?: string | null
          expense_type?: string | null
          final_accommodation_day?: string | null
          hotel?: string | null
          hotel_address?: string | null
          hotel_checkin_date?: string | null
          hotel_checkout_date?: string | null
          hotel_details?: string | null
          hotel_phone?: string | null
          hotel_place_id?: string | null
          hotel_url?: string | null
          hotel_website?: string | null
          image_url?: string | null
          is_paid?: boolean | null
          order_index?: number
          stay_id?: string
          timezone?: string | null
          title?: string
          trip_id?: string
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
          },
        ]
      }
      accommodations_days: {
        Row: {
          created_at: string
          date: string
          day_id: string
          id: string
          stay_id: string
        }
        Insert: {
          created_at?: string
          date: string
          day_id: string
          id?: string
          stay_id: string
        }
        Update: {
          created_at?: string
          date?: string
          day_id?: string
          id?: string
          stay_id?: string
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
          },
        ]
      }
      admin_insights: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          insight_text: string
          metrics_snapshot: Json
          model: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          insight_text: string
          metrics_snapshot?: Json
          model?: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          insight_text?: string
          metrics_snapshot?: Json
          model?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_threads: {
        Row: {
          created_at: string | null
          id: string
          title: string | null
          trip_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title?: string | null
          trip_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string | null
          trip_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_threads_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
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
          amount_paid: number | null
          cost: number | null
          created_at: string
          currency: string | null
          day_id: string
          description: string | null
          end_time: string | null
          id: string
          is_paid: boolean | null
          location_address: string | null
          location_phone: string | null
          location_place_id: string | null
          location_rating: number | null
          location_website: string | null
          order_index: number
          start_time: string | null
          timezone: string | null
          title: string
          trip_id: string
        }
        Insert: {
          amount_paid?: number | null
          cost?: number | null
          created_at?: string
          currency?: string | null
          day_id: string
          description?: string | null
          end_time?: string | null
          id?: string
          is_paid?: boolean | null
          location_address?: string | null
          location_phone?: string | null
          location_place_id?: string | null
          location_rating?: number | null
          location_website?: string | null
          order_index: number
          start_time?: string | null
          timezone?: string | null
          title: string
          trip_id: string
        }
        Update: {
          amount_paid?: number | null
          cost?: number | null
          created_at?: string
          currency?: string | null
          day_id?: string
          description?: string | null
          end_time?: string | null
          id?: string
          is_paid?: boolean | null
          location_address?: string | null
          location_phone?: string | null
          location_place_id?: string | null
          location_rating?: number | null
          location_website?: string | null
          order_index?: number
          start_time?: string | null
          timezone?: string | null
          title?: string
          trip_id?: string
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
          },
          {
            foreignKeyName: "day_activities_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
        ]
      }
      day_activity_travelers: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          traveler_id: string
          trip_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          traveler_id: string
          trip_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          traveler_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_activity_travelers_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "day_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_activity_travelers_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "trip_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_activity_travelers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
        ]
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
          },
        ]
      }
      expenses: {
        Row: {
          accommodation_id: string | null
          activity_id: string | null
          amount_paid: number | null
          category: string
          cost: number | null
          created_at: string | null
          currency: string | null
          date: string | null
          description: string
          id: string
          is_paid: boolean | null
          transportation_id: string | null
          trip_id: string
        }
        Insert: {
          accommodation_id?: string | null
          activity_id?: string | null
          amount_paid?: number | null
          category: string
          cost?: number | null
          created_at?: string | null
          currency?: string | null
          date?: string | null
          description: string
          id?: string
          is_paid?: boolean | null
          transportation_id?: string | null
          trip_id: string
        }
        Update: {
          accommodation_id?: string | null
          activity_id?: string | null
          amount_paid?: number | null
          category?: string
          cost?: number | null
          created_at?: string | null
          currency?: string | null
          date?: string | null
          description?: string
          id?: string
          is_paid?: boolean | null
          transportation_id?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_accommodation_id_fkey"
            columns: ["accommodation_id"]
            isOneToOne: false
            referencedRelation: "accommodations"
            referencedColumns: ["stay_id"]
          },
          {
            foreignKeyName: "expenses_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "day_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["currency"]
          },
          {
            foreignKeyName: "expenses_transportation_id_fkey"
            columns: ["transportation_id"]
            isOneToOne: false
            referencedRelation: "transportation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
        ]
      }
      flight_status_cache: {
        Row: {
          expires_at: string
          fetched_at: string
          flight_date: string
          flight_iata: string
          payload: Json
        }
        Insert: {
          expires_at?: string
          fetched_at?: string
          flight_date: string
          flight_iata: string
          payload: Json
        }
        Update: {
          expires_at?: string
          fetched_at?: string
          flight_date?: string
          flight_iata?: string
          payload?: Json
        }
        Relationships: []
      }
      other_expenses: {
        Row: {
          amount_paid: number | null
          cost: number | null
          created_at: string
          currency: string | null
          date: string | null
          description: string
          id: string
          is_paid: boolean | null
          trip_id: string
        }
        Insert: {
          amount_paid?: number | null
          cost?: number | null
          created_at?: string
          currency?: string | null
          date?: string | null
          description: string
          id?: string
          is_paid?: boolean | null
          trip_id: string
        }
        Update: {
          amount_paid?: number | null
          cost?: number | null
          created_at?: string
          currency?: string | null
          date?: string | null
          description?: string
          id?: string
          is_paid?: boolean | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "other_expenses_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["currency"]
          },
          {
            foreignKeyName: "other_expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
        ]
      }
      place_coordinates: {
        Row: {
          cache_key: string
          fetched_at: string
          formatted_address: string | null
          lat: number | null
          lng: number | null
          lookup_input: string
          name: string | null
          photo_reference: string | null
          place_id: string | null
          source: string
          status: string
        }
        Insert: {
          cache_key: string
          fetched_at?: string
          formatted_address?: string | null
          lat?: number | null
          lng?: number | null
          lookup_input: string
          name?: string | null
          photo_reference?: string | null
          place_id?: string | null
          source: string
          status?: string
        }
        Update: {
          cache_key?: string
          fetched_at?: string
          formatted_address?: string | null
          lat?: number | null
          lng?: number | null
          lookup_input?: string
          name?: string | null
          photo_reference?: string | null
          place_id?: string | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_imports_limit: number | null
          ai_messages_limit: number | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          home_location: string | null
          id: string
          initials: string | null
          is_admin: boolean | null
          last_login_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_tier: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          ai_imports_limit?: number | null
          ai_messages_limit?: number | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          home_location?: string | null
          id: string
          initials?: string | null
          is_admin?: boolean | null
          last_login_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          ai_imports_limit?: number | null
          ai_messages_limit?: number | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          home_location?: string | null
          id?: string
          initials?: string | null
          is_admin?: boolean | null
          last_login_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      reservation_travelers: {
        Row: {
          created_at: string
          id: string
          reservation_id: string
          traveler_id: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reservation_id: string
          traveler_id: string
          trip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reservation_id?: string
          traveler_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_travelers_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_travelers_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "trip_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_travelers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
        ]
      }
      reservations: {
        Row: {
          address: string | null
          amount_paid: number | null
          confirmation_number: string | null
          cost: number | null
          created_at: string
          currency: string | null
          day_id: string
          end_time: string | null
          id: string
          image_url: string | null
          is_paid: boolean | null
          notes: string | null
          number_of_people: number | null
          order_index: number
          phone_number: string | null
          place_id: string | null
          rating: number | null
          reservation_time: string | null
          restaurant_name: string
          timezone: string | null
          trip_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          amount_paid?: number | null
          confirmation_number?: string | null
          cost?: number | null
          created_at?: string
          currency?: string | null
          day_id: string
          end_time?: string | null
          id?: string
          image_url?: string | null
          is_paid?: boolean | null
          notes?: string | null
          number_of_people?: number | null
          order_index: number
          phone_number?: string | null
          place_id?: string | null
          rating?: number | null
          reservation_time?: string | null
          restaurant_name: string
          timezone?: string | null
          trip_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          amount_paid?: number | null
          confirmation_number?: string | null
          cost?: number | null
          created_at?: string
          currency?: string | null
          day_id?: string
          end_time?: string | null
          id?: string
          image_url?: string | null
          is_paid?: boolean | null
          notes?: string | null
          number_of_people?: number | null
          order_index?: number
          phone_number?: string | null
          place_id?: string | null
          rating?: number | null
          reservation_time?: string | null
          restaurant_name?: string
          timezone?: string | null
          trip_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_reservations_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["currency"]
          },
          {
            foreignKeyName: "restaurant_reservations_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "trip_days"
            referencedColumns: ["day_id"]
          },
          {
            foreignKeyName: "restaurant_reservations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
        ]
      }
      timezone_cache: {
        Row: {
          fetched_at: string
          place_id: string
          timezone_id: string
        }
        Insert: {
          fetched_at?: string
          place_id: string
          timezone_id: string
        }
        Update: {
          fetched_at?: string
          place_id?: string
          timezone_id?: string
        }
        Relationships: []
      }
      transportation: {
        Row: {
          arrival_location: string | null
          arrival_timezone: string | null
          confirmation_number: string | null
          cost: number | null
          created_at: string
          currency: string | null
          departure_location: string | null
          departure_timezone: string | null
          details: string | null
          end_date: string | null
          end_time: string | null
          flight_number: string | null
          flight_status_fetched_at: string | null
          id: string
          provider: string | null
          scheduled_end_time: string | null
          scheduled_start_time: string | null
          start_date: string
          start_time: string | null
          trip_id: string
          type: Database["public"]["Enums"]["transportation_type"]
        }
        Insert: {
          arrival_location?: string | null
          arrival_timezone?: string | null
          confirmation_number?: string | null
          cost?: number | null
          created_at?: string
          currency?: string | null
          departure_location?: string | null
          departure_timezone?: string | null
          details?: string | null
          end_date?: string | null
          end_time?: string | null
          flight_number?: string | null
          flight_status_fetched_at?: string | null
          id?: string
          provider?: string | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          start_date: string
          start_time?: string | null
          trip_id: string
          type: Database["public"]["Enums"]["transportation_type"]
        }
        Update: {
          arrival_location?: string | null
          arrival_timezone?: string | null
          confirmation_number?: string | null
          cost?: number | null
          created_at?: string
          currency?: string | null
          departure_location?: string | null
          departure_timezone?: string | null
          details?: string | null
          end_date?: string | null
          end_time?: string | null
          flight_number?: string | null
          flight_status_fetched_at?: string | null
          id?: string
          provider?: string | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
          start_date?: string
          start_time?: string | null
          trip_id?: string
          type?: Database["public"]["Enums"]["transportation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transportation_events_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["currency"]
          },
          {
            foreignKeyName: "transportation_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
        ]
      }
      transportation_travelers: {
        Row: {
          created_at: string
          id: string
          transportation_id: string
          traveler_id: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          transportation_id: string
          traveler_id: string
          trip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          transportation_id?: string
          traveler_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transportation_travelers_transportation_id_fkey"
            columns: ["transportation_id"]
            isOneToOne: false
            referencedRelation: "transportation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transportation_travelers_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "trip_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transportation_travelers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
        ]
      }
      trip_days: {
        Row: {
          created_at: string
          date: string
          day_id: string
          description: string | null
          image_position: string | null
          image_url: string | null
          title: string | null
          trip_id: string
        }
        Insert: {
          created_at?: string
          date: string
          day_id?: string
          description?: string | null
          image_position?: string | null
          image_url?: string | null
          title?: string | null
          trip_id: string
        }
        Update: {
          created_at?: string
          date?: string
          day_id?: string
          description?: string | null
          image_position?: string | null
          image_url?: string | null
          title?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
        ]
      }
      trip_invite_links: {
        Row: {
          created_at: string
          created_by_user_id: string
          expires_at: string | null
          id: string
          invite_code: string
          is_active: boolean
          permission_level: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          expires_at?: string | null
          id?: string
          invite_code: string
          is_active?: boolean
          permission_level: string
          trip_id: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          expires_at?: string | null
          id?: string
          invite_code?: string
          is_active?: boolean
          permission_level?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_invite_links_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
        ]
      }
      trip_print_designs: {
        Row: {
          created_at: string
          created_by: string
          design: Json
          id: string
          model: string | null
          theme_prompt: string | null
          trip_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          design: Json
          id?: string
          model?: string | null
          theme_prompt?: string | null
          trip_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          design?: Json
          id?: string
          model?: string | null
          theme_prompt?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_print_designs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
        ]
      }
      trip_reminder_sends: {
        Row: {
          sent_at: string
          sent_on: string
          trip_id: string
        }
        Insert: {
          sent_at?: string
          sent_on: string
          trip_id: string
        }
        Update: {
          sent_at?: string
          sent_on?: string
          trip_id?: string
        }
        Relationships: []
      }
      trip_shares: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          is_owner: boolean | null
          last_name: string | null
          permission_level: string
          share_status: Database["public"]["Enums"]["trip_share_status"]
          shared_by_user_id: string
          shared_with_email: string | null
          shared_with_user_id: string | null
          trip_id: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id?: string
          is_owner?: boolean | null
          last_name?: string | null
          permission_level?: string
          share_status?: Database["public"]["Enums"]["trip_share_status"]
          shared_by_user_id: string
          shared_with_email?: string | null
          shared_with_user_id?: string | null
          trip_id: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          is_owner?: boolean | null
          last_name?: string | null
          permission_level?: string
          share_status?: Database["public"]["Enums"]["trip_share_status"]
          shared_by_user_id?: string
          shared_with_email?: string | null
          shared_with_user_id?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_shares_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
        ]
      }
      trip_view_status: {
        Row: {
          created_at: string | null
          currently_viewing: boolean | null
          id: string
          last_viewed_at: string | null
          presence_updated_at: string | null
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currently_viewing?: boolean | null
          id?: string
          last_viewed_at?: string | null
          presence_updated_at?: string | null
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          currently_viewing?: boolean | null
          id?: string
          last_viewed_at?: string | null
          presence_updated_at?: string | null
          trip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_view_status_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
        ]
      }
      trips: {
        Row: {
          arrival_date: string
          budget: number | null
          calendar_feed_enabled: boolean
          calendar_feed_token: string | null
          cover_image_photographer: string | null
          cover_image_photographer_username: string | null
          cover_image_position: string | null
          cover_image_url: string | null
          created_at: string
          departure_date: string
          destination: string
          hidden: boolean | null
          image_position: string | null
          is_public: boolean
          primary_destination: string | null
          primary_destination_place_id: string | null
          slug: string | null
          summary: string | null
          timezone: string | null
          trip_id: string
          user_id: string
        }
        Insert: {
          arrival_date: string
          budget?: number | null
          calendar_feed_enabled?: boolean
          calendar_feed_token?: string | null
          cover_image_photographer?: string | null
          cover_image_photographer_username?: string | null
          cover_image_position?: string | null
          cover_image_url?: string | null
          created_at?: string
          departure_date: string
          destination: string
          hidden?: boolean | null
          image_position?: string | null
          is_public?: boolean
          primary_destination?: string | null
          primary_destination_place_id?: string | null
          slug?: string | null
          summary?: string | null
          timezone?: string | null
          trip_id?: string
          user_id: string
        }
        Update: {
          arrival_date?: string
          budget?: number | null
          calendar_feed_enabled?: boolean
          calendar_feed_token?: string | null
          cover_image_photographer?: string | null
          cover_image_photographer_username?: string | null
          cover_image_position?: string | null
          cover_image_url?: string | null
          created_at?: string
          departure_date?: string
          destination?: string
          hidden?: boolean | null
          image_position?: string | null
          is_public?: boolean
          primary_destination?: string | null
          primary_destination_place_id?: string | null
          slug?: string | null
          summary?: string | null
          timezone?: string | null
          trip_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ai_usage: {
        Row: {
          date: string
          id: string
          import_count: number | null
          message_count: number | null
          user_id: string
        }
        Insert: {
          date: string
          id?: string
          import_count?: number | null
          message_count?: number | null
          user_id: string
        }
        Update: {
          date?: string
          id?: string
          import_count?: number | null
          message_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_engagement_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      weather_cache: {
        Row: {
          created_at: string
          expires_at: string
          fetched_at: string
          forecast_data: Json
          id: string
          location: string
          location_normalized: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          fetched_at?: string
          forecast_data: Json
          id?: string
          location: string
          location_normalized: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          fetched_at?: string
          forecast_data?: Json
          id?: string
          location?: string
          location_normalized?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_trip_share: { Args: { share_id: string }; Returns: boolean }
      admin_get_active_users: { Args: { days_back?: number }; Returns: number }
      admin_get_daily_unique_users: {
        Args: { days_back?: number }
        Returns: {
          event_date: string
          unique_users: number
        }[]
      }
      admin_get_engagement_over_time: {
        Args: { days_back?: number }
        Returns: {
          event_count: number
          event_date: string
        }[]
      }
      admin_get_engagement_summary: {
        Args: { days_back?: number }
        Returns: {
          event_count: number
          event_type: string
          unique_users: number
        }[]
      }
      admin_get_insights: {
        Args: { page_limit?: number; page_offset?: number }
        Returns: {
          created_at: string
          id: string
          insight_text: string
          metrics_snapshot: Json
          model: string
        }[]
      }
      admin_get_new_users: { Args: { days_back?: number }; Returns: number }
      admin_get_shares_over_time: {
        Args: { weeks_back?: number }
        Returns: {
          share_count: number
          week_start: string
        }[]
      }
      admin_get_sharing_stats: {
        Args: never
        Returns: {
          shared_trips: number
          shares_this_month: number
          total_shares: number
        }[]
      }
      admin_get_signups_by_week: {
        Args: { weeks_back?: number }
        Returns: {
          signup_count: number
          week_start: string
        }[]
      }
      admin_get_subscription_stats: {
        Args: never
        Returns: {
          tier: string
          user_count: number
        }[]
      }
      admin_get_table_count: { Args: { table_name: string }; Returns: number }
      admin_get_trip_stats: {
        Args: never
        Returns: {
          active_trips: number
          past_trips: number
          total_trips: number
          upcoming_trips: number
        }[]
      }
      admin_get_user_count: { Args: never; Returns: number }
      can_access_trip: { Args: { check_trip_id: string }; Returns: boolean }
      can_edit_trip: { Args: { check_trip_id: string }; Returns: boolean }
      current_email: { Args: never; Returns: string }
      get_ai_import_usage: {
        Args: { check_date: string; check_user_id: string }
        Returns: {
          current_count: number
          daily_limit: number
          subscription_tier: string
        }[]
      }
      get_ai_usage: {
        Args: { check_date: string; check_user_id: string }
        Returns: {
          current_count: number
          daily_limit: number
          subscription_tier: string
        }[]
      }
      get_expenses_by_category:
        | {
            Args: never
            Returns: {
              category: string
              total: number
            }[]
          }
        | { Args: { category: string; expenses: Json }; Returns: Json }
      get_invite_link_preview: {
        Args: { p_invite_code: string }
        Returns: {
          arrival_date: string
          cover_image_url: string
          departure_date: string
          destination: string
          inviter_name: string
          trip_id: string
        }[]
      }
      get_pending_trip_preview: {
        Args: { p_share_id: string }
        Returns: {
          arrival_date: string
          cover_image_url: string
          departure_date: string
          destination: string
          primary_destination: string
          trip_id: string
        }[]
      }
      get_user_id_by_email: { Args: { lookup_email: string }; Returns: string }
      increment_ai_import_usage: {
        Args: { check_date: string; check_user_id: string }
        Returns: {
          allowed: boolean
          current_count: number
          daily_limit: number
        }[]
      }
      increment_ai_usage: {
        Args: { check_date: string; check_user_id: string }
        Returns: {
          allowed: boolean
          current_count: number
          daily_limit: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_trip_owner: { Args: { check_trip_id: string }; Returns: boolean }
      map_extraction_to_tables: {
        Args: { extraction: Json; in_trip_id: string }
        Returns: undefined
      }
      redeem_invite_link: { Args: { p_invite_code: string }; Returns: string }
      user_has_edit_permission: {
        Args: { trip_id_param: string }
        Returns: boolean
      }
      user_has_read_permission: {
        Args: { trip_id_param: string }
        Returns: boolean
      }
      user_owns_thread: { Args: { check_thread_id: string }; Returns: boolean }
    }
    Enums: {
      transportation_type:
        | "flight"
        | "train"
        | "car_service"
        | "shuttle"
        | "ferry"
        | "rental_car"
      trip_share_status: "pending" | "accepted"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      transportation_type: [
        "flight",
        "train",
        "car_service",
        "shuttle",
        "ferry",
        "rental_car",
      ],
      trip_share_status: ["pending", "accepted"],
    },
  },
} as const


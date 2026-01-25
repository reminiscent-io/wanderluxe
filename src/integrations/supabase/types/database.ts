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
      accommodation_travelers: {
        Row: {
          id: string
          trip_id: string
          stay_id: string
          traveler_id: string
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          stay_id: string
          traveler_id: string
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          stay_id?: string
          traveler_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_travelers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
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
          }
        ]
      }
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
          cost: number | null
          currency: string | null
          is_paid: boolean | null
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
          amount_paid: number | null
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
          cost?: number | null
          currency?: string | null
          is_paid?: boolean | null
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
          amount_paid?: number | null
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
          cost?: number | null
          currency?: string | null
          is_paid?: boolean | null
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
          amount_paid?: number | null
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
      day_activity_travelers: {
        Row: {
          id: string
          trip_id: string
          activity_id: string
          traveler_id: string
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          activity_id: string
          traveler_id: string
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          activity_id?: string
          traveler_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_activity_travelers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
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
      other_expenses: {
        Row: {
          id: string
          trip_id: string
          title: string
          description: string | null
          cost: number | null
          currency: string
          created_at: string
          expense_date: string | null
        }
        Insert: {
          id?: string
          trip_id: string
          title: string
          description?: string | null
          cost?: number | null
          currency?: string
          created_at?: string
          expense_date?: string | null
        }
        Update: {
          id?: string
          trip_id?: string
          title?: string
          description?: string | null
          cost?: number | null
          currency?: string
          created_at?: string
          expense_date?: string | null
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
          updated_at: string | null
          last_login_at: string | null
          subscription_tier: string | null
          ai_messages_limit: number | null
          ai_imports_limit: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          id: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          home_location?: string | null
          updated_at?: string | null
          last_login_at?: string | null
          subscription_tier?: string | null
          ai_messages_limit?: number | null
          ai_imports_limit?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          home_location?: string | null
          updated_at?: string | null
          last_login_at?: string | null
          subscription_tier?: string | null
          ai_messages_limit?: number | null
          ai_imports_limit?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: []
      }
      reservation_travelers: {
        Row: {
          id: string
          trip_id: string
          reservation_id: string
          traveler_id: string
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          reservation_id: string
          traveler_id: string
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          reservation_id?: string
          traveler_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_travelers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
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
          }
        ]
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
      transportation_travelers: {
        Row: {
          id: string
          trip_id: string
          transportation_id: string
          traveler_id: string
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          transportation_id: string
          traveler_id: string
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          transportation_id?: string
          traveler_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transportation_travelers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          },
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
      trip_shares: {
        Row: {
          id: string
          trip_id: string
          shared_by_user_id: string
          shared_with_user_id: string | null
          shared_with_email: string | null
          first_name: string
          last_name: string | null
          is_owner: boolean
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          shared_by_user_id: string
          shared_with_user_id?: string | null
          shared_with_email?: string | null
          first_name: string
          last_name?: string | null
          is_owner?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          shared_by_user_id?: string
          shared_with_user_id?: string | null
          shared_with_email?: string | null
          first_name?: string
          last_name?: string | null
          is_owner?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_shares_trip_id_fkey"
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
          budget: number | null
          is_public: boolean
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
          budget?: number | null
          is_public?: boolean
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
          budget?: number | null
          is_public?: boolean
        }
        Relationships: []
      }
      vision_board_items: {
        Row: {
          id: string
          trip_id: string
          title: string
          description: string | null
          image_url: string | null
          link_url: string | null
          created_at: string
          order_index: number
        }
        Insert: {
          id?: string
          trip_id: string
          title: string
          description?: string | null
          image_url?: string | null
          link_url?: string | null
          created_at?: string
          order_index: number
        }
        Update: {
          id?: string
          trip_id?: string
          title?: string
          description?: string | null
          image_url?: string | null
          link_url?: string | null
          created_at?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "vision_board_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          }
        ]
      }
      user_engagement_events: {
        Row: {
          id: string
          user_id: string
          event_type: string
          event_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_type: string
          event_data?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_type?: string
          event_data?: Json
          created_at?: string
        }
        Relationships: []
      }
      trip_view_status: {
        Row: {
          id: string
          trip_id: string
          user_id: string
          last_viewed_at: string
          currently_viewing: boolean
          presence_updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          trip_id: string
          user_id: string
          last_viewed_at?: string
          currently_viewing?: boolean
          presence_updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          trip_id?: string
          user_id?: string
          last_viewed_at?: string
          currently_viewing?: boolean
          presence_updated_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_view_status_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          }
        ]
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

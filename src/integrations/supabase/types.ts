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
          checkin_time: string | null
          checkout_time: string | null          
          hotel_details: string | null
          hotel_phone: string | null
          hotel_place_id: string | null
          hotel_url: string | null
          hotel_website: string | null
          image_url: string | null
          is_paid: boolean | null
          order_index: number
          stay_id: string
          title: string
          trip_id: string
          amount_paid: number | null
        }
        Insert: {
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
          checkin_time?: string | null
          checkout_time?: string | null
          hotel_details?: string | null
          hotel_phone?: string | null
          hotel_place_id?: string | null
          hotel_url?: string | null
          hotel_website?: string | null
          image_url?: string | null
          is_paid?: boolean | null
          order_index: number
          stay_id?: string
          title: string
          trip_id: string
          amount_paid?: number | null
        }
        Update: {
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
          checkin_time?: string | null
          checkout_time?: string | null
          hotel_details?: string | null
          hotel_phone?: string | null
          hotel_place_id?: string | null
          hotel_url?: string | null
          hotel_website?: string | null
          image_url?: string | null
          is_paid?: boolean | null
          order_index?: number
          stay_id?: string
          title?: string
          trip_id?: string
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
          cost: number | null
          created_at: string
          currency: string
          description: string | null
          day_id: string
          end_time: string | null
          id: string
          order_index: number
          start_time: string | null
          title: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          day_id: string
          end_time?: string | null
          id?: string
          order_index: number
          start_time?: string | null
          title: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          day_id?: string
          end_time?: string | null
          id?: string
          order_index?: number
          start_time?: string | null
          title?: string
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
          address: string | null
          confirmation_number: string | null
          cost: number | null
          created_at: string
          currency: string
          day_id: string
          trip_id: string
          id: string
          notes: string | null
          number_of_people: number | null
          order_index: number
          phone_number: string | null
          place_id: string | null
          rating: number | null
          reservation_time: string | null
          restaurant_name: string
          website: string | null
        }
        Insert: {
          address?: string | null
          confirmation_number?: string | null
          cost?: number | null
          created_at?: string
          currency?: string
          day_id: string
          trip_id: string
          id?: string
          notes?: string | null
          number_of_people?: number | null
          order_index: number
          phone_number?: string | null
          place_id?: string | null
          rating?: number | null
          reservation_time?: string | null
          restaurant_name: string
          website?: string | null
        }
        Update: {
          address?: string | null
          confirmation_number?: string | null
          cost?: number | null
          created_at?: string
          currency?: string
          day_id?: string
          trip_id?: string
          id?: string
          notes?: string | null
          number_of_people?: number | null
          order_index?: number
          phone_number?: string | null
          place_id?: string | null
          rating?: number | null
          reservation_time?: string | null
          restaurant_name?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["currency"]
          },
          {
            foreignKeyName: "reservations_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "trip_days"
            referencedColumns: ["day_id"]
          },
          {
            foreignKeyName: "reservations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["trip_id"]
          }
        ]
      }
      transportation: {
        Row: {
          arrival_location: string | null
          confirmation_number: string | null
          cost: number | null
          created_at: string
          currency: string
          departure_location: string | null
          details: string | null
          end_date: string | null
          end_time: string | null
          id: string
          is_arrival: boolean
          is_departure: boolean
          provider: string | null
          start_date: string
          start_time: string | null
          trip_id: string
          type: Database["public"]["Enums"]["transportation_type"]
        }
        Insert: {
          arrival_location?: string | null
          confirmation_number?: string | null
          cost?: number | null
          created_at?: string
          currency?: string
          departure_location?: string | null
          details?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_arrival?: boolean
          is_departure?: boolean
          provider?: string | null
          start_date: string
          start_time?: string | null
          trip_id: string
          type: Database["public"]["Enums"]["transportation_type"]
        }
        Update: {
          arrival_location?: string | null
          confirmation_number?: string | null
          cost?: number | null
          created_at?: string
          currency?: string
          departure_location?: string | null
          details?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_arrival?: boolean
          is_departure?: boolean
          provider?: string | null
          start_date?: string
          start_time?: string | null
          trip_id?: string
          type?: Database["public"]["Enums"]["transportation_type"]
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
          created_at: string
          date: string
          day_id: string
          description: string | null
          image_url: string | null
          title: string | null
          trip_id: string
        }
        Insert: {
          created_at?: string
          date: string
          day_id?: string
          description?: string | null
          image_url?: string | null
          title?: string | null
          trip_id: string
        }
        Update: {
          created_at?: string
          date?: string
          day_id?: string
          description?: string | null
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
          arrival_date: string
          cover_image_url: string | null
          created_at: string
          departure_date: string
          destination: string
          end_date: string
          hidden: boolean
          start_date: string
          trip_id: string
          user_id: string
        }
        Insert: {
          arrival_date: string
          cover_image_url?: string | null
          created_at?: string
          departure_date: string
          destination: string
          end_date: string
          hidden?: boolean
          start_date: string
          trip_id?: string
          user_id: string
        }
        Update: {
          arrival_date?: string
          cover_image_url?: string | null
          created_at?: string
          departure_date?: string
          destination?: string
          end_date?: string
          hidden?: boolean
          start_date?: string
          trip_id?: string
          user_id?: string
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

export type Tables<
  PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] & Database["public"]["Views"]) | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] & Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] & Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] & Database["public"]["Views"])
  ? (Database["public"]["Tables"] & Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends keyof Database["public"]["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof Database["public"]["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends keyof Database["public"]["Enums"] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof Database["public"]["CompositeTypes"] | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof Database["public"]["CompositeTypes"]
  ? Database["public"]["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
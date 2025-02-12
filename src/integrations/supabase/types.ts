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
          created_at: string
          currency: string | null
          description: string | null
          expense_cost: number | null
          expense_date: string | null
          expense_paid: boolean | null
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
          order_index: number
          stay_id: string
          title: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          description?: string | null
          expense_cost?: number | null
          expense_date?: string | null
          expense_paid?: boolean | null
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
          order_index: number
          stay_id?: string
          title: string
          trip_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          description?: string | null
          expense_cost?: number | null
          expense_date?: string | null
          expense_paid?: boolean | null
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
          order_index?: number
          stay_id?: string
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
          category: string
          cost: number | null
          created_at: string | null
          currency: string | null
          description: string
          id: string
          is_paid: boolean | null
          transportation_id: string | null
          trip_id: string
        }
        Insert: {
          accommodation_id?: string | null
          activity_id?: string | null
          category: string
          cost?: number | null
          created_at?: string | null
          currency?: string | null
          description: string
          id?: string
          is_paid?: boolean | null
          transportation_id?: string | null
          trip_id: string
        }
        Update: {
          accommodation_id?: string | null
          activity_id?: string | null
          category?: string
          cost?: number | null
          created_at?: string | null
          currency?: string | null
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
            referencedRelation: "transportation_events"
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
      restaurant_reservations: {
        Row: {
          address: string | null
          confirmation_number: string | null
          cost: number | null
          created_at: string
          currency: string | null
          day_id: string
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
          currency?: string | null
          day_id: string
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
          currency?: string | null
          day_id?: string
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
        ]
      }
      transportation_events: {
        Row: {
          arrival_location: string | null
          confirmation_number: string | null
          cost: number | null
          created_at: string
          currency: string | null
          departure_location: string | null
          details: string | null
          end_date: string | null
          end_time: string | null
          id: string
          is_arrival: boolean | null
          is_departure: boolean | null
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
          currency?: string | null
          departure_location?: string | null
          details?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_arrival?: boolean | null
          is_departure?: boolean | null
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
          currency?: string | null
          departure_location?: string | null
          details?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_arrival?: boolean | null
          is_departure?: boolean | null
          provider?: string | null
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
          },
        ]
      }
      trips: {
        Row: {
          arrival_date: string
          cover_image_url: string | null
          created_at: string
          departure_date: string
          destination: string
          hidden: boolean | null
          trip_id: string
          user_id: string
        }
        Insert: {
          arrival_date: string
          cover_image_url?: string | null
          created_at?: string
          departure_date: string
          destination: string
          hidden?: boolean | null
          trip_id?: string
          user_id: string
        }
        Update: {
          arrival_date?: string
          cover_image_url?: string | null
          created_at?: string
          departure_date?: string
          destination?: string
          hidden?: boolean | null
          trip_id?: string
          user_id?: string
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
      transportation_type:
        | "flight"
        | "train"
        | "car_service"
        | "shuttle"
        | "ferry"
        | "rental_car"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

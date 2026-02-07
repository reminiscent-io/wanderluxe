 [
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
          cover_image_position: string | null
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
          cover_image_position?: string | null
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
          cover_image_position?: string | null
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
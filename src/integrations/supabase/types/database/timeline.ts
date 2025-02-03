export interface TimelineTables {
  timeline_events: {
    Row: {
      created_at: string;
      date: string;
      description: string | null;
      expense_cost: number | null;
      expense_currency: string | null;
      expense_date: string | null;
      expense_paid: boolean | null;
      expense_type: string | null;
      final_accommodation_day: string | null;
      hotel: string | null;
      hotel_checkin_date: string | null;
      hotel_checkout_date: string | null;
      hotel_details: string | null;
      hotel_url: string | null;
      id: string;
      image_url: string | null;
      order_index: number;
      title: string;
      trip_id: string;
    };
    Insert: {
      created_at?: string;
      date: string;
      description?: string | null;
      expense_cost?: number | null;
      expense_currency?: string | null;
      expense_date?: string | null;
      expense_paid?: boolean | null;
      expense_type?: string | null;
      final_accommodation_day?: string | null;
      hotel?: string | null;
      hotel_checkin_date?: string | null;
      hotel_checkout_date?: string | null;
      hotel_details?: string | null;
      hotel_url?: string | null;
      id?: string;
      image_url?: string | null;
      order_index: number;
      title: string;
      trip_id: string;
    };
    Update: {
      created_at?: string;
      date?: string;
      description?: string | null;
      expense_cost?: number | null;
      expense_currency?: string | null;
      expense_date?: string | null;
      expense_paid?: boolean | null;
      expense_type?: string | null;
      final_accommodation_day?: string | null;
      hotel?: string | null;
      hotel_checkin_date?: string | null;
      hotel_checkout_date?: string | null;
      hotel_details?: string | null;
      hotel_url?: string | null;
      id?: string;
      image_url?: string | null;
      order_index?: number;
      title?: string;
      trip_id?: string;
    };
    Relationships: [
      {
        foreignKeyName: "timeline_events_trip_id_fkey";
        columns: ["trip_id"];
        isOneToOne: false;
        referencedRelation: "trips";
        referencedColumns: ["id"];
      }
    ];
  };
}
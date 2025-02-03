export interface TransportationTables {
  transportation_events: {
    Row: {
      arrival_location: string | null;
      confirmation_number: string | null;
      cost: number | null;
      created_at: string;
      currency: string | null;
      departure_location: string | null;
      details: string | null;
      end_date: string | null;
      end_time: string | null;
      id: string;
      provider: string | null;
      start_date: string;
      start_time: string | null;
      trip_id: string;
      type: "flight" | "train" | "car_service" | "shuttle" | "ferry" | "rental_car";
    };
    Insert: {
      arrival_location?: string | null;
      confirmation_number?: string | null;
      cost?: number | null;
      created_at?: string;
      currency?: string | null;
      departure_location?: string | null;
      details?: string | null;
      end_date?: string | null;
      end_time?: string | null;
      id?: string;
      provider?: string | null;
      start_date: string;
      start_time?: string | null;
      trip_id: string;
      type: "flight" | "train" | "car_service" | "shuttle" | "ferry" | "rental_car";
    };
    Update: {
      arrival_location?: string | null;
      confirmation_number?: string | null;
      cost?: number | null;
      created_at?: string;
      currency?: string | null;
      departure_location?: string | null;
      details?: string | null;
      end_date?: string | null;
      end_time?: string | null;
      id?: string;
      provider?: string | null;
      start_date?: string;
      start_time?: string | null;
      trip_id?: string;
      type?: "flight" | "train" | "car_service" | "shuttle" | "ferry" | "rental_car";
    };
    Relationships: [
      {
        foreignKeyName: "transportation_events_trip_id_fkey";
        columns: ["trip_id"];
        isOneToOne: false;
        referencedRelation: "trips";
        referencedColumns: ["id"];
      }
    ];
  };
}
import { Json } from '../types';

export interface TripTables {
  trips: {
    Row: {
      cover_image_url: string | null;
      created_at: string;
      destination: string;
      end_date: string;
      hidden: boolean | null;
      id: string;
      start_date: string;
      user_id: string;
    };
    Insert: {
      cover_image_url?: string | null;
      created_at?: string;
      destination: string;
      end_date: string;
      hidden?: boolean | null;
      id?: string;
      start_date: string;
      user_id: string;
    };
    Update: {
      cover_image_url?: string | null;
      created_at?: string;
      destination?: string;
      end_date?: string;
      hidden?: boolean | null;
      id?: string;
      start_date?: string;
      user_id?: string;
    };
    Relationships: [];
  };
  trip_days: {
    Row: {
      created_at: string;
      date: string;
      description: string | null;
      id: string;
      title: string | null;
      trip_id: string;
    };
    Insert: {
      created_at?: string;
      date: string;
      description?: string | null;
      id?: string;
      title?: string | null;
      trip_id: string;
    };
    Update: {
      created_at?: string;
      date?: string;
      description?: string | null;
      id?: string;
      title?: string | null;
      trip_id?: string;
    };
    Relationships: [
      {
        foreignKeyName: "trip_days_trip_id_fkey";
        columns: ["trip_id"];
        isOneToOne: false;
        referencedRelation: "trips";
        referencedColumns: ["id"];
      }
    ];
  };
}
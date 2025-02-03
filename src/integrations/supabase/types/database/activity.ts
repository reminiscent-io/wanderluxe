import { Json } from '../types';

export interface ActivityTables {
  activities: {
    Row: {
      cost: number | null;
      created_at: string;
      currency: string | null;
      event_id: string;
      id: string;
      text: string;
    };
    Insert: {
      cost?: number | null;
      created_at?: string;
      currency?: string | null;
      event_id: string;
      id?: string;
      text: string;
    };
    Update: {
      cost?: number | null;
      created_at?: string;
      currency?: string | null;
      event_id?: string;
      id?: string;
      text?: string;
    };
    Relationships: [
      {
        foreignKeyName: "activities_event_id_fkey";
        columns: ["event_id"];
        isOneToOne: false;
        referencedRelation: "timeline_events";
        referencedColumns: ["id"];
      }
    ];
  };
  day_activities: {
    Row: {
      cost: number | null;
      created_at: string;
      currency: string | null;
      day_id: string;
      description: string | null;
      end_time: string | null;
      id: string;
      order_index: number;
      start_time: string | null;
      title: string;
    };
    Insert: {
      cost?: number | null;
      created_at?: string;
      currency?: string | null;
      day_id: string;
      description?: string | null;
      end_time?: string | null;
      id?: string;
      order_index: number;
      start_time?: string | null;
      title: string;
    };
    Update: {
      cost?: number | null;
      created_at?: string;
      currency?: string | null;
      day_id?: string;
      description?: string | null;
      end_time?: string | null;
      id?: string;
      order_index?: number;
      start_time?: string | null;
      title?: string;
    };
    Relationships: [
      {
        foreignKeyName: "day_activities_day_id_fkey";
        columns: ["day_id"];
        isOneToOne: false;
        referencedRelation: "trip_days";
        referencedColumns: ["id"];
      }
    ];
  };
}
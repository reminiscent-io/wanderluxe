export interface ProfileTables {
  profiles: {
    Row: {
      avatar_url: string | null;
      created_at: string;
      full_name: string | null;
      home_location: string | null;
      id: string;
      username: string | null;
    };
    Insert: {
      avatar_url?: string | null;
      created_at?: string;
      full_name?: string | null;
      home_location?: string | null;
      id: string;
      username?: string | null;
    };
    Update: {
      avatar_url?: string | null;
      created_at?: string;
      full_name?: string | null;
      home_location?: string | null;
      id?: string;
      username?: string | null;
    };
    Relationships: [];
  };
}
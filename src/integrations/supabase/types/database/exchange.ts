export interface ExchangeTables {
  exchange_rates: {
    Row: {
      currency_from: string;
      currency_to: string;
      id: string;
      last_updated: string | null;
      rate: number;
    };
    Insert: {
      currency_from: string;
      currency_to: string;
      id?: string;
      last_updated?: string | null;
      rate: number;
    };
    Update: {
      currency_from?: string;
      currency_to?: string;
      id?: string;
      last_updated?: string | null;
      rate?: number;
    };
    Relationships: [];
  };
}

import { Database } from './database';

type PublicSchema = Database[Extract<keyof Database, "public">];

// Generic helper type to extract table/view row types
type ExtractRowType<T> = T extends { Row: infer R } ? R : never;

// Helper type to handle schema selection
type SchemaType<T extends { schema: keyof Database } | string> = T extends { schema: keyof Database }
  ? Database[T["schema"]]
  : PublicSchema;

// Helper type to get table name based on schema
type TableName<T extends { schema: keyof Database } | string> = T extends { schema: keyof Database }
  ? keyof (Database[T["schema"]]["Tables"] & Database[T["schema"]]["Views"])
  : T;

export type Tables<
  SchemaTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableNameType extends SchemaTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[SchemaTableNameOrOptions["schema"]]["Tables"] & 
        Database[SchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = ExtractRowType<
  (SchemaType<SchemaTableNameOrOptions>["Tables"] & 
   SchemaType<SchemaTableNameOrOptions>["Views"])[TableName<SchemaTableNameOrOptions>]
>;

export type TablesInsert<
  SchemaTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableNameType extends SchemaTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[SchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = ExtractRowType<
  SchemaType<SchemaTableNameOrOptions>["Tables"][TableName<SchemaTableNameOrOptions>] & { Insert: any }
>;

export type TablesUpdate<
  SchemaTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableNameType extends SchemaTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[SchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = ExtractRowType<
  SchemaType<SchemaTableNameOrOptions>["Tables"][TableName<SchemaTableNameOrOptions>] & { Update: any }
>;

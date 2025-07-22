export type Extraction = {
  type: 'hotel' | 'flight';
  fileName: string;
  data: Record<string, any>;
  readyToAdd: boolean;
};

/**
 * Basic SQL-safe escaping for single quotes. Doubles every single quote so that
 * Postgres treats the result as a single literal quote instead of closing the
 * surrounding string. It also guards against undefined / null values by
 * replacing them with an empty string so the caller can decide what to do.
 */
const escape = (value: string | null | undefined): string => {
  return (value ?? '').replace(/'/g, "''");
};

/**
 * Builds an INSERT‑…SELECT statement that adds a hotel stay to the
 * `accommodations` table.  The SQL is constructed as a *single* statement so it
 * can run inside a Supabase `rpc()` call or `sql` batch without mucking up the
 * implicit transaction.
 *
 * The previous implementation escaped only the *first* single quote it found
 * via `str.replace("'", "''")`.  That meant values like
 * `O'Hare Int'l` produced an *unbalanced* quote — resulting in the Postgres
 * error: _"incomplete string literal"_.  We now use a **global** RegExp
 * (`/'/g`) so **every** quote is escaped.
 */
export function mapToAccommodationSql(tripId: string, e: Extraction): string {
  // Pre‑escape user‑supplied values once so the template stays readable.
  const hotelName = escape(e.data.hotel_name);
  const address = escape(e.data.address);
  const currency = escape(e.data.currency ?? 'USD');

  // Cost might legitimately be `null` (e.g. loyalty booking).  Let SQL handle
  // the coercion rather than wrapping it in quotes.
  const cost = e.data.total_cost ?? 'null';

  return `
insert into accommodations (
  stay_id, trip_id, title, hotel, hotel_address,
  hotel_checkin_date, hotel_checkout_date,
  cost, currency, order_index
)
select
  gen_random_uuid(), '${tripId}', '${hotelName}',
  '${hotelName}',
  '${address}',
  '${e.data.check_in_date}', '${e.data.check_out_date}',
  ${cost}, '${currency}',
  coalesce((select max(order_index) + 1 from accommodations where trip_id = '${tripId}'), 0);
`;
}

export type Extraction = {
  type: 'hotel' | 'flight';
  fileName: string;
  data: Record<string, any>;
  readyToAdd: boolean;
};

export function mapToAccommodationSql(tripId: string, e: Extraction) {
  return `
insert into accommodations (
  stay_id, trip_id, title, hotel, hotel_address,
  hotel_checkin_date, hotel_checkout_date,
  cost, currency, order_index
)
select
  gen_random_uuid(), '${tripId}', '${e.data.hotel_name.replace("'", "''")}',
  '${e.data.hotel_name.replace("'", "''")}',
  '${(e.data.address ?? '').replace("'", "''")}',
  '${e.data.check_in_date}', '${e.data.check_out_date}',
  ${e.data.total_cost ?? 'null'}, '${e.data.currency ?? 'USD'}',
  coalesce((select max(order_index)+1 from accommodations where trip_id='${tripId}'),0);
`;
}

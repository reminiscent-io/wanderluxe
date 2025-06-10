# Restaurant Reservation Fields - Required vs Optional

## Database Schema Analysis

Based on the database schema in `src/integrations/supabase/types/database.ts`, here are the field requirements for the `reservations` table:

### ✅ REQUIRED FIELDS (must have values)
1. **restaurant_name** (string) - Cannot be empty
2. **day_id** (string) - Automatically provided by the form
3. **trip_id** (string) - Automatically provided by the form
4. **order_index** (number) - Automatically calculated

### ✅ OPTIONAL FIELDS (can be null/empty)
1. **reservation_time** (string | null) - Time of reservation
2. **number_of_people** (number | null) - Party size
3. **confirmation_number** (string | null) - Booking confirmation
4. **notes** (string | null) - Special requests/notes
5. **cost** (number | null) - Meal cost
6. **currency** (string) - Defaults to 'USD' if not specified
7. **address** (string | null) - Restaurant address
8. **phone_number** (string | null) - Restaurant phone
9. **website** (string | null) - Restaurant website
10. **place_id** (string | null) - Google Place ID (only for Google Places)
11. **rating** (number | null) - Restaurant rating

### 🔧 AUTO-GENERATED FIELDS
1. **id** (string) - Auto-generated UUID
2. **created_at** (string) - Auto-generated timestamp

## Form Validation Rules

The form validation schema enforces:
- Restaurant name: Required, minimum 1 character
- Number of people: If provided, must be at least 1
- Cost: If provided, must be positive (≥ 0)
- Rating: If provided, must be between 0-5
- All other fields: Optional

## Common Issues & Solutions

### Manual Entry Not Saving
1. **Check restaurant name**: Must not be empty or just whitespace
2. **Check browser console**: Look for specific database errors
3. **Verify network**: Ensure API calls are reaching the server
4. **Check permissions**: User must have edit access to the trip

### Google Places vs Manual Entry
- **Google Places**: Automatically fills address, phone, website, place_id, rating
- **Manual Entry**: User must fill these fields manually if desired
- **Both work**: The system supports both methods equally

## Testing Steps

### Test Manual Entry
1. Open restaurant reservation dialog
2. Type restaurant name manually (don't select from Google dropdown)
3. Fill optional fields as desired
4. Click "Save Reservation"
5. Check browser console for any errors
6. Verify reservation appears in the list

### Test Google Places
1. Open restaurant reservation dialog
2. Start typing restaurant name
3. Select from Google Places dropdown
4. Additional fields should auto-populate
5. Click "Save Reservation"
6. Verify reservation appears in the list

## Debugging Information

Enhanced logging has been added to help identify issues:
- Form validation errors are logged to console
- Database insertion errors include detailed error codes
- Processed data is logged before database submission
- Success/failure tracking via analytics

Check the browser console for detailed error information when testing.
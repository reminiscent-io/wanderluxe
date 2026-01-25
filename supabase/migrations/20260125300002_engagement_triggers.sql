-- =============================================
-- Engagement Event Triggers
-- Auto-track events on key tables for analytics
-- =============================================

-- Generic function to log engagement events
CREATE OR REPLACE FUNCTION log_engagement_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_user_id UUID;
  event_type_name TEXT;
  event_metadata JSONB;
BEGIN
  -- Determine event type based on table and operation
  event_type_name := TG_TABLE_NAME || '_' || LOWER(TG_OP);

  -- Get user_id based on the table
  CASE TG_TABLE_NAME
    WHEN 'trips' THEN
      event_user_id := COALESCE(NEW.user_id, OLD.user_id);
      event_metadata := jsonb_build_object(
        'trip_id', COALESCE(NEW.trip_id, OLD.trip_id),
        'destination', COALESCE(NEW.destination, OLD.destination)
      );
    WHEN 'accommodations' THEN
      -- Get user from the trip
      SELECT user_id INTO event_user_id
      FROM trips
      WHERE trip_id = COALESCE(NEW.trip_id, OLD.trip_id);
      event_metadata := jsonb_build_object(
        'stay_id', COALESCE(NEW.stay_id, OLD.stay_id),
        'trip_id', COALESCE(NEW.trip_id, OLD.trip_id)
      );
    WHEN 'transportation' THEN
      SELECT user_id INTO event_user_id
      FROM trips
      WHERE trip_id = COALESCE(NEW.trip_id, OLD.trip_id);
      event_metadata := jsonb_build_object(
        'id', COALESCE(NEW.id, OLD.id),
        'trip_id', COALESCE(NEW.trip_id, OLD.trip_id),
        'type', COALESCE(NEW.type, OLD.type)
      );
    WHEN 'reservations' THEN
      SELECT user_id INTO event_user_id
      FROM trips
      WHERE trip_id = COALESCE(NEW.trip_id, OLD.trip_id);
      event_metadata := jsonb_build_object(
        'id', COALESCE(NEW.id, OLD.id),
        'trip_id', COALESCE(NEW.trip_id, OLD.trip_id)
      );
    WHEN 'day_activities' THEN
      -- Get user from trip_days -> trips
      SELECT t.user_id INTO event_user_id
      FROM trip_days td
      JOIN trips t ON t.trip_id = td.trip_id
      WHERE td.day_id = COALESCE(NEW.day_id, OLD.day_id);
      event_metadata := jsonb_build_object(
        'id', COALESCE(NEW.id, OLD.id),
        'day_id', COALESCE(NEW.day_id, OLD.day_id)
      );
    ELSE
      -- Skip if we can't determine the user
      RETURN COALESCE(NEW, OLD);
  END CASE;

  -- Only log if we have a user_id
  IF event_user_id IS NOT NULL THEN
    INSERT INTO user_engagement_events (user_id, event_type, event_data)
    VALUES (event_user_id, event_type_name, event_metadata);
  END IF;

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the main operation if logging fails
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers on key tables

-- Trips trigger
DROP TRIGGER IF EXISTS trips_engagement_trigger ON trips;
CREATE TRIGGER trips_engagement_trigger
  AFTER INSERT OR UPDATE OR DELETE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION log_engagement_event();

-- Accommodations trigger
DROP TRIGGER IF EXISTS accommodations_engagement_trigger ON accommodations;
CREATE TRIGGER accommodations_engagement_trigger
  AFTER INSERT OR UPDATE OR DELETE ON accommodations
  FOR EACH ROW
  EXECUTE FUNCTION log_engagement_event();

-- Transportation trigger
DROP TRIGGER IF EXISTS transportation_engagement_trigger ON transportation;
CREATE TRIGGER transportation_engagement_trigger
  AFTER INSERT OR UPDATE OR DELETE ON transportation
  FOR EACH ROW
  EXECUTE FUNCTION log_engagement_event();

-- Reservations trigger
DROP TRIGGER IF EXISTS reservations_engagement_trigger ON reservations;
CREATE TRIGGER reservations_engagement_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION log_engagement_event();

-- Day activities trigger
DROP TRIGGER IF EXISTS day_activities_engagement_trigger ON day_activities;
CREATE TRIGGER day_activities_engagement_trigger
  AFTER INSERT OR UPDATE OR DELETE ON day_activities
  FOR EACH ROW
  EXECUTE FUNCTION log_engagement_event();

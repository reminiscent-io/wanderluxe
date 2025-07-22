import React from 'react';
import { Card } from '@/components/ui/card';
import { useToast } from "@/components/ui/use-toast"
import { useSupabaseClient } from '@supabase/auth-helpers-react';

interface BookingViewProps {
  tripId: string | undefined;
}

const BookingView: React.FC<BookingViewProps> = ({ tripId }) => {
  const { toast } = useToast()
  const supabase = useSupabaseClient();

  useEffect(() => {
    if (tripId) {
      trackBookingPageView(tripId);
    }
  }, [tripId]);

  const trackBookingPageView = async (tripId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Track in Google Analytics
        window.gtag('event', 'booking_page_view', {
          event_category: 'Booking',
          event_label: tripId,
          user_id: user.id
        });

        console.log('Booking page viewed by user:', user.id, 'for trip:', tripId);
        // Example: Insert into analytics table
        // await supabase.from('page_views').insert({
        //   user_id: user.id,
        //   trip_id: tripId,
        //   page_type: 'booking',
        //   viewed_at: new Date().toISOString()
        // });
      }
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  };

  const handleBookingClick = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && tripId) {
        // Track in Google Analytics
        window.gtag('event', 'booking_interest', {
          event_category: 'Booking',
          event_label: tripId,
          user_id: user.id,
          value: 1
        });

        console.log('User clicked booking for trip:', tripId);

        // Track the click interaction
        // await supabase.from('user_interactions').insert({
        //   user_id: user.id,
        //   trip_id: tripId,
        //   interaction_type: 'booking_click',
        //   timestamp: new Date().toISOString()
        // });

        toast({
          title: "Booking Interest Noted",
          description: "We'll notify you when booking features are available!",
        });
      }
    } catch (error) {
      console.error('Error tracking booking click:', error);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-earth-500">Booking</h2>
      <Card className="p-6">
        <p className="text-gray-500">Booking features coming soon...</p>
        <button onClick={handleBookingClick}>Notify me!</button>
      </Card>
    </div>
  );
};

export default BookingView;
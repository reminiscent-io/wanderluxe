import React, { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ExternalLink, MapPin, Star, Mail, Phone } from 'lucide-react';

interface BookingViewProps {
  tripId: string | undefined;
}

const BookingView: React.FC<BookingViewProps> = ({ tripId }) => {
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (tripId) {
      trackBookingPageView(tripId);
    }
  }, [tripId]);

  const trackBookingPageView = async (tripId: string) => {
    try {
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

  const handleContactClick = async () => {
    try {
      if (user && tripId) {
        // Track in Google Analytics
        window.gtag('event', 'advisor_contact', {
          event_category: 'Booking',
          event_label: tripId,
          user_id: user.id,
          value: 1
        });

        console.log('User clicked contact advisor for trip:', tripId);

        // Open Fora contact page in new window
        window.open('https://www.foratravel.com/advisor/kevin-lowe', '_blank');

        toast({
          title: "Redirecting to Fora Travel",
          description: "Opening Kevin's profile page for booking assistance",
        });
      }
    } catch (error) {
      console.error('Error tracking advisor contact:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-earth-500">Professional Travel Booking</h2>
      
      {/* Fora Travel Advisor Profile */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Image */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-sand-100 border-2 border-sand-300">
              <img 
                src="https://res.cloudinary.com/foratravelweb/image/upload/c_fill,g_auto,h_640,w_640/f_webp/q_90/a1ade640-a52b-4571-9d4d-b17ff07d882a" 
                alt="Kevin Lowe - Fora Travel Advisor"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Profile Details */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div>
                <h3 className="text-xl font-semibold text-earth-500">Kevin Lowe</h3>
                <p className="text-sm font-medium text-earth-400">Fora Travel Advisor</p>
              </div>
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="h-4 w-4 fill-current" />
                <span className="text-xs font-medium">Certified</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-earth-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">Based in New York</span>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-medium text-earth-500">About</h4>
                <p className="text-sm text-gray-700">
                  NYC-based traveler passionate about high-end US and Western Europe adventures, 
                  expertly balancing luxury experiences with smart value optimization.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-medium text-earth-500">Expertise</h4>
                <div className="flex flex-wrap gap-1">
                  {['Luxury Travel', 'Honeymoons', 'NYC', 'Aspen', 'Paris', 'Euro Skiing'].map((expertise, index) => (
                    <span 
                      key={index}
                      className="inline-block px-2 py-1 bg-sand-100 text-earth-600 text-xs rounded-full"
                    >
                      {expertise}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-medium text-earth-500">Travel Style</h4>
                <p className="text-sm text-gray-700">
                  I blend a pastry chef's love for exceptional food with deep travel experience across Europe and the US. 
                  With a luxury-leaning yet value-driven approach, I craft highly organized itineraries that balance 
                  indulgence and discovery—fun, exciting, and effortlessly relaxing.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Actions */}
        <div className="border-t border-sand-200 mt-6 pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleContactClick}
              className="flex-1 bg-earth-500 hover:bg-earth-600 text-white flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Contact Kevin on Fora Travel
            </Button>
            <div className="text-center sm:text-left">
              <p className="text-xs text-gray-600">Response time: 1-2 business days</p>
              <p className="text-xs text-gray-600">Get travel inspiration, hotel bookings & custom itineraries</p>
            </div>
          </div>
        </div>

        {/* Fora Branding */}
        <div className="flex items-center justify-center mt-4 pt-4 border-t border-sand-100">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            Powered by 
            <span className="font-medium text-earth-600">Fora Travel</span>
          </p>
        </div>
      </Card>

      {/* Why Book with a Fora Travel Advisor */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-earth-500 mb-4">Why Book with a Fora Travel Advisor?</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-earth-600">Exclusive Perks & Upgrades</h4>
            <p className="text-sm text-gray-700">Access to room upgrades, hotel credits, complimentary breakfast, and extended check-in/out times.</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-earth-600">Expert Knowledge</h4>
            <p className="text-sm text-gray-700">Insider tips and recommendations from someone who's been there and knows what works.</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-earth-600">Personalized Service</h4>
            <p className="text-sm text-gray-700">Custom itineraries tailored to your preferences, budget, and travel style.</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-earth-600">Support When You Need It</h4>
            <p className="text-sm text-gray-700">Professional assistance before, during, and after your trip for peace of mind.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BookingView;
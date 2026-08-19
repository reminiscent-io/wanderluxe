import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BarChart2,
  Building,
  CalendarDays,
  CalendarPlus,
  Cloud,
  Compass,
  FileDown,
  ListTree,
  Map as MapIcon,
  MessageCircle,
  Plug,
  ScanLine,
  Users,
} from 'lucide-react';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * The permanent answer to "what can this thing actually do?".
 *
 * Deliberately a page rather than a first-run tour: it is here for the person
 * coming back after six months, and for anyone who would rather look something
 * up than be walked through it. Every entry says what you can do in plain
 * words, and — where it can — takes you there with the feature already open.
 */

interface Capability {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  /** Path built from the user's most recent trip, when there is one. */
  to?: (tripPath: string | null) => string | null;
  actionLabel?: string;
}

interface Section {
  heading: string;
  intro: string;
  items: Capability[];
}

const SECTIONS: Section[] = [
  {
    heading: 'Building the itinerary',
    intro: 'Everything on a trip hangs off its days. Add things to a day and the rest follows.',
    items: [
      {
        icon: ListTree,
        title: 'Plan day by day',
        body: 'Add hotels, flights, activities and restaurant bookings to each day of your trip. Drag things around to reorder them. Everyone on the trip sees the same plan.',
        to: (p) => (p ? `${p}/timeline` : '/create-trip'),
        actionLabel: 'Show me',
      },
      {
        icon: ScanLine,
        title: 'Let it read your confirmations',
        body: "Attach a booking confirmation — a PDF or a photo of one — and the assistant pulls out the dates, times, addresses and confirmation numbers, then adds them to the right day. It handles most flight, hotel and restaurant confirmations.",
        to: (p) => (p ? `${p}/chat` : null),
        actionLabel: 'Try it',
      },
      {
        icon: MessageCircle,
        title: 'Ask for ideas',
        body: 'The assistant knows where and when you are going. Ask it what to do on a free afternoon, where to eat near your hotel, or how to get between two places. It can add anything it suggests straight to your itinerary.',
        to: (p) => (p ? `${p}/chat` : null),
        actionLabel: 'Open the assistant',
      },
    ],
  },
  {
    heading: 'Seeing it your way',
    intro: 'The same trip, shown three different ways. Switch between them at the top of the itinerary.',
    items: [
      {
        icon: MapIcon,
        title: 'See your days on a map',
        body: "Every place you've added, plotted in the order you'll visit it. Useful for spotting the day where you've accidentally booked lunch an hour from your morning.",
        to: (p) => (p ? `${p}/timeline?view=map` : null),
        actionLabel: 'Show me',
      },
      {
        icon: CalendarDays,
        title: 'See it as a calendar',
        body: 'A time-grid view of the whole trip, so you can see the gaps and the clashes. Drag anything to move it; times stay exactly as written, wherever you are in the world.',
        to: (p) => (p ? `${p}/timeline?view=calendar` : null),
        actionLabel: 'Show me',
      },
      {
        icon: Cloud,
        title: 'Weather and local times',
        body: 'Each day shows the forecast for where you are. Anything in a different time zone — a flight landing in another country — carries a small label so the time on screen is never ambiguous.',
      },
    ],
  },
  {
    heading: 'Going with other people',
    intro: 'Trips are rarely solo. Everything here is built for more than one person.',
    items: [
      {
        icon: Users,
        title: 'Share the trip',
        body: "Invite people by email or send them a link. You choose whether they can just look or also make changes. Edits appear on everyone's screen as they happen — no refreshing, no version confusion.",
        to: (p) => (p ? `${p}/timeline` : null),
        actionLabel: 'Open a trip',
      },
      {
        icon: BarChart2,
        title: 'Keep track of what it costs',
        body: 'Log expenses against the trip in whatever currency you paid in, and see the total converted into yours. Bookings you add to the itinerary carry their cost through automatically.',
        to: (p) => (p ? `${p}/budget` : null),
        actionLabel: 'Show me',
      },
      {
        icon: Building,
        title: 'Book what you still need',
        body: 'Search stays and flights without leaving the trip, or hand the whole thing to a human travel advisor if you would rather someone else made the calls.',
        to: (p) => (p ? `${p}/booking` : null),
        actionLabel: 'Show me',
      },
    ],
  },
  {
    heading: 'Taking it with you',
    intro: 'The plan is not much use if it only exists inside this app.',
    items: [
      {
        icon: CalendarPlus,
        title: 'Put it in your phone calendar',
        body: 'Subscribe once and the whole itinerary appears in Apple Calendar, Google Calendar or Outlook — and keeps itself up to date as the trip changes. You can turn the link off again at any time.',
        to: (p) => (p ? `${p}/timeline?sync=1` : null),
        actionLabel: 'Set it up',
      },
      {
        icon: FileDown,
        title: 'Print or save a PDF',
        body: 'A proper typeset itinerary you can print, email, or keep on your phone for the flight when there is no signal. Same layout whether you make it on a phone or a laptop.',
        to: (p) => (p ? `${p}/timeline?export=pdf` : null),
        actionLabel: 'Make one',
      },
      {
        icon: Compass,
        title: 'Install it like an app',
        body: 'WanderLuxe can be added to your home screen and opens like any other app, with your trips available even on a patchy connection.',
      },
    ],
  },
  {
    heading: 'For the curious',
    intro: 'One thing WanderLuxe does that most travel apps do not.',
    items: [
      {
        icon: Plug,
        title: 'Plan your trip from Claude or ChatGPT',
        body: "WanderLuxe runs a connector that lets an AI assistant work on your trips directly — ask Claude to add a dinner reservation on Thursday and it appears here. Add https://wanderluxe.io/mcp as a custom connector in your assistant's settings and sign in with your WanderLuxe account. It can read and change only your own trips.",
      },
    ],
  },
];

const Guide: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  // "Show me" is only honest if it lands on a real trip. Fall back to trip
  // creation when there is nothing to show yet.
  const { data: recentTripId } = useQuery({
    queryKey: ['guide-recent-trip'],
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('trip_id')
        .eq('user_id', session!.user.id)
        .eq('hidden', false)
        .order('arrival_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data?.trip_id ?? null;
    },
  });

  const tripPath = recentTripId ? `/trip/${recentTripId}` : null;

  return (
    <>
      <SEO
        title="How WanderLuxe works"
        description="A plain-language guide to everything WanderLuxe can do — planning day by day, maps and calendars, sharing with travel companions, calendar sync, PDF export, and the AI connector."
        canonicalPath="/guide"
      />

      <div className="bg-background">
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
          <div className="mx-auto max-w-3xl">

            <header className="mb-14">
              <p className="font-sans text-sm uppercase tracking-[0.18em] text-earth-400 mb-4">
                Guide
              </p>
              <h1 className="font-display text-4xl md:text-5xl text-foreground leading-[1.05]">
                What WanderLuxe can do.
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Most of this is one tap away once you know it's there. Nothing here
                is required — plan a trip however you like and come back when you
                want more.
              </p>
              {!session && (
                <div className="mt-8">
                  <Button size="lg" variant="sunset" onClick={() => navigate('/auth')}>
                    Create a free account
                  </Button>
                </div>
              )}
            </header>

            <div className="space-y-16">
              {SECTIONS.map((section) => (
                <section key={section.heading} aria-labelledby={`s-${section.heading}`}>
                  <div className="border-t border-border pt-6 mb-7">
                    <h2
                      id={`s-${section.heading}`}
                      className="font-display text-2xl md:text-3xl text-foreground leading-snug"
                    >
                      {section.heading}
                    </h2>
                    <p className="mt-2 text-base text-muted-foreground">{section.intro}</p>
                  </div>

                  <ul className="space-y-5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const href = item.to?.(tripPath) ?? null;

                      return (
                        <li
                          key={item.title}
                          className="rounded-card border border-border bg-card p-5 md:p-6 shadow-warm-sm"
                        >
                          <div className="flex items-start gap-4">
                            <span
                              aria-hidden="true"
                              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand-50 text-earth-500"
                            >
                              <Icon className="h-5 w-5" strokeWidth={1.75} />
                            </span>

                            <div className="min-w-0 flex-1">
                              <h3 className="font-display text-xl text-foreground leading-snug">
                                {item.title}
                              </h3>
                              <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                                {item.body}
                              </p>

                              {href && item.actionLabel && (
                                <Button
                                  variant="outline"
                                  size="lg"
                                  className="mt-4"
                                  onClick={() => navigate(href)}
                                >
                                  {item.actionLabel}
                                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>

            <div className="mt-16 border-t border-border pt-8">
              <p className="text-base text-muted-foreground">
                Still stuck on something?{' '}
                <a
                  href="mailto:hello@wanderluxe.io"
                  className="font-medium text-earth-500 underline underline-offset-4 hover:text-earth-600"
                >
                  Send us a note
                </a>{' '}
                and a person will read it.
              </p>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default Guide;

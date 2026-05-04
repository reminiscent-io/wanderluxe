import React from 'react';
import { MonthlyActivityChart } from '@/components/trip/stats';
import { cn } from '@/lib/utils';

interface TravelYearSectionProps {
  data: React.ComponentProps<typeof MonthlyActivityChart>['data'];
  title?: string;
  className?: string;
}

export function TravelYearSection({
  data,
  title = 'Your travel year',
  className,
}: TravelYearSectionProps) {
  return (
    <section className={cn('mb-10', className)} aria-labelledby="travel-year-heading">
      <h2
        id="travel-year-heading"
        className="font-display text-2xl md:text-3xl text-earth-800 mb-4"
      >
        {title}
      </h2>
      <MonthlyActivityChart data={data} />
    </section>
  );
}

export default TravelYearSection;

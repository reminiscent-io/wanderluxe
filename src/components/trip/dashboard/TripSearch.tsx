import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TripSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

export function TripSearch({
  value,
  onChange,
  placeholder = 'Search destinations, dates...',
  ariaLabel = 'Search trips',
  className,
}: TripSearchProps) {
  return (
    <div className={cn('relative max-w-md', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-earth-400 h-4 w-4" />
      <Input
        type="search"
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="pl-10 pr-4 py-3 bg-white border-earth-200 focus:border-earth-400 focus:ring-earth-400 rounded-card shadow-warm-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default TripSearch;

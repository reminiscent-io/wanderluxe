import React, { useEffect, useState } from 'react';
import { format, parseISO, isToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronUp, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TripDay } from '@/types/trip';

interface DayNavigatorProps {
  days: TripDay[];
  className?: string;
}

const DayNavigator: React.FC<DayNavigatorProps> = ({ days, className }) => {
  const [currentDayInView, setCurrentDayInView] = useState<number>(0);
  const [isCompact, setIsCompact] = useState(false);
  
  // Find today's index
  const todayIndex = days.findIndex(day => isToday(parseISO(day.date)));
  
  useEffect(() => {
    const handleScroll = () => {
      // Find which day card is currently in view
      const dayElements = days.map((_, index) => 
        document.getElementById(`day-${index + 1}`)
      ).filter(Boolean);
      
      const viewportTop = window.scrollY + 100; // Account for sticky header
      
      for (let i = dayElements.length - 1; i >= 0; i--) {
        const element = dayElements[i];
        if (element) {
          const rect = element.getBoundingClientRect();
          const elementTop = rect.top + window.scrollY;
          
          if (elementTop <= viewportTop) {
            setCurrentDayInView(i);
            break;
          }
        }
      }
      
      // Toggle compact mode based on scroll position
      setIsCompact(window.scrollY > 100);
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [days]);
  
  const scrollToDay = (index: number) => {
    const element = document.getElementById(`day-${index + 1}`);
    if (element) {
      const yOffset = -80; // Offset for sticky headers
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const scrollToToday = () => {
    if (todayIndex >= 0) {
      scrollToDay(todayIndex);
    }
  };
  
  const navigateDays = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, currentDayInView - 1)
      : Math.min(days.length - 1, currentDayInView + 1);
    scrollToDay(newIndex);
  };
  
  if (days.length === 0) return null;
  
  return (
    <div 
      className={cn(
        "sticky top-16 z-40 bg-white/95 backdrop-blur-sm border-b transition-all duration-200",
        isCompact ? "py-2" : "py-3",
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-3 md:px-6">
        {/* Desktop View */}
        <div className="hidden md:flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateDays('prev')}
              disabled={currentDayInView === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex gap-1 overflow-x-auto max-w-3xl">
              {days.map((day, index) => {
                const isActive = index === currentDayInView;
                const isTodayFlag = isToday(parseISO(day.date));
                
                return (
                  <Button
                    key={day.day_id}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => scrollToDay(index)}
                    className={cn(
                      "min-w-[80px] text-xs transition-all",
                      isTodayFlag && !isActive && "ring-1 ring-blue-500"
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-medium">Day {index + 1}</span>
                      {!isCompact && (
                        <span className="text-[10px] opacity-70">
                          {format(parseISO(day.date), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateDays('next')}
              disabled={currentDayInView === days.length - 1}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {todayIndex >= 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={scrollToToday}
                className="text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Today
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={scrollToTop}
              className="text-xs"
            >
              <ChevronUp className="h-3 w-3 mr-1" />
              Overview
            </Button>
          </div>
        </div>
        
        {/* Mobile View - Compact */}
        <div className="md:hidden flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 flex-1 overflow-x-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateDays('prev')}
              disabled={currentDayInView === 0}
              className="h-7 w-7 p-0 flex-shrink-0"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {days.map((day, index) => {
                const isActive = index === currentDayInView;
                const isTodayFlag = isToday(parseISO(day.date));
                
                return (
                  <Button
                    key={day.day_id}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => scrollToDay(index)}
                    className={cn(
                      "h-7 px-2 text-xs min-w-[45px] flex-shrink-0",
                      isTodayFlag && !isActive && "ring-1 ring-blue-500"
                    )}
                  >
                    D{index + 1}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateDays('next')}
              disabled={currentDayInView === days.length - 1}
              className="h-7 w-7 p-0 flex-shrink-0"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="flex gap-1">
            {todayIndex >= 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={scrollToToday}
                className="h-7 w-7 p-0"
                title="Jump to Today"
              >
                <Calendar className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollToTop}
              className="h-7 w-7 p-0"
              title="Back to Overview"
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayNavigator;
import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';

type Props = {
  dayTitle: string;
  formattedDate: string;
  index: number;
  isTodayFlag: boolean;
  isTravelDay: boolean;
  isCheckInDay: boolean;
  isCheckOutDay: boolean;
  totalEvents: number;
  summary: string;
  isExpanded: boolean;
  onToggle: () => void;
};

const DayHeader: React.FC<Props> = ({
  dayTitle,
  formattedDate,
  index,
  isTodayFlag,
  isTravelDay,
  isCheckInDay,
  isCheckOutDay,
  totalEvents,
  summary,
  isExpanded,
  onToggle,
}) => {
  return (
    <motion.div 
      className="p-4 md:p-6 cursor-pointer hover:bg-sand-25 transition-colors duration-200"
      onClick={onToggle}
      whileHover={{ backgroundColor: "rgba(250, 245, 235, 0.5)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-lg md:text-xl font-bold text-earth-800">
                {dayTitle} {formattedDate}
              </span>
              <div className="text-sm md:text-base text-earth-600 font-medium">
                Day {index}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isTodayFlag && (
                <Badge className="bg-emerald-500 text-white text-xs px-2 py-1">Today</Badge>
              )}
              {isTravelDay && (
                <Badge className="bg-sky-500 text-white text-xs px-2 py-1">Travel Day</Badge>
              )}
              {isCheckInDay && (
                <Badge className="bg-amber-500 text-white text-xs px-2 py-1">Check-in</Badge>
              )}
              {isCheckOutDay && (
                <Badge className="bg-amber-600 text-white text-xs px-2 py-1">Check-out</Badge>
              )}
              {totalEvents > 0 && (
                <Badge className="bg-earth-200 text-earth-800 text-xs px-2 py-1">
                  {totalEvents} event{totalEvents > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-earth-500 hidden lg:inline font-medium">{summary}</span>
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 hover:bg-earth-100 transition-colors">
            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-5 w-5 text-earth-600" />
            </motion.div>
          </Button>
        </div>
      </div>

      <div className="text-sm text-earth-500 mt-2 lg:hidden">{summary}</div>
    </motion.div>
  );
};

export default DayHeader;

import * as React from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import {
  Controller,
  useFormContext,
  Control as RHFControl,
} from "react-hook-form";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type LuxuryDateTimeRange = {
  start?: Date | null;
  end?: Date | null;
  startTime?: string;
  endTime?: string;
};

interface Props {
  name: string;
  label: string;
  required?: boolean;
  defaultMonth?: Date;
  control?: RHFControl<any>;
  hideTimeInputs?: boolean;
  placeholder?: string;
  timeStep?: number; // Step in seconds (e.g., 60 for 1 min, 300 for 5 min)
}

const prettyTime = (t?: string) => {
  if (!t) return "--:--";
  const [h, m] = t.split(":").map(Number);
  const d = new Date(1970, 0, 1, h, m);
  return format(d, "h:mm aa").toLowerCase();
};

const fmtDate = (d?: Date | null) => {
  if (!d) return "";
  const utcMidnight = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  return format(utcMidnight, "MMM d, yyyy");
};

export default function LuxuryDateTimeRangePicker({
  name,
  label,
  required,
  defaultMonth,
  control: externalControl,
  hideTimeInputs = false,
  placeholder = "Select date range",
  timeStep = 300, // Default to 5 minutes
}: Props) {
  const ctx = useFormContext();
  const control = ctx?.control ?? externalControl;
  
  if (!control) {
    throw new Error(
      "LuxuryDateTimeRangePicker: no RHF control found. Wrap in <Form> or pass control prop."
    );
  }

  const [isOpen, setIsOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // Detect mobile screen size
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <Controller
      name={name as any}
      control={control}
      render={({ field }) => {
        const value = (field.value || {}) as LuxuryDateTimeRange;

        const dateDisplay =
          value.start && value.end
            ? `${fmtDate(value.start)} – ${fmtDate(value.end)}`
            : value.start
            ? `${fmtDate(value.start)} → Select end date`
            : placeholder;

        const timeDisplay =
          !hideTimeInputs && value.startTime && value.endTime
            ? `${prettyTime(value.startTime)} → ${prettyTime(value.endTime)}`
            : null;

        const update = (patch: Partial<LuxuryDateTimeRange>) =>
          field.onChange({ ...value, ...patch });

        const clear = () => {
          field.onChange({ start: null, end: null, startTime: "", endTime: "" });
          setIsOpen(false);
        };

        const handleDateSelect = (range: any) => {
          if (range?.from || range?.to) {
            update({ 
              start: range?.from ?? null, 
              end: range?.to ?? null 
            });
          }
        };

        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-sand-700">
              {label} {required && <span className="text-red-500">*</span>}
            </Label>

            {/* Trigger Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(true)}
              className={cn(
                "w-full justify-start text-left font-normal bg-white border-sand-300 text-sand-900 h-auto py-3 px-4 hover:bg-sand-50 transition-colors",
                !value.start && "text-sand-500"
              )}
            >
              <CalendarIcon className="mr-3 h-4 w-4 flex-shrink-0 text-sand-600" />
              <div className="flex flex-col items-start text-left min-w-0 flex-1 space-y-1">
                <span className="truncate w-full text-sm font-medium">{dateDisplay}</span>
                {timeDisplay && (
                  <div className="flex items-center text-xs text-sand-600">
                    <Clock className="mr-1 h-3 w-3" />
                    <span className="truncate w-full">{timeDisplay}</span>
                  </div>
                )}
              </div>
            </Button>

            {/* Modal Dialog for Mobile/Desktop */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogContent 
                className={cn(
                  "bg-white border-0 shadow-2xl",
                  isMobile 
                    ? "w-[95vw] max-w-[95vw] h-[90dvh] max-h-[90dvh] rounded-2xl p-0" 
                    : "w-[420px] max-w-[420px] rounded-xl p-0"
                )}
                onPointerDownOutside={(e) => {
                  // @ts-ignore
                  if (e?.target && (e.target as HTMLElement).closest?.("[data-keep-open]")) {
                    e.preventDefault();
                  }
                }}
              >
                <DialogHeader className="p-6 pb-4 border-b border-sand-200">
                  <DialogTitle className="text-lg font-semibold text-sand-900">
                    {label}
                  </DialogTitle>
                </DialogHeader>

                <div className={cn(
                  "flex flex-col",
                  isMobile ? "h-full overflow-y-auto" : ""
                )}>
                  {/* Calendar Section */}
                  <div className="p-6">
                    <Calendar
                      mode="range"
                      numberOfMonths={1}
                      captionLayout="dropdown"
                      fromYear={2024}
                      toYear={2027}
                      selected={{
                        from: value.start ?? undefined,
                        to: value.end ?? undefined,
                      }}
                      onSelect={handleDateSelect}
                      defaultMonth={value.start ?? defaultMonth}
                      className="rounded-lg border border-sand-200 bg-sand-50/30"
                      classNames={{
                        day_selected: "bg-sand-600 text-white hover:bg-sand-700",
                        day_range_start: "bg-sand-600 text-white hover:bg-sand-700",
                        day_range_middle: "bg-sand-200 text-sand-800 hover:bg-sand-300",
                        day_range_end: "bg-sand-600 text-white hover:bg-sand-700",
                        day_today: "border-2 border-earth-500 font-semibold",
                      }}
                    />
                  </div>

                  {/* Time Inputs Section */}
                  {!hideTimeInputs && (
                    <div className="px-6 py-4 border-t border-sand-200 bg-sand-50/50">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-sand-700">
                            Start Time
                          </Label>
                          <Input
                            type="time"
                            value={value.startTime ?? ""}
                            onChange={(e) => update({ startTime: e.target.value })}
                            step={timeStep}
                            className="w-full bg-white border-sand-300 focus:ring-sand-500 focus:border-sand-500"
                            data-keep-open
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-sand-700">
                            End Time
                          </Label>
                          <Input
                            type="time"
                            value={value.endTime ?? ""}
                            onChange={(e) => update({ endTime: e.target.value })}
                            step={timeStep}
                            className="w-full bg-white border-sand-300 focus:ring-sand-500 focus:border-sand-500"
                            data-keep-open
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between p-6 pt-4 border-t border-sand-200 bg-white">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={clear}
                      className="text-sand-600 hover:text-sand-800 hover:bg-sand-100"
                    >
                      Clear
                    </Button>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        className="border-sand-300 text-sand-700 hover:bg-sand-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="bg-earth-600 text-white hover:bg-earth-700 shadow-sm"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        );
      }}
    />
  );
}
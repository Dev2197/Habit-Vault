import { useState } from "react";
import { format, addDays, subDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

export default function DatePicker({ date, onDateChange }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  
  const handlePreviousDay = () => {
    onDateChange(subDays(date, 1));
  };
  
  const handleNextDay = () => {
    const tomorrow = addDays(date, 1);
    const today = new Date();
    
    // Don't allow selecting future dates
    if (tomorrow <= today) {
      onDateChange(tomorrow);
    }
  };
  
  const handleToday = () => {
    onDateChange(new Date());
  };
  
  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const isFutureDisabled = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  
  return (
    <div className="flex items-center space-x-2">
      <Button 
        variant="outline" 
        size="icon" 
        onClick={handlePreviousDay}
        title="Previous day"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal w-[200px]",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {format(date, "MMMM d, yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(day) => {
              if (day) {
                onDateChange(day);
                setOpen(false);
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      
      <Button 
        variant="outline"
        size="icon" 
        onClick={handleNextDay}
        disabled={isFutureDisabled}
        title="Next day"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      
      {!isToday && (
        <Button 
          variant="outline"
          size="sm"
          onClick={handleToday}
          className="ml-2"
        >
          Today
        </Button>
      )}
    </div>
  );
}
import { useState, useMemo } from "react";
import { format, parseISO, subDays, eachDayOfInterval } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { HabitWithStats } from "@shared/schema";

interface CompletionHeatmapProps {
  habits: HabitWithStats[];
  entries: any[];
}

// Helper to group entries by habit and date
const groupEntriesByHabitAndDate = (entries: any[]) => {
  const grouped: Record<number, Record<string, boolean>> = {};
  
  for (const entry of entries) {
    if (!grouped[entry.habitId]) {
      grouped[entry.habitId] = {};
    }
    
    const dateString = typeof entry.date === 'string' 
      ? entry.date.split('T')[0] 
      : new Date(entry.date).toISOString().split('T')[0];
    
    grouped[entry.habitId][dateString] = entry.completed;
  }
  
  return grouped;
};

export default function CompletionHeatmap({ habits, entries }: CompletionHeatmapProps) {
  const [daysToShow, setDaysToShow] = useState("30");
  
  // Group entries by habit and date
  const entriesByHabitAndDate = useMemo(() => {
    return groupEntriesByHabitAndDate(entries);
  }, [entries]);
  
  // Generate dates for the period
  const dates = useMemo(() => {
    const today = new Date();
    const startDate = subDays(today, parseInt(daysToShow));
    
    return eachDayOfInterval({ start: startDate, end: today })
      .map(date => format(date, 'yyyy-MM-dd'))
      .reverse();
  }, [daysToShow]);
  
  // Generate days of week (Mon, Tue, etc.)
  const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];
  
  // Get cell color based on completion status
  const getCellColor = (habitId: number, date: string, targetDays: string) => {
    // Check if the habit exists on the given date
    if (!entriesByHabitAndDate[habitId] || !entriesByHabitAndDate[habitId][date]) {
      // Check if this habit should be active on this date
      const dateObj = parseISO(date);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ...
      
      // Handle different target days
      if (targetDays === "weekdays" && (dayOfWeek === 0 || dayOfWeek === 6)) {
        return "bg-gray-100"; // weekend - not scheduled
      }
      
      if (targetDays === "weekends" && dayOfWeek !== 0 && dayOfWeek !== 6) {
        return "bg-gray-100"; // weekday - not scheduled
      }
      
      if (targetDays.startsWith("[")) {
        // Custom days (stored as JSON string)
        try {
          const customDays = JSON.parse(targetDays);
          const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
          if (!customDays.includes(dayNames[dayOfWeek])) {
            return "bg-gray-100"; // not scheduled for this custom day
          }
        } catch (e) {
          // If parsing fails, treat as everyday
        }
      }
      
      // If it's today's date and not yet completed
      if (date === format(new Date(), 'yyyy-MM-dd')) {
        return "bg-gray-200"; // today - not completed yet
      }
      
      // If it's a date before the habit start date
      const habitStartDate = format(parseISO(habits.find(h => h.id === habitId)?.startDate.toString() || ''), 'yyyy-MM-dd');
      if (date < habitStartDate) {
        return "bg-gray-100"; // before habit started
      }
      
      return "bg-red-500"; // missed
    }
    
    // If it was completed
    if (entriesByHabitAndDate[habitId][date]) {
      // Calculate intensity level (1-5) based on streak at that point
      // This is a simplified version - in a real app, you would calculate the streak for each day
      const daysCompleted = Object.values(entriesByHabitAndDate[habitId]).filter(Boolean).length;
      
      if (daysCompleted <= 2) return "bg-primary-100";
      if (daysCompleted <= 5) return "bg-primary-200";
      if (daysCompleted <= 10) return "bg-primary-300";
      if (daysCompleted <= 20) return "bg-primary-400";
      if (daysCompleted <= 30) return "bg-primary-500";
      if (daysCompleted <= 50) return "bg-primary-600";
      return "bg-primary-700";
    }
    
    return "bg-red-500"; // missed
  };

  // Function to calculate month label
  const getMonthLabel = (date: string) => {
    const dateObj = parseISO(date);
    return format(dateObj, 'MMMM yyyy');
  };

  // Group dates by month
  const datesByMonth = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    
    for (const date of dates) {
      const month = getMonthLabel(date);
      if (!grouped[month]) {
        grouped[month] = [];
      }
      grouped[month].push(date);
    }
    
    return grouped;
  }, [dates]);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Select value={daysToShow} onValueChange={setDaysToShow}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last Week</SelectItem>
            <SelectItem value="30">Last Month</SelectItem>
            <SelectItem value="90">Last 3 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Days Header */}
          <div className="flex mb-2">
            <div className="w-20"></div>
            <div className="flex space-x-2">
              {daysOfWeek.map((day, index) => (
                <div key={index} className="text-xs font-medium text-gray-500 w-8 text-center">
                  {day}
                </div>
              ))}
            </div>
          </div>
          
          {/* Habit Rows */}
          {habits.map((habit) => (
            <div key={habit.id} className="flex items-center mb-3">
              <div className="w-20 text-xs font-medium text-gray-700 truncate pr-2">
                {habit.name}
              </div>
              <div className="flex space-x-2">
                {dates.slice(0, 7).map((date, index) => (
                  <div
                    key={index}
                    className={cn(
                      "calendar-day w-8 h-8 rounded-md cursor-pointer transition-transform duration-200 hover:scale-110",
                      getCellColor(habit.id, date, habit.targetDays)
                    )}
                    title={`${format(parseISO(date), 'PP')}: ${
                      entriesByHabitAndDate[habit.id]?.[date] ? 'Completed' :
                      date === format(new Date(), 'yyyy-MM-dd') ? 'Not completed yet' :
                      'Missed'
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
          
          {/* Legend */}
          <div className="mt-6 flex items-center justify-end">
            <div className="text-xs text-gray-500 mr-2">Completion Level:</div>
            <div className="flex items-center space-x-1">
              <div className="w-4 h-4 rounded bg-gray-100"></div>
              <div className="w-4 h-4 rounded bg-primary-100"></div>
              <div className="w-4 h-4 rounded bg-primary-300"></div>
              <div className="w-4 h-4 rounded bg-primary-500"></div>
              <div className="w-4 h-4 rounded bg-primary-700"></div>
              <div className="ml-2 w-4 h-4 rounded bg-red-500"></div>
              <span className="text-xs text-gray-500 ml-1">Missed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

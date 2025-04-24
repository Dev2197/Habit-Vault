import { useState, useMemo } from "react";
import { format, parseISO, subDays, eachDayOfInterval, isAfter, isBefore, addDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { HabitWithStats } from "@shared/schema";
import { Calendar, Flame, Activity } from "lucide-react";

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
    const dateObj = parseISO(date);
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // If the date is in the future, show as not applicable
    if (isAfter(dateObj, today)) {
      return "bg-gray-50";
    }
    
    // Find the habit for this ID
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return "bg-gray-100";
    
    // If it's a date before the habit start date
    const habitStartDate = parseISO(habit.startDate.toString());
    if (isBefore(dateObj, habitStartDate)) {
      return "bg-gray-100"; // before habit started
    }
    
    // Check if this habit should be active on this date based on target days
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
    
    // Check if there's an entry for this date
    if (!entriesByHabitAndDate[habitId] || entriesByHabitAndDate[habitId][date] === undefined) {
      // If it's today's date and not yet completed
      if (date === todayStr) {
        return "bg-gray-300"; // today - not completed yet
      }
      
      return "bg-red-400"; // missed
    }
    
    // If explicitly marked as missed (not completed)
    if (entriesByHabitAndDate[habitId][date] === false) {
      return "bg-orange-400"; // marked as missed
    }
    
    // If it was completed
    if (entriesByHabitAndDate[habitId][date] === true) {
      // Calculate streak up to this point
      let streak = 0;
      let currentDate = dateObj;
      
      while (true) {
        const currentDateStr = format(currentDate, 'yyyy-MM-dd');
        
        // If we have a completed entry for this date, increment streak
        if (entriesByHabitAndDate[habitId]?.[currentDateStr] === true) {
          streak++;
          currentDate = subDays(currentDate, 1);
        } else {
          break;
        }
      }
      
      // Return color based on streak length
      if (streak <= 1) return "bg-green-300";
      if (streak <= 3) return "bg-green-400";
      if (streak <= 7) return "bg-green-500";
      if (streak <= 14) return "bg-green-600";
      if (streak <= 30) return "bg-green-700";
      return "bg-green-800";
    }
    
    return "bg-gray-200"; // default
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
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-primary" />
          Performance Overview
        </h3>
        <Select value={daysToShow} onValueChange={setDaysToShow}>
          <SelectTrigger className="w-40">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Time Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Last Week
              </div>
            </SelectItem>
            <SelectItem value="30">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Last Month
              </div>
            </SelectItem>
            <SelectItem value="90">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Last 3 Months
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Days Header */}
          <div className="flex mb-2">
            <div className="w-32"></div>
            <div className="flex space-x-2">
              {daysOfWeek.map((day, index) => (
                <div key={index} className="text-xs font-medium text-gray-500 w-8 text-center">
                  {day}
                </div>
              ))}
            </div>
          </div>
          
          {habits.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No habits to display. Add a habit to see your performance.
            </div>
          ) : (
            /* Habit Rows */
            habits.map((habit) => (
              <div key={habit.id} className="flex items-center mb-4">
                <div className="w-32 text-sm font-medium text-gray-700 truncate pr-2 flex items-center">
                  {habit.currentStreak >= 3 && (
                    <span title={`${habit.currentStreak} day streak!`}>
                      <Flame className="w-4 h-4 mr-1 text-orange-500" />
                    </span>
                  )}
                  {habit.name}
                  {habit.currentStreak > 0 && (
                    <span className="ml-1 text-xs text-primary">({habit.currentStreak})</span>
                  )}
                </div>
                <div className="flex space-x-2">
                  {dates.slice(0, parseInt(daysToShow) > 7 ? 7 : parseInt(daysToShow)).map((date, index) => (
                    <div
                      key={index}
                      className={cn(
                        "calendar-day w-8 h-8 rounded-md cursor-pointer transition-all duration-200 hover:scale-110 flex items-center justify-center",
                        getCellColor(habit.id, date, habit.targetDays)
                      )}
                      title={`${format(parseISO(date), 'PP')}: ${
                        entriesByHabitAndDate[habit.id]?.[date] === true ? 'Completed' :
                        entriesByHabitAndDate[habit.id]?.[date] === false ? 'Missed' :
                        date === format(new Date(), 'yyyy-MM-dd') ? 'Not completed yet' :
                        'Not marked'
                      }`}
                    >
                      {entriesByHabitAndDate[habit.id]?.[date] === true && (
                        <Activity className="w-4 h-4 text-white" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          
          {/* Legend */}
          <div className="mt-6 flex items-center justify-end">
            <div className="text-xs text-gray-500 mr-2">Status:</div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-green-500 mr-1"></div>
                <span className="text-xs text-gray-700">Completed</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-orange-400 mr-1"></div>
                <span className="text-xs text-gray-700">Missed</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-red-400 mr-1"></div>
                <span className="text-xs text-gray-700">Not Marked</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded bg-gray-100 mr-1"></div>
                <span className="text-xs text-gray-700">Not Scheduled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

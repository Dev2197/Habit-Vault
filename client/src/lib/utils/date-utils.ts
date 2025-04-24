import { format, isWeekend } from "date-fns";

// Format date to "Day, Month DD, YYYY" (e.g., "Monday, June 10, 2023")
export function formatDate(date: Date): string {
  return format(date, "EEEE, MMMM d, yyyy");
}

// Get a human-readable label for target days
export function getTargetDaysLabel(targetDays: string): string {
  if (targetDays === "everyday") {
    return "Every day";
  }
  
  if (targetDays === "weekdays") {
    return "Weekdays";
  }
  
  if (targetDays === "weekends") {
    return "Weekends";
  }
  
  // Handle custom days stored as a JSON string
  if (targetDays.startsWith("[")) {
    try {
      const days = JSON.parse(targetDays);
      if (days.length === 0) return "No days selected";
      
      // Map day names to short versions
      const dayMap: Record<string, string> = {
        monday: "Mon",
        tuesday: "Tue",
        wednesday: "Wed",
        thursday: "Thu",
        friday: "Fri",
        saturday: "Sat",
        sunday: "Sun"
      };
      
      const shortDays = days.map((day: string) => dayMap[day] || day);
      
      // If all days are selected, it's "Every day"
      if (shortDays.length === 7) return "Every day";
      
      // If it's Mon-Fri, it's "Weekdays"
      const weekdaysOnly = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      if (shortDays.length === 5 && weekdaysOnly.every(day => shortDays.includes(day))) {
        return "Weekdays";
      }
      
      // If it's Sat-Sun, it's "Weekends"
      if (shortDays.length === 2 && shortDays.includes('Sat') && shortDays.includes('Sun')) {
        return "Weekends";
      }
      
      // Otherwise, return the list of days
      return shortDays.join(", ");
    } catch (e) {
      return "Custom days";
    }
  }
  
  return targetDays;
}

// Check if a date should be active for a given target days setting
export function isDateActive(date: Date, targetDays: string): boolean {
  if (targetDays === "everyday") {
    return true;
  }
  
  const isWeekendDay = isWeekend(date);
  
  if (targetDays === "weekdays") {
    return !isWeekendDay;
  }
  
  if (targetDays === "weekends") {
    return isWeekendDay;
  }
  
  // Handle custom days stored as a JSON string
  if (targetDays.startsWith("[")) {
    try {
      const customDays = JSON.parse(targetDays);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      
      return customDays.includes(dayNames[dayOfWeek]);
    } catch (e) {
      return false;
    }
  }
  
  return false;
}

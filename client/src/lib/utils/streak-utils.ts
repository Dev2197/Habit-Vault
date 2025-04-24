import { HabitEntry, Habit } from "@shared/schema";
import { isDateActive } from "./date-utils";

// Calculate the current streak for a habit based on entries
export function calculateCurrentStreak(habit: Habit, entries: HabitEntry[]): number {
  if (!entries || entries.length === 0) return 0;
  
  // Sort entries by date (newest first)
  const sortedEntries = [...entries].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });
  
  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  
  // Check if there's an entry for today and it's completed
  const todayStr = currentDate.toISOString().split('T')[0];
  const todayEntry = sortedEntries.find(entry => 
    new Date(entry.date).toISOString().split('T')[0] === todayStr
  );
  
  // If today's entry exists and is completed, start counting streak
  if (todayEntry && todayEntry.completed) {
    streak = 1;
  } else {
    // If no entry for today or not completed, check if today is an active day
    const isTodayActive = isDateActive(currentDate, habit.targetDays);
    
    // If today is not an active day (e.g., weekend for a weekday habit), we don't break the streak
    if (!isTodayActive) {
      streak = 0;
    } else {
      // Today is active but not completed, so streak is 0
      return 0;
    }
  }
  
  // Check previous days
  let checkDate = new Date(currentDate);
  checkDate.setDate(checkDate.getDate() - 1); // Start with yesterday
  
  // Loop through previous days to calculate streak
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const isActiveDay = isDateActive(checkDate, habit.targetDays);
    
    // If it's not an active day, skip to the next day without breaking streak
    if (!isActiveDay) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }
    
    // Find entry for this date
    const entry = sortedEntries.find(e => 
      new Date(e.date).toISOString().split('T')[0] === dateStr
    );
    
    // If no entry or not completed, break the streak
    if (!entry || !entry.completed) {
      break;
    }
    
    // Increment streak and move to the previous day
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
    
    // Break if we go before the habit start date
    const habitStartDate = new Date(habit.startDate);
    habitStartDate.setHours(0, 0, 0, 0);
    if (checkDate < habitStartDate) break;
  }
  
  return streak;
}

// Calculate the longest streak for a habit
export function calculateLongestStreak(habit: Habit, entries: HabitEntry[]): number {
  if (!entries || entries.length === 0) return 0;
  
  // Sort entries by date (oldest first)
  const sortedEntries = [...entries].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });
  
  let currentStreak = 0;
  let longestStreak = 0;
  let previousDate: Date | null = null;
  
  for (const entry of sortedEntries) {
    if (entry.completed) {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      
      // If this is the first completed entry or if it's consecutive to the previous one
      if (previousDate === null) {
        currentStreak = 1;
      } else {
        // Calculate the gap between dates
        const diffTime = Math.abs(entryDate.getTime() - previousDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          // Consecutive day
          currentStreak++;
        } else {
          // Not consecutive, check if there are inactive days in between
          let isConsecutive = true;
          const tempDate = new Date(previousDate);
          
          for (let i = 1; i < diffDays; i++) {
            tempDate.setDate(tempDate.getDate() + 1);
            if (isDateActive(tempDate, habit.targetDays)) {
              // Found an active day that was missed
              isConsecutive = false;
              break;
            }
          }
          
          if (isConsecutive) {
            // All days in between were inactive days, so streak continues
            currentStreak++;
          } else {
            // Streak broken
            currentStreak = 1;
          }
        }
      }
      
      previousDate = entryDate;
      longestStreak = Math.max(longestStreak, currentStreak);
    }
  }
  
  return longestStreak;
}

// Check if a habit is completed today
export function isCompletedToday(habitId: number, entries: HabitEntry[]): boolean {
  const today = new Date().toISOString().split('T')[0];
  
  return entries.some(entry => 
    entry.habitId === habitId && 
    new Date(entry.date).toISOString().split('T')[0] === today && 
    entry.completed
  );
}

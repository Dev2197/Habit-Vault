import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isBefore, parseISO, isSameDay, isAfter } from "date-fns";
import Navbar from "@/components/navbar";
import HabitCard from "@/components/habit-card";
import AddHabitDialog from "@/components/add-habit-dialog";
import CompletionHeatmap from "@/components/completion-heatmap";
import TimeRangeSelector from "@/components/time-range-selector";
import DatePicker from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { PlusIcon, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatDate, isDateActive } from "@/lib/utils/date-utils";
import { HabitWithStats } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user } = useAuth();
  const [showAddHabitDialog, setShowAddHabitDialog] = useState(false);

  // Date selection state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState<string>("7");

  const {
    data: habits,
    isLoading: isLoadingHabits,
    error: habitsError,
  } = useQuery<HabitWithStats[]>({
    queryKey: ["/api/habits"],
  });

  const { data: entriesData, isLoading: isLoadingEntries } = useQuery({
    queryKey: ["/api/entries"],
  });

  // Ensure entries is always an array
  const entries = entriesData && Array.isArray(entriesData) ? entriesData : [];

  // Filter habits based on date selection
  const filteredHabits = useMemo(() => {
    if (!habits) return [];

    return habits.filter((habit) => {
      // If the habit start date is after the selected date, don't show it
      const habitStartDate = parseISO(habit.startDate.toString());
      if (isAfter(habitStartDate, selectedDate)) {
        return false;
      }

      // Check if the habit is active on the selected day
      return isDateActive(selectedDate, habit.targetDays);
    });
  }, [habits, selectedDate]);

  const formattedSelectedDate = formatDate(selectedDate);
  const isSelectedDateToday = isSameDay(selectedDate, new Date());

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Dashboard Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold font-sans text-gray-900">
                  {isSelectedDateToday ? "Today's Habits" : "Habits"}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {formattedSelectedDate}
                </p>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-4 mt-4 md:mt-0">
                <DatePicker
                  date={selectedDate}
                  onDateChange={setSelectedDate}
                />
                <Button
                  onClick={() => setShowAddHabitDialog(true)}
                  className="inline-flex items-center"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Add Habit
                </Button>
              </div>
            </div>
          </div>

          {/* Habits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingHabits ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 p-5"
                >
                  <div className="flex justify-between items-start">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Skeleton className="h-12 w-20" />
                    <Skeleton className="h-12 w-20" />
                  </div>
                  <Skeleton className="h-10 w-full mt-6" />
                </div>
              ))
            ) : habitsError ? (
              <div className="col-span-full text-center p-8 bg-white rounded-lg shadow-sm border border-gray-200">
                <p className="text-red-500">
                  Error loading habits. Please try again later.
                </p>
              </div>
            ) : filteredHabits && filteredHabits.length > 0 ? (
              // Actual habit cards
              filteredHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  selectedDate={selectedDate}
                  entries={entries}
                />
              ))
            ) : habits && habits.length > 0 && filteredHabits.length === 0 ? (
              // No habits for selected date
              <div className="col-span-full text-center p-8 bg-white rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">
                  No habits scheduled for this date
                </h3>
                <p className="text-gray-500 mb-4">
                  Either select a different date or add a new habit that
                  includes this day
                </p>
                <div className="flex justify-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedDate(new Date())}
                  >
                    Return to Today
                  </Button>
                  <Button onClick={() => setShowAddHabitDialog(true)}>
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    Add New Habit
                  </Button>
                </div>
              </div>
            ) : (
              // Empty state - no habits at all
              <div className="col-span-full text-center p-8 bg-white rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">
                  No habits yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Get started by adding your first habit
                </p>
                <Button onClick={() => setShowAddHabitDialog(true)}>
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Add Your First Habit
                </Button>
              </div>
            )}
          </div>

          {/* Performance Section */}
          {habits && habits.length > 0 && (
            <div className="mt-12">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <h2 className="text-xl font-bold font-sans text-gray-900">
                  Performance Overview
                </h2>
                <div className="mt-2 md:mt-0">
                  <TimeRangeSelector value={timeRange} />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                {isLoadingEntries ? (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-gray-500">
                      Loading completion history...
                    </p>
                  </div>
                ) : (
                  <CompletionHeatmap
                    habits={habits}
                    entries={entries}
                    daysToShow={timeRange}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Habit Dialog */}
      <AddHabitDialog
        open={showAddHabitDialog}
        onOpenChange={setShowAddHabitDialog}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} HabitVault. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

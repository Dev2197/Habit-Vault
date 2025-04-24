import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/navbar";
import HabitCard from "@/components/habit-card";
import AddHabitDialog from "@/components/add-habit-dialog";
import CompletionHeatmap from "@/components/completion-heatmap";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/utils/date-utils";
import { HabitWithStats } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user } = useAuth();
  const [showAddHabitDialog, setShowAddHabitDialog] = useState(false);
  
  const { data: habits, isLoading: isLoadingHabits, error: habitsError } = useQuery<HabitWithStats[]>({
    queryKey: ["/api/habits"],
  });

  const { data: entries, isLoading: isLoadingEntries } = useQuery({
    queryKey: ["/api/entries"],
  });

  const today = new Date();
  const formattedToday = formatDate(today);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-1 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Dashboard Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold font-sans text-gray-900">Today's Habits</h1>
                <p className="mt-1 text-sm text-gray-500">{formattedToday}</p>
              </div>
              <div className="mt-4 md:mt-0">
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
                <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 p-5">
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
                <p className="text-red-500">Error loading habits. Please try again later.</p>
              </div>
            ) : habits && habits.length > 0 ? (
              // Actual habit cards
              habits.map((habit) => (
                <HabitCard key={habit.id} habit={habit} />
              ))
            ) : (
              // Empty state
              <div className="col-span-full text-center p-8 bg-white rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-2">No habits yet</h3>
                <p className="text-gray-500 mb-4">Get started by adding your first habit</p>
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
              <h2 className="text-xl font-bold font-sans text-gray-900 mb-6">Performance Overview</h2>
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Completion History</h3>
                {isLoadingEntries ? (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-gray-500">Loading completion history...</p>
                  </div>
                ) : (
                  <CompletionHeatmap habits={habits} entries={entries || []} />
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

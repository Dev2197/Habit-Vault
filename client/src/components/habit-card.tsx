import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HabitWithStats } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Circle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTargetDaysLabel } from "@/lib/utils/date-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import EditHabitDialog from "./edit-habit-dialog";
import DeleteHabitDialog from "./delete-habit-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { isAfter } from 'date-fns';


interface HabitCardProps {
  habit: HabitWithStats;
}

export default function HabitCard({ habit }: HabitCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());


  // Calculate days since start
  const startDate = new Date(habit.startDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Format the last completion time if available
  const lastCompletionTime = habit.lastCompletedDate
    ? new Date(habit.lastCompletedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '-';

  // Toggle habit status mutation
  const updateHabitStatusMutation = useMutation({
    mutationFn: async (status: 'completed' | 'missed' | 'unmarked') => {
      const res = await apiRequest("POST", `/api/habits/${habit.id}/toggle`, {
        date: selectedDate.toISOString().split("T")[0], // Use selectedDate
        status
      });
      if (status === 'unmarked') {
        return null; // No content returned for unmarked status
      }
      return await res.json();
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });

      if (status === 'completed') {
        toast({
          title: "Habit completed!",
          description: `Keep it up! Current streak: ${habit.currentStreak + 1}`,
          variant: "default",
        });
      } else if (status === 'missed') {
        toast({
          title: "Habit marked as missed",
          description: "It's okay to miss sometimes. Your streak has been updated.",
          variant: "default",
        });
      } else {
        toast({
          title: "Habit mark removed",
          description: "Habit status has been reset for today.",
          variant: "default",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error updating habit status",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Determine if the card should have the streak pulse animation
  const hasLongStreak = habit.currentStreak >= 10;
  const isCloseToRecord = habit.currentStreak > 0 && habit.currentStreak >= habit.longestStreak - 1;
  const shouldPulse = hasLongStreak || isCloseToRecord;

  return (
    <div className="habit-card bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-all duration-200">
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{habit.name}</h3>
            <p className="text-sm text-gray-500">{getTargetDaysLabel(habit.targetDays)}</p>
          </div>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-gray-500"
              onClick={() => setShowEditDialog(true)}
            >
              <Pencil className="h-5 w-5" />
              <span className="sr-only">Edit habit</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-red-500"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-5 w-5" />
              <span className="sr-only">Delete habit</span>
            </Button>
          </div>
        </div>

        <DatePicker
          date={selectedDate}
          onDateChange={setSelectedDate}
          min={new Date()} //Allow only future dates
        />


        <div className="mt-4 flex items-center">
          <div className="flex-1">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current streak</div>
            <div className="mt-1 flex items-baseline">
              <span className={cn(
                "text-2xl font-semibold",
                shouldPulse && "text-primary animate-pulse",
                habit.currentStreak === 0 && "text-red-500",
                !shouldPulse && habit.currentStreak > 0 && "text-primary"
              )}>
                {habit.currentStreak}
              </span>
              <span className="ml-1 text-sm text-gray-500">
                {habit.currentStreak === 1 ? "day" : "days"}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Longest streak</div>
            <div className="mt-1 flex items-baseline">
              <span className="text-2xl font-semibold text-gray-700">{habit.longestStreak}</span>
              <span className="ml-1 text-sm text-gray-500">
                {habit.longestStreak === 1 ? "day" : "days"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="grid grid-cols-3 gap-2">
            <Button
              className={cn(
                "flex items-center justify-center",
                habit.completedToday ? "bg-green-500 hover:bg-green-600" : ""
              )}
              disabled={updateHabitStatusMutation.isPending || isAfter(selectedDate, new Date())}
              onClick={() => updateHabitStatusMutation.mutate('completed')}
              variant={habit.completedToday ? "default" : "outline"}
            >
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Done
            </Button>

            <Button
              className="flex items-center justify-center"
              disabled={updateHabitStatusMutation.isPending || isAfter(selectedDate, new Date())}
              onClick={() => updateHabitStatusMutation.mutate('missed')}
              variant={habit.completedToday === false && habit.lastCompletedDate === new Date().toISOString().split('T')[0] ? "default" : "outline"}
            >
              <XCircle className="mr-1 h-4 w-4" />
              Missed
            </Button>

            <Button
              className="flex items-center justify-center"
              disabled={updateHabitStatusMutation.isPending || isAfter(selectedDate, new Date())}
              onClick={() => updateHabitStatusMutation.mutate('unmarked')}
              variant="outline"
            >
              <Circle className="mr-1 h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 px-5 py-3">
        <div className="text-xs text-gray-500 flex justify-between items-center">
          <span>Started {diffDays > 1 ? `${diffDays} days ago` : 'today'}</span>
          {habit.completedToday ? (
            <span className="text-green-600 font-medium">Completed at {lastCompletionTime}</span>
          ) : (
            habit.lastCompletedDate === new Date().toISOString().split('T')[0] ? (
              <span className="text-orange-600 font-medium">Marked as missed today</span>
            ) : (
              habit.currentStreak > 5 ? (
                <span className="text-red-500 font-medium">Don't break your streak!</span>
              ) : null
            )
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <EditHabitDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        habit={habit}
      />

      {/* Delete Dialog */}
      <DeleteHabitDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        habit={habit}
      />
    </div>
  );
}
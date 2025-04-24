import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HabitWithStats } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Circle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTargetDaysLabel } from "@/lib/utils/date-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import EditHabitDialog from "./edit-habit-dialog";
import DeleteHabitDialog from "./delete-habit-dialog";

interface HabitCardProps {
  habit: HabitWithStats;
}

export default function HabitCard({ habit }: HabitCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Calculate days since start
  const startDate = new Date(habit.startDate);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Format the last completion time if available
  const lastCompletionTime = habit.lastCompletedDate 
    ? new Date(habit.lastCompletedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '-';
  
  // Toggle habit completion mutation
  const toggleCompletionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/habits/${habit.id}/toggle`, {
        date: new Date().toISOString().split("T")[0]
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      
      toast({
        title: habit.completedToday ? "Habit marked as incomplete" : "Habit completed!",
        description: habit.completedToday 
          ? "Your streak has been updated." 
          : `Keep it up! Current streak: ${habit.currentStreak + 1}`,
        variant: habit.completedToday ? "default" : "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error toggling habit status",
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
          <Button 
            className={cn(
              "w-full flex items-center justify-center",
              habit.completedToday ? "bg-green-500 hover:bg-green-600" : ""
            )}
            disabled={toggleCompletionMutation.isPending}
            onClick={() => toggleCompletionMutation.mutate()}
          >
            {habit.completedToday ? (
              <>
                <CheckCircle2 className="-ml-1 mr-2 h-5 w-5" />
                Completed
              </>
            ) : (
              <>
                <Circle className="-ml-1 mr-2 h-5 w-5" />
                Mark as Done
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="bg-gray-50 px-5 py-3">
        <div className="text-xs text-gray-500 flex justify-between items-center">
          <span>Started {diffDays > 1 ? `${diffDays} days ago` : 'today'}</span>
          {habit.completedToday ? (
            <span>{lastCompletionTime}</span>
          ) : (
            habit.currentStreak > 10 ? (
              <span className="text-red-500 font-medium">Don't break your streak!</span>
            ) : null
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

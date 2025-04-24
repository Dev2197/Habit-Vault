import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HabitWithStats } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DeleteHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit: HabitWithStats;
}

export default function DeleteHabitDialog({ open, onOpenChange, habit }: DeleteHabitDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const deleteHabitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/habits/${habit.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      toast({
        title: "Habit deleted",
        description: "Your habit has been deleted successfully.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error deleting habit",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleDelete = () => {
    deleteHabitMutation.mutate();
  };
  
  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the habit "{habit.name}" and all of its tracking history. 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            className="bg-red-500 hover:bg-red-600"
            disabled={deleteHabitMutation.isPending}
          >
            {deleteHabitMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

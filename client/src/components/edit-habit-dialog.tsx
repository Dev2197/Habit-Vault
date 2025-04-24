import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { targetDaysOptions, HabitWithStats } from "@shared/schema";

interface EditHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit: HabitWithStats;
}

const habitSchema = z.object({
  name: z.string().min(1, "Habit name is required").max(50, "Habit name is too long"),
  targetDays: z.enum(targetDaysOptions),
  customDays: z.array(z.string()).optional(),
  startDate: z.string().min(1, "Start date is required"),
});

type HabitFormValues = z.infer<typeof habitSchema>;

const daysOfWeek = [
  { id: "monday", label: "Mon" },
  { id: "tuesday", label: "Tue" },
  { id: "wednesday", label: "Wed" },
  { id: "thursday", label: "Thu" },
  { id: "friday", label: "Fri" },
  { id: "saturday", label: "Sat" },
  { id: "sunday", label: "Sun" },
];

export default function EditHabitDialog({ open, onOpenChange, habit }: EditHabitDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Parse custom days if it's a JSON string
  const parseCustomDays = (targetDays: string): string[] => {
    if (targetDays.startsWith('[')) {
      try {
        return JSON.parse(targetDays);
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  // Determine target days type and custom days
  const getTargetDaysType = (targetDays: string): typeof targetDaysOptions[number] => {
    if (targetDays === "everyday" || targetDays === "weekdays" || targetDays === "weekends") {
      return targetDays;
    }
    return "custom";
  };
  
  // Format start date to YYYY-MM-DD
  const formatDate = (date: Date | string): string => {
    if (typeof date === 'string') {
      return new Date(date).toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  };
  
  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      name: habit.name,
      targetDays: getTargetDaysType(habit.targetDays),
      customDays: getTargetDaysType(habit.targetDays) === "custom" 
        ? parseCustomDays(habit.targetDays) 
        : [],
      startDate: formatDate(habit.startDate),
    },
  });
  
  // Update form when habit changes
  useEffect(() => {
    form.reset({
      name: habit.name,
      targetDays: getTargetDaysType(habit.targetDays),
      customDays: getTargetDaysType(habit.targetDays) === "custom" 
        ? parseCustomDays(habit.targetDays) 
        : [],
      startDate: formatDate(habit.startDate),
    });
  }, [habit, form]);
  
  const targetDaysValue = form.watch("targetDays");
  
  // Edit habit mutation
  const editHabitMutation = useMutation({
    mutationFn: async (values: HabitFormValues) => {
      // Prepare the data to send
      const habitData = {
        name: values.name,
        targetDays: values.targetDays === "custom" 
          ? JSON.stringify(values.customDays) 
          : values.targetDays,
        startDate: values.startDate,
      };
      
      const res = await apiRequest("PUT", `/api/habits/${habit.id}`, habitData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({
        title: "Habit updated",
        description: "Your habit has been updated successfully.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error updating habit",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (values: HabitFormValues) => {
    editHabitMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Habit</DialogTitle>
          <DialogDescription>
            Make changes to your habit tracking settings.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Habit Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Drink 2L water" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="targetDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Days</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target days" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="everyday">Every Day</SelectItem>
                      <SelectItem value="weekdays">Weekdays</SelectItem>
                      <SelectItem value="weekends">Weekends</SelectItem>
                      <SelectItem value="custom">Custom Days</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {targetDaysValue === "custom" && (
              <FormField
                control={form.control}
                name="customDays"
                render={() => (
                  <FormItem>
                    <FormLabel>Select Days</FormLabel>
                    <div className="flex flex-wrap gap-4">
                      {daysOfWeek.map((day) => (
                        <FormField
                          key={day.id}
                          control={form.control}
                          name="customDays"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={day.id}
                                className="flex flex-row items-center space-x-2 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(day.id)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      return checked
                                        ? field.onChange([...currentValue, day.id])
                                        : field.onChange(
                                            currentValue.filter((value) => value !== day.id)
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm">{day.label}</FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="mt-2 sm:mt-0"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={editHabitMutation.isPending}
                className="mt-2 sm:mt-0"
              >
                {editHabitMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

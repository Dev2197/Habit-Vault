import { useState } from "react";
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
import { targetDaysOptions } from "@shared/schema";

interface AddHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export default function AddHabitDialog({ open, onOpenChange }: AddHabitDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Format today's date as YYYY-MM-DD for the date input
  const today = new Date().toISOString().split("T")[0];
  
  const form = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      name: "",
      targetDays: "everyday",
      customDays: [],
      startDate: today,
    },
  });
  
  const targetDaysValue = form.watch("targetDays");
  
  // Add habit mutation
  const addHabitMutation = useMutation({
    mutationFn: async (values: HabitFormValues) => {
      // Prepare the data to send
      const habitData = {
        name: values.name,
        targetDays: values.targetDays === "custom" 
          ? JSON.stringify(values.customDays) 
          : values.targetDays,
        startDate: values.startDate,
      };
      
      const res = await apiRequest("POST", "/api/habits", habitData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
      toast({
        title: "Habit created",
        description: "Your new habit has been added successfully.",
      });
      form.reset({
        name: "",
        targetDays: "everyday",
        customDays: [],
        startDate: today,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error creating habit",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (values: HabitFormValues) => {
    addHabitMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Habit</DialogTitle>
          <DialogDescription>
            Create a new habit to track daily and build consistency.
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
                disabled={addHabitMutation.isPending}
                className="mt-2 sm:mt-0"
              >
                {addHabitMutation.isPending ? "Creating..." : "Create Habit"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

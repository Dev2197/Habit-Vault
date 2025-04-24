import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertHabitSchema, insertHabitEntrySchema } from "@shared/schema";
import { z } from "zod";

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req: Request, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // === Habit Routes ===
  
  // Get all habits for the logged-in user
  app.get("/api/habits", ensureAuthenticated, async (req, res) => {
    try {
      const habits = await storage.getHabitsByUserId(req.user!.id);
      // Calculate streaks and stats for each habit
      const habitsWithStats = await Promise.all(
        habits.map(async (habit) => {
          const entries = await storage.getHabitEntriesByHabitId(habit.id);
          const today = new Date().toISOString().split('T')[0];
          
          // Calculate current streak
          let currentStreak = 0;
          let completedToday = false;
          let lastCompletedDate = null;
          
          // Sort entries by date (newest first)
          const sortedEntries = [...entries].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          
          // Check if completed today
          if (sortedEntries.length > 0 && sortedEntries[0].date === today) {
            completedToday = sortedEntries[0].completed;
            if (completedToday) {
              lastCompletedDate = today;
            }
          }
          
          // Calculate current streak
          for (let i = 0; i < sortedEntries.length; i++) {
            const entry = sortedEntries[i];
            if (entry.completed) {
              currentStreak++;
              if (!lastCompletedDate) {
                lastCompletedDate = entry.date;
              }
            } else {
              break;
            }
          }
          
          // Calculate longest streak
          let longestStreak = 0;
          let tempStreak = 0;
          
          for (const entry of sortedEntries) {
            if (entry.completed) {
              tempStreak++;
            } else {
              longestStreak = Math.max(longestStreak, tempStreak);
              tempStreak = 0;
            }
          }
          
          longestStreak = Math.max(longestStreak, tempStreak);
          
          return {
            ...habit,
            currentStreak,
            longestStreak,
            completedToday,
            lastCompletedDate
          };
        })
      );
      
      res.json(habitsWithStats);
    } catch (err) {
      console.error("Error getting habits:", err);
      res.status(500).json({ message: "Error fetching habits" });
    }
  });

  // Create a new habit
  app.post("/api/habits", ensureAuthenticated, async (req, res) => {
    try {
      const habitData = insertHabitSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      
      const habit = await storage.createHabit(habitData);
      res.status(201).json(habit);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid habit data", errors: err.format() });
      }
      console.error("Error creating habit:", err);
      res.status(500).json({ message: "Error creating habit" });
    }
  });

  // Update a habit
  app.put("/api/habits/:id", ensureAuthenticated, async (req, res) => {
    try {
      const habitId = parseInt(req.params.id);
      const habit = await storage.getHabit(habitId);
      
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      
      if (habit.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized to update this habit" });
      }
      
      const updatedHabit = await storage.updateHabit(habitId, req.body);
      res.json(updatedHabit);
    } catch (err) {
      console.error("Error updating habit:", err);
      res.status(500).json({ message: "Error updating habit" });
    }
  });

  // Delete a habit
  app.delete("/api/habits/:id", ensureAuthenticated, async (req, res) => {
    try {
      const habitId = parseInt(req.params.id);
      const habit = await storage.getHabit(habitId);
      
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      
      if (habit.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized to delete this habit" });
      }
      
      await storage.deleteHabit(habitId);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting habit:", err);
      res.status(500).json({ message: "Error deleting habit" });
    }
  });

  // === Habit Entries Routes ===

  // Get all entries for a specific habit
  app.get("/api/habits/:id/entries", ensureAuthenticated, async (req, res) => {
    try {
      const habitId = parseInt(req.params.id);
      const habit = await storage.getHabit(habitId);
      
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      
      if (habit.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized to view this habit's entries" });
      }
      
      const entries = await storage.getHabitEntriesByHabitId(habitId);
      res.json(entries);
    } catch (err) {
      console.error("Error getting habit entries:", err);
      res.status(500).json({ message: "Error fetching habit entries" });
    }
  });

  // Toggle completion status of a habit for a specific date
  app.post("/api/habits/:id/toggle", ensureAuthenticated, async (req, res) => {
    try {
      const habitId = parseInt(req.params.id);
      const { date = new Date().toISOString().split('T')[0], status } = req.body;
      
      const habit = await storage.getHabit(habitId);
      
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      
      if (habit.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized to update this habit" });
      }
      
      // Check if entry exists for this date
      const existingEntry = await storage.getHabitEntryByDate(habitId, date);
      
      if (existingEntry) {
        // If status is provided, set the value directly
        if (status !== undefined) {
          const completed = status === 'completed';
          const updated = await storage.updateHabitEntry(
            existingEntry.id, 
            { completed }
          );
          return res.json(updated);
        } else {
          // Toggle the existing entry if no status provided
          const updated = await storage.updateHabitEntry(
            existingEntry.id, 
            { completed: !existingEntry.completed }
          );
          return res.json(updated);
        }
      } else {
        // Create a new entry
        const completed = status === undefined || status === 'completed';
        const newEntry = await storage.createHabitEntry({
          habitId,
          userId: req.user!.id,
          date,
          completed
        });
        return res.status(201).json(newEntry);
      }
    } catch (err) {
      console.error("Error toggling habit completion:", err);
      res.status(500).json({ message: "Error updating habit completion status" });
    }
  });

  // Get all entries for all habits for a user (for heatmap)
  app.get("/api/entries", ensureAuthenticated, async (req, res) => {
    try {
      const entries = await storage.getHabitEntriesByUserId(req.user!.id);
      res.json(entries);
    } catch (err) {
      console.error("Error getting habit entries:", err);
      res.status(500).json({ message: "Error fetching habit entries" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

import { users, habits, habitEntries, type User, type InsertUser, type Habit, type InsertHabit, type HabitEntry, type InsertHabitEntry } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Habit methods
  getHabit(id: number): Promise<Habit | undefined>;
  getHabitsByUserId(userId: number): Promise<Habit[]>;
  createHabit(habit: InsertHabit): Promise<Habit>;
  updateHabit(id: number, updates: Partial<Habit>): Promise<Habit>;
  deleteHabit(id: number): Promise<void>;
  
  // Habit Entry methods
  getHabitEntry(id: number): Promise<HabitEntry | undefined>;
  getHabitEntryByDate(habitId: number, date: string): Promise<HabitEntry | undefined>;
  getHabitEntriesByHabitId(habitId: number): Promise<HabitEntry[]>;
  getHabitEntriesByUserId(userId: number): Promise<HabitEntry[]>;
  createHabitEntry(entry: InsertHabitEntry): Promise<HabitEntry>;
  updateHabitEntry(id: number, updates: Partial<HabitEntry>): Promise<HabitEntry>;
  deleteHabitEntry(id: number): Promise<void>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private habits: Map<number, Habit>;
  private habitEntries: Map<number, HabitEntry>;
  sessionStore: session.SessionStore;
  
  private userIdCounter: number;
  private habitIdCounter: number;
  private habitEntryIdCounter: number;

  constructor() {
    this.users = new Map();
    this.habits = new Map();
    this.habitEntries = new Map();
    this.userIdCounter = 1;
    this.habitIdCounter = 1;
    this.habitEntryIdCounter = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }

  // Habit methods
  async getHabit(id: number): Promise<Habit | undefined> {
    return this.habits.get(id);
  }

  async getHabitsByUserId(userId: number): Promise<Habit[]> {
    return Array.from(this.habits.values()).filter(
      (habit) => habit.userId === userId
    );
  }

  async createHabit(insertHabit: InsertHabit): Promise<Habit> {
    const id = this.habitIdCounter++;
    const now = new Date();
    
    // Handle date conversion for startDate
    let startDate = insertHabit.startDate;
    if (typeof startDate === 'string') {
      startDate = new Date(startDate);
    }
    
    const habit: Habit = {
      ...insertHabit,
      id,
      startDate,
      createdAt: now
    };
    
    this.habits.set(id, habit);
    return habit;
  }

  async updateHabit(id: number, updates: Partial<Habit>): Promise<Habit> {
    const habit = this.habits.get(id);
    if (!habit) {
      throw new Error(`Habit with ID ${id} not found`);
    }
    
    // Handle date conversion for startDate if it exists in updates
    let startDate = updates.startDate;
    if (startDate && typeof startDate === 'string') {
      startDate = new Date(startDate);
      updates.startDate = startDate;
    }
    
    const updatedHabit: Habit = { ...habit, ...updates };
    this.habits.set(id, updatedHabit);
    return updatedHabit;
  }

  async deleteHabit(id: number): Promise<void> {
    // Delete the habit
    this.habits.delete(id);
    
    // Also delete all related entries
    const entriesToDelete = Array.from(this.habitEntries.values())
      .filter(entry => entry.habitId === id)
      .map(entry => entry.id);
    
    for (const entryId of entriesToDelete) {
      this.habitEntries.delete(entryId);
    }
  }

  // Habit Entry methods
  async getHabitEntry(id: number): Promise<HabitEntry | undefined> {
    return this.habitEntries.get(id);
  }

  async getHabitEntryByDate(habitId: number, date: string): Promise<HabitEntry | undefined> {
    // Convert date string to a Date object if it's a string
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const dateStr = dateObj.toISOString().split('T')[0]; // Format to YYYY-MM-DD
    
    return Array.from(this.habitEntries.values()).find(
      (entry) => entry.habitId === habitId && entry.date.toISOString().split('T')[0] === dateStr
    );
  }

  async getHabitEntriesByHabitId(habitId: number): Promise<HabitEntry[]> {
    return Array.from(this.habitEntries.values()).filter(
      (entry) => entry.habitId === habitId
    );
  }

  async getHabitEntriesByUserId(userId: number): Promise<HabitEntry[]> {
    return Array.from(this.habitEntries.values()).filter(
      (entry) => entry.userId === userId
    );
  }

  async createHabitEntry(insertEntry: InsertHabitEntry): Promise<HabitEntry> {
    const id = this.habitEntryIdCounter++;
    const now = new Date();
    
    // Handle date conversion for the date field
    let entryDate = insertEntry.date;
    if (typeof entryDate === 'string') {
      entryDate = new Date(entryDate);
    }
    
    const entry: HabitEntry = {
      ...insertEntry,
      id,
      date: entryDate,
      createdAt: now
    };
    
    this.habitEntries.set(id, entry);
    return entry;
  }

  async updateHabitEntry(id: number, updates: Partial<HabitEntry>): Promise<HabitEntry> {
    const entry = this.habitEntries.get(id);
    if (!entry) {
      throw new Error(`Habit entry with ID ${id} not found`);
    }
    
    // Handle date conversion for the date field if it exists in updates
    let entryDate = updates.date;
    if (entryDate && typeof entryDate === 'string') {
      entryDate = new Date(entryDate);
      updates.date = entryDate;
    }
    
    const updatedEntry: HabitEntry = { ...entry, ...updates };
    this.habitEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteHabitEntry(id: number): Promise<void> {
    this.habitEntries.delete(id);
  }
}

export const storage = new MemStorage();

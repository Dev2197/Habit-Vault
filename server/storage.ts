import { users, habits, habitEntries, type User, type InsertUser, type Habit, type InsertHabit, type HabitEntry, type InsertHabitEntry } from "@shared/schema";
import session from "express-session";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { Pool } from "@neondatabase/serverless";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);
// Define SessionStore type
type SessionStore = ReturnType<typeof connectPg> & {
  new (options: { pool: Pool, createTableIfMissing?: boolean }): session.Store;
};

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
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true 
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }
  
  // Habit methods
  async getHabit(id: number): Promise<Habit | undefined> {
    const result = await db.select().from(habits).where(eq(habits.id, id));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async getHabitsByUserId(userId: number): Promise<Habit[]> {
    return await db.select().from(habits).where(eq(habits.userId, userId));
  }
  
  async createHabit(insertHabit: InsertHabit): Promise<Habit> {
    // Ensure startDate is a Date object
    let habitData = { ...insertHabit };
    if (typeof habitData.startDate === 'string') {
      habitData.startDate = new Date(habitData.startDate);
    }
    
    const result = await db.insert(habits).values(habitData).returning();
    return result[0];
  }
  
  async updateHabit(id: number, updates: Partial<Habit>): Promise<Habit> {
    // Ensure startDate is a Date object if present
    let updateData = { ...updates };
    if (updateData.startDate && typeof updateData.startDate === 'string') {
      updateData.startDate = new Date(updateData.startDate);
    }
    
    const result = await db.update(habits)
      .set(updateData)
      .where(eq(habits.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Habit with ID ${id} not found`);
    }
    
    return result[0];
  }
  
  async deleteHabit(id: number): Promise<void> {
    // First delete associated entries
    await db.delete(habitEntries).where(eq(habitEntries.habitId, id));
    
    // Then delete the habit
    const result = await db.delete(habits).where(eq(habits.id, id)).returning();
    
    if (result.length === 0) {
      throw new Error(`Habit with ID ${id} not found`);
    }
  }
  
  // Habit Entry methods
  async getHabitEntry(id: number): Promise<HabitEntry | undefined> {
    const result = await db.select().from(habitEntries).where(eq(habitEntries.id, id));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async getHabitEntryByDate(habitId: number, date: string): Promise<HabitEntry | undefined> {
    // Convert date string to a properly formatted date string YYYY-MM-DD
    const dateObj = new Date(date);
    const formattedDate = dateObj.toISOString().split('T')[0];
    
    // Use SQL string to handle date comparison
    const result = await db.select().from(habitEntries).where(
      and(
        eq(habitEntries.habitId, habitId),
        sql`CAST(${habitEntries.date} AS TEXT) = ${formattedDate}`
      )
    );
    
    return result.length > 0 ? result[0] : undefined;
  }
  
  async getHabitEntriesByHabitId(habitId: number): Promise<HabitEntry[]> {
    return await db.select().from(habitEntries).where(eq(habitEntries.habitId, habitId));
  }
  
  async getHabitEntriesByUserId(userId: number): Promise<HabitEntry[]> {
    return await db.select().from(habitEntries).where(eq(habitEntries.userId, userId));
  }
  
  async createHabitEntry(insertEntry: InsertHabitEntry): Promise<HabitEntry> {
    // Ensure date is a Date object
    let entryData = { ...insertEntry };
    if (typeof entryData.date === 'string') {
      entryData.date = new Date(entryData.date);
    }
    
    const result = await db.insert(habitEntries).values(entryData).returning();
    return result[0];
  }
  
  async updateHabitEntry(id: number, updates: Partial<HabitEntry>): Promise<HabitEntry> {
    // Ensure date is a Date object if present
    let updateData = { ...updates };
    if (updateData.date && typeof updateData.date === 'string') {
      updateData.date = new Date(updateData.date);
    }
    
    const result = await db.update(habitEntries)
      .set(updateData)
      .where(eq(habitEntries.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Habit entry with ID ${id} not found`);
    }
    
    return result[0];
  }
  
  async deleteHabitEntry(id: number): Promise<void> {
    const result = await db.delete(habitEntries)
      .where(eq(habitEntries.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Habit entry with ID ${id} not found`);
    }
  }
}

export const storage = new DatabaseStorage();

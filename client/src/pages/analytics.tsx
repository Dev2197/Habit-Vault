import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2 } from "lucide-react";
import { HabitWithStats } from "@shared/schema";

export default function Analytics() {
  const [activeTab, setActiveTab] = useState("completion");
  
  const { data: habits, isLoading } = useQuery<HabitWithStats[]>({
    queryKey: ["/api/habits"],
  });

  const { data: entries } = useQuery({
    queryKey: ["/api/entries"],
  });

  // Calculate completion rate
  const calculateCompletionRate = () => {
    if (!habits || !entries) return 0;
    
    const totalEntries = entries.length;
    const completedEntries = entries.filter((entry: any) => entry.completed).length;
    
    return totalEntries > 0 ? (completedEntries / totalEntries) * 100 : 0;
  };

  // Generate data for the pie chart
  const generatePieData = () => {
    if (!habits) return [];
    
    return [
      { name: "Completed", value: habits.filter(h => h.completedToday).length },
      { name: "Not Completed", value: habits.filter(h => !h.completedToday).length }
    ];
  };

  // Generate data for the streak chart
  const generateStreakData = () => {
    if (!habits) return [];
    
    return habits.map(habit => ({
      name: habit.name.length > 15 ? habit.name.substring(0, 15) + '...' : habit.name,
      currentStreak: habit.currentStreak,
      longestStreak: habit.longestStreak
    }));
  };

  const pieColors = ["#6366f1", "#e5e7eb"];
  const pieData = generatePieData();
  const streakData = generateStreakData();
  const completionRate = calculateCompletionRate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-1 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold font-sans text-gray-900 mb-6">Analytics</h1>
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Habits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{habits?.length || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{completionRate.toFixed(1)}%</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Longest Streak</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {habits && habits.length > 0 
                    ? Math.max(...habits.map(h => h.longestStreak)) 
                    : 0}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="completion">Today's Completion</TabsTrigger>
              <TabsTrigger value="streaks">Habit Streaks</TabsTrigger>
            </TabsList>
            
            <TabsContent value="completion" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Habit Completion</CardTitle>
                  <CardDescription>
                    Overview of completed vs. not completed habits for today
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {habits && habits.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-gray-500">No habit data available yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="streaks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Habit Streaks Comparison</CardTitle>
                  <CardDescription>
                    Current vs. longest streaks for each habit
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {habits && habits.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={streakData}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 60,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end" 
                          height={70}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="currentStreak" name="Current Streak" fill="#6366f1" />
                        <Bar dataKey="longestStreak" name="Longest Streak" fill="#a5b4fc" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-gray-500">No habit streak data available yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
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

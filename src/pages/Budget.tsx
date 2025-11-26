import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Navigation from "../components/Navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrencyWithSymbol } from '../components/trip/budget/utils/budgetCalculations';
import ExpenseActions from '../components/trip/budget/components/ExpenseActions';
import { useExpenses } from '../components/trip/budget/hooks/useExpenses';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import CurrencySelector from '../components/trip/budget/CurrencySelector';
import { 
  Search, 
  Plus, 
  DollarSign, 
  TrendingUp, 
  PieChart, 
  Calendar,
  MapPin,
  Plane,
  Utensils,
  Hotel,
  ShoppingBag,
  Camera,
  Filter
} from 'lucide-react';

// Interface for combined expense data across all trips
interface CombinedExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  location: string;
  status: string;
  tripId: string;
  currency: string;
}

const Budget = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [activeTab, setActiveTab] = useState("categories");
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { user } = useAuth();

  // Fetch all user trips and their expenses
  const { data: allExpenses = [], isLoading } = useQuery({
    queryKey: ['all-expenses', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get all user trips
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('trip_id, destination')
        .eq('user_id', user.id);

      if (tripsError || !trips) return [];

      // Get expenses for all trips
      const allExpensesPromises = trips.map(async (trip) => {
        const [
          { data: activities },
          { data: accommodations },
          { data: transportation },
          { data: restaurants },
          { data: otherExpenses }
        ] = await Promise.all([
          supabase.from('day_activities').select('*').eq('trip_id', trip.trip_id),
          supabase.from('accommodations').select('*').eq('trip_id', trip.trip_id),
          supabase.from('transportation').select('*').eq('trip_id', trip.trip_id),
          supabase.from('reservations').select('*').eq('trip_id', trip.trip_id),
          supabase.from('other_expenses').select('*').eq('trip_id', trip.trip_id)
        ]);

        const tripExpenses: CombinedExpense[] = [];

        // Map accommodations (fix the categorization issue)
        (accommodations || []).forEach(acc => {
          if (acc.cost) {
            tripExpenses.push({
              id: acc.stay_id,
              description: acc.title || acc.hotel || 'Accommodation',
              amount: acc.cost,
              category: 'accommodation', // Fixed: use lowercase to match UI categories
              date: acc.hotel_checkin_date || acc.created_at,
              location: acc.hotel_address || trip.destination,
              status: acc.is_paid ? 'confirmed' : 'pending',
              tripId: trip.trip_id,
              currency: acc.currency || 'USD'
            });
          }
        });

        // Map other expense types
        (activities || []).forEach(act => {
          if (act.cost) {
            tripExpenses.push({
              id: act.id,
              description: act.title,
              amount: act.cost,
              category: 'entertainment',
              date: act.created_at,
              location: trip.destination,
              status: 'pending', // activities don't have is_paid field
              tripId: trip.trip_id,
              currency: act.currency || 'USD'
            });
          }
        });

        (transportation || []).forEach(trans => {
          if (trans.cost) {
            tripExpenses.push({
              id: trans.id,
              description: trans.type,
              amount: trans.cost,
              category: 'transportation',
              date: trans.start_date || trans.created_at,
              location: trip.destination,
              status: 'pending', // transportation doesn't have is_paid field
              tripId: trip.trip_id,
              currency: trans.currency || 'USD'
            });
          }
        });

        (restaurants || []).forEach(rest => {
          if (rest.cost) {
            tripExpenses.push({
              id: rest.id,
              description: rest.restaurant_name,
              amount: rest.cost,
              category: 'food',
              date: rest.created_at,
              location: trip.destination,
              status: 'pending', // reservations don't have is_paid field
              tripId: trip.trip_id,
              currency: rest.currency || 'USD'
            });
          }
        });

        (otherExpenses || []).forEach(expense => {
          if (expense.cost) {
            tripExpenses.push({
              id: expense.id,
              description: expense.description,
              amount: expense.cost,
              category: 'other',
              date: expense.expense_date || expense.created_at, // Fixed: use expense_date not date
              location: trip.destination,
              status: 'pending', // other_expenses don't have is_paid field
              tripId: trip.trip_id,
              currency: expense.currency || 'USD'
            });
          }
        });

        return tripExpenses;
      });

      const results = await Promise.all(allExpensesPromises);
      return results.flat();
    },
    enabled: !!user
  });

  const expenses = allExpenses;

  // Filter expenses based on search and category
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesSearch = expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           expense.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchQuery, selectedCategory]);

  // Calculate totals
  const totalBudget = 5000;
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remainingBudget = totalBudget - totalSpent;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'transportation': return <Plane className="w-4 h-4" />;
      case 'accommodation': return <Hotel className="w-4 h-4" />;
      case 'food': return <Utensils className="w-4 h-4" />;
      case 'entertainment': return <Camera className="w-4 h-4" />;
      case 'other': return <ShoppingBag className="w-4 h-4" />;
      default: return <ShoppingBag className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'transportation': return 'bg-blue-100 text-blue-800';
      case 'accommodation': return 'bg-green-100 text-green-800';
      case 'food': return 'bg-orange-100 text-orange-800';
      case 'entertainment': return 'bg-purple-100 text-purple-800';
      case 'other': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const ExpenseCard = ({ expense }: { expense: any }) => (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border border-sand-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${getCategoryColor(expense.category)} flex items-center gap-1`}>
                  {getCategoryIcon(expense.category)}
                  {expense.category}
                </Badge>
                <Badge className={getStatusColor(expense.status)}>
                  {expense.status}
                </Badge>
              </div>
              <h3 className="font-semibold text-earth-600 mb-1">{expense.description}</h3>
              <div className="flex items-center gap-4 text-sm text-sand-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {expense.date}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {expense.location}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-earth-600">
                {formatCurrencyWithSymbol(expense.amount, selectedCurrency)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sand-50 to-earth-50">
      <Navigation />
      <div className="container max-w-7xl mx-auto px-4 py-8">
        
        {/* Header Section */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl font-bold text-earth-600 mb-2">Budget Management</h1>
            <p className="text-sand-600 text-lg">Track your travel expenses and stay within budget</p>
          </motion.div>
        </div>

        {/* Budget Header with Currency Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-earth-500">Budget Overview</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Display in:</span>
                <CurrencySelector
                  value={selectedCurrency}
                  onValueChange={setSelectedCurrency}
                  className="w-[100px]"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Exchange rates last updated: {new Date().toLocaleDateString('en-US', { 
                month: 'numeric', 
                day: 'numeric', 
                year: '2-digit',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </p>
          </div>
        </motion.div>

        {/* Budget Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <Card className="border border-sand-200 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-sand-600 mb-1">Total Budget</p>
                  <p className="text-2xl font-bold text-earth-600">{formatCurrencyWithSymbol(totalBudget, selectedCurrency)}</p>
                </div>
                <DollarSign className="w-8 h-8 text-earth-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-sand-200 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-sand-600 mb-1">Total Spent</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrencyWithSymbol(totalSpent, selectedCurrency)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border border-sand-200 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-sand-600 mb-1">Remaining</p>
                  <p className={`text-2xl font-bold ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrencyWithSymbol(remainingBudget, selectedCurrency)}
                  </p>
                </div>
                <PieChart className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="overview">Recent</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border border-sand-200 bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-earth-600">Recent Expenses</CardTitle>
                    <CardDescription>Your latest spending activity</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {expenses.slice(0, 3).map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between py-2 border-b border-sand-100 last:border-0">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(expense.category)}
                          <div>
                            <p className="font-medium text-earth-600">{expense.description}</p>
                            <p className="text-sm text-sand-600">{expense.date}</p>
                          </div>
                        </div>
                        <p className="font-semibold text-earth-600">{formatCurrencyWithSymbol(expense.amount, selectedCurrency)}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border border-sand-200 bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-earth-600">Budget Progress</CardTitle>
                    <CardDescription>How much you've spent vs your budget</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round((totalSpent / totalBudget) * 100)}%</span>
                      </div>
                      <div className="w-full bg-sand-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-500 ${
                            totalSpent > totalBudget ? 'bg-red-500' : 'bg-earth-500'
                          }`}
                          style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm text-sand-600">
                        <span>{formatCurrencyWithSymbol(totalSpent, selectedCurrency)} spent</span>
                        <span>{formatCurrencyWithSymbol(totalBudget, selectedCurrency)} budget</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="expenses" className="space-y-6">
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sand-400 w-4 h-4" />
                  <Input
                    placeholder="Search expenses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/80 border-sand-200"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-sand-600" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 rounded-md border border-sand-200 bg-white/80 text-sm"
                  >
                    <option value="all">All Categories</option>
                    <option value="transportation">Transportation</option>
                    <option value="accommodation">Accommodation</option>
                    <option value="food">Food & Dining</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="other">Other</option>
                  </select>
                  <ExpenseActions onAddExpense={() => console.log('Add expense')} />
                </div>
              </div>

              {/* Expenses Grid */}
              <div className="space-y-4">
                {isLoading ? (
                  <div className="grid grid-cols-1 gap-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="p-4">
                        <div className="animate-pulse flex space-x-4">
                          <div className="rounded-full bg-sand-200 h-10 w-10"></div>
                          <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 bg-sand-200 rounded w-3/4"></div>
                            <div className="h-3 bg-sand-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : filteredExpenses.length > 0 ? (
                  <div className="space-y-4">
                    {filteredExpenses.map((expense) => (
                      <ExpenseCard key={expense.id} expense={expense} />
                    ))}
                  </div>
                ) : (
                  <Card className="border border-sand-200 bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-12 text-center">
                      <ShoppingBag className="w-12 h-12 text-sand-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-earth-600 mb-2">No expenses found</h3>
                      <p className="text-sand-600 mb-4">
                        {searchQuery || selectedCategory !== 'all' 
                          ? 'Try adjusting your search or filter criteria.'
                          : 'Start by adding your first expense to track your spending.'
                        }
                      </p>
                      <Button 
                        onClick={() => console.log('Add expense')}
                        className="bg-earth-500 hover:bg-earth-600 text-sand-50"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Expense
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-6">
              <Card className="border border-sand-200 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-earth-600">Spending by Category</CardTitle>
                  <CardDescription>Breakdown of your expenses by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['transportation', 'accommodation', 'food', 'entertainment', 'other'].map((category) => {
                      const categoryExpenses = expenses.filter(e => {
                        const expenseCategory = e.category?.toLowerCase() || '';
                        // Handle food/dining mapping
                        if (category === 'food') {
                          return expenseCategory === 'food' || expenseCategory === 'dining';
                        }
                        // Handle accommodation variations
                        if (category === 'accommodation') {
                          return expenseCategory === 'accommodation' || expenseCategory === 'accommodations';
                        }
                        return expenseCategory === category.toLowerCase();
                      });
                      const categoryTotal = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
                      const percentage = totalSpent > 0 ? (categoryTotal / totalSpent) * 100 : 0;
                      
                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(category)}
                              <span className="font-medium text-earth-600 capitalize">{category}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-earth-600">{formatCurrencyWithSymbol(categoryTotal, selectedCurrency)}</p>
                              <p className="text-sm text-sand-600">{percentage.toFixed(1)}%</p>
                            </div>
                          </div>
                          <div className="w-full bg-sand-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-earth-500 transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card className="border border-sand-200 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <PieChart className="w-12 h-12 text-sand-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-earth-600 mb-2">Advanced Analytics</h3>
                  <p className="text-sand-600">
                    Detailed spending analytics and insights coming soon. This will include spending trends,
                    budget forecasting, and personalized recommendations.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Budget;
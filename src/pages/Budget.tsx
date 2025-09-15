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

// Mock data for demonstration
const mockExpenses = [
  {
    id: '1',
    description: 'Flight tickets to Paris',
    amount: 850,
    category: 'transportation',
    date: '2025-09-10',
    location: 'Travel Agency',
    status: 'confirmed'
  },
  {
    id: '2',
    description: 'Hotel booking - 3 nights',
    amount: 450,
    category: 'accommodation',
    date: '2025-09-12',
    location: 'Paris, France',
    status: 'confirmed'
  },
  {
    id: '3',
    description: 'Restaurant dinner',
    amount: 85,
    category: 'food',
    date: '2025-09-13',
    location: 'Le Petit Bistro',
    status: 'pending'
  },
  {
    id: '4',
    description: 'Museum entrance tickets',
    amount: 35,
    category: 'entertainment',
    date: '2025-09-14',
    location: 'Louvre Museum',
    status: 'confirmed'
  },
  {
    id: '5',
    description: 'Local transportation',
    amount: 25,
    category: 'transportation',
    date: '2025-09-15',
    location: 'Metro Pass',
    status: 'confirmed'
  }
];

const Budget = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Mock query for expenses
  const { data: expenses = mockExpenses, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockExpenses;
    }
  });

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
      default: return <ShoppingBag className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'transportation': return 'bg-blue-100 text-blue-800';
      case 'accommodation': return 'bg-green-100 text-green-800';
      case 'food': return 'bg-orange-100 text-orange-800';
      case 'entertainment': return 'bg-purple-100 text-purple-800';
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
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
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
                    {['transportation', 'accommodation', 'food', 'entertainment'].map((category) => {
                      const categoryExpenses = expenses.filter(e => e.category === category);
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
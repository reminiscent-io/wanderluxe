import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import ExpenseTable from './budget/ExpenseTable';
import BudgetHeader from './budget/BudgetHeader';
import AddExpenseDialog from './budget/AddExpenseDialog';
import { useCurrencyState } from './budget/hooks/useCurrencyState';
import { useExpenses } from './budget/hooks/useExpenses';
import { useBudgetMutations } from './budget/hooks/useBudgetMutations';
import BudgetSummary from './budget/components/BudgetSummary';
import ExpenseActions from './budget/components/ExpenseActions';
import CategoryBreakdownChart from './budget/components/CategoryBreakdownChart';
import BudgetHealthCard from './budget/components/BudgetHealthCard';
import SpendingInsights from './budget/components/SpendingInsights';
import { convertCurrency } from './budget/utils/currencyConverter';
import { useBudgetEvents } from './budget/hooks/useBudgetEvents';
import { useTripQuery } from '@/hooks/useTripQuery';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrencyWithSymbol } from './budget/utils/budgetCalculations';
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
  Filter,
  Edit3,
  Check,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AddExpenseData {
  description: string;
  cost: number;
  date?: string;
  currency: string;
}

interface BudgetViewProps {
  tripId: string;
  canEdit?: boolean;
}

const BudgetView: React.FC<BudgetViewProps> = ({ tripId, canEdit = true }) => {
  const { selectedCurrency, handleCurrencyChange, lastUpdated: currencyLastUpdated } = useCurrencyState();
  const { data: expenses } = useExpenses(tripId);
  const { addExpense, updateExpense } = useBudgetMutations(tripId);
  const { trip } = useTripQuery(tripId);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // Use the hook that provides expenses and exchange rates
  const { exchangeRates, lastUpdated } = useBudgetEvents(tripId);

  // Additional state for the modern UI
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState("categories");
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  // --- ReDoS-safe numeric formatting/parsing (O(n), no regex backtracking) ---
  const sanitizeNumeric = (s: string): string => {
    let out = '';
    let seenDot = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch >= '0' && ch <= '9') out += ch;
      else if (ch === '.' && !seenDot) { out += '.'; seenDot = true; }
    }
    return out;
  };

  const insertThousands = (digits: string): string => {
    const n = digits.length;
    if (n <= 3) return digits;
    let res = '';
    let count = 0;
    for (let i = n - 1; i >= 0; i--) {
      res = digits[i] + res;
      count++;
      if (count === 3 && i !== 0) { res = ',' + res; count = 0; }
    }
    return res;
  };

  // Format number with commas and handle decimal places (#,###.##)
  const formatNumber = (value: string): string => {
    const cleanValue = sanitizeNumeric(value);
    if (!cleanValue || cleanValue === '.') return '';
    const parts = cleanValue.split('.');
    const intRaw = parts[0] || '';
    // Merge extra dots into decimals, then cap to 2 places
    let decRaw = parts.length > 1 ? parts.slice(1).join('') : '';
    if (decRaw.length > 2) decRaw = decRaw.slice(0, 2);
    const intFmt = intRaw ? insertThousands(intRaw) : '';
    return decRaw !== '' ? `${intFmt}.${decRaw}` : intFmt;
  };

  const parseNumber = (formattedValue: string): number => {
    // Linear-time comma/character filter
    let out = '';
    for (let i = 0; i < formattedValue.length; i++) {
      const ch = formattedValue[i];
      if ((ch >= '0' && ch <= '9') || ch === '.') out += ch;
    }
    const parsed = parseFloat(out);
    return isNaN(parsed) ? 0 : parsed;
  };
  // --------------------------------------------------------------------------

  // Initialize budget input when trip data loads
  useEffect(() => {
    if (trip?.budget !== null && trip?.budget !== undefined) {
      setBudgetInput(formatNumber(trip.budget.toString()));
    }
  }, [trip?.budget]);

  const handleBudgetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatNumber(rawValue);
    setBudgetInput(formattedValue);
  };

  useEffect(() => {
    if (tripId) {
      trackBudgetPageView(tripId);
    }
  }, [tripId]);

  const trackBudgetPageView = async (tripId: string) => {
    try {
      if (user) {
        // Track in Google Analytics
        window.gtag('event', 'budget_page_view', {
          event_category: 'Budget',
          event_label: tripId,
          user_id: user.id
        });

        console.log('Budget page viewed by user:', user.id, 'for trip:', tripId);
      }
    } catch (error) {
      console.error('Error tracking budget page view:', error);
    }
  };

  // Transform the exchangeRates array into an object:
  // { currency_from: { currency_to: rate, ... }, ... }
  const ratesObject = useMemo(() => {
    if (!exchangeRates || exchangeRates.length === 0) return {};
    const obj: Record<string, Record<string, number>> = {};
    exchangeRates.forEach((rate) => {
      // Use the correct field names: currency_from and currency_to
      const from = rate.currency_from;
      const to = rate.currency_to;
      if (!obj[from]) {
        obj[from] = {};
      }
      obj[from][to] = rate.rate;
    });
    return obj;
  }, [exchangeRates]);

  // Convert expenses to selected currency using the rates from the hook
  const convertedExpenses = useMemo(() => {
    if (!expenses?.items || !Object.keys(ratesObject).length) return [];
    return expenses.items.map(expense => ({
      ...expense,
      convertedCost: convertCurrency(
        expense.cost || 0,
        expense.currency || 'USD',
        selectedCurrency,
        ratesObject
      )
    }));
  }, [expenses?.items, selectedCurrency, ratesObject]);

  // Filter expenses based on search and category
  const filteredExpenses = useMemo(() => {
    return convertedExpenses.filter(expense => {
      const matchesSearch = expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false;

      // Handle category matching with proper mapping
      let matchesCategory = selectedCategory === 'all';
      if (!matchesCategory && expense.category) {
        const expenseCategory = expense.category.toLowerCase();
        switch (selectedCategory) {
          case 'transportation':
            matchesCategory = expenseCategory === 'transportation';
            break;
          case 'accommodation':
            matchesCategory = expenseCategory === 'accommodations' || expenseCategory === 'accommodation';
            break;
          case 'food':
            matchesCategory = expenseCategory === 'dining' || expenseCategory === 'food';
            break;
          case 'activities':
            matchesCategory = expenseCategory === 'activities' || expenseCategory === 'entertainment';
            break;
          case 'other':
            matchesCategory = expenseCategory === 'other';
            break;
          default:
            matchesCategory = expenseCategory === selectedCategory.toLowerCase();
        }
      }

      return matchesSearch && matchesCategory;
    });
  }, [convertedExpenses, searchQuery, selectedCategory]);

  // Helper functions for modern UI
  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'transportation': return <Plane className="w-4 h-4" />;
      case 'accommodation': return <Hotel className="w-4 h-4" />;
      case 'food': return <Utensils className="w-4 h-4" />;
      case 'activities': 
      case 'entertainment': return <Camera className="w-4 h-4" />;
      case 'other': return <ShoppingBag className="w-4 h-4" />;
      default: return <ShoppingBag className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'transportation': return 'bg-blue-100 text-blue-800';
      case 'accommodation': return 'bg-green-100 text-green-800';
      case 'food': return 'bg-orange-100 text-orange-800';
      case 'activities':
      case 'entertainment': return 'bg-purple-100 text-purple-800';
      case 'other': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Budget update function
  const updateBudget = async () => {
    const budgetValue = parseNumber(budgetInput);

    if (isNaN(budgetValue) || budgetValue < 0) {
      toast.error('Please enter a valid budget amount');
      return;
    }

    try {
      const { error } = await supabase
        .from('trips')
        .update({ budget: budgetValue } as any)
        .eq('trip_id', tripId);

      if (error) throw error;

      // Invalidate the trip query to refresh the data
      await queryClient.invalidateQueries({ queryKey: ['trip', tripId] });

      setIsEditingBudget(false);
      toast.success('Budget updated successfully');
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error('Failed to update budget. Please try again.');
    }
  };

  const cancelBudgetEdit = () => {
    setBudgetInput(trip?.budget ? formatNumber(trip.budget.toString()) : '');
    setIsEditingBudget(false);
  };

  const handleAddExpense = async (data: AddExpenseData) => {
    try {
      await addExpense.mutateAsync({
        trip_id: tripId,
        description: data.description,
        cost: data.cost,
        currency: data.currency,
        date: data.date
      });

      // Track expense addition in Google Analytics
      if (user) {
        window.gtag('event', 'expense_added', {
          event_category: 'Budget',
          event_label: tripId,
          user_id: user.id,
          value: data.cost
        });

        console.log('Expense added by user:', user.id, 'for trip:', tripId, 'amount:', data.cost);
      }

      setIsAddingExpense(false);
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  // Remove the paid status update function since we've deprecated the is_paid feature

  // Calculate totals using converted values
  const totalSpent = convertedExpenses.reduce((sum, item) => sum + item.convertedCost, 0);
  const totalBudget = trip?.budget || 0;
  const remainingBudget = totalBudget - totalSpent;

  // Modern ExpenseCard component
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
                  {expense.category || 'Other'}
                </Badge>
              </div>
              <h3 className="font-semibold text-earth-600 mb-1">{expense.description}</h3>
              <div className="flex items-center gap-4 text-sm text-sand-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {expense.date || 'No date'}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-earth-600">
                {formatCurrencyWithSymbol(expense.convertedCost, selectedCurrency)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sand-50 to-earth-50">
      <div className="container max-w-7xl mx-auto px-4 py-6">

        {/* Header Section */}
        <div className="mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-earth-600 mb-2">Trip Budget</h1>
            <p className="text-sand-600 text-lg">Track your travel expenses for {trip?.destination || 'this trip'}</p>
          </motion.div>
        </div>

        {/* Budget Header with Currency Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <BudgetHeader
            selectedCurrency={selectedCurrency}
            onCurrencyChange={handleCurrencyChange}
            lastUpdated={lastUpdated || currencyLastUpdated}
          />
        </motion.div>

        {/* Budget Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <Card className="border border-sand-200 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-sand-600">Total Budget</p>
                    {!isEditingBudget && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingBudget(true)}
                        className="h-6 w-6 p-0 text-sand-500 hover:text-earth-600"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  {isEditingBudget ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={budgetInput}
                        onChange={handleBudgetInputChange}
                        className="h-8 text-lg font-bold border-earth-300 focus:border-earth-500"
                        placeholder="e.g., 5,000.00"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={updateBudget}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelBudgetEdit}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-earth-600">
                      {totalBudget > 0 ? formatCurrencyWithSymbol(totalBudget, selectedCurrency) : 'Set Budget'}
                    </p>
                  )}
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

          {/* New Budget Health Card */}
          <BudgetHealthCard
            totalBudget={totalBudget}
            totalSpent={totalSpent}
            selectedCurrency={selectedCurrency}
          />
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
                    {convertedExpenses.slice(0, 3).map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between py-2 border-b border-sand-100 last:border-0">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(expense.category)}
                          <div>
                            <p className="font-medium text-earth-600">{expense.description}</p>
                            <p className="text-sm text-sand-600">{expense.date}</p>
                          </div>
                        </div>
                        <p className="font-semibold text-earth-600">{formatCurrencyWithSymbol(expense.convertedCost, selectedCurrency)}</p>
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
                    <option value="activities">Activities</option>
                    <option value="other">Other</option>
                  </select>
                  {canEdit && <ExpenseActions onAddExpense={() => setIsAddingExpense(true)} />}
                </div>
              </div>

              {/* Expenses Grid or Table */}
              <div className="space-y-4">
                {!expenses?.items ? (
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
                      {canEdit && (
                        <Button 
                          onClick={() => setIsAddingExpense(true)}
                          className="bg-earth-500 hover:bg-earth-600 text-sand-50"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Your First Expense
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-6">
              {/* Visual Chart */}
              <CategoryBreakdownChart
                expenses={convertedExpenses}
                selectedCurrency={selectedCurrency}
              />

              {/* Detailed Breakdown */}
              <Card className="border border-sand-200 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-earth-600">Detailed Breakdown</CardTitle>
                  <CardDescription>Spending details for each category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['transportation', 'accommodation', 'food', 'activities', 'other'].map((category) => {
                      const categoryExpenses = convertedExpenses.filter(e => {
                        const expenseCategory = e.category?.toLowerCase() || '';
                        // Handle food/dining mapping
                        if (category === 'food') {
                          return expenseCategory === 'food' || expenseCategory === 'dining';
                        }
                        // Handle accommodation variations
                        if (category === 'accommodation') {
                          return expenseCategory === 'accommodation' || expenseCategory === 'accommodations';
                        }
                        return expenseCategory === category;
                      });
                      const categoryTotal = categoryExpenses.reduce((sum, e) => sum + e.convertedCost, 0);
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
              {/* Insights Section */}
              <div>
                <h3 className="text-lg font-semibold text-earth-600 mb-4">Spending Insights</h3>
                <SpendingInsights
                  expenses={convertedExpenses}
                  totalBudget={totalBudget}
                  totalSpent={totalSpent}
                  selectedCurrency={selectedCurrency}
                />
              </div>

              {/* Charts Section */}
              <CategoryBreakdownChart
                expenses={convertedExpenses}
                selectedCurrency={selectedCurrency}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <AddExpenseDialog
        open={isAddingExpense}
        onOpenChange={setIsAddingExpense}
        onSubmit={handleAddExpense}
        defaultCurrency={selectedCurrency}
        defaultDate={trip?.arrival_date}
      />
    </div>
  );
};

export default BudgetView;

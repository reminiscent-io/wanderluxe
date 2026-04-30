import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import BudgetHeader from './budget/BudgetHeader';
import AddExpenseDialog from './budget/AddExpenseDialog';
import { useCurrencyState } from './budget/hooks/useCurrencyState';
import { useExpenses } from './budget/hooks/useExpenses';
import { useBudgetMutations } from './budget/hooks/useBudgetMutations';
import ExpenseActions from './budget/components/ExpenseActions';
import CategoryBreakdownChart from './budget/components/CategoryBreakdownChart';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrencyWithSymbol } from './budget/utils/budgetCalculations';
import {
  Search,
  Plus,
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
  const { addExpense } = useBudgetMutations(tripId);
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

  useEffect(() => {
    if (isEditingBudget) return;
    if (trip?.budget !== null && trip?.budget !== undefined) {
      setBudgetInput(formatNumber(trip.budget.toString()));
    }
  }, [trip?.budget, isEditingBudget]);

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

  const trackBudgetPageView = (tripId: string) => {
    if (!user) return;
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    try {
      window.gtag('event', 'budget_page_view', {
        event_category: 'Budget',
        event_label: tripId,
        user_id: user.id,
      });
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

  // Calculate totals using converted values
  const totalSpent = useMemo(
    () => convertedExpenses.reduce((sum, item) => sum + item.convertedCost, 0),
    [convertedExpenses]
  );

  const categoryRows = useMemo(() => {
    const categories = ['transportation', 'accommodation', 'food', 'activities', 'other'] as const;
    return categories
      .map((category) => {
        const categoryExpenses = convertedExpenses.filter((e) => {
          const c = e.category?.toLowerCase() || '';
          if (category === 'food') return c === 'food' || c === 'dining';
          if (category === 'accommodation') return c === 'accommodation' || c === 'accommodations';
          if (category === 'activities') return c === 'activities' || c === 'entertainment';
          return c === category;
        });
        const total = categoryExpenses.reduce((sum, e) => sum + e.convertedCost, 0);
        const percentage = totalSpent > 0 ? (total / totalSpent) * 100 : 0;
        return { category, total, percentage };
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [convertedExpenses, totalSpent]);

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

  const getCategoryColor = (_category: string) =>
    'bg-accent text-accent-foreground hover:bg-accent';

  // Budget update function
  const updateBudget = async () => {
    const budgetValue = parseNumber(budgetInput);

    if (isNaN(budgetValue) || budgetValue < 0) {
      toast.error('Please enter a valid budget amount');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('trips')
        .update({ budget: budgetValue } as any)
        .eq('trip_id', tripId)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error('Unable to save budget. You may not have edit permission for this trip.');
        return;
      }

      // Invalidate the trip query to refresh the data
      await queryClient.invalidateQueries({ queryKey: ['trip', tripId] });

      setIsEditingBudget(false);
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

      if (user && typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', 'expense_added', {
          event_category: 'Budget',
          event_label: tripId,
          user_id: user.id,
          value: data.cost,
        });
      }

      setIsAddingExpense(false);
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const totalBudget = trip?.budget || 0;
  const remainingBudget = totalBudget - totalSpent;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 py-6">

        {/* Header Section */}
        <div className="mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display text-4xl text-earth-600 tracking-tight mb-2">Trip budget</h1>
            <p className="text-muted-foreground text-lg">Track your travel expenses for {trip?.destination || 'this trip'}</p>
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

        {/* Budget Summary — editorial line */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-10 border-b border-border pb-8"
          aria-label="Budget summary"
        >
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 mb-4">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-display text-4xl text-earth-600 tracking-tight">
                {formatCurrencyWithSymbol(totalSpent, selectedCurrency)}
              </span>

              {!isEditingBudget && (
                <>
                  {totalBudget > 0 ? (
                    <span className="text-base text-muted-foreground">
                      of {formatCurrencyWithSymbol(totalBudget, selectedCurrency)}
                    </span>
                  ) : (
                    <span className="text-base italic text-muted-foreground">no budget set</span>
                  )}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditingBudget(true)}
                      aria-label={totalBudget > 0 ? 'Edit budget' : 'Set budget'}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  )}
                </>
              )}

              {isEditingBudget && (
                <div className="flex items-center gap-1.5">
                  <span className="text-base text-muted-foreground">of</span>
                  <Input
                    autoFocus
                    type="text"
                    value={budgetInput}
                    onChange={handleBudgetInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') updateBudget();
                      if (e.key === 'Escape') cancelBudgetEdit();
                    }}
                    className="h-9 w-32 text-base"
                    placeholder="5,000"
                    aria-label="Budget amount"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={updateBudget}
                    aria-label="Save budget"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={cancelBudgetEdit}
                    aria-label="Cancel"
                    className="text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {totalBudget > 0 && !isEditingBudget && (
              <div className="text-sm">
                {remainingBudget >= 0 ? (
                  <span className="text-earth-600">
                    {formatCurrencyWithSymbol(remainingBudget, selectedCurrency)} left
                  </span>
                ) : (
                  <span className="text-destructive">
                    {formatCurrencyWithSymbol(Math.abs(remainingBudget), selectedCurrency)} over budget
                  </span>
                )}
              </div>
            )}
          </div>

          {totalBudget > 0 && (
            <div
              className="h-1 w-full bg-muted rounded-full overflow-hidden"
              role="progressbar"
              aria-label="Budget used"
              aria-valuenow={Math.min(Math.round((totalSpent / totalBudget) * 100), 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totalSpent > totalBudget ? 'bg-destructive' : 'bg-primary'
                }`}
                style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
              />
            </div>
          )}
        </motion.section>

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
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-earth-600">Recent expenses</CardTitle>
                  <CardDescription>Your latest spending activity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  {convertedExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      No expenses yet. Add one to see it here.
                    </p>
                  ) : (
                    convertedExpenses.slice(0, 5).map((expense, idx, arr) => (
                      <div
                        key={expense.id ?? idx}
                        className={`flex items-center justify-between py-3 ${
                          idx === arr.length - 1 ? '' : 'border-b border-border'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">
                            {getCategoryIcon(expense.category)}
                          </span>
                          <div>
                            <p className="font-medium text-earth-600">{expense.description}</p>
                            <p className="text-sm text-muted-foreground">{expense.date}</p>
                          </div>
                        </div>
                        <p className="font-semibold text-earth-600">
                          {formatCurrencyWithSymbol(expense.convertedCost, selectedCurrency)}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expenses" className="space-y-6">
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" aria-hidden="true" />
                  <Input
                    placeholder="Search expenses..."
                    aria-label="Search expenses"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger aria-label="Filter by category" className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      <SelectItem value="transportation">Transportation</SelectItem>
                      <SelectItem value="accommodation">Accommodation</SelectItem>
                      <SelectItem value="food">Food & dining</SelectItem>
                      <SelectItem value="activities">Activities</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {canEdit && <ExpenseActions onAddExpense={() => setIsAddingExpense(true)} />}
                </div>
              </div>

              {/* Expenses Table */}
              <Card>
                {!expenses?.items ? (
                  <CardContent className="p-8 text-center">
                    <div className="animate-pulse space-y-3">
                      <div className="h-10 bg-muted rounded"></div>
                      <div className="h-10 bg-muted rounded"></div>
                      <div className="h-10 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                ) : filteredExpenses.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-border bg-muted/40">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-earth-600">Description</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-earth-600">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-earth-600">Date</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-earth-600">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpenses.map((expense, idx) => (
                          <tr key={expense.id ?? idx} className={`border-b border-border hover:bg-muted/40 transition-colors ${idx === filteredExpenses.length - 1 ? 'border-b-0' : ''}`}>
                            <td className="px-4 py-3 text-sm text-earth-700">{expense.description}</td>
                            <td className="px-4 py-3">
                              <Badge className={`${getCategoryColor(expense.category)} flex items-center gap-1 w-fit`}>
                                {getCategoryIcon(expense.category)}
                                <span className="text-xs">{expense.category || 'Other'}</span>
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{expense.date}</td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-earth-600">
                              {formatCurrencyWithSymbol(expense.convertedCost, selectedCurrency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <CardContent className="p-12 text-center">
                    <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                    <h3 className="font-display text-2xl text-earth-600 mb-2">No expenses found</h3>
                    <p className="text-muted-foreground mb-6">
                      {searchQuery || selectedCategory !== 'all'
                        ? 'Try adjusting your search or filter criteria.'
                        : 'Start by adding your first expense to track your spending.'
                      }
                    </p>
                    {canEdit && !searchQuery && selectedCategory === 'all' && (
                      <Button variant="sunset" onClick={() => setIsAddingExpense(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add your first expense
                      </Button>
                    )}
                  </CardContent>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="categories" className="space-y-6">
              {/* Visual Chart */}
              <CategoryBreakdownChart
                expenses={convertedExpenses}
                selectedCurrency={selectedCurrency}
              />

              {/* Detailed Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-earth-600">Detailed breakdown</CardTitle>
                  <CardDescription>Spending details for each category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-5">
                    {categoryRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        No spending recorded yet.
                      </p>
                    ) : (
                      categoryRows.map((row, idx) => {
                        const isLeader = idx === 0;
                        return (
                          <div key={row.category} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{getCategoryIcon(row.category)}</span>
                                <span
                                  className={`capitalize text-earth-600 ${
                                    isLeader ? 'font-display text-xl' : 'font-medium'
                                  }`}
                                >
                                  {row.category}
                                </span>
                              </div>
                              <div className="text-right">
                                <p
                                  className={`text-earth-600 ${
                                    isLeader ? 'font-display text-xl' : 'font-semibold'
                                  }`}
                                >
                                  {formatCurrencyWithSymbol(row.total, selectedCurrency)}
                                </p>
                                <p className="text-sm text-muted-foreground">{row.percentage.toFixed(1)}%</p>
                              </div>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${row.percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {/* Insights Section */}
              <div>
                <h3 className="font-display text-2xl text-earth-600 mb-4">Spending insights</h3>
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

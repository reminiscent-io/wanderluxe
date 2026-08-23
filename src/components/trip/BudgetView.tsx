import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { motion } from 'framer-motion';
import BudgetHeader from './budget/BudgetHeader';
import AddExpenseDialog from './budget/AddExpenseDialog';
import { useCurrencyState } from './budget/hooks/useCurrencyState';
import { useExpenses } from './budget/hooks/useExpenses';
import { useBudgetMutations } from './budget/hooks/useBudgetMutations';
import ExpenseActions from './budget/components/ExpenseActions';
import CategoryBreakdownChart from './budget/components/CategoryBreakdownChart';
import SpendingInsights from './budget/components/SpendingInsights';
import { getConversionRate } from './budget/utils/currencyConverter';
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

// Warm-palette fills for data-viz; do not swap in cool tones (DESIGN.md).
const CATEGORY_HUES: Record<string, string> = {
  transportation: '#603D2E', // roasted-bronze
  accommodation: '#A86B4D',  // warm tan
  food: '#EA580C',           // burnt orange
  activities: '#8A7F6C',     // wet sand
  other: '#DDD4C8',          // stitched edge
};
const hueFor = (category: string): string =>
  CATEGORY_HUES[category.toLowerCase()] ?? CATEGORY_HUES.other;

const BudgetView: React.FC<BudgetViewProps> = ({ tripId, canEdit = true }) => {
  const {
    selectedCurrency,
    handleCurrencyChange,
    rates,
    lastUpdated: ratesLastUpdated,
    isLoading: ratesLoading,
  } = useCurrencyState();
  const { data: expenses } = useExpenses(tripId);
  const { addExpense } = useBudgetMutations(tripId);
  const { trip } = useTripQuery(tripId);
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
    // formatNumber is a pure helper redefined per render — adding it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Fire-and-forget analytics; trackBudgetPageView only reads `user` which is stable for this view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Convert every expense into the selected display currency. A row whose
  // currency can't be reached from the rate table keeps its own amount and
  // currency rather than borrowing the selected symbol — showing 12,000 yen
  // relabelled as $12,000 is worse than showing it as yen.
  const convertedExpenses = useMemo(() => {
    return (expenses?.items ?? []).map((expense) => {
      const sourceCurrency = (expense.currency || 'USD').toUpperCase();
      const rate = getConversionRate(sourceCurrency, selectedCurrency, rates);
      const cost = expense.cost || 0;
      return {
        ...expense,
        sourceCurrency,
        converted: rate !== null,
        convertedCost: rate === null ? cost : cost * rate,
        displayCurrency: rate === null ? sourceCurrency : selectedCurrency,
      };
    });
  }, [expenses?.items, selectedCurrency, rates]);

  // Charts and insights aggregate amounts, so they may only see rows that are
  // actually expressed in the selected currency.
  const convertibleExpenses = useMemo(
    () => convertedExpenses.filter((e) => e.converted),
    [convertedExpenses]
  );

  // Currencies we could not convert, so the headline total can say so instead
  // of quietly under-reporting.
  const unconvertedCurrencies = useMemo(
    () =>
      Array.from(
        new Set(
          convertedExpenses
            .filter((e) => !e.converted && (e.cost || 0) !== 0)
            .map((e) => e.sourceCurrency)
        )
      ).sort(),
    [convertedExpenses]
  );

  // Defer search input so heavy table re-render doesn't block keystrokes.
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Single-pass aggregation: total + per-category buckets in one walk.
  const { totalSpent, categoryRows } = useMemo(() => {
    let total = 0;
    const buckets: Record<string, number> = {
      transportation: 0,
      accommodation: 0,
      food: 0,
      activities: 0,
      other: 0,
    };

    for (const e of convertedExpenses) {
      // Unconvertible rows are listed in their own currency; folding them into
      // a selected-currency total would mix units.
      if (!e.converted) continue;
      const cost = e.convertedCost;
      total += cost;
      const c = e.category?.toLowerCase() || '';
      if (c === 'transportation') buckets.transportation += cost;
      else if (c === 'accommodation' || c === 'accommodations') buckets.accommodation += cost;
      else if (c === 'food' || c === 'dining') buckets.food += cost;
      else if (c === 'activities' || c === 'entertainment') buckets.activities += cost;
      else buckets.other += cost;
    }

    const rows = (Object.entries(buckets) as Array<[string, number]>)
      .filter(([, t]) => t > 0)
      .map(([category, t]) => ({
        category,
        total: t,
        percentage: total > 0 ? (t / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return { totalSpent: total, categoryRows: rows };
  }, [convertedExpenses]);

  // Filter expenses based on deferred search and category.
  const filteredExpenses = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    return convertedExpenses.filter((expense) => {
      if (q && !(expense.description?.toLowerCase().includes(q) ?? false)) return false;

      if (selectedCategory === 'all') return true;
      const c = expense.category?.toLowerCase() || '';
      switch (selectedCategory) {
        case 'transportation':
          return c === 'transportation';
        case 'accommodation':
          return c === 'accommodation' || c === 'accommodations';
        case 'food':
          return c === 'food' || c === 'dining';
        case 'activities':
          return c === 'activities' || c === 'entertainment';
        case 'other':
          return c === 'other';
        default:
          return c === selectedCategory.toLowerCase();
      }
    });
  }, [convertedExpenses, deferredSearchQuery, selectedCategory]);

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
        .update({ budget: budgetValue })
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
            lastUpdated={ratesLastUpdated}
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

          {!ratesLoading && unconvertedCurrencies.length > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              No exchange rate available for {unconvertedCurrencies.join(', ')} — those
              expenses are listed in their own currency and left out of the total above.
            </p>
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
                          {formatCurrencyWithSymbol(expense.convertedCost, expense.displayCurrency)}
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
                              {formatCurrencyWithSymbol(expense.convertedCost, expense.displayCurrency)}
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

            <TabsContent value="categories" className="space-y-10">
              {categoryRows.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                  <h3 className="font-display text-2xl text-earth-600 mb-2">No spending yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Add an expense to see it broken down by category.
                  </p>
                </div>
              ) : (
                <>
                  {/* Heading rail + segmented proportion bar */}
                  <section className="space-y-4" aria-label="Category overview">
                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                      <h2 className="font-display text-2xl text-earth-600 tracking-tight">
                        Where it went
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        {convertedExpenses.length} {convertedExpenses.length === 1 ? 'expense' : 'expenses'}
                        {' · '}
                        {categoryRows.length} {categoryRows.length === 1 ? 'category' : 'categories'}
                      </span>
                    </div>
                    <div
                      className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label={`Spending split: ${categoryRows
                        .map((r) => `${r.category} ${r.percentage.toFixed(0)} percent`)
                        .join(', ')}`}
                    >
                      {categoryRows.map((row) => (
                        <div
                          key={row.category}
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${row.percentage}%`,
                            backgroundColor: hueFor(row.category),
                          }}
                        />
                      ))}
                    </div>
                  </section>

                  {/* Leader — editorial moment, bracketed by hairline rules */}
                  {categoryRows[0] && (
                    <section className="border-y border-border py-7" aria-label="Top category">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
                        <div className="flex items-start gap-4 min-w-0">
                          <span
                            className="flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: `${hueFor(categoryRows[0].category)}1A`,
                              color: hueFor(categoryRows[0].category),
                            }}
                            aria-hidden="true"
                          >
                            {getCategoryIcon(categoryRows[0].category)}
                          </span>
                          <div className="space-y-1 min-w-0">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Top category
                            </p>
                            <h3 className="font-display text-3xl text-earth-600 leading-tight capitalize truncate">
                              {categoryRows[0].category}
                            </h3>
                          </div>
                        </div>
                        <div className="space-y-1 sm:text-right flex-shrink-0">
                          <p className="font-display text-3xl text-earth-600 leading-tight tabular-nums">
                            {formatCurrencyWithSymbol(categoryRows[0].total, selectedCurrency)}
                          </p>
                          <p className="text-sm text-muted-foreground tabular-nums">
                            {categoryRows[0].percentage.toFixed(1)}% of total
                          </p>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Followers — rhythmic list, denser */}
                  {categoryRows.length > 1 && (
                    <section className="space-y-5" aria-label="Other categories">
                      {categoryRows.slice(1).map((row) => (
                        <div key={row.category} className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-muted-foreground flex-shrink-0" aria-hidden="true">
                                {getCategoryIcon(row.category)}
                              </span>
                              <span className="capitalize font-medium text-earth-600 truncate">
                                {row.category}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-4 flex-shrink-0">
                              <span className="text-sm text-muted-foreground tabular-nums">
                                {row.percentage.toFixed(1)}%
                              </span>
                              <span className="font-semibold text-earth-600 tabular-nums">
                                {formatCurrencyWithSymbol(row.total, selectedCurrency)}
                              </span>
                            </div>
                          </div>
                          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${row.percentage}%`,
                                backgroundColor: hueFor(row.category),
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </section>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {/* Insights Section */}
              <div>
                <h3 className="font-display text-2xl text-earth-600 mb-4">Spending insights</h3>
                <SpendingInsights
                  expenses={convertibleExpenses}
                  totalBudget={totalBudget}
                  totalSpent={totalSpent}
                  selectedCurrency={selectedCurrency}
                />
              </div>

              {/* Charts Section */}
              <CategoryBreakdownChart
                expenses={convertibleExpenses}
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

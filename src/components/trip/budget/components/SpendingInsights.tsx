import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Zap, TrendingUp, Award } from 'lucide-react';
import { formatCurrencyWithSymbol } from '../utils/budgetCalculations';

interface SpendingInsightsProps {
  expenses: any[];
  totalBudget: number;
  totalSpent: number;
  selectedCurrency: string;
  tripDaysRemaining?: number;
}

const SpendingInsights: React.FC<SpendingInsightsProps> = ({
  expenses,
  totalBudget,
  totalSpent,
  selectedCurrency,
  tripDaysRemaining = 0
}) => {
  const insights = useMemo(() => {
    const result: Array<{
      type: 'warning' | 'success' | 'insight' | 'opportunity';
      message: string;
      icon: React.ReactNode;
      color: string;
    }> = [];

    if (!expenses || expenses.length === 0) {
      return [{
        type: 'insight',
        message: 'Start adding expenses to get spending insights',
        icon: <Zap className="w-4 h-4" />,
        color: 'text-blue-600'
      }];
    }

    // Calculate category spending
    const categorySpending: Record<string, number> = {};
    const categoryBudgets: Record<string, number> = {
      transportation: totalBudget * 0.25,
      accommodation: totalBudget * 0.35,
      food: totalBudget * 0.20,
      activities: totalBudget * 0.15,
      other: totalBudget * 0.05
    };

    expenses.forEach(expense => {
      const category = (expense.category || 'other').toLowerCase();
      categorySpending[category] = (categorySpending[category] || 0) + expense.convertedCost;
    });

    // Check for over-budget categories
    Object.entries(categorySpending).forEach(([category, spent]) => {
      const categoryBudget = categoryBudgets[category] || totalBudget * 0.1;
      if (spent > categoryBudget * 1.2) {
        const overage = spent - categoryBudget;
        result.push({
          type: 'warning',
          message: `⚠️ ${category.charAt(0).toUpperCase() + category.slice(1)} is ${Math.round(((spent - categoryBudget) / categoryBudget) * 100)}% over its typical allocation (${formatCurrencyWithSymbol(overage, selectedCurrency)} overage)`,
          icon: <AlertTriangle className="w-4 h-4" />,
          color: 'text-orange-600'
        });
      }
    });

    // Check overall budget status
    if (totalBudget > 0) {
      const percentageUsed = (totalSpent / totalBudget) * 100;
      const remaining = totalBudget - totalSpent;

      if (percentageUsed > 100) {
        result.push({
          type: 'warning',
          message: `🚨 Budget exceeded by ${formatCurrencyWithSymbol(totalSpent - totalBudget, selectedCurrency)}`,
          icon: <AlertTriangle className="w-4 h-4" />,
          color: 'text-red-600'
        });
      } else if (percentageUsed > 85) {
        result.push({
          type: 'warning',
          message: `⏰ Only ${formatCurrencyWithSymbol(remaining, selectedCurrency)} remaining (${(100 - percentageUsed).toFixed(1)}% left)`,
          icon: <AlertTriangle className="w-4 h-4" />,
          color: 'text-orange-600'
        });
      } else if (percentageUsed < 50) {
        result.push({
          type: 'opportunity',
          message: `💡 You're at ${percentageUsed.toFixed(0)}% of budget - consider exploring premium activities or dining`,
          icon: <Zap className="w-4 h-4" />,
          color: 'text-blue-600'
        });
      }
    }

    // Spending trend
    if (expenses.length > 1) {
      const recentExpenses = expenses.slice(-5);
      const oldExpenses = expenses.slice(0, -5);
      
      if (oldExpenses.length > 0) {
        const recentAvg = recentExpenses.reduce((sum, e) => sum + e.convertedCost, 0) / recentExpenses.length;
        const oldAvg = oldExpenses.reduce((sum, e) => sum + e.convertedCost, 0) / oldExpenses.length;
        
        if (recentAvg > oldAvg * 1.2) {
          result.push({
            type: 'warning',
            message: `📈 Your spending is accelerating - recent expenses are higher than average`,
            icon: <TrendingUp className="w-4 h-4" />,
            color: 'text-orange-600'
          });
        } else if (recentAvg < oldAvg * 0.8) {
          result.push({
            type: 'success',
            message: `✨ Great job! Your recent spending is lower than average`,
            icon: <Award className="w-4 h-4" />,
            color: 'text-green-600'
          });
        }
      }
    }

    return result.length > 0 ? result : [{
      type: 'success',
      message: '✅ Great job staying on budget!',
      icon: <Award className="w-4 h-4" />,
      color: 'text-green-600'
    }];
  }, [expenses, totalBudget, totalSpent, selectedCurrency]);

  return (
    <div className="space-y-3">
      {insights.map((insight, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="border border-sand-200 bg-white/80 backdrop-blur-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`flex-shrink-0 mt-0.5 ${insight.color}`}>
                {insight.icon}
              </div>
              <p className="text-sm text-earth-700 leading-relaxed">
                {insight.message}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default SpendingInsights;

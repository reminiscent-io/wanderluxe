import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, TrendingDown, CheckCircle2 } from 'lucide-react';
import { formatCurrencyWithSymbol } from '../utils/budgetCalculations';

interface BudgetHealthCardProps {
  totalBudget: number;
  totalSpent: number;
  selectedCurrency: string;
}

const BudgetHealthCard: React.FC<BudgetHealthCardProps> = ({
  totalBudget,
  totalSpent,
  selectedCurrency
}) => {
  const healthMetrics = useMemo(() => {
    if (totalBudget === 0) return { score: 0, status: 'no-budget', percentage: 0 };

    const percentage = Math.min((totalSpent / totalBudget) * 100, 100);
    let score = 100;
    let status: 'excellent' | 'good' | 'warning' | 'over' | 'no-budget' = 'excellent';

    if (percentage > 100) {
      status = 'over';
      score = Math.max(0, 100 - (percentage - 100));
    } else if (percentage > 85) {
      status = 'warning';
      score = 70;
    } else if (percentage > 60) {
      status = 'good';
      score = 85;
    }

    return { score, status, percentage };
  }, [totalBudget, totalSpent]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'warning': return 'text-orange-600';
      case 'over': return 'text-red-600';
      default: return 'text-earth-600';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-50';
      case 'good': return 'bg-blue-50';
      case 'warning': return 'bg-orange-50';
      case 'over': return 'bg-red-50';
      default: return 'bg-secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'warning':
      case 'over':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      default:
        return <TrendingDown className="w-5 h-5 text-earth-600" />;
    }
  };

  const getStatusMessage = (status: string, percentage: number) => {
    if (status === 'no-budget') return 'Set a budget to track spending';
    if (status === 'excellent') return 'Great budget management!';
    if (status === 'good') return 'On track with spending';
    if (status === 'warning') return `Getting close to limit (${Math.round(percentage)}%)`;
    return `Over budget by ${formatCurrencyWithSymbol(totalSpent - totalBudget, selectedCurrency)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`border border-sand-200 ${getStatusBg(healthMetrics.status)} backdrop-blur-sm`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-sand-600 mb-1">Budget Health</p>
              <h3 className={`text-3xl font-bold ${getStatusColor(healthMetrics.status)}`}>
                {healthMetrics.score}%
              </h3>
            </div>
            <div className="flex-shrink-0">
              {getStatusIcon(healthMetrics.status)}
            </div>
          </div>

          {/* Progress Ring */}
          <div className="flex items-center justify-center mb-4">
            <svg width="120" height="120" className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <motion.circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={
                  healthMetrics.status === 'excellent' ? '#10b981' :
                  healthMetrics.status === 'good' ? '#3b82f6' :
                  healthMetrics.status === 'warning' ? '#f97316' :
                  '#ef4444'
                }
                strokeWidth="8"
                strokeDasharray={`${Math.PI * 100}`}
                strokeDashoffset={Math.PI * 100 * (1 - healthMetrics.percentage / 100)}
                strokeLinecap="round"
                initial={{ strokeDashoffset: Math.PI * 100 }}
                animate={{ strokeDashoffset: Math.PI * 100 * (1 - healthMetrics.percentage / 100) }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
          </div>

          <p className={`text-center text-sm font-medium ${getStatusColor(healthMetrics.status)} mb-2`}>
            {getStatusMessage(healthMetrics.status, healthMetrics.percentage)}
          </p>
          <p className="text-xs text-sand-600 text-center">
            {totalBudget > 0 ? `${Math.round(healthMetrics.percentage)}% of budget used` : 'No budget set'}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default BudgetHealthCard;

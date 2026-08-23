import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrencyWithSymbol } from '../utils/budgetCalculations';

type ExpenseLike = {
  // Already expressed in the selected display currency by the caller.
  convertedCost: number;
  currency?: string | null;
  category?: string | null;
  description?: string | null;
};

interface CategoryBreakdownChartProps {
  expenses: ExpenseLike[];
  selectedCurrency: string;
}

const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({ expenses, selectedCurrency }) => {
  const categoryColors: Record<string, string> = {
    transportation: '#3b82f6',
    accommodation: '#10b981',
    food: '#f97316',
    dining: '#f97316',
    activities: '#a855f7',
    entertainment: '#a855f7',
    other: '#ec4899'
  };

  const chartData = useMemo(() => {
    const categoryMap: Record<string, number> = {};

    expenses.forEach(expense => {
      const category = (expense.category || 'other').toLowerCase();
      categoryMap[category] = (categoryMap[category] || 0) + expense.convertedCost;
    });

    return Object.entries(categoryMap)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Math.round(value * 100) / 100,
        originalName: name
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  if (chartData.length === 0) {
    return (
      <Card className="border border-sand-200 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-earth-600">Spending by Category</CardTitle>
          <CardDescription>Your expense breakdown will appear here</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-sand-600">No expenses to display</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-sand-200 bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-earth-600">Spending by Category</CardTitle>
        <CardDescription>Visual breakdown of your expenses</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={categoryColors[entry.originalName] || '#gray'}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrencyWithSymbol(value, selectedCurrency)}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(_value, entry) => {
                const payload = (entry as { payload?: { name?: string } }).payload;
                return payload?.name ?? '';
              }}
              wrapperStyle={{ paddingTop: '20px' }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Enhanced Category List Below Chart */}
        <div className="mt-8">
          <h4 className="text-sm font-semibold text-earth-600 mb-4">Category Breakdown</h4>
          <div className="space-y-3">
            {chartData.map((category) => {
              const total = chartData.reduce((sum, item) => sum + item.value, 0);
              const percentage = ((category.value / total) * 100).toFixed(1);
              return (
                <div key={category.originalName} className="flex items-center gap-4">
                  {/* Color dot */}
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: categoryColors[category.originalName] }}
                  />
                  
                  {/* Category name and percentage */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-earth-700">{category.name}</p>
                      <p className="text-sm font-semibold text-earth-600">{formatCurrencyWithSymbol(category.value, selectedCurrency)}</p>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-sand-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: categoryColors[category.originalName]
                        }}
                      />
                    </div>
                    
                    {/* Percentage label */}
                    <p className="text-xs text-sand-600 mt-1">{percentage}% of total</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryBreakdownChart;

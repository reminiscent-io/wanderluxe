import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrencyWithSymbol } from '../utils/budgetCalculations';

interface CategoryBreakdownChartProps {
  expenses: any[];
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
              formatter={(value, entry: any) => `${entry.payload.name}: ${formatCurrencyWithSymbol(entry.payload.value, selectedCurrency)}`}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Category List Below Chart */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          {chartData.map((category) => {
            const percentage = ((category.value / chartData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1);
            return (
              <div key={category.originalName} className="flex items-start gap-3">
                <div
                  className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: categoryColors[category.originalName] }}
                />
                <div>
                  <p className="text-sm font-medium text-earth-600">{category.name}</p>
                  <p className="text-xs text-sand-600">{percentage}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryBreakdownChart;

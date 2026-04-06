import { NextResponse } from 'next/server';
import getDb from '@/lib/db/database';
import { getUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();

    // Current month dates
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    // Total this month
    const totalMonth = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND date >= ? AND date <= ?'
    ).get(user.id, monthStart, monthEnd);

    // Total last month
    const totalLastMonth = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND date >= ? AND date <= ?'
    ).get(user.id, lastMonthStart, lastMonthEnd);

    // Category breakdown this month
    const categoryBreakdown = db.prepare(
      'SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY category ORDER BY total DESC'
    ).all(user.id, monthStart, monthEnd);

    // Daily spending this month
    const dailySpending = db.prepare(
      'SELECT date, SUM(amount) as total FROM expenses WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY date ORDER BY date'
    ).all(user.id, monthStart, monthEnd);

    // Monthly spending last 6 months
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0];
    const monthlyTrending = db.prepare(
      `SELECT strftime('%Y-%m', date) as month, SUM(amount) as total, COUNT(*) as count 
       FROM expenses WHERE user_id = ? AND date >= ? GROUP BY month ORDER BY month`
    ).all(user.id, sixMonthsAgo);

    // Total expenses count
    const expenseCount = db.prepare(
      'SELECT COUNT(*) as count FROM expenses WHERE user_id = ? AND date >= ? AND date <= ?'
    ).get(user.id, monthStart, monthEnd);

    // Recent expenses
    const recentExpenses = db.prepare(
      'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 5'
    ).all(user.id);

    // Budget status
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const budgets = db.prepare(
      'SELECT * FROM budgets WHERE user_id = ? AND month = ?'
    ).all(user.id, currentMonthKey);

    const budgetStatus = budgets.map(b => {
      const spent = categoryBreakdown.find(c => c.category === b.category);
      return {
        ...b,
        spent: spent ? spent.total : 0,
        percentage: spent ? Math.round((spent.total / b.amount) * 100) : 0,
      };
    });

    // Top merchants
    const topMerchants = db.prepare(
      `SELECT merchant, SUM(amount) as total, COUNT(*) as count FROM expenses 
       WHERE user_id = ? AND date >= ? AND date <= ? AND merchant IS NOT NULL AND merchant != ''
       GROUP BY merchant ORDER BY total DESC LIMIT 5`
    ).all(user.id, monthStart, monthEnd);

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();

    return NextResponse.json({
      totalMonth: totalMonth.total,
      totalLastMonth: totalLastMonth.total,
      monthlyChange: totalLastMonth.total > 0 
        ? (((totalMonth.total - totalLastMonth.total) / totalLastMonth.total) * 100).toFixed(1)
        : 0,
      dailyAverage: daysPassed > 0 ? (totalMonth.total / daysPassed).toFixed(2) : 0,
      expenseCount: expenseCount.count,
      categoryBreakdown,
      dailySpending,
      monthlyTrending,
      recentExpenses,
      budgetStatus,
      topMerchants,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

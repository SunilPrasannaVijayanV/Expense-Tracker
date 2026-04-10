import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Expense from '@/lib/db/models/Expense';
import Budget from '@/lib/db/models/Budget';
import { getUser } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
    
    // 1. Total This Month
    const totalMonthResult = await Expense.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(user.id), date: { $regex: `^${currentMonth}` } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalMonth = totalMonthResult[0]?.total || 0;

    // 2. Daily Average This Month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const dailyAverage = totalMonth / currentDay;

    // 3. Category Breakdown
    const categoryBreakdown = await Expense.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(user.id), date: { $regex: `^${currentMonth}` } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $project: { category: '$_id', total: 1, _id: 0 } },
      { $sort: { total: -1 } }
    ]);

    // 4. Monthly Trending (Last 6 months)
    const monthlyTrending = await Expense.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(user.id) } },
      {
        $group: {
          _id: { $substr: ['$date', 0, 7] },
          total: { $sum: '$amount' }
        }
      },
      { $project: { month: '$_id', total: 1, _id: 0 } },
      { $sort: { month: -1 } },
      { $limit: 6 }
    ]);

    // 5. Recent Expenses
    const rawRecent = await Expense.find({ userId: user.id })
      .sort({ date: -1, createdAt: -1 })
      .limit(5);
    
    const recentExpenses = rawRecent.map(exp => ({
      ...exp.toObject(),
      id: exp._id.toString()
    }));

    // 6. Budget Status
    const rawBudgets = await Budget.find({ userId: user.id, month: currentMonth });
    const budgetStatus = rawBudgets.map(b => {
      const spent = categoryBreakdown.find(c => c.category === b.category)?.total || 0;
      return {
        id: b._id.toString(),
        category: b.category,
        amount: b.amount,
        spent,
        percentage: (spent / b.amount) * 100
      };
    });

    // 7. Monthly Change (%)
    const lastMonthRaw = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = lastMonthRaw.toISOString().slice(0, 7);
    const lastMonthResult = await Expense.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(user.id), date: { $regex: `^${lastMonth}` } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalLastMonth = lastMonthResult[0]?.total || 0;
    const monthlyChange = totalLastMonth === 0 ? 0 : ((totalMonth - totalLastMonth) / totalLastMonth) * 100;

    return NextResponse.json({
      totalMonth,
      dailyAverage,
      monthlyChange: monthlyChange.toFixed(1),
      categoryBreakdown,
      monthlyTrending: monthlyTrending.reverse(),
      recentExpenses,
      budgetStatus,
      expenseCount: await Expense.countDocuments({ userId: user.id, date: { $regex: `^${currentMonth}` } })
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

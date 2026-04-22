import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Expense from '@/lib/db/models/Expense';
import { getUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'DESC';
    const paymentMethod = searchParams.get('paymentMethod');
    const format = searchParams.get('format') || 'csv';

    await dbConnect();

    const query = { userId: user.id };

    if (category && category !== 'All') query.category = category;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) query.amount.$gte = parseFloat(minAmount);
      if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { merchant: { $regex: search, $options: 'i' } }
      ];
    }

    const sortDir = sortOrder === 'ASC' ? 1 : -1;
    const expenses = await Expense.find(query).sort({ [sortBy]: sortDir, createdAt: -1 });

    if (format === 'json') {
      return NextResponse.json({ expenses });
    }

    // Build CSV
    const escapeCell = (val) => {
      const s = val == null ? '' : String(val);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = ['Date', 'Description', 'Category', 'Merchant', 'Payment Method', 'Amount'];
    const rows = expenses.map(e => [
      e.date,
      e.description || '',
      e.category,
      e.merchant || '',
      (e.paymentMethod || 'cash').replace(/_/g, ' '),
      Number(e.amount).toFixed(2),
    ].map(escapeCell).join(','));

    const csv = [headers.join(','), ...rows].join('\r\n');
    const today = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="expenses-${today}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

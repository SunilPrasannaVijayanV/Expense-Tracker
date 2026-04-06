import { NextResponse } from 'next/server';
import getDb from '@/lib/db/database';
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

    const db = getDb();
    let where = ['e.user_id = ?'];
    let params = [user.id];

    if (category) { where.push('e.category = ?'); params.push(category); }
    if (startDate) { where.push('e.date >= ?'); params.push(startDate); }
    if (endDate) { where.push('e.date <= ?'); params.push(endDate); }
    if (minAmount) { where.push('e.amount >= ?'); params.push(parseFloat(minAmount)); }
    if (maxAmount) { where.push('e.amount <= ?'); params.push(parseFloat(maxAmount)); }
    if (paymentMethod) { where.push('e.payment_method = ?'); params.push(paymentMethod); }
    if (search) { where.push('(e.description LIKE ? OR e.merchant LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

    const whereClause = where.join(' AND ');
    const validSortColumns = ['date', 'amount', 'category', 'created_at'];
    const sortCol = validSortColumns.includes(sortBy) ? sortBy : 'date';
    const sortDir = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const expenses = db.prepare(
      `SELECT e.* FROM expenses e WHERE ${whereClause} ORDER BY e.${sortCol} ${sortDir}, e.created_at DESC`
    ).all(...params);

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
      (e.payment_method || 'cash').replace(/_/g, ' '),
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

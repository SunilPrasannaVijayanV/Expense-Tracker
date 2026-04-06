import { NextResponse } from 'next/server';
import getDb from '@/lib/db/database';
import { getUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
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

    const countResult = db.prepare(`SELECT COUNT(*) as total FROM expenses e WHERE ${whereClause}`).get(...params);
    const total = countResult.total;

    const offset = (page - 1) * limit;
    const expenses = db.prepare(
      `SELECT e.* FROM expenses e WHERE ${whereClause} ORDER BY e.${sortCol} ${sortDir}, e.created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    return NextResponse.json({
      expenses,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    
    // Support batch creation
    const expenses = Array.isArray(body) ? body : [body];
    const db = getDb();
    const results = [];

    const insert = db.prepare(
      'INSERT INTO expenses (user_id, amount, category, subcategory, description, merchant, date, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    const insertMany = db.transaction((items) => {
      for (const exp of items) {
        if (!exp.amount || !exp.category || !exp.date) {
          throw new Error('Amount, category, and date are required');
        }
        const result = insert.run(
          user.id,
          parseFloat(exp.amount),
          exp.category,
          exp.subcategory || null,
          exp.description || null,
          exp.merchant || null,
          exp.date,
          exp.payment_method || 'cash'
        );
        results.push({
          id: result.lastInsertRowid,
          ...exp,
          user_id: user.id,
          amount: parseFloat(exp.amount),
        });
      }
    });

    insertMany(expenses);

    return NextResponse.json({ 
      message: `${results.length} expense(s) added successfully`, 
      expenses: results 
    }, { status: 201 });
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import getDb from '@/lib/db/database';
import { getUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const budgets = db.prepare(
      'SELECT * FROM budgets WHERE user_id = ? AND month = ?'
    ).all(user.id, currentMonthKey);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const spending = db.prepare(
      'SELECT category, SUM(amount) as total FROM expenses WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY category'
    ).all(user.id, monthStart, monthEnd);

    const budgetStatus = budgets.map(b => {
      const spent = spending.find(s => s.category === b.category);
      return {
        ...b,
        spent: spent ? spent.total : 0,
        percentage: spent ? Math.round((spent.total / b.amount) * 100) : 0,
      };
    });

    return NextResponse.json({ budgets: budgetStatus });
  } catch (error) {
    console.error('Get budgets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { category, amount, month } = await request.json();
    
    if (!category || !amount) {
      return NextResponse.json({ error: 'Category and amount are required' }, { status: 400 });
    }

    const now = new Date();
    const budgetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const db = getDb();
    
    // Upsert budget
    const existing = db.prepare(
      'SELECT id FROM budgets WHERE user_id = ? AND category = ? AND month = ?'
    ).get(user.id, category, budgetMonth);

    if (existing) {
      db.prepare('UPDATE budgets SET amount = ? WHERE id = ?').run(parseFloat(amount), existing.id);
    } else {
      db.prepare(
        'INSERT INTO budgets (user_id, category, amount, month) VALUES (?, ?, ?, ?)'
      ).run(user.id, category, parseFloat(amount), budgetMonth);
    }

    return NextResponse.json({ message: 'Budget saved' }, { status: 201 });
  } catch (error) {
    console.error('Save budget error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Budget ID required' }, { status: 400 });
    }

    const db = getDb();
    db.prepare('DELETE FROM budgets WHERE id = ? AND user_id = ?').run(id, user.id);

    return NextResponse.json({ message: 'Budget deleted' });
  } catch (error) {
    console.error('Delete budget error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

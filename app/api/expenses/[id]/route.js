import { NextResponse } from 'next/server';
import getDb from '@/lib/db/database';
import { getUser } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(id, user.id);

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ expense });
  } catch (error) {
    console.error('Get expense error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const existing = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(id, user.id);
    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const updates = {
      amount: body.amount !== undefined ? parseFloat(body.amount) : existing.amount,
      category: body.category || existing.category,
      subcategory: body.subcategory !== undefined ? body.subcategory : existing.subcategory,
      description: body.description !== undefined ? body.description : existing.description,
      merchant: body.merchant !== undefined ? body.merchant : existing.merchant,
      date: body.date || existing.date,
      payment_method: body.payment_method || existing.payment_method,
    };

    db.prepare(
      'UPDATE expenses SET amount = ?, category = ?, subcategory = ?, description = ?, merchant = ?, date = ?, payment_method = ? WHERE id = ? AND user_id = ?'
    ).run(updates.amount, updates.category, updates.subcategory, updates.description, updates.merchant, updates.date, updates.payment_method, id, user.id);

    const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    return NextResponse.json({ message: 'Expense updated', expense: updated });
  } catch (error) {
    console.error('Update expense error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = getDb();

    // Support bulk delete via comma-separated ids
    const ids = String(id).split(',').map(i => parseInt(i.trim()));
    
    const deleteStmt = db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?');
    let deleted = 0;

    const deleteMany = db.transaction(() => {
      for (const expId of ids) {
        const result = deleteStmt.run(expId, user.id);
        deleted += result.changes;
      }
    });

    deleteMany();

    if (deleted === 0) {
      return NextResponse.json({ error: 'No expenses found' }, { status: 404 });
    }

    return NextResponse.json({ message: `${deleted} expense(s) deleted`, deleted });
  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

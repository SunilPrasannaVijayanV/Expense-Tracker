import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Expense from '@/lib/db/models/Expense';
import { getUser } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const expense = await Expense.findOne({ _id: id, userId: user.id });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ expense });
  } catch (error) {
    console.error('Get expense error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    await dbConnect();

    const updated = await Expense.findOneAndUpdate(
      { _id: id, userId: user.id },
      { $set: body },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const expense = { ...updated.toObject(), id: updated._id.toString() };
    return NextResponse.json({ message: 'Expense updated', expense });
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
    await dbConnect();

    // Support bulk delete via comma-separated ids
    const ids = String(id).split(',').map(i => i.trim());
    
    const result = await Expense.deleteMany({ _id: { $in: ids }, userId: user.id });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'No expenses found' }, { status: 404 });
    }

    return NextResponse.json({ message: `${result.deletedCount} expense(s) deleted`, deleted: result.deletedCount });
  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Budget from '@/lib/db/models/Budget';
import { getUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    await dbConnect();

    const budgets = await Budget.find({ userId: user.id, month });

    return NextResponse.json(budgets);
  } catch (error) {
    console.error('Fetch budgets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { category, amount, month } = await request.json();

    if (!category || !amount || !month) {
      return NextResponse.json({ error: 'Category, amount, and month are required' }, { status: 400 });
    }

    await dbConnect();

    const budget = await Budget.findOneAndUpdate(
      { userId: user.id, category, month },
      { $set: { amount: parseFloat(amount) } },
      { upsert: true, new: true }
    );

    return NextResponse.json(budget);
  } catch (error) {
    console.error('Update budget error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Budget ID is required' }, { status: 400 });
    }

    await dbConnect();

    await Budget.deleteOne({ _id: id, userId: user.id });

    return NextResponse.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Delete budget error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

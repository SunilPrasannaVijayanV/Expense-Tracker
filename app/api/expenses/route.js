import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Expense from '@/lib/db/models/Expense';
import { getUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    const paymentMethod = searchParams.get('paymentMethod');
    const search = searchParams.get('search');

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

    const expenses = await Expense.find(query).sort({ date: -1, createdAt: -1 });

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('Fetch expenses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const expensesData = Array.isArray(body) ? body : [body];

    await dbConnect();

    const formattedData = expensesData.map((exp) => ({
      userId: user.id,
      amount: parseFloat(exp.amount),
      category: exp.category,
      subcategory: exp.subcategory,
      description: exp.description,
      merchant: exp.merchant,
      date: exp.date,
      paymentMethod: exp.paymentMethod || 'cash',
    }));

    const result = await Expense.insertMany(formattedData);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

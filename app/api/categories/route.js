import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongodb';
import Category from '@/lib/db/models/Category';
import { getUser } from '@/lib/auth';
import { seedCategories } from '@/lib/db/seed';

export async function GET() {
  try {
    const user = await getUser();
    // Categories are accessible to everyone (defaults) + specific user custom ones
    
    await dbConnect();
    
    // Ensure defaults are seeded
    await seedCategories();

    const query = { $or: [{ userId: null }] };
    if (user) {
      query.$or.push({ userId: user.id });
    }

    const categories = await Category.find(query).sort({ name: 1 });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Fetch categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, icon, color } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    await dbConnect();

    const category = await Category.create({
      userId: user.id,
      name,
      icon,
      color,
      isCustom: true,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

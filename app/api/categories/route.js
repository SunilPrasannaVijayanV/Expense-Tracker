import { NextResponse } from 'next/server';
import getDb from '@/lib/db/database';
import { getUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getDb();
    const defaultCats = db.prepare('SELECT * FROM categories WHERE user_id IS NULL ORDER BY name').all();
    const customCats = db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY name').all(user.id);

    return NextResponse.json({ categories: [...defaultCats, ...customCats] });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, icon, color } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO categories (user_id, name, icon, color, is_custom) VALUES (?, ?, ?, ?, 1)'
    ).run(user.id, name, icon || '📁', color || '#6C63FF');

    return NextResponse.json({ 
      category: { id: result.lastInsertRowid, user_id: user.id, name, icon: icon || '📁', color: color || '#6C63FF', is_custom: 1 } 
    }, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

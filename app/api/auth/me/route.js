import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}

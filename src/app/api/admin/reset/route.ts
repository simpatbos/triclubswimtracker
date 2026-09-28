import { NextResponse } from 'next/server';
import { resetToDemoData } from '@/lib/db';

export async function POST() {
  resetToDemoData();
  return NextResponse.json({ success: true, message: 'Demo data re-seeded' });
}

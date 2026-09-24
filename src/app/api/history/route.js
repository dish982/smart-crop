import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import FarmerHistory from '@/models/FarmerHistory';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export async function GET(request) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    await connectToDatabase();

    // Request URL se optional query parameter extract karein
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');

    // Base query: User ke saare history logs
    const query = { userId: decoded.userId };
    
    // Agar frontend specific type maang raha hai (e.g. ?type=disease), toh filter lagayen
    if (typeFilter) {
      query.type = typeFilter;
    }

    const history = await FarmerHistory.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error('HISTORY GET API ERROR:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
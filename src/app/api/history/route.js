import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import FarmerHistory from '@/models/FarmerHistory';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET(request) {
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is missing in environment variables.');
    }

    // 1. Fetch token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access. Please log in.' },
        { status: 401 }
      );
    }

    // 2. Verify JWT token to get logged-in user ID
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session. Please log in again.' },
        { status: 401 }
      );
    }

    const userId = decoded.id || decoded.userId;

    // 3. Read query parameters safely
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    await connectToDatabase();

    // 4. Query only current user's history
    const query = { userId };
    if (type) {
      query.type = type;
    }

    const history = await FarmerHistory.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, history });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
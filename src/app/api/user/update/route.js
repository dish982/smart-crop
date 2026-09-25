import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET;

export async function PATCH(request) {
  try {
    if (!JWT_SECRET) throw new Error('JWT_SECRET missing');

    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid or expired session' }, { status: 401 });
    }

    const userId = decoded.id || decoded.userId;
    const { name, state, district, language } = await request.json();

    await connectToDatabase();

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { name, state, district, language } },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
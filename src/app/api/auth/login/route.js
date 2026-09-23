import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET
const THIRTY_DAYS = 30 * 24 * 60 * 60;

export async function POST(request) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Phone number and password are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ phone });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid phone number or password' },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid phone number or password' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { userId: user._id, name: user.name, state: user.state || "", phone: user.phone, role: user.role || "Farmer", district: user.district || "No district set" },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

      const response = NextResponse.json(
      {
        message: 'Login successful',
        user: { 
          id: user._id, 
          name: user.name, 
          phone: user.phone,
          state: user.state || '' ,
          district: user.district
        },
      },
      { status: 200 }
    );

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: THIRTY_DAYS,
    });

    return response;
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
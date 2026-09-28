import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET;
const THIRTY_DAYS = 30 * 24 * 60 * 60;

export async function POST(request) {
  try {
    const { name, phone, password, state, district, language, email } = await request.json();

    if (!name || !phone || !password) {
      return NextResponse.json(
        { error: 'Name, phone, and password are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      phone,
      password: hashedPassword,
      email: email ? email.toLowerCase().trim() : '',
      state: state || '',
      district: district || '',
      language: language || 'en',
    });

    const token = jwt.sign(
      {
        userId: newUser._id,
        phone: newUser.phone,
        role: newUser.role || 'Farmer',
        state: newUser.state,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const response = NextResponse.json(
      {
        message: 'Signup successful',
        user: { id: newUser._id, name: newUser.name, phone: newUser.phone, state: newUser.state },
      },
      { status: 201 }
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
    console.error('SIGNUP ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
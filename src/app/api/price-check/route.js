import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import FarmerHistory from '@/models/FarmerHistory';

const JWT_SECRET = process.env.JWT_SECRET;

function getUserFromCookie(request) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function POST(request) {
  const base = process.env.ML_SERVICE_URL || "http://localhost:8000";
  const body = await request.json();
  const { crop, state, mandi } = body;

  if (!crop || !state || !mandi) {
    return Response.json({ error: "crop, state and mandi are required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${base}/api/market/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crop, mandi, state }),
      cache: "no-store",
    });

    const data = await res.json();
    console.log("ML SERVICE RESPONSE:", data);

    if (!res.ok) {
      return Response.json({ error: data.detail || "Prediction failed" }, { status: res.status });
    }

    const resultPayload = { ...data, current_date: data.current_date || null };

    // Save to history, same pattern as disease detection
    const user = getUserFromCookie(request);
    let savedHistory = null;

    if (user?.userId) {
      await connectToDatabase();
      savedHistory = await FarmerHistory.create({
        userId: user.userId,
        type: 'market',
        title: `${crop} @ ${mandi}: ${data.decision} (₹${data.current_price} → ₹${Math.max(...data.forecast.map(f => f.predicted_price)).toFixed(0)})`,
        inputData: { crop, state, mandi },
        resultData: resultPayload,
      });
    }

    return Response.json({ ...resultPayload, historyId: savedHistory ? savedHistory._id : null });
  } catch (err) {
    console.error("ML SERVICE CONNECTION ERROR:", err);
    return Response.json({ error: "Could not reach ML service", detail: err.message }, { status: 502 });
  }
}
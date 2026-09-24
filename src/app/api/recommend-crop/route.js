import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import FarmerHistory from '@/models/FarmerHistory';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Helper function to extract user details from the JWT cookie
function getUserFromCookie(request) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { N, P, K, pH, rainfall, state, district, season } = body;

    // Validate essential inputs
    if (N === undefined || P === undefined || K === undefined || !pH) {
      return NextResponse.json(
        { success: false, error: 'Missing soil parameters (N, P, K, pH required)' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // -------------------------------------------------------------
    // MOCK MODEL INFERENCE (Replace this block with FastAPI fetch later)
    // -------------------------------------------------------------
    // Rule-based logic simulating the trained classification model:
    let recommendedCrop = 'Rice';
    let confidence = 0.89;
    let fallbackToICAR = false;

    const nVal = Number(N);
    const kVal = Number(K);
    const phVal = Number(pH);

    if (nVal > 80 && kVal > 40) {
      recommendedCrop = 'Cotton';
      confidence = 0.92;
    } else if (phVal < 6.0) {
      recommendedCrop = 'Tea';
      confidence = 0.85;
    } else if (nVal < 40 && kVal > 50) {
      recommendedCrop = 'Chickpea (Gram)';
      confidence = 0.88;
    } else if (season && season.toLowerCase() === 'rabi') {
      recommendedCrop = 'Wheat';
      confidence = 0.94;
    }

    // Example ICAR Cross-Check Rule (e.g., Rice recommended in high pH dry season overrides to ICAR default)
    if (phVal > 8.0 && recommendedCrop === 'Rice') {
      recommendedCrop = 'Mustard'; // ICAR rule override
      fallbackToICAR = true;
    }

    const resultPayload = {
      recommendedCrop,
      confidence,
      icarVerified: true,
      icarOverrideApplied: fallbackToICAR,
      advisoryNotes: `Optimal growth conditions found for ${recommendedCrop} in ${district || 'your region'}. Ensure proper nitrogen management during seedling stage.`,
    };
    // -------------------------------------------------------------

    // Identify user from Auth Token cookie (Fallback to Anonymous if unauthenticated)
    const user = getUserFromCookie(request);
    const userId = user?.userId || null;

    // SAVE LOG TO FarmerHistory (Triggers Admin Dashboard Real-Time Analytics)
    if (userId) {
      await FarmerHistory.create({
        userId: userId,
        type: 'crop',
        title: `Crop Recommendation: ${recommendedCrop}`,
        inputData: { N, P, K, pH, rainfall, state, district, season },
        resultData: resultPayload,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: resultPayload,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('CROP RECOMMENDATION API ERROR:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server processing error' },
      { status: 500 }
    );
  }
}
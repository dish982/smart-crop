import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import FarmerHistory from '@/models/FarmerHistory';
import { DISEASE_KNOWLEDGE_BASE } from '@/data/diseaseData';

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

const CONFIDENCE_THRESHOLD = 60.0;

export async function POST(request) {
  try {
    const { imageUrl, cropName, predictedClass, confidenceScore } = await request.json();

    if (!predictedClass || confidenceScore === undefined) {
      return NextResponse.json(
        { success: false, error: 'Prediction class and confidence score are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const confidence = Number(confidenceScore);
    const isLowConfidence = confidence < CONFIDENCE_THRESHOLD;

    const knowledge = DISEASE_KNOWLEDGE_BASE[predictedClass];
    const displayName = predictedClass.replace(/___/g, ': ').replace(/_/g, ' ');

    const advisory = knowledge
      ? {
          verified: true,
          note: `Standard Integrated Pest Management (IPM) guidance for this condition.`,
          treatment: knowledge.treatment,
        }
      : {
          verified: false,
          note: 'No specific advisory on file for this exact condition yet — general guidance shown below.',
          treatment: {
            chemical: [],
            organic: ['Consult your local agricultural extension officer for a targeted treatment plan.'],
            dosage: 'N/A',
            prevention: ['Ensure proper field drainage and destroy infected crop debris.'],
          },
        };

    const resultPayload = {
      prediction: displayName,
      confidence, 
      isLowConfidence,
      lowConfidenceWarning: isLowConfidence
        ? 'Confidence is below 60%, so this result may be unreliable even if it looks correct. For a more accurate reading, try retaking the photo: get closer to a single affected leaf, use even daylight (avoid harsh shadows or glare), and keep the leaf flat against a plain background.'
        : null,
      icarVerified: advisory.verified,
      icarNotes: advisory.note,
      treatment: advisory.treatment,
      farmerConfirmed: null,
    };

    const user = getUserFromCookie(request);
    let savedHistory = null;

    if (user?.userId) {
      savedHistory = await FarmerHistory.create({
        userId: user.userId,
        type: 'disease',
        title: `Diagnosed: ${displayName} (${confidence.toFixed(1)}%)`,
        inputData: { imageUrl, cropName },
        resultData: resultPayload,
      });
    }

    return NextResponse.json({
      success: true,
      data: { ...resultPayload, historyId: savedHistory ? savedHistory._id : null },
    });
  } catch (error) {
    console.error('DIAGNOSE API ERROR:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
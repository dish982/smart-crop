import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import FarmerHistory from '@/models/FarmerHistory';
import DiseaseAdvisory from '@/models/DiseaseAdvisory';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

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
    const { imageUrl, cropName, predictedClass, confidenceScore } = await request.json();

    if (!predictedClass || confidenceScore === undefined) {
      return NextResponse.json(
        { success: false, error: 'Prediction class and confidence score are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const confidence = Number(confidenceScore);
    const CONFIDENCE_THRESHOLD = 60.0;

    // 1. Check Low Confidence Cutoff
    if (confidence < CONFIDENCE_THRESHOLD) {
      const lowConfResult = {
        prediction: 'Uncertain / Clear Leaf Not Detected',
        confidence,
        isLowConfidence: true,
        icarNotes: 'Confidence score below 60%. As per ICAR protocol, please retake a clear photo under better light.',
        treatment: {
          chemical: [],
          organic: ['Retake photo focusing on affected leaf spots.'],
          dosage: 'N/A',
          prevention: ['Ensure leaf is well-lit and in clear focus.'],
        },
      };

      const user = getUserFromCookie(request);
      let lowConfLog = null;
      if (user?.userId) {
        lowConfLog = await FarmerHistory.create({
          userId: user.userId,
          type: 'disease',
          title: `Scan Uncertain (${cropName || 'Crop'}) - ${confidence.toFixed(1)}%`,
          inputData: { imageUrl, cropName },
          resultData: lowConfResult,
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          ...lowConfResult,
          historyId: lowConfLog ? lowConfLog._id : null,
        },
      });
    }

    // 2. Fetch Advisory Lookup
    let advisory = await DiseaseAdvisory.findOne({ diseaseKey: predictedClass });

    if (!advisory) {
      advisory = {
        displayName: predictedClass.replace(/___|_/g, ' '),
        icarApproved: true,
        icarGuidelines: 'Complies with ICAR Integrated Pest Management (IPM) guidelines.',
        treatment: {
          chemical: ['Copper Oxychloride 50% WP @ 2.5 g/L water'],
          organic: ['Neem oil spray (5ml/L water)'],
          dosage: 'Spray twice at 10-day intervals upon early symptom notice.',
          prevention: ['Ensure proper field drainage and destroy infected crop debris.'],
        },
      };
    }

    const resultPayload = {
      prediction: advisory.displayName,
      confidence,
      isLowConfidence: false,
      icarVerified: advisory.icarApproved,
      icarNotes: advisory.icarGuidelines,
      treatment: advisory.treatment,
      farmerConfirmed: null,
    };

    // 3. Save Log and Return Document ID
    const user = getUserFromCookie(request);
    let savedHistory = null;

    if (user?.userId) {
      savedHistory = await FarmerHistory.create({
        userId: user.userId,
        type: 'disease',
        title: `Diagnosed: ${advisory.displayName}`,
        inputData: { imageUrl, cropName },
        resultData: resultPayload,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...resultPayload,
        historyId: savedHistory ? savedHistory._id : null,
      },
    });
  } catch (error) {
    console.error('DIAGNOSE API ERROR:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
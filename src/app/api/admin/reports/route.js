import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import FarmerHistory from '@/models/FarmerHistory';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET;

export async function GET() {
  try {
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET missing');
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired session',
        },
        { status: 401 }
      );
    }

    // Only Admin can access this report
    if (decoded.role !== 'Admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
        },
        { status: 403 }
      );
    }
    await connectToDatabase();

    const diseaseLogs = await FarmerHistory.find({
      type: 'disease',
    })
      .populate('userId', 'name phone')
      .sort({ createdAt: -1 })
      .lean();
    function parseResultData(resultData) {
      if (!resultData) {
        return {};
      }

      // Already an object
      if (typeof resultData === 'object') {
        return resultData;
      }

      // Sometimes resultData may have been saved as JSON text
      if (typeof resultData === 'string') {
        try {
          const parsed = JSON.parse(resultData);

          if (parsed && typeof parsed === 'object') {
            return parsed;
          }

          return {
            prediction: resultData,
          };
        } catch {
          // Not JSON, so treat the string itself as prediction
          return {
            prediction: resultData,
          };
        }
      }

      return {};
    }


    function getPrediction(resultData) {
      const parsed = parseResultData(resultData);

      return (
        parsed.prediction ||
        parsed.disease ||
        parsed.label ||
        parsed.className ||
        'Unknown'
      );
    }

    function isUncertain(resultData) {
      const prediction = getPrediction(resultData);

      const normalized = String(prediction)
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, ' ');

      /*
        We consider a scan uncertain when the saved prediction
        itself indicates uncertainty.

        Examples handled:

        "Uncertain"
        "uncertain"
        "Not Detected"
        "not_detected"
        "Unknown"
        "Low Confidence"
      */

      return (
        normalized === 'uncertain' ||
        normalized.includes('uncertain') ||
        normalized === 'not detected' ||
        normalized.includes('not detected') ||
        normalized === 'unknown' ||
        normalized.includes('low confidence')
      );
    }

    function cleanDiseaseName(name) {
      if (!name) {
        return 'Unknown';
      }

      return String(name)
        .replace(/___/g, ': ')
        .replace(/_/g, ' ')
        .trim();
    }

    let totalScans = 0;
    let accurate = 0;
    let inaccurate = 0;
    let unconfirmed = 0;
    let uncertain = 0;

    const diseaseMap = new Map();
    const farmerMap = new Map();

    for (const log of diseaseLogs) {
      totalScans++;
      const result = parseResultData(log.resultData);
      const prediction = getPrediction(log.resultData);
      const farmer = log.userId;
      const farmerId = farmer?._id ? String(farmer._id) : 'unknown';
      const farmerName = farmer?.name || 'Anonymous Farmer';
      const farmerPhone = farmer?.phone || ''
      const scanIsUncertain = isUncertain(log.resultData);

      if (scanIsUncertain) {
        uncertain++;
      } else {
        

        if (result.farmerConfirmed === true) {
          accurate++;
        } else if (result.farmerConfirmed === false) {
          inaccurate++;
        } else {
          unconfirmed++;
        }
      }

      const diseaseKey = prediction || 'Unknown';

      if (!diseaseMap.has(diseaseKey)) {
        diseaseMap.set(diseaseKey, {
          disease: diseaseKey,
          count: 0,
          accurate: 0,
          inaccurate: 0,
          unconfirmed: 0,
          uncertain: 0,
        });
      }

      const diseaseStats = diseaseMap.get(diseaseKey);
      diseaseStats.count++;

      if (scanIsUncertain) {
        diseaseStats.uncertain++;
      } else if (result.farmerConfirmed === true) {
        diseaseStats.accurate++;
      } else if (result.farmerConfirmed === false) {
        diseaseStats.inaccurate++;
      } else {
        diseaseStats.unconfirmed++;
      }

      if (!farmerMap.has(farmerId)) {
        farmerMap.set(farmerId, {
          _id: farmerId,
          farmerName,
          farmerPhone,

          totalScans: 0,
          accurate: 0,
          inaccurate: 0,
          unconfirmed: 0,
          uncertain: 0,
        });
      }

      const farmerStats = farmerMap.get(farmerId);

      farmerStats.totalScans++;

      if (scanIsUncertain) {
        farmerStats.uncertain++;
      } else if (result.farmerConfirmed === true) {
        farmerStats.accurate++;
      } else if (result.farmerConfirmed === false) {
        farmerStats.inaccurate++;
      } else {
        farmerStats.unconfirmed++;
      }
    }

    const totalFarmers = await User.countDocuments({
      role: 'Farmer',
    });

    const diseaseBreakdown = Array.from(diseaseMap.values())
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        ...item,
        diseaseName: cleanDiseaseName(item.disease),
      }));

    const farmerLevel = Array.from(farmerMap.values())
      .sort((a, b) => b.totalScans - a.totalScans);

    const recentLogs = diseaseLogs.slice(0, 20).map((log) => {
      const result = parseResultData(log.resultData);

      const prediction = getPrediction(log.resultData);

      const scanIsUncertain = isUncertain(log.resultData);

      let confirmationStatus = 'unconfirmed';

      if (scanIsUncertain) {
        confirmationStatus = 'uncertain';
      } else if (result.farmerConfirmed === true) {
        confirmationStatus = 'accurate';
      } else if (result.farmerConfirmed === false) {
        confirmationStatus = 'incorrect';
      }

      return {
        _id: log._id,
        farmerName: log.userId?.name || 'Anonymous Farmer',
        farmerPhone: log.userId?.phone || '',
        prediction,
        diseaseName: cleanDiseaseName(prediction),
        confidence:
          typeof result.confidence === 'number'
            ? result.confidence
            : null,
        farmerConfirmed:
          typeof result.farmerConfirmed === 'boolean'
            ? result.farmerConfirmed
            : null,
        confirmationStatus,
        createdAt: log.createdAt,
      };
    });

    return NextResponse.json({
      success: true,

      data: {
        overall: {
          totalScans,
          accurate,
          inaccurate,
          unconfirmed,
          uncertain,
        },
        totalFarmers,
        farmerLevel,
        diseaseBreakdown,
        recentLogs,
      },
    });
  } catch (error) {
    console.error('ADMIN REPORTS ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Server error',
      },
      {
        status: 500,
      }
    );
  }
}
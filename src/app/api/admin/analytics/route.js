import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import FarmerHistory from '@/models/FarmerHistory';
import User from '@/models/User';

export async function GET() {
  try {
    await connectToDatabase();

    // 1. Total Farmers Count (Case-insensitive check for 'Farmer')
    const totalFarmers = await User.countDocuments({ role: 'Farmer' });

    // 2. Count by Activity Type (disease, crop, market, chat)
    const typeCounts = await FarmerHistory.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const formattedCounts = {
      disease: 0,
      crop: 0,
      market: 0,
      chat: 0,
    };

    typeCounts.forEach((item) => {
      if (item._id) formattedCounts[item._id] = item.count;
    });

    // 3. Top Scanned Diseases Breakdown
    const diseaseBreakdown = await FarmerHistory.aggregate([
      { $match: { type: 'disease' } },
      {
        $group: {
          _id: '$resultData.prediction',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // 4. Recent Farmer Activity Logs
    const recentLogs = await FarmerHistory.find()
      .populate('userId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(20);

    return NextResponse.json({
      success: true,
      data: {
        totalFarmers,
        totalChecks: formattedCounts,
        diseaseBreakdown,
        recentLogs,
      },
    });
  } catch (error) {
    console.error('ADMIN ANALYTICS ERROR:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
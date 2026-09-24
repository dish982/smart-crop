import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import FarmerHistory from '@/models/FarmerHistory';

export async function PATCH(request) {
  try {
    const { historyId, confirmed } = await request.json(); // confirmed: true / false

    if (!historyId || confirmed === undefined) {
      return NextResponse.json(
        { success: false, error: 'historyId and confirmed status required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const updatedLog = await FarmerHistory.findByIdAndUpdate(
      historyId,
      { $set: { 'resultData.farmerConfirmed': confirmed } },
      { new: true }
    );

    return NextResponse.json({ success: true, data: updatedLog });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
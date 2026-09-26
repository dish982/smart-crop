import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";
import FarmerHistory from "@/models/FarmerHistory";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";
const JWT_SECRET = process.env.JWT_SECRET;

function getUserFromCookie(request) {
  try {
    const token = request.cookies.get("auth_token")?.value;
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

async function mlFetch(path, options = {}) {
  const response = await fetch(`${ML_SERVICE_URL}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Crop ML service returned non-JSON data (HTTP ${response.status}).`
    );
  }

  if (!response.ok) {
    throw new Error(data.detail || data.error || "Crop ML service request failed.");
  }

  return data;
}

export async function GET() {
  try {
    const data = await mlFetch("/api/crop/metadata");
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Could not load crop metadata." },
      { status: 502 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const required = ["state", "district", "season"];
    const missing = required.filter(
      (key) => body[key] === undefined || body[key] === null || String(body[key]).trim() === ""
    );

    if (missing.length) {
      return NextResponse.json(
        { success: false, error: `Missing required field(s): ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const data = await mlFetch("/api/crop/recommend-crop", {
      method: "POST",
      body: JSON.stringify(body),
    });

    // Keep the existing FarmerHistory feature of the main app.
    try {
      const user = getUserFromCookie(request);
      const userId = user?.userId || null;      

      if (userId) {
        await connectToDatabase();
        const primary = data.recommendations?.[0];
        await FarmerHistory.create({
          userId,
          type: "crop",
          title: primary
            ? `Crop Recommendation: ${primary.crop}`
            : "Crop Recommendation",
          inputData: body,
          resultData: data,
        });
      }
    } catch (historyError) {
      // A history-write problem should not hide a successful ML result.
      console.error("CROP HISTORY SAVE ERROR:", historyError);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("CROP RECOMMENDATION API ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Crop recommendation failed." },
      { status: 502 }
    );
  }
}
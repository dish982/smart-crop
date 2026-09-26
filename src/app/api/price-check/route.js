export async function POST(request) {
  const base = process.env.ML_SERVICE_URL || "http://localhost:8000";
  const body = await request.json();
  const { crop, state, mandi } = body;

  if (!crop || !state || !mandi) {
    return Response.json(
      { error: "crop, state and mandi are required" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${base}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crop, mandi, state }),
      cache: "no-store",
    });

    const data = await res.json();

    console.log("ML SERVICE RESPONSE:", data);

    if (!res.ok) {
      return Response.json(
        { error: data.detail || "Prediction failed" },
        { status: res.status }
      );
    }

    return Response.json({
      ...data,
      current_date: data.current_date || null,
    });
  } catch (err) {
    console.error("ML SERVICE CONNECTION ERROR:", err);

    return Response.json(
      {
        error: "Could not reach ML service",
        detail: err.message,
      },
      { status: 502 }
    );
  }
}
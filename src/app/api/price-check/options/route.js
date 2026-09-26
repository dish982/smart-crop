export async function GET() {
  const base = process.env.ML_SERVICE_URL || "http://localhost:8000";
  try {
    const res = await fetch(`${base}/api/market/options`, { cache: "no-store" }); //chnaged market options base url
    if (!res.ok) throw new Error(`ML service returned ${res.status}`);
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: "Could not reach ML service", detail: err.message },
      { status: 502 }
    );
  }
}
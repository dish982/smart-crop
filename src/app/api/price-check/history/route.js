export async function GET(request) {
  const base = process.env.ML_SERVICE_URL || "http://localhost:8000";
  const { searchParams } = new URL(request.url);
  try {
    const res = await fetch(`${base}/api/market/price-history?${searchParams.toString()}`, { cache: "no-store" });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err) {
    return Response.json({ error: "Could not reach ML service", detail: err.message }, { status: 502 });
  }
}
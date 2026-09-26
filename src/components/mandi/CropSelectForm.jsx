"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export default function CropSelectForm() {
  const router = useRouter();
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [crop, setCrop] = useState("");
  const [mandi, setMandi] = useState("");

  useEffect(() => {
    fetch("/api/price-check/options")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load options");
        return data;
      })
      .then((data) => {
        setOptions(data);
        if (data.crops?.length) setCrop(data.crops[0]);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const mandisForCrop = crop && options?.mandis_by_crop?.[crop] ? options.mandis_by_crop[crop] : [];

  useEffect(() => {
    if (mandisForCrop.length && !mandisForCrop.includes(mandi)) {
      setMandi(mandisForCrop[0]);
    }
  }, [crop, mandisForCrop, mandi]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams({ crop, mandi, state: "Maharashtra" });
    router.push(`/dashboard/mandi-prices/result?${params.toString()}`);
  };

  if (loading) return <div className="card-agri text-text-subtle text-sm">Loading crops and mandis…</div>;
  if (error) return <div className="card-agri text-accent-cherry text-sm">{error}</div>;
  if (!options?.crops?.length) return <div className="card-agri text-accent-cherry text-sm">No crop data available.</div>;

  return (
    <div className="card-agri max-w-lg">
      <h2 className="text-xl font-bold text-text-main">Crop Advisory</h2>
      <p className="text-sm text-text-subtle mt-1 mb-6">Check the expected price trend of your crop</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="State">
          <select value="Maharashtra" disabled className="input-agri opacity-70 cursor-not-allowed">
            <option>Maharashtra</option>
          </select>
        </Field>

        <Field label="Crop">
          <select value={crop} onChange={(e) => setCrop(e.target.value)} className="input-agri">
            {options.crops.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <Field label="Mandi">
          <select value={mandi} onChange={(e) => setMandi(e.target.value)} className="input-agri">
            {mandisForCrop.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>

        <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
          Get Crop Advisory <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm font-medium text-text-main block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
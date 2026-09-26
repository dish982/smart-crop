"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CloudSun,
  Database,
  Droplets,
  Info,
  Leaf,
  MapPin,
  RefreshCw,
  Sprout,
  Thermometer,
  History
} from "lucide-react";
import Link from "next/link";

// -----------------------------------------------------------------------------
// Small display helpers
// -----------------------------------------------------------------------------
function pretty(value = "") {
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (x) => x.toUpperCase());
}

function num(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function percent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function Card({ title, value, sub }) {
  return (
    <div className="rounded-2xl border border-border-light bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-subtle">{title}</p>
      <p className="mt-2 text-lg font-bold text-text-main">{value}</p>
      {sub && <p className="mt-1 text-xs text-text-subtle">{sub}</p>}
    </div>
  );
}

function Bar({ label, value, right }) {
  const width = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div>
      <div className="mb-2 flex justify-between text-xs text-text-subtle">
        <span>{label}</span>
        <b className="text-text-main">{right}</b>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-primary-green/15">
        <div className="h-full rounded-full bg-primary-green" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function Step({ number, text, active }) {
  return (
    <div
      className={`rounded-full px-4 py-2 text-sm font-medium ${
        active ? "bg-primary-green text-white" : "bg-surface-muted text-text-subtle"
      }`}
    >
      {number}. {text}
    </div>
  );
}

function HistoricalChart({ data, crop }) {
  if (!data?.length) {
    return (
      <div className="card-agri p-8 text-center text-sm text-text-subtle">
        No year-wise historical data available for {pretty(crop)}.
      </div>
    );
  }

  const values = data.map((x) => Number(x.yield || 0));
  const max = Math.max(...values, 1);
  const average = values.reduce((a, b) => a + b, 0) / values.length;

  return (
    <div className="card-agri">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-subtle">
          HISTORICAL VALIDATION — {pretty(crop)}
        </p>
        <p className="mt-1 text-sm text-text-subtle">
          Year-wise Production ÷ Area from the real agricultural records.
        </p>
      </div>

      <div className="flex h-64 items-end gap-3 overflow-x-auto border-b border-border-light px-2 pb-2">
        {data.map((item) => {
          const height = Math.max(8, (Number(item.yield || 0) / max) * 180);
          return (
            <div key={item.year} className="flex min-w-13.75 flex-col items-center justify-end">
              <span className="mb-2 text-[10px] text-text-subtle">{num(item.yield)}</span>
              <div className="w-8 rounded-t-lg bg-primary-green" style={{ height }} />
              <span className="mt-2 text-xs text-text-subtle">{item.year}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card title="Average" value={num(average)} />
        <Card title="Minimum" value={num(Math.min(...values))} />
        <Card title="Maximum" value={num(Math.max(...values))} />
        <Card title="Recent" value={num(values[values.length - 1])} />
      </div>
    </div>
  );
}

export default function CropAdvisory() {
  // -------------------- form state --------------------
  const [step, setStep] = useState(1);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState({});
  const [seasons, setSeasons] = useState({});

  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [season, setSeason] = useState("");

  const [soilMode, setSoilMode] = useState("manual");
  const [soil, setSoil] = useState({ N: "", P: "", K: "", ph: "" });

  // -------------------- result state --------------------
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  // Load real state / district / season lists.
  useEffect(() => {
    async function loadOptions() {
      try {
        const response = await fetch("/api/recommend-crop", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Could not load crop options.");

        setStates(data.states || []);
        setDistricts(data.districts || {});
        setSeasons(data.seasons || {});

        const firstState = data.states?.[0] || "";
        const firstDistrict = data.districts?.[firstState]?.[0] || "";
        const firstSeason = data.seasons?.[`${firstState}|||${firstDistrict}`]?.[0] || "";

        setState(firstState);
        setDistrict(firstDistrict);
        setSeason(firstSeason);
      } catch (e) {
        setError(e.message || "Could not load crop options.");
      } finally {
        setLoading(false);
      }
    }

    loadOptions();
  }, []);

  function selectState(value) {
    const nextDistrict = districts[value]?.[0] || "";
    const nextSeason = seasons[`${value}|||${nextDistrict}`]?.[0] || "";
    setState(value);
    setDistrict(nextDistrict);
    setSeason(nextSeason);
  }

  function selectDistrict(value) {
    const nextSeason = seasons[`${state}|||${value}`]?.[0] || "";
    setDistrict(value);
    setSeason(nextSeason);
  }

  function changeSoil(name, value) {
    setSoil((old) => ({ ...old, [name]: value }));
  }

  function validSoil() {
    if (soilMode === "none") return true;
    return [soil.N, soil.P, soil.K, soil.ph].every(
      (value) => value !== "" && Number.isFinite(Number(value))
    );
  }

  async function getRecommendation() {
    setError("");

    if (!state || !district || !season) {
      setError("Please select state, district and season.");
      setStep(1);
      return;
    }

    if (!validSoil()) {
      setError("Please enter valid N, P, K and pH values.");
      setStep(2);
      return;
    }

    setRunning(true);

    try {
      const body = { state, district, season, soil_mode: soilMode };

      if (soilMode === "manual") {
        body.N = Number(soil.N);
        body.P = Number(soil.P);
        body.K = Number(soil.K);
        body.ph = Number(soil.ph);
      }

      const response = await fetch("/api/recommend-crop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Recommendation failed.");
      }

      setResult(data.data);
      setStep(4);
    } catch (e) {
      setError(e.message || "Could not complete the recommendation.");
    } finally {
      setRunning(false);
    }
  }

  function reset() {
    setResult(null);
    setError("");
    setStep(1);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="card-agri flex items-center justify-center gap-3 py-16 text-sm text-text-subtle">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading real crop options…
        </div>
      </div>
    );
  }

  // ===========================================================================
  // RESULT PAGE
  // ===========================================================================
  if (result) {
    const top = result.recommendations?.[0];
    const topEvidence = top?.historical_evidence;
    const weather = result.weather || {};
    const general = Boolean(result.is_general_recommendation);
    const warnings = result.data_quality_warnings || [];
    const history = result.primary_historical_series || top?.historical_yearly || [];

    const recordCount = Number(topEvidence?.records ?? top?.historical_records ?? 0);
    const maxRecords = Math.max(
      1,
      ...(result.recommendations || []).map((x) =>
        Number(x.historical_evidence?.records ?? x.historical_records ?? 0)
      )
    );

    const climateCards = [
      ["State", pretty(result.location?.state)],
      ["District", pretty(result.location?.district)],
      ["Season", pretty(result.location?.season)],
      ["Current Temperature", `${num(weather.temperature_c, 1)} °C`],
      ["Current Humidity", `${num(weather.humidity_pct, 0)} %`],
      ["Recent Rain", weather.recent_rain_mm == null ? "—" : `${num(weather.recent_rain_mm, 1)} mm`],
      ["Historical Rainfall Used", `${num(weather.rainfall_for_prediction)} mm/month`],
      ["Historical Temperature", `${num(weather.temperature_for_prediction)} °C`],
      ["Historical Humidity", `${num(weather.humidity_for_prediction)} %`],
    ];

    const why = [
      general
        ? "Historical local planting evidence was the primary ranking signal because no field soil values were supplied."
        : "Random Forest probability was the primary ranking signal.",
      `Selected season: ${pretty(result.location?.season)}`,
      "Open-Meteo supplied the climate information used by the model.",
      topEvidence
        ? `Historical evidence: ${topEvidence.records} record(s).`
        : "No matching historical record was found.",
    ];

    return (
      <div className="mx-auto max-w-7xl space-y-6 p-2 sm:p-4">
        {/* heading */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-main">Recommended Crops</h1>
            <p className="mt-1 text-sm text-text-subtle">
              Real Random Forest output + Open-Meteo + historical agriculture data.
            </p>
          </div>
          <button onClick={reset} className="btn-secondary inline-flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> New analysis
          </button>
        </div>

        {/* main recommendation */}
        {top && (
          <div className="card-agri overflow-hidden p-0">
            <div className="p-6 md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="flex gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-green/10">
                    <Sprout className="h-7 w-7 text-primary-green" />
                  </div>
                  <div>
                    <span className="mb-2 inline-block rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-text-subtle">
                      {general ? "GENERAL RECOMMENDATION" : "MODEL RECOMMENDATION"}
                    </span>
                    <h2 className="text-3xl font-bold text-text-main">{pretty(top.crop)}</h2>
                    <p className="mt-1 text-sm text-text-subtle">
                      {general
                        ? "Historical local planting evidence is the main ranking signal."
                        : "Random Forest probability is the main ranking signal."}
                    </p>
                  </div>
                </div>

                <div className="min-w-52.5 rounded-2xl bg-primary-green/10 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-subtle">MODEL PROBABILITY</p>
                  <p className="mt-1 text-3xl font-bold text-primary-green">{percent(top.model_probability)}</p>
                  <p className="mt-1 text-xs text-text-subtle">Not a chance of success or yield.</p>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card
                  title="Historical Records"
                  value={recordCount}
                  sub={topEvidence?.first_year ? `${topEvidence.first_year}–${topEvidence.last_year}` : "No matching record range"}
                />
                <Card
                  title="Average Yield"
                  value={topEvidence ? num(topEvidence.average_yield) : "—"}
                  sub="Production / Area units"
                />
                <Card
                  title="Recent Yield"
                  value={topEvidence ? num(topEvidence.recent_yield) : "—"}
                  sub="Most recent matching record"
                />
              </div>

              <div className="mt-6 space-y-4">
                <Bar
                  label="Random Forest class probability"
                  value={Number(top.model_probability || 0) * 100}
                  right={percent(top.model_probability)}
                />
                <Bar
                  label="Relative historical record count"
                  value={(recordCount / maxRecords) * 100}
                  right={`${recordCount} record(s)`}
                />
              </div>
            </div>

            <div className="grid border-t border-border-light md:grid-cols-3">
              {(result.recommendations || []).slice(0, 3).map((item) => (
                <div key={item.crop} className="border-b border-border-light p-5 md:border-b-0 md:border-r last:md:border-r-0">
                  <div className="flex justify-between gap-3">
                    <span className="text-sm font-semibold text-text-main">#{item.rank} {pretty(item.crop)}</span>
                    <b className="text-sm text-primary-green">{percent(item.model_probability)}</b>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary-green/15">
                    <div className="h-full rounded-full bg-primary-green" style={{ width: percent(item.model_probability) }} />
                  </div>
                  <p className="mt-3 text-xs text-text-subtle">
                    Historical records: {item.historical_evidence?.records ?? item.historical_records ?? 0}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        
        {/* climate + model inputs */}
        <div
          className={`grid grid-cols-1 gap-6 ${
            general ? "lg:grid-cols-1" : "lg:grid-cols-3"
          }`}
        >
          {/* Location and climate — shown in both modes */}
          <div
            className={`card-agri ${
              general ? "" : "lg:col-span-2"
            }`}
          >
            <div className="mb-5 flex gap-3">
              <MapPin className="mt-1 h-5 w-5 text-primary-green" />
              <div>
                <h3 className="font-bold text-text-main">
                  Location & Climate Used
                </h3>
                <p className="text-sm text-text-subtle">
                  Weather and climate values retrieved for the selected location.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {climateCards.map(([title, value]) => (
                <Card key={title} title={title} value={value} />
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-surface-muted p-4 text-sm text-text-subtle">
              <b className="text-text-main">Weather location</b>
              <p className="mt-1">
                {weather.resolved_location || "Selected district"}
              </p>
              <p className="mt-1 text-xs">
                Coordinates: {num(weather.latitude, 5)},{" "}
                {num(weather.longitude, 5)}
              </p>
              <p className="mt-2 text-xs">
                {weather.rainfall_definition || weather.rainfall_source}
              </p>
            </div>
          </div>

          {/* Model Inputs — shown ONLY when farmer supplied soil values */}
          {!general && (
            <div className="card-agri">
              <div className="mb-5 flex gap-3">
                <Leaf className="mt-1 h-5 w-5 text-primary-green" />
                <div>
                  <h3 className="font-bold text-text-main">
                    Model Inputs
                  </h3>
                  <p className="text-sm text-text-subtle">
                    Soil values supplied by the farmer and climate values
                    used by the model.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(result.model_inputs || {}).map(
                  ([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between rounded-xl bg-surface-muted px-3 py-3"
                    >
                      <span className="text-sm text-text-subtle">
                        {key}
                      </span>
                      <b>{num(value, key === "ph" ? 2 : 3)}</b>
                    </div>
                  )
                )}
              </div>

              <div className="mt-4 rounded-xl border border-primary-green/30 bg-primary-green/10 p-3 text-xs text-text-subtle">
                <b className="text-text-main">Soil source:</b>{" "}
                {result.soil?.source}
              </div>
            </div>
          )}

          {/* Honest explanation for no-soil mode */}
          {general && (
            <div className="rounded-2xl border border-primary-green/30 bg-primary-green/10 p-5 text-sm text-text-subtle">
              <div className="flex gap-3">
                <Info className="h-5 w-5 shrink-0 text-primary-green" />
                <div>
                  <h3 className="font-bold text-text-main">
                    General Recommendation
                  </h3>
                  <p className="mt-2">
                    No farm-specific soil values were provided. Crop
                    recommendations are based primarily on historical
                    agricultural evidence for the selected location and
                    season, supported by weather and climate information.
                  </p>
                  <p className="mt-2">
                    Internal fallback values used by the model are not
                    displayed as farmer-provided soil measurements.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* graph */}
        <HistoricalChart data={history} crop={top?.crop} />

        {/* historical evidence */}
        <div className="card-agri">
          <div className="mb-5 flex gap-3">
            <Database className="mt-1 h-5 w-5 text-primary-green" />
            <div>
              <h3 className="font-bold text-text-main">Historical Evidence</h3>
              <p className="text-sm text-text-subtle">Actual records used as supporting evidence.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {(result.historical_most_planted_crops || []).map((item) => (
              <Card
                key={item.crop}
                title={pretty(item.crop)}
                value={`${item.records} record${item.records === 1 ? "" : "s"}`}
                sub={`Total area: ${num(item.total_area, 1)}`}
              />
            ))}

            {!result.historical_most_planted_crops?.length && (
              <div className="rounded-xl bg-surface-muted p-4 text-sm text-text-subtle sm:col-span-2 lg:col-span-5">
                No historical planting records matched this location.
              </div>
            )}
          </div>
        </div>

        {/* why */}
        <div className="card-agri">
          <h3 className="font-bold text-text-main">Why was this crop recommended?</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {why.map((text) => (
              <div key={text} className="flex gap-3 rounded-xl bg-surface-muted p-4 text-sm">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-primary-green" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="card-agri bg-amber-50">
            <h3 className="font-bold text-amber-900">Data quality warnings</h3>
            <div className="mt-2 space-y-1 text-sm text-amber-900">
              {warnings.map((text) => <p key={text}>• {text}</p>)}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border-light bg-white p-5 text-xs leading-6 text-text-subtle shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-semibold text-text-main">
            <Info className="h-4 w-4" /> Important model limitations
          </div>
          <ul className="space-y-1">
            {(result.limitations || []).map((text) => <li key={text}>• {text}</li>)}
          </ul>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // INPUT PAGE
  // ===========================================================================
  const currentDistricts = districts[state] || [];
  const currentSeasons = seasons[`${state}|||${district}`] || [];

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-2 sm:p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-main">Crop Recommendation</h1>
          <p className="mt-1 text-sm text-text-subtle">Find crops suitable for your soil, climate and farming conditions.</p>
        </div>

        <Link
          href="/dashboard/crop-advisory/history"
          className="inline-flex items-center gap-2 px-4 py-2 border border-primary-green text-primary-green hover:bg-primary-green hover:text-white transition-all rounded-lg text-sm font-semibold shadow-sm shrink-0 w-fit"
        >
          <History className="w-4 h-4" />
          View Recommendation History
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl border border-accent-cherry/30 bg-accent-cherry/10 p-4 text-sm text-accent-cherry">
          {error}
        </div>
      )}

      <div className="card-agri p-5 md:p-7">
        <div className="flex flex-wrap gap-2">
          <Step number="1" text="Location" active={step === 1} />
          <Step number="2" text="Soil" active={step === 2} />
          <Step number="3" text="Climate" active={step === 3} />
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary-green/15">
          <div className="h-full rounded-full bg-primary-green" style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        {step === 1 && (
          <div className="mt-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text-main">Tell us your location</h2>
              <p className="mt-1 text-sm text-text-subtle">State, district and season are required.</p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <label className="text-sm font-semibold">State
                <select value={state} onChange={(e) => selectState(e.target.value)} className="input-agri mt-2">
                  {states.map((x) => <option key={x} value={x}>{pretty(x)}</option>)}
                </select>
              </label>

              <label className="text-sm font-semibold">District
                <select value={district} onChange={(e) => selectDistrict(e.target.value)} className="input-agri mt-2">
                  {currentDistricts.map((x) => <option key={x} value={x}>{pretty(x)}</option>)}
                </select>
              </label>

              <label className="text-sm font-semibold">Growing season
                <select value={season} onChange={(e) => setSeason(e.target.value)} className="input-agri mt-2">
                  {currentSeasons.map((x) => <option key={x} value={x}>{pretty(x)}</option>)}
                </select>
              </label>
            </div>

            <div className="flex gap-3 rounded-2xl bg-primary-green/10 p-4 text-sm text-text-subtle">
              <MapPin className="h-5 w-5 shrink-0 text-primary-green" />
              <span>The selected district is automatically used for Open-Meteo weather and climate retrieval.</span>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setStep(2)} className="btn-primary inline-flex items-center gap-2">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text-main">Soil information</h2>
              <p className="mt-1 text-sm text-text-subtle">Use Soil Health Card values when available.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <button
                onClick={() => setSoilMode("manual")}
                className={`rounded-2xl border p-5 text-left ${soilMode === "manual" ? "border-primary-green bg-primary-green/10" : "border-border-light bg-white"}`}
              >
                <Leaf className="h-5 w-5 text-primary-green" />
                <p className="mt-3 font-bold">I have Soil Health Card values</p>
                <p className="mt-1 text-sm text-text-subtle">Enter N, P, K and pH.</p>
              </button>

              <button
                onClick={() => setSoilMode("none")}
                className={`rounded-2xl border p-5 text-left ${soilMode === "none" ? "border-primary-green bg-primary-green/10" : "border-border-light bg-white"}`}
              >
                <Database className="h-5 w-5 text-primary-green" />
                <p className="mt-3 font-bold">I do not have soil values</p>
                <p className="mt-1 text-sm text-text-subtle">Use the general historical/location-based path.</p>
              </button>
            </div>

            {soilMode === "manual" && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {[["N", "Nitrogen (N)", "kg/ha"], ["P", "Phosphorus (P)", "kg/ha"], ["K", "Potassium (K)", "kg/ha"], ["ph", "Soil pH", "0–14"]].map(([key, label, unit]) => (
                  <label key={key} className="text-sm font-semibold">
                    {label}
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        max={key === "ph" ? "14" : undefined}
                        step={key === "ph" ? "0.1" : "1"}
                        value={soil[key]}
                        onChange={(e) => changeSoil(key, e.target.value)}
                        className="input-agri"
                      />
                      <span className="text-xs text-text-subtle">{unit}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {soilMode === "none" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                No fake soil values will be shown. The backend will mark this as a general recommendation.
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="btn-secondary inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button onClick={() => setStep(3)} className="btn-primary inline-flex items-center gap-2">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-text-main">Climate & automatic weather</h2>
              <p className="mt-1 text-sm text-text-subtle">You do not enter rainfall manually.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card title="Location" value={`${pretty(district)}, ${pretty(state)}`} />
              <Card title="Season" value={pretty(season)} />
              <Card title="Rainfall input" value="Automatic" sub="Historical Open-Meteo climate proxy" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-surface-muted p-4"><CloudSun className="h-5 w-5 text-primary-green" /><p className="mt-3 font-semibold">Current weather</p><p className="mt-1 text-sm text-text-subtle">Temperature, humidity and recent rain are fetched automatically.</p></div>
              <div className="rounded-2xl bg-surface-muted p-4"><Droplets className="h-5 w-5 text-primary-green" /><p className="mt-3 font-semibold">Historical rainfall</p><p className="mt-1 text-sm text-text-subtle">The model uses historical climate, not one rain event.</p></div>
              <div className="rounded-2xl bg-surface-muted p-4"><Thermometer className="h-5 w-5 text-primary-green" /><p className="mt-3 font-semibold">Temperature & humidity</p><p className="mt-1 text-sm text-text-subtle">Historical climate values are sent to the model.</p></div>
            </div>

            <div className="rounded-2xl border border-primary-green/30 bg-primary-green/10 p-4 text-sm text-text-subtle">
              <div className="flex gap-3">
                <Info className="h-5 w-5 shrink-0 text-primary-green" />
                <div><p className="font-semibold text-text-main">Ready to calculate</p><p className="mt-1">This calls the real Python model, Open-Meteo and historical agricultural data.</p></div>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="btn-secondary inline-flex items-center gap-2"><ArrowLeft className="h-4 w-4" /> Back</button>
              <button onClick={getRecommendation} disabled={running} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
                {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sprout className="h-4 w-4" />}
                {running ? "Calculating…" : "Get Recommendation"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
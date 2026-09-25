"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sprout, ScanSearch, TrendingUp, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("Good Day");

  useEffect(() => {


    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting("Good Morning");
    } else if (hour >= 12 && hour < 17) {
      setGreeting("Good Afternoon");
    } else {
      setGreeting("Good Evening");
    }


    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed session");
        const data = await res.json();
        setFarmer(data.user || data);
      })
      .catch((err) => {
        console.error("Session fetch error:", err);
        setFarmer(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-text-subtle text-sm animate-pulse">
        Loading agricultural advisory overview...
      </div>
    );
  }

  // Fallback default values for screenshot visual parity
  const stateName = farmer?.state || "Maharashtra";
  const districtName = farmer?.district || "Pune";
  const farmSize = farmer?.farmSize || "3.5 acres";
  const farmerName = farmer?.name || "Farmer";

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">

      {/* Greeting Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-main flex items-center gap-2">
          {greeting}, {farmerName} 
        </h1>
        <p className="text-sm text-text-subtle mt-1">
          Here's your agricultural advisory overview.
        </p>
      </div>

      {/* FARM PROFILE GREEN BANNER */}
      <div className="bg-[#0b5c2c] text-white rounded-2xl p-6 shadow-md">
        <span className="text-[10px] tracking-widest font-bold uppercase opacity-80 block mb-4">
          FARM PROFILE
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-xs opacity-75">State</p>
            <p className="text-xl font-bold mt-0.5">{stateName}</p>
          </div>
          <div>
            <p className="text-xs opacity-75">District</p>
            <p className="text-xl font-bold mt-0.5">{districtName}</p>
          </div>
        </div>
      </div>

      {/* ACTION FEATURE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Crop Recommendation Card */}
        <div className="bg-surface-card border border-border-light rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="w-12 h-12 rounded-full bg-emerald-100/70 flex items-center justify-center mb-4">
              <Sprout className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="font-bold text-lg text-text-main mb-1">Crop Recommendation</h3>
            <p className="text-xs text-text-subtle leading-relaxed mb-6">
              Find the most suitable crops for your farm.
            </p>
          </div>
          <Link
            href="/dashboard/crop-advisory"
            className="w-full py-3 px-4 bg-[#0b5c2c] hover:bg-[#084822] text-white font-medium rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-sm"
          >
            Get Recommendation <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Disease Detection Card */}
        <div className="bg-surface-card border border-border-light rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="w-12 h-12 rounded-full bg-emerald-100/70 flex items-center justify-center mb-4">
              <ScanSearch className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="font-bold text-lg text-text-main mb-1">Disease Detection</h3>
            <p className="text-xs text-text-subtle leading-relaxed mb-6">
              Upload a crop image to identify possible diseases.
            </p>
          </div>
          <Link
            href="/dashboard/disease-detect"
            className="w-full py-3 px-4 bg-[#0b5c2c] hover:bg-[#084822] text-white font-medium rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-sm"
          >
            Detect Disease <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Market Advisory Card */}
        <div className="bg-surface-card border border-border-light rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="w-12 h-12 rounded-full bg-emerald-100/70 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="font-bold text-lg text-text-main mb-1">Market Advisory</h3>
            <p className="text-xs text-text-subtle leading-relaxed mb-6">
              Check historical prices and selling recommendations.
            </p>
          </div>
          <Link
            href="/dashboard/mandi-prices"
            className="w-full py-3 px-4 bg-[#0b5c2c] hover:bg-[#084822] text-white font-medium rounded-xl flex items-center justify-center gap-2 text-sm transition-all shadow-sm"
          >
            View Market Advisory <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* LOWER STATUS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        <div className="bg-surface-card border border-border-light rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] tracking-widest font-bold uppercase text-text-subtle block mb-2">
            RECENT ADVISORY
          </span>
          <p className="text-xs text-text-subtle">No recent advisories generated yet.</p>
        </div>

        <div className="bg-surface-card border border-border-light rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] tracking-widest font-bold uppercase text-text-subtle block mb-2">
            CROP HEALTH
          </span>
          <p className="text-xs text-text-subtle">Upload photos to track crop health status.</p>
        </div>

        <div className="bg-surface-card border border-border-light rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] tracking-widest font-bold uppercase text-text-subtle block mb-2">
            MARKET ALERT
          </span>
          <p className="text-xs text-text-subtle">Select target crops to view live mandi rate updates.</p>
        </div>
      </div>
    </div>
  );
}
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Edit3, Languages } from "lucide-react";

export default function FarmerDetails() {
  const router = useRouter();
  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch session");
        const data = await res.json();
        setFarmer(data.user || data);
      })
      .catch((err) => {
        console.error("Session fetch error:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-text-subtle animate-pulse">
        Loading farmer profile...
      </div>
    );
  }

  const name = farmer?.name || "Farmer";
  const district = farmer?.district || "Pune";
  const state = farmer?.state || "Maharashtra";
  const preferredLanguage = farmer?.preferredLanguage || "English";

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-main">Profile</h1>
        <p className="text-sm text-text-subtle mt-1">
          Farm details used to personalise their experience.
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-surface-card border border-border-light rounded-2xl p-6 shadow-soft space-y-6">
        {/* Header Avatar & Info */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200">
            <User className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-main">{name}</h2>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-muted p-4 rounded-xl border border-border-light">
            <span className="text-[10px] font-semibold text-text-subtle tracking-wider uppercase">
              State
            </span>
            <p className="text-lg font-bold text-text-main mt-1 truncate">
              {state}
            </p>
          </div>

          <div className="bg-surface-muted p-4 rounded-xl border border-border-light">
            <span className="text-[10px] font-semibold text-text-subtle tracking-wider uppercase">
              District
            </span>
            <p className="text-lg font-bold text-text-main mt-1 truncate">
              {district}
            </p>
          </div>


          <div className="bg-surface-muted p-4 rounded-xl border border-border-light">
            <span className="text-[10px] font-semibold text-text-subtle tracking-wider uppercase">
              Preferred Language
            </span>
            <p className="text-lg font-bold text-text-main mt-1 truncate">
              {preferredLanguage}
            </p>
          </div>
        </div>

        
        

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button className="flex items-center justify-center gap-2 py-3 px-4 bg-primary-green hover:bg-emerald-800 text-white text-sm font-semibold rounded-xl transition-all shadow-sm">
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </button>


          <button className="flex items-center justify-center gap-2 py-3 px-4 bg-surface-muted hover:bg-emerald-50 text-text-main border border-border-light text-sm font-semibold rounded-xl transition-all"
          onClick={() => router.push("/dashboard/settings")}
          >
            <Languages className="w-4 h-4 text-emerald-700" />
            Change Language
          </button>
        </div>
      </div>
    </div>
  );
}
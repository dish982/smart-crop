"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sprout, ArrowRight, ScanSearch, TrendingUp, ShieldCheck, CheckCircle2, Sparkles, Mic } from "lucide-react";
import PWAInstallPrompt from "../components/common/PWAInstallPrompt";

export default function Home() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth status
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => {
        if (res.ok) setIsLoggedIn(true);
        else setIsLoggedIn(false);
      })
      .catch(() => setIsLoggedIn(false))
      .finally(() => setLoading(false));
  }, []);

  const handleGetStarted = () => {
    if (isLoggedIn) {
      router.push("/dashboard");
    } else {
      router.push("/signup");
    }
  };

  const features = [
    {
      icon: Sprout,
      title: "Smart Crop Advisory",
      description: "Get precise crop recommendations based on soil health and climate.",
      tag: "Data Driven"
    },
    {
      icon: ScanSearch,
      title: "AI Disease Detection",
      description: "Upload leaf photos to detect infestation early and get treatments.",
      tag: "Instant AI"
    },
    {
      icon: TrendingUp,
      title: "Live Mandi Rates",
      description: "Track real-time market prices across nearby government mandis.",
      tag: "Real-time"
    },
    {
      icon: Mic,
      title: "Multilingual Voice Bot",
      description: "Ask questions and get instant advice in English, Hindi, or Marathi.",
      tag: "Voice AI"
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-text-main flex flex-col justify-between">
      <PWAInstallPrompt />

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#FAF9F5]/80 backdrop-blur-md border-b border-border-light/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-green text-white rounded-xl shadow-sm">
              <Sprout className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-primary-green tracking-tight">
              EcoBloom
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="text-sm font-semibold px-4 py-2 text-primary-green hover:bg-emerald-50 rounded-lg transition-all"
            >
              {isLoggedIn ? "Open Dashboard" : "Log In"}
            </Link>
            {!isLoggedIn && (
              <button
                onClick={() => router.push("/signup")}
                className="text-sm font-semibold px-4 py-2 bg-primary-green text-white rounded-lg hover:opacity-90 transition-all shadow-sm hidden sm:block"
              >
                Register
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-8 md:py-12 w-full">
        <div className="bg-surface-card rounded-3xl border border-border-light overflow-hidden grid grid-cols-1 lg:grid-cols-2 shadow-soft">
          <div className="p-8 md:p-14 flex flex-col justify-center items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-primary-green text-xs font-semibold mb-6 border border-emerald-100">
              <Sparkles className="w-3.5 h-3.5" />
              Designed for Indian Agriculture
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-text-main tracking-tight leading-[1.15] uppercase mb-4">
              SMART CROP <br />
              <span className="text-primary-green">ADVISORY SYSTEM</span>
            </h1>

            <p className="font-bold text-primary-green text-base md:text-lg mb-3">
              Smarter decisions. Healthier crops. Better harvests.
            </p>

            <p className="text-text-subtle text-sm leading-relaxed mb-8 max-w-md">
              Empowering farmers with localized crop recommendations, automated disease detection, and real-time market insights.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
              <button
                onClick={handleGetStarted}
                disabled={loading}
                className="w-full sm:w-auto px-7 py-3.5 bg-primary-green hover:opacity-90 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md text-sm cursor-pointer disabled:opacity-50"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#features"
                className="w-full sm:w-auto px-7 py-3.5 bg-surface-muted border border-border-light text-text-main font-semibold rounded-xl text-center transition-all text-sm hover:border-primary-green"
              >
                Explore Features
              </a>
            </div>

            <div className="mt-8 pt-6 border-t border-border-light/60 w-full flex items-center gap-6 text-xs text-text-subtle">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary-green" />
                <span>Verified Insights</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary-green" />
                <span>Regional Data</span>
              </div>
            </div>
          </div>

          <div className="relative min-h-80 lg:min-h-full bg-surface-muted">
            <img
              src="/farm-image.jpg"
              alt="Farmer standing in green field"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-12 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="bg-surface-card border border-border-light rounded-2xl p-6 shadow-soft">
                <div className="p-3 bg-emerald-50 text-primary-green rounded-xl border border-emerald-100 w-fit mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-text-main mb-2">{f.title}</h3>
                <p className="text-xs text-text-subtle leading-relaxed">{f.description}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
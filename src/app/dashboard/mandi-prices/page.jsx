"use client";

import { useEffect, useState } from "react";
import CropSelectForm from "@/components/mandi/CropSelectForm";

export default function MandiPricesPage() {
  const [farmerName, setFarmerName] = useState("Farmer");

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("no session");
        const data = await res.json();
        setFarmerName((data.user || data)?.name || "Farmer");
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      <div>
        <h1 className="text-3xl font-bold text-text-main">Hello, {farmerName} 👋</h1>
        <p className="text-sm text-text-subtle mt-1">
          Get a personalized crop price advisory based on market trends.
        </p>
      </div>

      <CropSelectForm />
    </div>
  );
}
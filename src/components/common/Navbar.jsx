"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  MessageSquareText, 
  Settings, 
  Sprout, 
  LogOut ,
  UserIcon
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Chatbot", href: "/dashboard/chat", icon: MessageSquareText },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

const MOBILE_NAV_ITEMS = [
  ...NAV_ITEMS,
  { label: "Profile", href: "/dashboard/profile", icon: UserIcon },
];

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const userName = user?.name || "Disha";
  const userSubtext = user?.state || user?.role || "Maharashtra";
  const firstLetter = userName.charAt(0).toUpperCase();

  return (
    <>
      {/* MOBILE HEADER */}
      <header className="md:hidden bg-[#FAF9F5] border-b border-border-light/60 px-5 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100/60 flex items-center justify-center text-[#0b5c2c] border border-emerald-200/50">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-[#0b5c2c] tracking-tight block leading-tight">
              Ecobloom
            </span>
            <span className="text-[10px] text-text-subtle block">
              better crops, better tomorrow
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 transition-colors"
        >
          Logout
        </button>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex md:w-72 bg-[#FAF9F5] border-r border-border-light/60 flex-col justify-between p-7 sticky top-0 h-screen shrink-0">
        <div>
          {/* ECOBLOOM BRAND HEADER WITH SPROUT ICON */}
          <div className="flex items-center gap-3.5 pb-6 border-b border-border-light/60">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100/60 flex items-center justify-center text-[#0b5c2c] border border-emerald-200/50 shrink-0 shadow-sm">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-xl text-[#0b5c2c] tracking-tight leading-tight">
                Ecobloom
              </h2>
              <p className="text-[11px] text-text-subtle font-medium leading-tight mt-0.5">
                better crops, better tomorrow
              </p>
            </div>
          </div>

          {/* NAVIGATION LINKS */}
          <nav className="mt-8 space-y-2.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl font-medium text-base transition-all ${
                    isActive
                      ? "bg-white text-text-main shadow-sm font-semibold border border-border-light/50"
                      : "text-text-main/80 hover:bg-black/5 hover:text-text-main"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-[#0b5c2c]" : "text-text-subtle"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

          {/* USER PROFILE & LOGOUT */}
          <div className="pt-6 border-t border-border-light/60 flex items-center justify-between">
            <Link href="/dashboard/profile" className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity">
              <div className="w-11 h-11 shrink-0 rounded-full bg-[#273229] text-white font-bold flex items-center justify-center border-2 border-emerald-400 text-base shadow-sm">
                {firstLetter}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="font-bold text-base text-text-main leading-tight truncate">
                  {userName}
                </p>
                <p className="text-xs text-text-subtle leading-tight truncate mt-0.5">
                  {userSubtext}
                </p>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2.5 text-text-subtle hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#FAF9F5] border-t border-border-light/60 flex justify-around py-2.5 z-50 shadow-md">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-1 text-xs font-medium transition-colors ${
                isActive ? "text-[#0b5c2c] font-semibold" : "text-text-subtle hover:text-text-main"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-[#0b5c2c]" : "text-text-subtle"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
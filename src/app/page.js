import Image from "next/image";
import PWAInstallPrompt from "../components/common/PWAInstallPrompt";
import Dashboard from "./dashboard/page";

export default function Home() {
  return (
  <>
  <PWAInstallPrompt />
  <Dashboard />
  </>
  );
}

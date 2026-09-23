import Image from "next/image";
import PWAInstallPrompt from "../components/common/PWAInstallPrompt";
import DashboardLayout from "./dashboard/layout";

export default function Home() {
  return (
  <>
  <PWAInstallPrompt />
  <DashboardLayout />
  </>
  );
}

import { redirect } from 'next/navigation';

export default function DashboardRootPage() {
  // Automatically redirect /dashboard to /dashboard/crop-advisory
  redirect('/dashboard/crop-advisory');
}
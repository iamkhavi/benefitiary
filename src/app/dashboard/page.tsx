import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/auth/login');
    return; // This won't execute but helps with type safety
  }

  // Skip onboarding check for now - will be implemented with proper session extension

  // Default dashboard - redirect to seeker for now
  redirect('/dashboard/seeker');
}
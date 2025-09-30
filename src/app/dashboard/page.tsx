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

  if (!session.user.onboardingCompleted) {
    redirect('/onboarding/organization');
    return;
  }

  // Redirect to role-specific dashboard
  const role = session.user.role?.toUpperCase();
  
  switch (role) {
    case 'WRITER':
      redirect('/dashboard/writer');
      break;
    case 'FUNDER':
      redirect('/dashboard/funder');
      break;
    case 'SEEKER':
    default:
      redirect('/dashboard/seeker');
      break;
  }
}
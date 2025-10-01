import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/auth/login');
  }

  // Check if user has completed onboarding
  try {
    const [organization, userWithRole, preferences] = await Promise.all([
      prisma.organization.findFirst({
        where: { userId: session.user.id }
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      }),
      prisma.userPreferences.findFirst({
        where: { userId: session.user.id }
      })
    ]);

    const hasOrganization = !!organization;
    const hasRole = !!(userWithRole?.role && userWithRole.role !== 'SEEKER');
    const hasPreferences = !!preferences;
    
    // If onboarding is not complete, redirect to appropriate step
    if (!hasOrganization) {
      redirect('/onboarding/organization');
    } else if (!hasRole) {
      redirect('/onboarding/role');
    } else if (!hasPreferences) {
      redirect('/onboarding/preferences');
    }
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    // Continue to dashboard if check fails
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={session.user} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
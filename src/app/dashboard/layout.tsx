import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { DashboardShell } from '@/components/layout/dashboard-shell';

// Use global prisma instance to avoid connection issues
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

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

  // Return shared dashboard shell with sidebar and header
  return (
    <DashboardShell user={session.user}>
      {children}
    </DashboardShell>
  );
}
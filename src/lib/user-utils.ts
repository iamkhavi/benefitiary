import { prisma } from '@/lib/prisma';

export async function getUserRole(userId: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    return user?.role || null;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

export async function getUserWithRole(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        onboardingCompleted: true,
        onboardingStep: true
      }
    });
    
    return user;
  } catch (error) {
    console.error('Error fetching user with role:', error);
    return null;
  }
}
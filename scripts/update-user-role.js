const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateUserRole() {
  try {
    // Update the user with email steevekhavi@gmail.com to ADMIN role
    const updatedUser = await prisma.user.update({
      where: {
        email: 'steevekhavi@gmail.com'
      },
      data: {
        role: 'ADMIN'
      }
    });

    console.log('✅ User role updated successfully:', {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role
    });

  } catch (error) {
    if (error.code === 'P2025') {
      console.log('❌ User not found with email: steevekhavi@gmail.com');
      console.log('Available users:');
      
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      });
      
      console.table(users);
    } else {
      console.error('❌ Error updating user role:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

updateUserRole();
import { requireAdmin } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Filter,
  MoreHorizontal,
  Shield,
  Users,
  UserCheck,
  UserX,
  Edit,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { prisma } from '@/lib/prisma';
import { RoleSelector } from '@/components/admin/role-selector';

export default async function AdminUsersPage() {
  try {
    await requireAdmin();
  } catch (error) {
    redirect('/auth/login');
  }

  // Fetch real users from database
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      onboardingCompleted: true,
      onboardingStep: true,
      createdAt: true,
      updatedAt: true,
      image: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Transform data for display
  const transformedUsers = users.map(user => ({
    id: user.id,
    name: user.name || 'Unknown User',
    email: user.email,
    role: user.role || 'SEEKER',
    status: user.onboardingCompleted ? 'active' : 'pending',
    createdAt: user.createdAt.toISOString().split('T')[0],
    lastLogin: user.updatedAt.toISOString().split('T')[0],
    organization: user.onboardingCompleted ? 'Completed Onboarding' : 'Pending Setup',
    applications: 0, // TODO: Count from applications table when implemented
    image: user.image
  }));

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-100 text-red-800';
      case 'FUNDER': return 'bg-purple-100 text-purple-800';
      case 'WRITER': return 'bg-blue-100 text-blue-800';
      case 'SEEKER': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-red-600" />
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          </div>
          <Badge className="bg-red-100 text-red-800">Admin Only</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{transformedUsers.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{transformedUsers.filter(u => u.status === 'active').length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Seekers</p>
                <p className="text-2xl font-bold text-gray-900">{transformedUsers.filter(u => u.role === 'SEEKER').length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Funders</p>
                <p className="text-2xl font-bold text-gray-900">{transformedUsers.filter(u => u.role === 'FUNDER').length}</p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search users..."
              className="pl-10 w-80"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter by Role
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Organization</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Applications</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Last Login</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transformedUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.image || undefined} alt={user.name} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <RoleSelector
                        userId={user.id}
                        currentRole={user.role}
                        userName={user.name}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-gray-900">{user.organization}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-gray-900">{user.applications}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-gray-900">{user.lastLogin}</p>
                    </td>
                    <td className="py-4 px-4">
                      <Badge className={cn(
                        "text-xs",
                        user.status === 'active' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      )}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
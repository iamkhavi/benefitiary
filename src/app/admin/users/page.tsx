import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
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

export default async function AdminUsersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/auth/login');
  }

  // TODO: Add proper admin role check once auth types are updated

  // Mock data - replace with actual database query
  const users = [
    {
      id: '1',
      name: 'Steve Khavi',
      email: 'steevekhavi@gmail.com',
      role: 'ADMIN',
      status: 'active',
      createdAt: '2024-01-15',
      lastLogin: '2024-12-10',
      organization: 'Benefitiary',
      applications: 0
    },
    {
      id: '2',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'SEEKER',
      status: 'active',
      createdAt: '2024-02-20',
      lastLogin: '2024-12-09',
      organization: 'Health Innovations Inc',
      applications: 5
    },
    {
      id: '3',
      name: 'Jane Smith',
      email: 'jane@writer.com',
      role: 'WRITER',
      status: 'active',
      createdAt: '2024-03-10',
      lastLogin: '2024-12-08',
      organization: 'Grant Writing Services',
      applications: 0
    },
    {
      id: '4',
      name: 'Gates Foundation',
      email: 'contact@gatesfoundation.org',
      role: 'FUNDER',
      status: 'active',
      createdAt: '2024-01-05',
      lastLogin: '2024-12-07',
      organization: 'Bill & Melinda Gates Foundation',
      applications: 0
    }
  ];

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
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
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
                <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.status === 'active').length}</p>
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
                <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'SEEKER').length}</p>
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
                <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'FUNDER').length}</p>
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
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
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
                      <Badge className={cn("text-xs", getRoleBadgeColor(user.role))}>
                        {user.role}
                      </Badge>
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
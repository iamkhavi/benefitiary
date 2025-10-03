import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { PrismaClient } from '@prisma/client';
import { 
  User,
  Bell,
  Shield,
  Palette,
  Building2,
  Trash2,
  MapPin,
  Users,
  Tag
} from 'lucide-react';

const prisma = new PrismaClient();

export default async function SettingsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/auth/login');
  }

  // Fetch user's organization and preferences data
  const [organization, preferences] = await Promise.all([
    prisma.organization.findFirst({
      where: { userId: session.user.id }
    }),
    prisma.userPreferences.findFirst({
      where: { userId: session.user.id }
    })
  ]);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Account Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <CardTitle>Account Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={session.user.image || undefined} alt={session.user.name || 'User'} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {session.user.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button variant="outline" size="sm">Change Photo</Button>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 2MB</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <Input defaultValue={session.user.name || ''} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <Input defaultValue={session.user.email} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <Input defaultValue="Seeker" disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Member Since
                </label>
                <Input defaultValue={new Date().toLocaleDateString()} disabled />
              </div>
            </div>

            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        {/* Business Details */}
        {organization && (
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <CardTitle>Business Details</CardTitle>
              </div>
              <p className="text-sm text-gray-600">Information from your onboarding</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Name
                  </label>
                  <Input defaultValue={organization.name} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry Type
                  </label>
                  <div className="flex items-center space-x-2">
                    <Input defaultValue={organization.orgType} />
                    <Badge variant="outline" className="capitalize">
                      {organization.orgType}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industries
                  </label>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <div className="flex flex-wrap gap-2">
                      {organization.industries.map((industry) => (
                        <Badge key={industry} variant="outline" className="capitalize">
                          {industry.replace('_', ' ').toLowerCase()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <Input defaultValue={organization.country} />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Organization Profile Created:</strong> {new Date(organization.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Last Updated:</strong> {new Date(organization.updatedAt).toLocaleDateString()}
                </p>
              </div>

              <Button>Update Business Details</Button>
            </CardContent>
          </Card>
        )}

        {/* Grant Preferences */}
        {preferences && (
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Tag className="h-5 w-5" />
                <CardTitle>Grant Preferences</CardTitle>
              </div>
              <p className="text-sm text-gray-600">Categories you're interested in from onboarding</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Selected Categories
                </label>
                <div className="flex flex-wrap gap-2">
                  {preferences.categories.map((category, index) => (
                    <Badge key={index} className="bg-primary/10 text-primary border-primary/20">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Preferences Set:</strong> {new Date(preferences.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Last Updated:</strong> {new Date(preferences.updatedAt).toLocaleDateString()}
                </p>
              </div>

              <Button>Update Preferences</Button>
            </CardContent>
          </Card>
        )}

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              { title: "Grant Matches", description: "Get notified when new grants match your profile", enabled: true },
              { title: "Application Updates", description: "Updates on your grant applications", enabled: true },
              { title: "Deadline Reminders", description: "Reminders for upcoming deadlines", enabled: true },
              { title: "Weekly Summary", description: "Weekly email with your activity summary", enabled: false },
              { title: "Marketing Emails", description: "Product updates and tips", enabled: false }
            ].map((notification, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-sm text-gray-600">{notification.description}</p>
                </div>
                <Switch defaultChecked={notification.enabled} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Privacy & Security</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-gray-600">Add an extra layer of security</p>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Change Password</p>
                <p className="text-sm text-gray-600">Update your account password</p>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Data Export</p>
                <p className="text-sm text-gray-600">Download your account data</p>
              </div>
              <Button variant="outline" size="sm">Export</Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Palette className="h-5 w-5" />
              <CardTitle>App Preferences</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select className="w-full p-2 border border-gray-300 rounded-md">
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select className="w-full p-2 border border-gray-300 rounded-md">
                <option>UTC-5 (Eastern Time)</option>
                <option>UTC-8 (Pacific Time)</option>
                <option>UTC+0 (GMT)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-gray-600">Switch to dark theme</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
              <div>
                <p className="font-medium text-red-600">Delete Account</p>
                <p className="text-sm text-gray-600">Permanently delete your account and all data</p>
              </div>
              <Button variant="destructive" size="sm">Delete</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  User,
  Bell,
  Shield,
  Palette,
  Building2,
  Trash2,
  Tag,
  Loader2,
  Save
} from 'lucide-react';
import { COUNTRIES } from '@/lib/utils/email-utils';

interface Organization {
  id: string;
  name: string;
  website?: string;
  orgType: string;
  orgSize: string;
  industries: string[];
  country: string;
  grantSizeRange?: string;
  fundingNeeds?: string[];
  createdAt: string;
  updatedAt: string;
}

interface UserPreferences {
  id: string;
  categories: string[];
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedOrg, setEditedOrg] = useState<Partial<Organization>>({});

  useEffect(() => {
    if (isPending) return;
    
    if (!session?.user) {
      router.push('/auth/login');
      return;
    }

    fetchUserData();
  }, [session, isPending, router]);

  // Update editedOrg when organization data is loaded
  useEffect(() => {
    if (organization) {
      setEditedOrg(organization);
    }
  }, [organization]);

  const fetchUserData = async () => {
    try {
      const [orgResponse, prefResponse] = await Promise.all([
        fetch('/api/user/business'),
        fetch('/api/onboarding/preferences')
      ]);

      if (orgResponse.ok) {
        const orgData = await orgResponse.json();
        setOrganization(orgData.organization);
        setEditedOrg(orgData.organization);
      }

      if (prefResponse.ok) {
        const prefData = await prefResponse.json();
        setPreferences(prefData.preferences);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBusinessDetails = async () => {
    if (!editedOrg) return;

    setSaving(true);
    try {
      const response = await fetch('/api/user/business', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedOrg),
      });

      if (response.ok) {
        const data = await response.json();
        setOrganization(data.organization);
        setEditedOrg(data.organization);
        alert('Business details updated successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to update: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error updating business details:', error);
      alert('An error occurred while updating business details');
    } finally {
      setSaving(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

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
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5" />
                  <CardTitle>Business Details</CardTitle>
                </div>
                <Badge variant="outline">Editable</Badge>
              </div>
              <p className="text-sm text-gray-600">Update your organization information</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Name *
                  </label>
                  <Input 
                    value={editedOrg.name || ''} 
                    onChange={(e) => setEditedOrg({...editedOrg, name: e.target.value})}
                    placeholder="Enter organization name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website (Optional)
                  </label>
                  <Input 
                    value={editedOrg.website || ''} 
                    onChange={(e) => setEditedOrg({...editedOrg, website: e.target.value})}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Type
                  </label>
                  <Select 
                    value={editedOrg.orgType || ''} 
                    onValueChange={(value) => setEditedOrg({...editedOrg, orgType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={organization?.orgType || "Select organization type"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUSINESS">Business</SelectItem>
                      <SelectItem value="NONPROFIT">Nonprofit / NGO</SelectItem>
                      <SelectItem value="GOVERNMENT">Government</SelectItem>
                      <SelectItem value="SOCIAL_ENTERPRISE">Social Enterprise</SelectItem>
                      <SelectItem value="RESEARCH_ACADEMIC">Research / Academic</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Size
                  </label>
                  <Select 
                    value={editedOrg.orgSize || ''} 
                    onValueChange={(value) => setEditedOrg({...editedOrg, orgSize: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={organization?.orgSize || "Select organization size"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOLO_1">Solo (1 person)</SelectItem>
                      <SelectItem value="MICRO_2_10">Micro (2-10 people)</SelectItem>
                      <SelectItem value="SMALL_11_50">Small (11-50 people)</SelectItem>
                      <SelectItem value="MEDIUM_51_250">Medium (51-250 people)</SelectItem>
                      <SelectItem value="LARGE_250_PLUS">Large (250+ people)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <Select 
                    value={editedOrg.country || ''} 
                    onValueChange={(value) => setEditedOrg({...editedOrg, country: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={organization?.country || "Select country"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industries
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-md bg-gray-50">
                    {organization.industries.map((industry) => (
                      <Badge key={industry} variant="outline" className="capitalize">
                        {industry.replace('_', ' ').toLowerCase()}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Industries are set during onboarding and cannot be changed here
                  </p>
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

              <div className="flex items-center space-x-3">
                <Button 
                  onClick={handleSaveBusinessDetails}
                  disabled={saving || !editedOrg.name}
                  className="flex items-center space-x-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setEditedOrg(organization)}
                  disabled={saving}
                >
                  Reset
                </Button>
              </div>
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
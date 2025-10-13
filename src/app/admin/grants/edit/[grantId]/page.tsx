'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft,
  Save,
  Loader2
} from 'lucide-react';
import Link from 'next/link';

export default function EditGrantPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const params = useParams();
  const grantId = params.grantId as string;
  
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [grant, setGrant] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    funderName: '',
    category: '',
    fundingAmountMin: '',
    fundingAmountMax: '',
    deadline: '',
    eligibilityCriteria: '',
    applicationUrl: '',
    contactEmail: '',
    locationEligibility: '',
    requiredDocuments: ''
  });

  useEffect(() => {
    async function checkAccessAndLoadGrant() {
      if (isPending) return;
      
      if (!session?.user) {
        router.push('/auth/login');
        return;
      }

      try {
        // Check user role
        const roleResponse = await fetch(`/api/user/role?userId=${session.user.id}`);
        if (!roleResponse.ok) {
          router.push('/');
          return;
        }

        const roleData = await roleResponse.json();
        setUserRole(roleData.role);

        if (roleData.role !== 'ADMIN') {
          router.push('/');
          return;
        }

        // Load grant data
        const grantResponse = await fetch(`/api/admin/grants/${grantId}`);
        if (!grantResponse.ok) {
          throw new Error('Grant not found');
        }

        const grantData = await grantResponse.json();
        const grantInfo = grantData.grant;
        
        setGrant(grantInfo);
        
        // Populate form with existing data
        setFormData({
          title: grantInfo.title || '',
          description: grantInfo.description || '',
          funderName: grantInfo.funder?.name || '',
          category: grantInfo.category || '',
          fundingAmountMin: grantInfo.fundingAmountMin?.toString() || '',
          fundingAmountMax: grantInfo.fundingAmountMax?.toString() || '',
          deadline: grantInfo.deadline ? new Date(grantInfo.deadline).toISOString().split('T')[0] : '',
          eligibilityCriteria: grantInfo.eligibilityCriteria || '',
          applicationUrl: grantInfo.applicationUrl || '',
          contactEmail: grantInfo.contactEmail || '',
          locationEligibility: Array.isArray(grantInfo.locationEligibility) ? grantInfo.locationEligibility.join(', ') : '',
          requiredDocuments: Array.isArray(grantInfo.requiredDocuments) ? grantInfo.requiredDocuments.join(', ') : ''
        });

      } catch (error) {
        console.error('Error loading grant:', error);
        alert('Failed to load grant data');
        router.push('/admin/grants');
      } finally {
        setLoading(false);
      }
    }

    checkAccessAndLoadGrant();
  }, [session, isPending, router, grantId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      console.log('💾 Updating grant...', formData);
      
      const response = await fetch(`/api/admin/grants/${grantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          funderName: formData.funderName,
          category: formData.category,
          fundingAmountMin: formData.fundingAmountMin ? parseInt(formData.fundingAmountMin) : null,
          fundingAmountMax: formData.fundingAmountMax ? parseInt(formData.fundingAmountMax) : null,
          deadline: formData.deadline || null,
          eligibilityCriteria: formData.eligibilityCriteria,
          applicationUrl: formData.applicationUrl,
          contactEmail: formData.contactEmail,
          locationEligibility: formData.locationEligibility.split(',').map(s => s.trim()).filter(s => s),
          requiredDocuments: formData.requiredDocuments.split(',').map(s => s.trim()).filter(s => s)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update grant');
      }

      const result = await response.json();
      console.log('✅ Grant updated successfully:', result);
      
      // Redirect back to grants management
      router.push('/admin/grants');
      
    } catch (error) {
      console.error('❌ Failed to update grant:', error);
      alert(`Failed to update grant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (userRole !== 'ADMIN') {
    return null; // Will redirect in useEffect
  }

  if (!grant) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Grant Not Found</h1>
          <Link href="/admin/grants">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Grants
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/grants">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Grants
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Grant</h1>
            <p className="text-gray-600">Update grant information</p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Grant Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Grant Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter grant title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="funderName">Funder Name *</Label>
                <Input
                  id="funderName"
                  value={formData.funderName}
                  onChange={(e) => handleInputChange('funderName', e.target.value)}
                  placeholder="Enter funder name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMMUNITY_DEVELOPMENT">Community Development</SelectItem>
                    <SelectItem value="EDUCATION">Education</SelectItem>
                    <SelectItem value="HEALTH">Health</SelectItem>
                    <SelectItem value="ENVIRONMENT">Environment</SelectItem>
                    <SelectItem value="ARTS_CULTURE">Arts & Culture</SelectItem>
                    <SelectItem value="RESEARCH">Research</SelectItem>
                    <SelectItem value="TECHNOLOGY">Technology</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Application Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => handleInputChange('deadline', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fundingAmountMin">Minimum Funding Amount</Label>
                <Input
                  id="fundingAmountMin"
                  type="number"
                  value={formData.fundingAmountMin}
                  onChange={(e) => handleInputChange('fundingAmountMin', e.target.value)}
                  placeholder="e.g., 10000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fundingAmountMax">Maximum Funding Amount</Label>
                <Input
                  id="fundingAmountMax"
                  type="number"
                  value={formData.fundingAmountMax}
                  onChange={(e) => handleInputChange('fundingAmountMax', e.target.value)}
                  placeholder="e.g., 50000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="applicationUrl">Application URL</Label>
                <Input
                  id="applicationUrl"
                  type="url"
                  value={formData.applicationUrl}
                  onChange={(e) => handleInputChange('applicationUrl', e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  placeholder="contact@funder.org"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter grant description"
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eligibilityCriteria">Eligibility Criteria</Label>
              <Textarea
                id="eligibilityCriteria"
                value={formData.eligibilityCriteria}
                onChange={(e) => handleInputChange('eligibilityCriteria', e.target.value)}
                placeholder="Enter eligibility criteria"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationEligibility">Location Eligibility</Label>
              <Input
                id="locationEligibility"
                value={formData.locationEligibility}
                onChange={(e) => handleInputChange('locationEligibility', e.target.value)}
                placeholder="e.g., United States, California, Global (comma-separated)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requiredDocuments">Required Documents</Label>
              <Input
                id="requiredDocuments"
                value={formData.requiredDocuments}
                onChange={(e) => handleInputChange('requiredDocuments', e.target.value)}
                placeholder="e.g., Proposal, Budget, Letters of Support (comma-separated)"
              />
            </div>

            <div className="flex items-center justify-end space-x-4 pt-6">
              <Link href="/admin/grants">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Grant
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
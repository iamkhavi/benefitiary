'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus,
  Sparkles,
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AddGrantPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    funder: '',
    category: '',
    fundingAmountMin: '',
    fundingAmountMax: '',
    deadline: '',
    eligibilityCriteria: '',
    applicationUrl: '',
    contactEmail: '',
    locationEligibility: '',
    requiredDocuments: '',
    applicationMethod: 'Online Portal'
  });

  // AI extraction state
  const [aiText, setAiText] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAIExtraction = async () => {
    if (!aiText.trim()) return;
    
    setAiProcessing(true);
    try {
      // Simulate AI processing - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock extracted data - replace with actual AI extraction
      const mockExtracted = {
        title: 'Health Innovation Challenge 2025',
        description: 'Supporting breakthrough innovations in healthcare technology for underserved communities.',
        funder: 'Global Health Foundation',
        category: 'HEALTHCARE_PUBLIC_HEALTH',
        fundingAmountMin: '50000',
        fundingAmountMax: '250000',
        deadline: '2025-03-15',
        eligibilityCriteria: 'Must be a registered nonprofit or social enterprise with 3+ years experience in healthcare innovation.',
        applicationUrl: 'https://example.com/apply',
        contactEmail: 'grants@globalhealthfoundation.org',
        locationEligibility: 'Global',
        requiredDocuments: 'Project proposal, Budget, Team qualifications, Impact metrics',
        applicationMethod: 'Online Portal'
      };
      
      setExtractedData(mockExtracted);
      setFormData(mockExtracted);
      
    } catch (error) {
      console.error('AI extraction failed:', error);
    } finally {
      setAiProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Simulate API call - replace with actual grant creation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Grant data to save:', formData);
      
      // Redirect back to grants management
      router.push('/admin/grants');
      
    } catch (error) {
      console.error('Failed to save grant:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
          <div className="flex items-center space-x-2">
            <Plus className="h-6 w-6 text-red-600" />
            <h1 className="text-2xl font-bold text-gray-900">Add New Grant</h1>
          </div>
          <Badge className="bg-red-100 text-red-800">Admin Only</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grant Entry Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="ai">AI Extraction</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="space-y-6 mt-6">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <AlertCircle className="h-4 w-4" />
                <span>Fill out the form manually with grant information</span>
              </div>
              
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
                    <Label htmlFor="funder">Funder *</Label>
                    <Input
                      id="funder"
                      value={formData.funder}
                      onChange={(e) => handleInputChange('funder', e.target.value)}
                      placeholder="Enter funder name"
                      required
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HEALTHCARE_PUBLIC_HEALTH">Healthcare & Public Health</SelectItem>
                        <SelectItem value="EDUCATION_TRAINING">Education & Training</SelectItem>
                        <SelectItem value="AGRICULTURE_FOOD_SECURITY">Agriculture & Food Security</SelectItem>
                        <SelectItem value="CLIMATE_ENVIRONMENT">Climate & Environment</SelectItem>
                        <SelectItem value="TECHNOLOGY_INNOVATION">Technology & Innovation</SelectItem>
                        <SelectItem value="WOMEN_YOUTH_EMPOWERMENT">Women & Youth Empowerment</SelectItem>
                        <SelectItem value="ARTS_CULTURE">Arts & Culture</SelectItem>
                        <SelectItem value="COMMUNITY_DEVELOPMENT">Community Development</SelectItem>
                        <SelectItem value="HUMAN_RIGHTS_GOVERNANCE">Human Rights & Governance</SelectItem>
                        <SelectItem value="SME_BUSINESS_GROWTH">SME & Business Growth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fundingAmountMin">Min Funding Amount</Label>
                    <Input
                      id="fundingAmountMin"
                      type="number"
                      value={formData.fundingAmountMin}
                      onChange={(e) => handleInputChange('fundingAmountMin', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fundingAmountMax">Max Funding Amount</Label>
                    <Input
                      id="fundingAmountMax"
                      type="number"
                      value={formData.fundingAmountMax}
                      onChange={(e) => handleInputChange('fundingAmountMax', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Grant
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="ai" className="space-y-6 mt-6">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Sparkles className="h-4 w-4" />
                <span>Paste grant information and let AI extract the details</span>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aiText">Grant Information</Label>
                  <Textarea
                    id="aiText"
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    placeholder="Paste the complete grant information from the funder's website here. Include title, description, eligibility, deadline, funding amount, application process, etc."
                    rows={10}
                    className="min-h-[200px]"
                  />
                </div>
                
                <Button 
                  onClick={handleAIExtraction} 
                  disabled={!aiText.trim() || aiProcessing}
                  className="w-full"
                >
                  {aiProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extracting Information...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Extract Grant Information with AI
                    </>
                  )}
                </Button>
                
                {extractedData && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Information Extracted Successfully!</span>
                    </div>
                    <p className="text-sm text-green-700 mb-4">
                      Review the extracted information and save the grant.
                    </p>
                    
                    <div className="flex justify-end space-x-4">
                      <Button type="button" variant="outline" onClick={() => setExtractedData(null)}>
                        Re-extract
                      </Button>
                      <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Grant
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
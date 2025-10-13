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
  Loader2,
  ExternalLink
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'text' | 'pdf'>('text');
  const [showAdditionalInput, setShowAdditionalInput] = useState(false);
  const [additionalContent, setAdditionalContent] = useState('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setUploadMethod('pdf');
    } else if (file) {
      alert('Please select a PDF file');
      e.target.value = '';
    }
  };

  const handleProcessAdditionalContent = async () => {
    if (!additionalContent.trim()) {
      alert('Please paste the additional content first');
      return;
    }

    setAiProcessing(true);
    try {
      console.log('🤖 Processing additional content...');
      
      // Combine original content with additional content
      const combinedContent = `${uploadMethod === 'text' ? aiText : 'PDF content'}\n\n=== ADDITIONAL CONTENT FROM EXTERNAL SOURCES ===\n\n${additionalContent}`;
      
      const response = await fetch('/api/admin/grants/ai-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ grantText: combinedContent }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process additional content');
      }

      console.log('✅ Additional content processed successfully');

      // Update form data with enhanced information
      const mappedData = {
        title: data.extractedData.title || formData.title,
        description: data.extractedData.description || formData.description,
        funder: data.extractedData.funderName || formData.funder,
        category: data.extractedData.category || formData.category,
        fundingAmountMin: data.extractedData.fundingAmountMin?.toString() || formData.fundingAmountMin,
        fundingAmountMax: data.extractedData.fundingAmountMax?.toString() || formData.fundingAmountMax,
        deadline: data.extractedData.deadline ? data.extractedData.deadline.split('T')[0] : formData.deadline,
        eligibilityCriteria: data.extractedData.eligibilityCriteria || formData.eligibilityCriteria,
        applicationUrl: data.extractedData.applicationUrl || formData.applicationUrl,
        contactEmail: data.extractedData.contactEmail || formData.contactEmail,
        locationEligibility: Array.isArray(data.extractedData.locationEligibility) 
          ? data.extractedData.locationEligibility.join(', ') 
          : data.extractedData.locationEligibility || formData.locationEligibility,
        requiredDocuments: Array.isArray(data.extractedData.requiredDocuments)
          ? data.extractedData.requiredDocuments.join(', ')
          : data.extractedData.requiredDocuments || formData.requiredDocuments,
        applicationMethod: 'Online Portal'
      };
      
      setExtractedData({
        ...data.extractedData, 
        contentInfo: data.contentInfo,
        fieldAnalysis: data.fieldAnalysis
      });
      setFormData(mappedData);
      setShowAdditionalInput(false);
      setAdditionalContent('');
      
    } catch (error) {
      console.error('❌ Failed to process additional content:', error);
      alert(`Failed to process additional content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAiProcessing(false);
    }
  };

  const handleAIExtraction = async () => {
    if (uploadMethod === 'text' && !aiText.trim()) {
      alert('Please enter grant text');
      return;
    }
    if (uploadMethod === 'pdf' && !selectedFile) {
      alert('Please select a PDF file');
      return;
    }
    
    setAiProcessing(true);
    try {
      console.log(`🤖 Starting AI extraction from ${uploadMethod}...`);
      
      let response;
      
      if (uploadMethod === 'pdf' && selectedFile) {
        // Handle PDF upload
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        response = await fetch('/api/admin/grants/ai-extract', {
          method: 'POST',
          body: formData,
        });
      } else {
        // Handle text input
        response = await fetch('/api/admin/grants/ai-extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ grantText: aiText }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract grant information');
      }

      console.log('✅ AI extraction successful:', data);

      // Show content info if available
      if (data.contentInfo) {
        const info = data.contentInfo;
        console.log(`📄 Content processed: ${info.originalLength} chars from ${info.source}${info.fileName ? ` (${info.fileName})` : ''}`);
        if (info.wasChunked) {
          console.log('⚠️ Large document was chunked for processing, but complete content is stored');
        }
      }

      // Show field analysis
      if (data.fieldAnalysis) {
        if (!data.fieldAnalysis.hasAllRequired) {
          console.log('⚠️ Missing required fields:', data.fieldAnalysis.missingRequired);
        }
      }

      // Map the extracted data to form format
      const mappedData = {
        title: data.extractedData.title || '',
        description: data.extractedData.description || '',
        funder: data.extractedData.funderName || '',
        category: data.extractedData.category || '',
        fundingAmountMin: data.extractedData.fundingAmountMin?.toString() || '',
        fundingAmountMax: data.extractedData.fundingAmountMax?.toString() || '',
        deadline: data.extractedData.deadline ? data.extractedData.deadline.split('T')[0] : '',
        eligibilityCriteria: data.extractedData.eligibilityCriteria || '',
        applicationUrl: data.extractedData.applicationUrl || '',
        contactEmail: data.extractedData.contactEmail || '',
        locationEligibility: Array.isArray(data.extractedData.locationEligibility) 
          ? data.extractedData.locationEligibility.join(', ') 
          : data.extractedData.locationEligibility || '',
        requiredDocuments: Array.isArray(data.extractedData.requiredDocuments)
          ? data.extractedData.requiredDocuments.join(', ')
          : data.extractedData.requiredDocuments || '',
        applicationMethod: 'Online Portal'
      };
      
      setExtractedData({
        ...data.extractedData, 
        contentInfo: data.contentInfo,
        fieldAnalysis: data.fieldAnalysis
      });
      setFormData(mappedData);
      
    } catch (error) {
      console.error('❌ AI extraction failed:', error);
      alert(`AI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                    <Label htmlFor="fundingAmountMin">Min Funding Amount ($)</Label>
                    <Input
                      id="fundingAmountMin"
                      type="number"
                      value={formData.fundingAmountMin}
                      onChange={(e) => handleInputChange('fundingAmountMin', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fundingAmountMax">Max Funding Amount ($)</Label>
                    <Input
                      id="fundingAmountMax"
                      type="number"
                      value={formData.fundingAmountMax}
                      onChange={(e) => handleInputChange('fundingAmountMax', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <Label htmlFor="applicationUrl">Application URL</Label>
                    <Input
                      id="applicationUrl"
                      type="url"
                      value={formData.applicationUrl}
                      onChange={(e) => handleInputChange('applicationUrl', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eligibilityCriteria">Eligibility Criteria</Label>
                  <Textarea
                    id="eligibilityCriteria"
                    value={formData.eligibilityCriteria}
                    onChange={(e) => handleInputChange('eligibilityCriteria', e.target.value)}
                    placeholder="Who can apply for this grant?"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="locationEligibility">Location Eligibility</Label>
                    <Input
                      id="locationEligibility"
                      value={formData.locationEligibility}
                      onChange={(e) => handleInputChange('locationEligibility', e.target.value)}
                      placeholder="e.g., Global, Kenya, Sub-Saharan Africa"
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
                  <Label htmlFor="requiredDocuments">Required Documents</Label>
                  <Textarea
                    id="requiredDocuments"
                    value={formData.requiredDocuments}
                    onChange={(e) => handleInputChange('requiredDocuments', e.target.value)}
                    placeholder="List of required documents for application"
                    rows={2}
                  />
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
                <span>Upload PDF or paste grant information and let AI extract the details</span>
              </div>
              
              {/* Upload Method Selection */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium">Input Method:</Label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="uploadMethod"
                      value="text"
                      checked={uploadMethod === 'text'}
                      onChange={(e) => setUploadMethod(e.target.value as 'text' | 'pdf')}
                      className="text-primary"
                    />
                    <span className="text-sm">Paste Text</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="uploadMethod"
                      value="pdf"
                      checked={uploadMethod === 'pdf'}
                      onChange={(e) => setUploadMethod(e.target.value as 'text' | 'pdf')}
                      className="text-primary"
                    />
                    <span className="text-sm">Upload PDF</span>
                  </label>
                </div>
              </div>
              
              <div className="space-y-4">
                {uploadMethod === 'text' ? (
                  <div className="space-y-2">
                    <Label htmlFor="aiText">Grant Information</Label>
                    <Textarea
                      id="aiText"
                      value={aiText}
                      onChange={(e) => setAiText(e.target.value)}
                      placeholder="Paste the complete grant information from the funder's website here. Include title, description, eligibility, deadline, funding amount, application process, etc. Large documents (10+ pages) are supported."
                      rows={10}
                      className="min-h-[200px]"
                    />
                    <p className="text-xs text-gray-500">
                      {aiText.length} characters • Supports large documents and RFPs
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="pdfFile">Upload PDF File</Label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input
                        id="pdfFile"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label htmlFor="pdfFile" className="cursor-pointer">
                        <div className="space-y-2">
                          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Plus className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {selectedFile ? selectedFile.name : 'Click to upload PDF'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Supports RFPs, grant announcements, and large documents (10+ pages)
                            </p>
                          </div>
                        </div>
                      </label>
                    </div>
                    {selectedFile && (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-800">
                            {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFile(null)}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                <Button 
                  onClick={handleAIExtraction} 
                  disabled={(uploadMethod === 'text' && !aiText.trim()) || (uploadMethod === 'pdf' && !selectedFile) || aiProcessing}
                  className="w-full"
                >
                  {aiProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {uploadMethod === 'pdf' ? 'Processing PDF...' : 'Extracting Information...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {uploadMethod === 'pdf' ? 'Extract from PDF with AI' : 'Extract Grant Information with AI'}
                    </>
                  )}
                </Button>
                
                {extractedData && (
                  <div className="mt-6 space-y-4">
                    {/* Success/Warning Header */}
                    <div className={`p-4 rounded-lg border ${
                      extractedData.fieldAnalysis?.hasAllRequired 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex items-center space-x-2 mb-3">
                        {extractedData.fieldAnalysis?.hasAllRequired ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                        )}
                        <span className={`font-medium ${
                          extractedData.fieldAnalysis?.hasAllRequired 
                            ? 'text-green-800' 
                            : 'text-yellow-800'
                        }`}>
                          {extractedData.fieldAnalysis?.hasAllRequired 
                            ? 'Information Extracted Successfully!' 
                            : 'Information Extracted with Missing Fields'}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <p className={`text-sm ${
                          extractedData.fieldAnalysis?.hasAllRequired 
                            ? 'text-green-700' 
                            : 'text-yellow-700'
                        }`}>
                          {extractedData.fieldAnalysis?.hasAllRequired 
                            ? 'Review the extracted information and save the grant.'
                            : 'Some required information is missing. Please review and fill in the missing fields manually.'}
                        </p>
                        
                        {/* Missing Fields Warning */}
                        {extractedData.fieldAnalysis?.missingRequired?.length > 0 && (
                          <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
                            <p className="text-sm font-medium text-yellow-800 mb-2">Missing Required Fields:</p>
                            <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1">
                              {extractedData.fieldAnalysis.missingRequired.map((field: string, index: number) => (
                                <li key={index}>
                                  <strong>{field === 'funderName' ? 'Funder Name' : field.charAt(0).toUpperCase() + field.slice(1)}</strong>
                                  {field === 'title' && ' - The grant program title'}
                                  {field === 'funderName' && ' - The organization offering the grant'}
                                  {field === 'description' && ' - Detailed program description'}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Critical External References */}
                        {extractedData.fieldAnalysis?.externalReferences?.criticalLinks?.length > 0 && (
                          <div className="bg-orange-50 border border-orange-200 rounded p-3">
                            <p className="text-sm font-medium text-orange-800 mb-2">⚠️ Critical Information May Be Missing:</p>
                            <div className="space-y-3">
                              
                              {extractedData.fieldAnalysis.externalReferences.missingCriticalInfo?.length > 0 && (
                                <div className="text-xs text-orange-700">
                                  <p className="font-medium mb-1">Missing Essential Grant Information:</p>
                                  <ul className="list-disc list-inside space-y-1">
                                    {extractedData.fieldAnalysis.externalReferences.missingCriticalInfo.map((info: string, index: number) => (
                                      <li key={index}>{info}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div className="text-xs text-orange-700">
                                <p className="font-medium mb-1">Critical Links to Review:</p>
                                <ul className="list-disc list-inside space-y-1">
                                  {extractedData.fieldAnalysis.externalReferences.criticalLinks.map((link: string, index: number) => (
                                    <li key={index} className="break-all">
                                      <a href={link} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">
                                        {link}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {extractedData.fieldAnalysis.externalReferences.reasoning && (
                                <div className="bg-orange-100 p-2 rounded text-xs text-orange-800">
                                  <p className="font-medium">Why these links are important:</p>
                                  <p>{extractedData.fieldAnalysis.externalReferences.reasoning}</p>
                                </div>
                              )}

                              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                                <p className="text-xs font-medium text-blue-800 mb-1">📋 Recommended Action:</p>
                                <p className="text-xs text-blue-700 mb-2">
                                  {extractedData.fieldAnalysis.externalReferences.userAction || 
                                   "Visit the critical links above, copy the relevant grant information, and paste it below to get a complete picture."}
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowAdditionalInput(true)}
                                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Missing Information
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Non-Critical References (if any) */}
                        {extractedData.fieldAnalysis?.externalReferences?.nonCriticalLinks?.length > 0 && (
                          <div className="bg-gray-50 border border-gray-200 rounded p-3">
                            <p className="text-sm font-medium text-gray-700 mb-2">ℹ️ Additional Resources (Optional):</p>
                            <div className="text-xs text-gray-600">
                              <p className="mb-1">These links contain general information but aren't essential for grant writing:</p>
                              <ul className="list-disc list-inside space-y-1">
                                {extractedData.fieldAnalysis.externalReferences.nonCriticalLinks.map((link: string, index: number) => (
                                  <li key={index} className="break-all">
                                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:underline">
                                      {link}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* AI Suggestions */}
                        {extractedData.fieldCompleteness?.missingInfoSuggestions?.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-sm font-medium text-blue-800 mb-2">💡 Suggestions to find missing information:</p>
                            <ul className="text-xs text-blue-700 list-disc list-inside space-y-1">
                              {extractedData.fieldCompleteness.missingInfoSuggestions.map((suggestion: string, index: number) => (
                                <li key={index}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Content Info */}
                        {extractedData.contentInfo && (
                          <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
                            <p><strong>Content processed:</strong> {extractedData.contentInfo.originalLength.toLocaleString()} characters from {extractedData.contentInfo.source.toUpperCase()}</p>
                            {extractedData.contentInfo.fileName && (
                              <p><strong>File:</strong> {extractedData.contentInfo.fileName}</p>
                            )}
                            {extractedData.contentInfo.wasChunked && (
                              <p><strong>Note:</strong> Large document was processed in chunks, but complete content is stored for AI workspace use.</p>
                            )}
                            {extractedData.fieldCompleteness?.confidenceScore && (
                              <p><strong>Extraction Confidence:</strong> {extractedData.fieldCompleteness.confidenceScore}%</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Additional Content Input */}
                    {showAdditionalInput && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Plus className="h-5 w-5 text-blue-600" />
                            <span className="font-medium text-blue-800">Add Missing Information</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAdditionalInput(false)}
                            className="text-blue-600"
                          >
                            Cancel
                          </Button>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="additionalContent" className="text-sm font-medium text-blue-800">
                              Paste Additional Grant Information
                            </Label>
                            <Textarea
                              id="additionalContent"
                              value={additionalContent}
                              onChange={(e) => setAdditionalContent(e.target.value)}
                              placeholder="Visit the critical links above, then copy and paste the relevant grant information here (eligibility criteria, application requirements, deadlines, etc.)"
                              rows={6}
                              className="mt-1 border-blue-300 focus:border-blue-500"
                            />
                            <p className="text-xs text-blue-600 mt-1">
                              {additionalContent.length} characters • Focus on grant-essential information only
                            </p>
                          </div>
                          
                          <Button
                            type="button"
                            onClick={handleProcessAdditionalContent}
                            disabled={!additionalContent.trim() || aiProcessing}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            {aiProcessing ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Processing Additional Content...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Process Additional Information
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                    
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
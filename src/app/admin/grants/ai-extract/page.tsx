'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sparkles, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Eye,
  Save,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ExtractedGrant {
  title: string;
  funderName: string;
  description: string;
  eligibilityCriteria: string;
  deadline: string;
  fundingAmountMin: number;
  fundingAmountMax: number;
  applicationUrl: string;
  locationEligibility: string[];
  category: string;
  applicantType: string;
  fundingType: string;
  durationMonths: number;
  requiredDocuments: string[];
  evaluationCriteria: string[];
  programGoals: string[];
  expectedOutcomes: string[];
}

export default function AIGrantExtractionPage() {
  const [grantText, setGrantText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedGrant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const router = useRouter();

  const handleExtract = async () => {
    if (!grantText.trim()) {
      setError('Please paste grant information to extract');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/grants/ai-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ grantText }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.configurationRequired) {
          throw new Error(`Configuration Error: ${data.error}\n\nPlease add your OpenAI API key to the environment variables.`);
        }
        throw new Error(data.error || 'Failed to extract grant information');
      }

      setExtractedData(data.extractedData);
      
      if (data.databaseAvailable === false) {
        setSuccess(`Grant information extracted successfully! (Note: Database not available - data not saved)`);
      } else {
        setSuccess(`Grant "${data.grant.title}" extracted and saved successfully!`);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during extraction');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFieldUpdate = (field: keyof ExtractedGrant, value: any) => {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      [field]: value
    });
  };

  const handleSaveChanges = async () => {
    if (!extractedData) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/grants/ai-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          grantText: JSON.stringify(extractedData),
          isReExtraction: true 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save changes');
      }

      setSuccess('Changes saved successfully!');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setGrantText('');
    setExtractedData(null);
    setError(null);
    setSuccess(null);
    setShowPreview(false);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Grant Extraction</h1>
          <p className="text-gray-600 mt-2">
            Paste grant information and let AI extract structured data automatically
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.push('/admin/grants')}
        >
          Back to Grants
        </Button>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>Grant Information Input</span>
          </CardTitle>
          <CardDescription>
            Paste grant announcement text, HTML content, or any grant-related information below
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="grant-text">Grant Information</Label>
            <Textarea
              id="grant-text"
              placeholder="Paste grant announcement, description, or any grant-related content here..."
              value={grantText}
              onChange={(e) => setGrantText(e.target.value)}
              rows={12}
              className="mt-2"
            />
            <p className="text-sm text-gray-500 mt-2">
              {grantText.length} characters • Supports plain text, HTML, and formatted content
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button 
              onClick={handleExtract}
              disabled={isExtracting || !grantText.trim()}
              className="flex items-center space-x-2"
            >
              {isExtracting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span>{isExtracting ? 'Extracting...' : 'Extract Grant Data'}</span>
            </Button>

            <Button 
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              disabled={!grantText.trim()}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Hide' : 'Preview'} Raw Content
            </Button>

            <Button 
              variant="ghost"
              onClick={resetForm}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* Raw Content Preview */}
          {showPreview && grantText && (
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-sm">Raw Content Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {grantText}
                </pre>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Extracted Data Review */}
      {extractedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Extracted Grant Information</span>
            </CardTitle>
            <CardDescription>
              Review and edit the extracted information before saving
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Grant Title</Label>
                <Input
                  id="title"
                  value={extractedData.title || ''}
                  onChange={(e) => handleFieldUpdate('title', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="funder">Funder Name</Label>
                <Input
                  id="funder"
                  value={extractedData.funderName || ''}
                  onChange={(e) => handleFieldUpdate('funderName', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={extractedData.description || ''}
                onChange={(e) => handleFieldUpdate('description', e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>

            {/* Funding & Deadline */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="min-amount">Min Funding Amount</Label>
                <Input
                  id="min-amount"
                  type="number"
                  value={extractedData.fundingAmountMin || ''}
                  onChange={(e) => handleFieldUpdate('fundingAmountMin', parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="max-amount">Max Funding Amount</Label>
                <Input
                  id="max-amount"
                  type="number"
                  value={extractedData.fundingAmountMax || ''}
                  onChange={(e) => handleFieldUpdate('fundingAmountMax', parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={extractedData.deadline ? extractedData.deadline.split('T')[0] : ''}
                  onChange={(e) => handleFieldUpdate('deadline', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Category and Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Badge variant="secondary" className="mt-1 block w-fit">
                  {extractedData.category?.replace(/_/g, ' ') || 'Not specified'}
                </Badge>
              </div>
              <div>
                <Label htmlFor="funding-type">Funding Type</Label>
                <Badge variant="outline" className="mt-1 block w-fit">
                  {extractedData.fundingType || 'GRANT'}
                </Badge>
              </div>
              <div>
                <Label htmlFor="duration">Duration (Months)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={extractedData.durationMonths || ''}
                  onChange={(e) => handleFieldUpdate('durationMonths', parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Eligibility */}
            <div>
              <Label htmlFor="eligibility">Eligibility Criteria</Label>
              <Textarea
                id="eligibility"
                value={extractedData.eligibilityCriteria || ''}
                onChange={(e) => handleFieldUpdate('eligibilityCriteria', e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Location Eligibility */}
            {extractedData.locationEligibility && extractedData.locationEligibility.length > 0 && (
              <div>
                <Label>Location Eligibility</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {extractedData.locationEligibility.map((location, index) => (
                    <Badge key={index} variant="secondary">
                      {location}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Application URL */}
            {extractedData.applicationUrl && (
              <div>
                <Label htmlFor="app-url">Application URL</Label>
                <Input
                  id="app-url"
                  value={extractedData.applicationUrl}
                  onChange={(e) => handleFieldUpdate('applicationUrl', e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-4 border-t">
              <Button 
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center space-x-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </Button>

              <Button 
                variant="outline"
                onClick={() => router.push('/admin/grants')}
              >
                View All Grants
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
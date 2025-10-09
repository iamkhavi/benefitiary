'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { 
  Download, 
  Save, 
  FileText, 
  Bold, 
  Italic, 
  List, 
  AlignLeft,
  Type,
  X
} from 'lucide-react';

interface ProposalSection {
  id: string;
  title: string;
  content: string;
  placeholder: string;
}

interface ProposalEditorProps {
  showCanvas: boolean;
  onClose: () => void;
}

export function ProposalEditor({ showCanvas, onClose }: ProposalEditorProps) {
  const [sections, setSections] = useState<ProposalSection[]>([
    {
      id: 'executive-summary',
      title: 'Executive Summary',
      content: '',
      placeholder: 'Provide a concise overview of your project, its objectives, and expected impact...'
    },
    {
      id: 'project-description',
      title: 'Project Description',
      content: '',
      placeholder: 'Describe your project in detail, including methodology, approach, and innovation...'
    },
    {
      id: 'budget-overview',
      title: 'Budget Overview',
      content: '',
      placeholder: 'Outline your budget breakdown, including major cost categories and justifications...'
    },
    {
      id: 'impact-outcomes',
      title: 'Impact & Outcomes',
      content: '',
      placeholder: 'Detail the expected outcomes, impact metrics, and long-term benefits...'
    },
    {
      id: 'timeline',
      title: 'Project Timeline',
      content: '',
      placeholder: 'Provide a detailed timeline with key milestones and deliverables...'
    },
    {
      id: 'team-capacity',
      title: 'Team & Organizational Capacity',
      content: '',
      placeholder: 'Describe your team\'s expertise and organizational capacity to execute this project...'
    }
  ]);

  const updateSection = (id: string, content: string) => {
    setSections(prev => prev.map(section => 
      section.id === id ? { ...section, content } : section
    ));
  };

  const generatePDF = () => {
    // In a real implementation, you'd use a library like jsPDF or html2pdf
    console.log('Generating PDF...', sections);
    alert('PDF generation would be implemented here');
  };

  const saveDraft = () => {
    // Save to localStorage or API
    localStorage.setItem('proposal-draft', JSON.stringify(sections));
    alert('Draft saved successfully!');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600" />
            Proposal Draft
          </h3>
          <div className="flex items-center space-x-2">
            {showCanvas && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={generatePDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button size="sm" onClick={saveDraft}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto">
        <Card className="max-w-none mx-auto bg-white shadow-sm border min-h-[800px] p-8" style={{ width: '210mm', minHeight: '297mm' }}>
          {/* A4 Size Canvas */}
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Grant Proposal: Maternal Health Innovation Challenge 2025
              </h1>
              <p className="text-gray-600">
                Submitted by: HealthCare Kenya
              </p>
              <p className="text-sm text-gray-500">
                Application Deadline: Apr 15, 2025
              </p>
            </div>

            {sections.map((section) => (
              <div key={section.id} className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  {section.title}
                </h2>
                <div className="relative">
                  <Textarea
                    value={section.content}
                    onChange={(e) => updateSection(section.id, e.target.value)}
                    placeholder={section.placeholder}
                    className="min-h-[120px] resize-none border-dashed border-gray-300 focus:border-solid focus:border-blue-500 transition-all"
                    style={{ 
                      fontFamily: 'Georgia, serif',
                      fontSize: '14px',
                      lineHeight: '1.6'
                    }}
                  />
                  {!section.content && (
                    <div className="absolute top-2 right-2 flex space-x-1 opacity-50">
                      <Type className="h-4 w-4 text-gray-400" />
                      <Bold className="h-4 w-4 text-gray-400" />
                      <Italic className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="mt-8 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                This proposal was generated with AI assistance • {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
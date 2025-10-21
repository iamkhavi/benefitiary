/**
 * Maya File Upload Component
 * Handles document uploads and triggers Maya's intelligent analysis
 */

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, FileText, X, Eye, Loader2 } from 'lucide-react';

interface MayaFileUploadProps {
  onDocumentAnalyzed: (documents: Array<any>) => void;
  onAnalysisComplete?: (analysis: string) => void;
  className?: string;
}

export function MayaFileUpload({ onDocumentAnalyzed, onAnalysisComplete, className }: MayaFileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<Array<any>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const processFile = useCallback(async (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        
        // Extract text content based on file type
        let extractedContent = content;
        
        if (file.type === 'application/pdf') {
          // For PDF files, we'd need a PDF parser
          // For now, we'll use the raw content or implement PDF.js
          extractedContent = content; // Placeholder - implement PDF parsing
        } else if (file.type.includes('text') || file.name.endsWith('.txt')) {
          extractedContent = content;
        } else {
          // For other document types, try to extract text
          extractedContent = content;
        }

        resolve({
          fileName: file.name,
          type: file.type.includes('pdf') ? 'pdf' : 
                file.type.includes('doc') ? 'doc' : 'txt',
          size: file.size,
          content: extractedContent,
          uploadedAt: new Date().toISOString()
        });
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      // Read as text for most files
      if (file.type.includes('text') || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        // For binary files, read as data URL and extract text later
        reader.readAsDataURL(file);
      }
    });
  }, []);

  const handleFileUpload = useCallback(async (files: FileList) => {
    setIsProcessing(true);
    
    try {
      const processedFiles: any[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type and size
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          alert(`File ${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }
        
        const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.some(type => file.type.includes(type)) && !file.name.endsWith('.txt')) {
          alert(`File ${file.name} is not supported. Please upload PDF, DOC, or TXT files.`);
          continue;
        }
        
        const processedFile = await processFile(file);
        processedFiles.push(processedFile);
      }
      
      if (processedFiles.length > 0) {
        const newFiles = [...uploadedFiles, ...processedFiles];
        setUploadedFiles(newFiles);
        
        // Trigger Maya's analysis
        onDocumentAnalyzed(processedFiles);
        
        // Auto-send analysis request to Maya
        if (onAnalysisComplete) {
          // This would trigger Maya to analyze the documents
          setTimeout(() => {
            onAnalysisComplete(`Documents uploaded: ${processedFiles.map(f => f.fileName).join(', ')}`);
          }, 1000);
        }
      }
      
    } catch (error) {
      console.error('File processing error:', error);
      alert('Failed to process files. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedFiles, processFile, onDocumentAnalyzed, onAnalysisComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const removeFile = useCallback((index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
  }, [uploadedFiles]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <Card 
        className={`border-2 border-dashed p-6 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex flex-col items-center space-y-4">
          {isProcessing ? (
            <>
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-600">Processing documents for Maya analysis...</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Upload documents for Maya to analyze
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  RFPs, grant guidelines, previous proposals, organizational documents
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supports PDF, DOC, TXT files up to 10MB
                </p>
              </div>
              
              <Button
                variant="outline"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = '.pdf,.doc,.docx,.txt';
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files) handleFileUpload(files);
                  };
                  input.click();
                }}
                disabled={isProcessing}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Files
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Uploaded Documents</h4>
          {uploadedFiles.map((file, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.fileName}</p>
                    <p className="text-xs text-gray-500">
                      {file.type.toUpperCase()} • {(file.size / 1024).toFixed(1)}KB • {new Date(file.uploadedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Show file preview or analysis
                      alert(`File content preview:\n\n${file.content.substring(0, 500)}...`);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          
          <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
            💡 Maya will automatically analyze these documents and suggest how to use them strategically for your grant application.
          </div>
        </div>
      )}
    </div>
  );
}
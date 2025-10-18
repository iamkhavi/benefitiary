import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;

    if (!file || !sessionId) {
      return NextResponse.json({ error: 'Missing file or session ID' }, { status: 400 });
    }

    // Validate file type and size
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // In production, upload to your storage service (S3, Vercel Blob, etc.)
    const fileUrl = `https://storage.benefitiary.com/files/${session.user.id}/${file.name}`;
    
    // Extract text from file (placeholder - implement actual text extraction)
    const extractedText = await extractTextFromFile(file);
    const summary = await generateFileSummary(extractedText);

    // Store file record
    const contextFile = await prisma.aIContextFile.create({
      data: {
        sessionId,
        fileName: file.name,
        fileUrl,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedBy: session.user.id,
        extractedText,
        summary
      }
    });

    // Create system message about file upload
    await prisma.aIMessage.create({
      data: {
        sessionId,
        sender: 'AI',
        messageType: 'SYSTEM',
        content: `📎 **File uploaded**: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)

I've analyzed this document and added it to our conversation context. You can now ask me questions about this file or reference it in your proposal development.

**File Summary**: ${summary}`,
        metadata: {
          fileId: contextFile.id,
          fileName: file.name,
          fileSize: file.size
        }
      }
    });

    return NextResponse.json({
      success: true,
      file: contextFile
    });

  } catch (error) {
    console.error('File Upload API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'text/plain') {
    return await file.text();
  }
  
  if (file.type === 'application/pdf') {
    try {
      // Use the same PDF extraction logic as the AI extract system
      const PDFParser = require('pdf2json');
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const pdfParser = new PDFParser();
      
      const extractedText = await new Promise<string>((resolve, reject) => {
        pdfParser.on('pdfParser_dataError', (errData: any) => {
          reject(new Error(errData.parserError));
        });

        pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
          try {
            let fullText = '';
            if (pdfData.Pages) {
              pdfData.Pages.forEach((page: any) => {
                if (page.Texts) {
                  page.Texts.forEach((text: any) => {
                    if (text.R) {
                      text.R.forEach((run: any) => {
                        if (run.T) {
                          try {
                            fullText += decodeURIComponent(run.T) + ' ';
                          } catch (uriError) {
                            fullText += run.T + ' ';
                          }
                        }
                      });
                    }
                  });
                }
                fullText += '\n\n';
              });
            }
            resolve(fullText.trim());
          } catch (error) {
            reject(error);
          }
        });

        pdfParser.parseBuffer(buffer);
      });

      return extractedText;
    } catch (error) {
      console.error('PDF extraction failed:', error);
      return `Failed to extract text from ${file.name}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
  
  // For other file types, return a message indicating the limitation
  return `File type ${file.type} is not yet supported for text extraction. Please convert to PDF or plain text.`;
}

async function generateFileSummary(text: string): Promise<string> {
  // Placeholder summary generation
  // In production, use AI to generate meaningful summaries
  
  const wordCount = text.split(' ').length;
  return `Document contains ${wordCount} words. Key topics and content would be summarized here using AI.`;
}
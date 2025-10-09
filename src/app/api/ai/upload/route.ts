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
  // Placeholder text extraction
  // In production, use libraries like pdf-parse, mammoth, etc.
  
  if (file.type === 'text/plain') {
    return await file.text();
  }
  
  // For PDF and Word docs, you'd use appropriate libraries
  return `Extracted text from ${file.name}. This is a placeholder - implement actual text extraction based on file type.`;
}

async function generateFileSummary(text: string): Promise<string> {
  // Placeholder summary generation
  // In production, use AI to generate meaningful summaries
  
  const wordCount = text.split(' ').length;
  return `Document contains ${wordCount} words. Key topics and content would be summarized here using AI.`;
}
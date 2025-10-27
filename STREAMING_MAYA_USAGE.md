# Maya Streaming API Usage

## Backend Implementation

The Maya API now supports real-time status updates during processing to improve user experience.

### API Request Format

```typescript
// Enable streaming by adding stream: true
const response = await fetch('/api/maya', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userMessage: "Create a complete proposal",
    grantId: "grant-123",
    stream: true, // Enable streaming status updates
    // ... other parameters
  })
});
```

### Streaming Response Format

The API returns Server-Sent Events (SSE) with status updates:

```typescript
// Status Update Format
{
  "type": "status",
  "status": "🔍 Analyzing your request...",
  "progress": 10
}

// Final Response Format
{
  "type": "final",
  "data": {
    "intent": "canvas_write",
    "content": "I've created your comprehensive proposal...",
    "extractedContent": { ... },
    "suggestions": [ ... ]
  }
}
```

## Frontend Implementation Example

```typescript
async function callMayaWithStreaming(userMessage: string, grantId: string) {
  const response = await fetch('/api/maya', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userMessage,
      grantId,
      stream: true
    })
  });

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          
          if (data.type === 'status') {
            // Update UI with status
            updateStatus(data.status, data.progress);
          } else if (data.type === 'final') {
            // Handle final response
            handleFinalResponse(data.data);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function updateStatus(status: string, progress: number) {
  // Update your UI with the current status
  console.log(`${status} (${progress}%)`);
  // Update progress bar, status text, etc.
}

function handleFinalResponse(mayaResponse: MayaResponse) {
  // Handle the final Maya response
  console.log('Maya finished:', mayaResponse);
}
```

## React Hook Example

```typescript
import { useState, useCallback } from 'react';

interface StreamingStatus {
  status: string;
  progress: number;
  isComplete: boolean;
  response?: MayaResponse;
}

export function useMayaStreaming() {
  const [streamingStatus, setStreamingStatus] = useState<StreamingStatus>({
    status: '',
    progress: 0,
    isComplete: true
  });

  const callMaya = useCallback(async (userMessage: string, grantId: string) => {
    setStreamingStatus({
      status: 'Starting...',
      progress: 0,
      isComplete: false
    });

    try {
      const response = await fetch('/api/maya', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage,
          grantId,
          stream: true
        })
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'status') {
              setStreamingStatus(prev => ({
                ...prev,
                status: data.status,
                progress: data.progress
              }));
            } else if (data.type === 'final') {
              setStreamingStatus({
                status: 'Complete!',
                progress: 100,
                isComplete: true,
                response: data.data
              });
            }
          }
        }
      }
    } catch (error) {
      setStreamingStatus({
        status: 'Error occurred',
        progress: 0,
        isComplete: true
      });
      console.error('Streaming error:', error);
    }
  }, []);

  return { streamingStatus, callMaya };
}
```

## Status Messages

The API provides two simple, accurate status updates:

**All Requests Follow This Pattern:**
1. **💭 Thinking...** (30%) - Maya is processing your request and understanding context
2. **✍️ Working...** (70%) - Maya is generating your response/content

**Simple & Accurate:**
- Status messages accurately reflect what Maya is actually doing
- No misleading messages (won't say "reading documents" when writing proposal)
- Two clear phases: thinking about the request, then creating the response

## Benefits

- **Better UX**: Users see real-time progress instead of waiting in silence
- **Transparency**: Clear indication of what Maya is doing at each step
- **Confidence**: Users know the system is working, even for long operations
- **Progress Tracking**: Visual progress bar shows completion percentage
- **Error Handling**: Clear error states if something goes wrong

## Fallback Mode

If streaming is not requested (`stream: false` or omitted), the API works in traditional mode with a single response after all processing is complete.
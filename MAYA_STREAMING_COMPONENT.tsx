import React, { useState } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface StreamingStatus {
  status: string;
  progress: number;
  isComplete: boolean;
  response?: any;
  error?: string;
}

export function MayaChatWithStreaming({ grantId }: { grantId: string }) {
  const [message, setMessage] = useState('');
  const [streamingStatus, setStreamingStatus] = useState<StreamingStatus>({
    status: '',
    progress: 0,
    isComplete: true
  });
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    // Add user message to chat
    const userMessage = message;
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setMessage('');

    // Start streaming
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
          stream: true,
          history: chatHistory
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
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'status') {
                setStreamingStatus(prev => ({
                  ...prev,
                  status: data.status,
                  progress: data.progress
                }));
              } else if (data.type === 'final') {
                // Add Maya's response to chat
                setChatHistory(prev => [...prev, { 
                  role: 'assistant', 
                  content: data.data.content 
                }]);
                
                setStreamingStatus({
                  status: 'Complete!',
                  progress: 100,
                  isComplete: true,
                  response: data.data
                });
              }
            } catch (parseError) {
              console.error('Failed to parse streaming data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setStreamingStatus({
        status: 'Error occurred',
        progress: 0,
        isComplete: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {/* Streaming Status */}
        {!streamingStatus.isComplete && (
          <div className="flex justify-start">
            <div className="max-w-3xl p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-blue-900">
                    {streamingStatus.status}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-blue-600 mb-1">
                      <span>Progress</span>
                      <span>{streamingStatus.progress}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${streamingStatus.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {streamingStatus.error && (
          <div className="flex justify-start">
            <div className="max-w-3xl p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <div className="text-sm font-medium text-red-900">
                    Something went wrong
                  </div>
                  <div className="text-sm text-red-700 mt-1">
                    {streamingStatus.error}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-4">
        <div className="flex space-x-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask Maya to help with your grant proposal..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!streamingStatus.isComplete}
          />
          <button
            onClick={sendMessage}
            disabled={!message.trim() || !streamingStatus.isComplete}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {!streamingStatus.isComplete ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            <span>Send</span>
          </button>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setMessage('Create a complete proposal')}
            disabled={!streamingStatus.isComplete}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full disabled:opacity-50"
          >
            📝 Write Proposal
          </button>
          <button
            onClick={() => setMessage('Analyze my fit for this grant')}
            disabled={!streamingStatus.isComplete}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full disabled:opacity-50"
          >
            🔍 Check Fit
          </button>
          <button
            onClick={() => setMessage('What should I focus on?')}
            disabled={!streamingStatus.isComplete}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full disabled:opacity-50"
          >
            💡 Get Tips
          </button>
        </div>
      </div>
    </div>
  );
}

export default MayaChatWithStreaming;
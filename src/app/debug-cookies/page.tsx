'use client';

import { useEffect, useState } from 'react';

export default function DebugCookiesPage() {
  const [cookies, setCookies] = useState<string>('');
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    // Get all cookies
    setCookies(document.cookie);

    // Test session endpoint
    fetch('/api/debug/session')
      .then(res => res.json())
      .then(data => setSessionData(data))
      .catch(err => console.error('Session check failed:', err));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Debug Cookies & Session</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">All Cookies:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {cookies || 'No cookies found'}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Session Data:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(sessionData, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Actions:</h2>
          <div className="space-x-2">
            <button 
              onClick={() => window.location.href = '/admin/users'}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Try Admin Page
            </button>
            <button 
              onClick={() => window.location.href = '/auth/login'}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
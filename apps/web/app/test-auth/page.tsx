'use client';
import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase'; // Ensure this matches your file path

export default function TestAuth() {
  const [token, setToken] = useState('');

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const auth = getFirebaseAuth()
      const result = await signInWithPopup(auth, provider);
      // Get the raw JWT token
      const idToken = await result.user.getIdToken();
      setToken(idToken);
      console.log("Token:", idToken);
    } catch (error) {
      console.error(error);
      alert('Login failed check console');
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    alert('Token copied!');
  };

  return (
    <div className="p-10 space-y-4">
      <h1 className="text-2xl font-bold">Auth Tester</h1>
      <button 
        onClick={handleLogin}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Sign in with Google
      </button>

      {token && (
        <div className="bg-gray-100 p-4 rounded break-all">
          <p className="font-mono text-xs mb-2">Your ID Token:</p>
          <textarea 
            readOnly 
            value={token} 
            className="w-full h-32 p-2 text-black text-xs border"
          />
          <button 
            onClick={copyToken}
            className="mt-2 bg-green-600 text-white px-3 py-1 text-sm rounded"
          >
            Copy Token
          </button>
        </div>
      )}
    </div>
  );
}
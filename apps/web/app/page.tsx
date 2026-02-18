'use client';
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { role } = useAuth();

  return (
    <main className="p-10">
      <Link href="/scan" className="text-blue-500 underline">
        <button className="px-4 py-2 bg-blue-500 text-white rounded">
          Go to Scan Page
        </button>
      </Link>
      <br />
      <Link href="/test-auth" className="text-blue-500 underline">
        <button className="px-4 py-2 bg-blue-500 text-white rounded">
          Go to Test Auth Page
        </button>
      </Link>
      <br />
      <Link href="/api-docs" className="text-blue-500 underline">
        <button className="px-4 py-2 bg-blue-500 text-white rounded">
          Go to API Docs Page
        </button>
      </Link>
      {role === 'ADMIN' && (
        <>
          <br />
          <Link href="/admin" className="text-purple-500 underline">
            <button className="px-4 py-2 bg-purple-600 text-white rounded">
              Admin Dashboard
            </button>
          </Link>
        </>
      )}
    </main>
  );
}
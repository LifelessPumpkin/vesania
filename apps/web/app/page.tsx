'use client';
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { role } = useAuth();

  return (
    <main className="p-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800 dark:text-black-100">Welcome to Vesania (Alpha)</h1>
      <div className="flex flex-col gap-4 items-center">
        <Link href="/scan" className="w-full sm:w-64 block px-6 py-3 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-medium rounded-lg shadow-sm text-center">
          Scan a Card
        </Link>
        <Link href="/test-auth" className="w-full sm:w-64 block px-6 py-3 bg-gray-200 hover:bg-gray-300 transition-colors text-gray-800 font-medium rounded-lg shadow-sm text-center">
          Test Auth
        </Link>
        <Link href="/api-docs" className="w-full sm:w-64 block px-6 py-3 bg-gray-200 hover:bg-gray-300 transition-colors text-gray-800 font-medium rounded-lg shadow-sm text-center">
          API Docs
        </Link>
        {role === 'ADMIN' && (
          <Link href="/admin" className="w-full sm:w-64 block mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 transition-colors text-white font-medium rounded-lg shadow-sm text-center">
            Admin Dashboard
          </Link>
        )}
      </div>
    </main>
  );
}
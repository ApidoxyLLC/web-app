"use client"; // This is needed since we're using useState and onSubmit
import { signIn } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useFingerprint from "@/hooks/useFingerprint";

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const fingerprint = useFingerprint();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await signIn("otp-login", {
      redirect: false,
      phone: phone,
      otp: otp,
      fingerprint: fingerprint?.fingerprintId || "",
      timezone: fingerprint?.timezone || "",
    });
  };

  return (
    <div className="border border-red-400 h-full p-4 max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4">Login</h2>
      {/* {error && <p className="text-red-500 mb-4">{error}</p>} */}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <input
            type="text"
            placeholder="OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <button
          onClick={ async ()=> await signOut({ redirect: false })}
          disabled={isLoading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          Sign Out
        </button>
    </div>
  );
}
"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function VerifyOTPPage() {
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone");
  const router = useRouter();
  const [otp, setOtp] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();

    const res = await fetch("http://localhost:3000/api/v1/auth/verify-phone", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify({ phone, otp }),
    });

    const result = await res.json();

    if (res.ok && result.valid) {
      toast.success("Phone verified and logged in!");
      router.push("/dashboard"); // or your authenticated page
    } else {
      toast.error(result.error || "OTP verification failed");
    }
  };

  return (
    <form
      onSubmit={handleVerify}
      className="flex flex-col gap-4 max-w-sm mx-auto mt-12"
    >
      <h2 className="text-lg font-semibold text-center">
        Enter the OTP sent to {phone}
      </h2>
      <Input
        type="text"
        placeholder="Enter OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />
      <Button type="submit">Verify & Login</Button>
    </form>
  );
}

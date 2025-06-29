"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const res = await fetch(
          "http://localhost:3000/api/v1/auth/verify-email",
          {
            method: "POST",
            headers: { "Content-type": "application/json" },
            body: JSON.stringify({ token }),
            cache: "no-store",
          }
        );
        const data = await res.json();

        if (res.ok) {
          toast.success(data?.message || "Email verified successfully!");
          setStatus("success");
        } else {
          toast.error(data?.error || "Verification failed.");
          setStatus("failed");
        }
      } catch (err) {
        console.log(err);
        toast.error("Something went wrong.");
        setStatus("failed");
      } finally {
        setLoading(false);
      }
    };

    if (token) verifyEmail();
    else {
      toast.error("Invalid verification token");
      setStatus("failed");
      setLoading(false);
    }
  }, [token]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
      {loading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="animate-spin" /> Verifying your email...
        </div>
      ) : status === "success" ? (
        <div>
          <h2 className="text-2xl font-bold mb-4">✅ Email Verified!</h2>
          <Button asChild>
            <a href="/login">Go to Login</a>
          </Button>
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            ❌ Verification Failed
          </h2>
          <p>Please try again or contact support.</p>
        </div>
      )}
    </div>
  );
}

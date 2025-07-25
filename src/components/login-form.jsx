"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  PasswordInputAdornmentToggle,
  PasswordInputInput,
} from "@/components/ui/password-input";

import { ControlGroup, ControlGroupItem } from "@/components/ui/control-group";
import {
  InputBase,
  InputBaseAdornment,
  InputBaseControl,
  InputBaseInput,
} from "@/components/ui/input-base";
import Link from "next/link";
import useFingerprint from "@/hooks/useFingerprint";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { FaFacebookF } from "react-icons/fa";
import { useRouter } from "next/navigation";
export function LoginForm({ className, ...props }) {
  const fingerprint = useFingerprint();
  const router = useRouter()
  async function createUser(e) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email")?.toString() ?? "";
    const password = formData.get("password")?.toString() ?? "";
    if(!email){
          return toast.error("Email/Phone is required");
    
        }
    if(!password){
          return toast.error("Password is required");
    
        }
    const result = await signIn("login", {
      redirect: false,
      identifier: email,
      password: password,
      fingerprint: fingerprint?.fingerprintId || "",
      userAgent: fingerprint?.userAgent || "",
      timezone: fingerprint?.timezone || "",
    });

    if (result?.error) {
      // Handle error
      toast.error(` Login failed`);
      console.log("Login failed", result.error);
    } else {
      // Redirect to a protected route
      router.push("http://localhost:3000/")
      toast.success("Login sucessful");
    }

    async function requestToCreateProduct() {
      try {
        const response = await fetch("/api/v1/shops", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Sample data",
          }),
        });

        if (!response.ok) {
          throw new Error("Network response was not ok");
        }

        const data = await response.json();
        console.log("Got Data", data);
      } catch (error) {
        console.error("Error:", error);
      }
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form onSubmit={createUser} className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Welcome!</h1>
                <p className="text-muted-foreground text-balance">
                  Login to your Apidoxy account
                </p>
              </div>
              <div className="gap-3">
                <ControlGroup className="w-full">
                  <ControlGroupItem>
                    <InputBase>
                      <InputBaseAdornment>Email or phone</InputBaseAdornment>
                    </InputBase>
                  </ControlGroupItem>
                  <ControlGroupItem className="flex-1">
                    <InputBase>
                      <InputBaseControl>
                        <InputBaseInput
                          name="email"
                          placeholder="Email or phone number"
                        />
                      </InputBaseControl>
                    </InputBase>
                  </ControlGroupItem>
                </ControlGroup>
              </div>
              <div className="gap-3">
                <div className="flex items-center">
                  <ControlGroup className="w-full">
                    <ControlGroupItem>
                      <InputBase>
                        <InputBaseAdornment>Password</InputBaseAdornment>
                      </InputBase>
                    </ControlGroupItem>
                    <ControlGroupItem className="flex-1">
                      <InputBase>
                        <PasswordInputInput
                          name="password"
                          placeholder="Password"
                        />
                        <PasswordInputAdornmentToggle />
                      </InputBase>
                    </ControlGroupItem>
                  </ControlGroup>
                </div>
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                  Or continue with
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => {
                    signIn("google", { callbackUrl: "/",});
                  }}
                  variant="outline"
                  type="button"
                  className="w-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="sr-only">Login with Google</span>
                </Button>
                <Button
                  onClick={() => signIn("facebook")}
                  variant="outline"
                  type="button"
                  className="w-full"
                >
                  <FaFacebookF />
                  <span className="sr-only">Login with Facebook</span>
                </Button>
              </div>
              <div className="text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="underline underline-offset-4">
                  Sign up
                </Link>
              </div>
            </div>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/placeholder.svg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our{" "}
        <Link href="https://apidoxy.com/tos">Terms of Service</Link> and{" "}
        <Link href="https://apidoxy.com/privacy">Privacy Policy</Link>.
      </div>
    </div>
  );
}

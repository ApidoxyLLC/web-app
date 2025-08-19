"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ControlGroup, ControlGroupItem } from "@/components/ui/control-group";
import {
  InputBase,
  InputBaseAdornment,
  InputBaseControl,
  InputBaseInput,
} from "@/components/ui/input-base";
import Link from "next/link";
import { toast } from "sonner";
import { FaFacebookF } from "react-icons/fa";
import { useRouter } from "next/navigation";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import useFingerprint from "@/hooks/useFingerprint";
import {  useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import one from "../../public/images/1.png"
import two from "../../public/images/2.png"
import three from "../../public/images/3.png"
import four from "../../public/images/4.png"
import five from "../../public/images/5.png"
import six from "../../public/images/6.png"
import seven from "../../public/images/7.png"
import Image from "next/image";

export function SignUp({ className, ...props }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [otp,setOtp] = useState('')
  const [number,setNumber] = useState('')
  const fingerprint = useFingerprint();
  const [showPass, setShowPass] = useState(false)
  
const [api, setApi] = useState();
const [current, setCurrent] = useState(0);
const [count, setCount] = useState(0);
  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = form.get("name");
    const email = form.get("email");
    const phone = form.get("phone");
    const password = form.get("password");
    const formData = {
      name,
      email,
      phone,
      password,
    };
    if(!name){
      return toast.error("Name is required");

    }
    if(!phone){
      return toast.error("Phone is required");

    }
    if(!password){
      return toast.error("Password is required");

    }
    const formDataWithOutEmail = { name, phone, password };
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },
        body: JSON.stringify(
          formData.email === "" ? formDataWithOutEmail : formData
        ),
      });

      if (res.ok) {
        if (formData.email === "") {
          toast.success("OTP sent to your phone. Verify to continue.");
          setShowModal(true);
          setNumber(phone)
        } else {
          toast.success(
            "Registration successful! Check your email to verify your account."
          );
        }
      } else {
        toast.error("Registration Failed");
      }
    } catch (err) {
      console.log(err);
      toast.error("Registration Failed");
    }
  };
  useEffect(() => {
    if (!api) {
      return;
    }
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);
   const images = [
    { id: 1, url: one},
    { id: 2, url: two },
    { id: 3, url: three },
    { id: 4, url: four },
    { id: 5, url: five },
    { id: 6, url: six },
    { id: 7, url: seven },
  ];

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className=" p-6 flex flex-col gap-6">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl font-bold">Welcome!</h1>
              <p className="text-muted-foreground text-balance">
                Login to your Apidoxy account
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="gap-3">
                <ControlGroup className="w-full">
                  <ControlGroupItem>
                    <InputBase>
                      <InputBaseAdornment>Name</InputBaseAdornment>
                    </InputBase>
                  </ControlGroupItem>
                  <ControlGroupItem className="flex-1">
                    <InputBase>
                      <InputBaseControl>
                        <InputBaseInput
                          name="name"
                          placeholder="Enter Your Name"
                          type="text"
                          onChange={(e) => {
                            const onlyLetters = e.target.value.replace(
                              /[^a-zA-Z\s]/g,
                              ""
                            );
                            e.target.value = onlyLetters;
                          }}
                          title="Only alphabets and spaces are allowed"
                        />
                      </InputBaseControl>
                    </InputBase>
                  </ControlGroupItem>
                </ControlGroup>
              </div>
              <div className="gap-3">
                <ControlGroup className="w-full">
                  <ControlGroupItem>
                    <InputBase>
                      <InputBaseAdornment>Email</InputBaseAdornment>
                    </InputBase>
                  </ControlGroupItem>
                  <ControlGroupItem className="flex-1">
                    <InputBase>
                      <InputBaseControl>
                        <InputBaseInput
                          name="email"
                          placeholder="Enter Your Email"
                          type="email"
                        />
                      </InputBaseControl>
                    </InputBase>
                  </ControlGroupItem>
                </ControlGroup>
              </div>
              <div className="gap-3">
                <ControlGroup className="w-full">
                  <ControlGroupItem>
                    <InputBase>
                      <InputBaseAdornment>Phone</InputBaseAdornment>
                    </InputBase>
                  </ControlGroupItem>
                  <ControlGroupItem className="flex-1">
                    <InputBase>
                      <InputBaseControl>
                        <InputBaseInput
                          name="phone"
                          placeholder="Enter Your Phone number"
                          onChange={(e) => {
                            const onlyNumbers = e.target.value.replace(
                              /[^0-9+]/g,
                              ""
                            );
                            e.target.value = onlyNumbers;
                          }}
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
      <ControlGroupItem className="flex-1 relative">
        <InputBase>
          <InputBaseControl>
            <InputBaseInput
              name="password"
              placeholder="Enter Your Password"
              type={showPass ? "text" : "password"}
            />
          </InputBaseControl>
          <button
            type="button"
            onClick={() => setShowPass((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPass ? (
              
              <EyeIcon className="h-5 w-5" />
            ) : (
              <EyeOffIcon className="h-5 w-5" />
            )}
          </button>
        </InputBase>
      </ControlGroupItem>
    </ControlGroup>
  </div>
</div>

              <Button  type="submit" className="w-full">
                Sign Up
              </Button>
            </form>
            <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
              <span className="bg-card text-muted-foreground relative z-10 px-2">
                Or continue with
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => {
                  signIn("google");
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
              Have you any account?
              <Link href="/login" className="underline underline-offset-4 pl-1">
                Login
              </Link>
            </div>
          </div>
          <div className="bg-muted relative hidden md:block">
                <div className="relative mx-auto w-full">
  <Carousel setApi={setApi} className="w-full">
    <CarouselContent>
      {images.map((item) => (
        <CarouselItem key={item.id}>
          <Card className="py-0">
            <CardContent className="flex aspect-video items-center justify-center p-0">
              <Image
                src={item.url}
                alt={`Slide ${item.id}`}
                className="w-full h-full object-cover rounded-lg rounded-bl-none rounded-tl-none"
              />
            </CardContent>
          </Card>
        </CarouselItem>
      ))}
    </CarouselContent>
  </Carousel>

  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
    {Array.from({ length: count }).map((_, index) => (
      <button
        key={index}
        onClick={() => api?.scrollTo(index)}
        className={cn("h-3 w-3 rounded-full border-2", {
          "border-primary bg-primary": current === index + 1,
          "border-white bg-white/60": current !== index + 1,
        })}
      />
    ))}
  </div>
</div>

  

          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our{" "}
        <Link href="https://apidoxy.com/tos">Terms of Service</Link> and{" "}
        <Link href="https://apidoxy.com/privacy">Privacy Policy</Link>.
      </div>
      <Dialog open={showModal}>
        <DialogContent className="sm:max-w-[425px]">
  <DialogHeader>
    <DialogTitle>Phone Verification</DialogTitle>
    <DialogDescription>
      Please enter the 6-digit OTP sent to your phone number.
    </DialogDescription>
  </DialogHeader>

  <form
    onSubmit={ async (e) => {
      e.preventDefault();
      setShowModal(false);
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    const result = await signIn("otp-login", {
      redirect: false,
      phone: number, 
      otp: parseInt(otp, 10),
      fingerprint: fingerprint?.fingerprintId ,
      timezone: fingerprint?.timezone || "",
    });

    if (result?.error) {
      toast.error(`Login failed: ${result.error}`);
    } else {
      toast.success("Phone verified & login successful!");
      // router.push("/dashboard"); 
    }
    }}
    className="space-y-6"
  >
    <div className="grid gap-4 ">
      <div className="flex gap-2 ">
        <Label htmlFor="otp" className="text-sm font-medium">
          OTP Code
        </Label>
        <InputOTP onChange={setOtp} maxLength={6} id="otp" name="otp" className="ml-16">
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
    </div>

    <DialogFooter>
      <DialogClose asChild>
       
      <Button type="submit">Verify</Button>
      </DialogClose>
    </DialogFooter>
  </form>
      </DialogContent>
      </Dialog>

    </div>
  );
}
"use client"
import {
  KeyRound,
  LifeBuoy,
  Lock,
  LogOutIcon,
  Shield,
  UserCircle2,
  UserLock,
} from "lucide-react";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ModeToggle } from "./mode-toggle";
import { signOut, useSession } from "next-auth/react";
import { useEffect,useRef, useState } from "react";
import { useRouter } from "next/navigation";
import logo from "../../public/favicon.ico"
import { TreePalm, MapPin, User2, ChevronRight  } from "lucide-react";
import Image from "next/image";
import CreatShop from "./shop-info-modal";
import useFetch from "@/hooks/useFetch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function ProjectsCard() {
  const router = useRouter()
  const userData = useSession()
  const [showSecuritySub, setShowSecuritySub] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const submenuRef = useRef(null);
  const [submenuHeight, setSubmenuHeight] = useState(0);

  useEffect(() => {
    if (submenuRef.current) {
      setSubmenuHeight(showSecuritySub ? submenuRef.current.scrollHeight : 0);
    }
  }, [showSecuritySub]);
  console.log(userData)
  useEffect(() => {
    if (userData.status === "authenticated" && userData.data?.user) {
        router.push("http://localhost:3000/");
      } else {
        router.push("http://localhost:3000/signup");
      }
  }, [userData, userData.status, router]);
  
  const { data, loading } = useFetch("/shops")
  if (loading) {
  return (
    <div className="grid grid-cols-1 @xl/main:grid-cols-2 @5xl/main:grid-cols-3 gap-6 px-4 py-6 lg:px-6">
      {[...Array(3)].map((_, idx) => (
        <div
          key={idx}
          className="h-[150px] animate-pulse rounded-xl bg-muted/50 dark:bg-muted"
        />
      ))}
    </div>
  );
}
  return (
    <div>
      <div className="flex flex-row items-center justify-between px-6 py-4 gap-4 border-b bg-white dark:bg-background">
        <div className="flex items-center gap-3">
          <Image src={logo} width={30} height={30} alt="logo"></Image>
          <span className="font-bold text-lg tracking-tight">
            Apidoxy Appcommerz
          </span>
        </div>

        <div className="flex flex-row items-center gap-6">
          <ModeToggle />
          <Popover>
            <PopoverTrigger asChild>
              <div className="cursor-pointer">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>
                    {userData?.data?.user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 border bg-white dark:bg-zinc-900 text-black dark:text-white shadow-lg rounded-xl z-50 mr-2">
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>
                      {userData?.data?.user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{userData?.data?.user?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {userData?.data?.user?.email}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
        <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-accent dark:hover:bg-zinc-800 transition text-left">
          <UserCircle2 className="w-4 h-4" />
          Account
        </button>

        <div className="w-full">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowSecuritySub((prev) => !prev);
            }}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-accent dark:hover:bg-zinc-800 transition text-left"
          >
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
            </span>
            <ChevronRight
              className={`w-4 h-4 transition-transform duration-200 ${showSecuritySub ? "rotate-90" : ""}`}
            />
          </button>

          <div
            ref={submenuRef}
            style={{
              height: submenuHeight,
              overflow: "hidden",
              transition: "height 0.25s ease"
            }}
          >
            <div className="ml-8 flex flex-col border-l border-muted pl-2 py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModal("changePassword");
                }}
                className="px-4 py-2 hover:bg-accent flex gap-2 items-center dark:hover:bg-zinc-800 text-sm text-left"
              >
                <KeyRound className="size-4" />Change Password
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModal("twoFactor");
                }}
                className="px-4 py-2 flex gap-2 items-center hover:bg-accent dark:hover:bg-zinc-800 text-sm text-left"
              >
                <Lock  className="size-4"/>Two-Factor Auth
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModal("loginActivity");
                }}
                className="px-4 py-2 flex gap-2 items-center hover:bg-accent dark:hover:bg-zinc-800 text-sm text-left"
              >
               <UserLock  className="size-4" /> Login Activity
              </button>
            </div>
          </div>
        </div>

        <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-accent dark:hover:bg-zinc-800 transition text-left">
          <Lock className="w-4 h-4" />
          Privacy
        </button>

        <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-accent dark:hover:bg-zinc-800 transition text-left pb-3">
          <LifeBuoy className="w-4 h-4" />
          Support
        </button>

        <div className="border-t" />
        <button
          onClick={() => signOut({ callbackUrl: "/signup" })}
          className="w-full flex items-center gap-2 px-4 pt-2 pb-3 hover:bg-accent dark:hover:bg-zinc-800 transition text-left"
        >
          <LogOutIcon className="w-4 h-4" />
          Logout
        </button>
      </div>
      <Dialog open={activeModal === "changePassword"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input type="password" placeholder="Current Password" />
            <Input type="password" placeholder="New Password" />
            <Input type="password" placeholder="Confirm New Password" />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "twoFactor"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Two-Factor Authentication</DialogTitle>
          </DialogHeader>
          <p className="text-sm">Enable or disable 2FA.</p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setActiveModal(null)}>Close</Button>
            <Button>Enable</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "loginActivity"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Login Activity</DialogTitle>
          </DialogHeader>
          <p className="text-sm">Here will be your login history...</p>
          <DialogFooter>
            <Button onClick={() => setActiveModal(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="*:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-3 grid grid-cols-1 gap-6 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card lg:px-6 py-6  auto-rows-fr">
        
         {data?.data?.map((shop)=> (
          <Link key={shop?.businessName} href={`${shop?.id}/dashboard`} >
            <Card className="@container/card cursor-pointer hover:bg-muted/100">
            <CardHeader className="relative">
              <div className="flex items-center gap-2">
                <Avatar className="h-12 w-12 bg-muted/100 rounded-sm">
                  <AvatarImage src="https://placehold.co/400/png?text=H" alt="Project Icon" />
                  <AvatarFallback>{shop?.businessName?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <CardTitle className="@[250px]/card:text-xl text-xl font-semibold tabular-nums">
                {shop?.businessName}
                </CardTitle>
              </div>
            </CardHeader>
            <div className="border border-t -mb-3"></div>
            <CardFooter className="flex-col items-start gap-1 text-sm ">
              <div className="border-t border"></div>
              <div className="flex items-center gap-4 text-sm  ">
                <div className="flex items-center gap-1">
                  <TreePalm className="w-4 h-4" />
                  <span>{shop?.industry}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{shop?.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User2 className="w-4 h-4" />
                  <span>{data.data?.user?.name}</span>
                </div>
              </div>
            </CardFooter>
            </Card>
          </Link>
        ))}
        <CreatShop ></CreatShop>
      </div>
    </div>
  );
}

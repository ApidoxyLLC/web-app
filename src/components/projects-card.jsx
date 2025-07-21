"use client"
import {
  LifeBuoy,
  Lock,
  LogOutIcon,
  Shield,
  UserCircle2,
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
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ModeToggle } from "./mode-toggle";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AlertDialogDemo from "./shop-info-modal";
import logo from "../../public/favicon.ico"
import { TreePalm, MapPin, User2 } from "lucide-react";
import Image from "next/image";
import CreatShop from "./shop-info-modal";
import useFetch from "@/hooks/useFetch";
export function ProjectsCard() {
  const router = useRouter()
  const userData = useSession()
  const [shops,setShops] = useState([])
  useEffect(() => {
    if (userData.status === "authenticated" && userData.data?.user) {
        router.push("http://localhost:3000/");
      } else {
        router.push("http://localhost:3000/signup");
      }
    
  }, [userData, userData.status, router]);
  
  // useEffect(()=>{
  //   try{
  //     const res = fetch("http://localhost:3000/api/v1/shops/")
  //     .then(res => res.json())
  //     .then(data => {
  //       setShops(data.data)
  //     })
  //   }catch(err){
  //     console.log(err)
  //   }
  // },[])
    const { data } = useFetch("shops")
  console.log(data)
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
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 border bg-muted/100 shadow-lg rounded-xl relative  z-50 mr-2">
              <div className="p-4 border-b trap ">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="https://github.com/shadcn.png" />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">John Doe</div>
                    <div className="text-xs text-muted-foreground">
                      john@example.com
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
                <button className="w-full flex items-center gap-2 text-left px-4 py-2 hover:bg-muted transition">
                  <UserCircle2 className="w-4 h-4" />
                  Account
                </button>
                <button className="w-full flex items-center gap-2 text-left px-4 py-2 hover:bg-muted transition">
                  <Shield className="w-4 h-4" />
                  Security
                </button>
                <button className="w-full flex items-center gap-2 text-left px-4 py-2 hover:bg-muted transition">
                  <Lock className="w-4 h-4" />
                  Privacy
                </button>
                <div className="border-t my-1" />
                <button className="w-full flex items-center gap-2 text-left px-4 py-2 hover:bg-muted transition">
                  <LifeBuoy className="w-4 h-4" />
                  Support
                </button>
                <div className="border-t my-1" />
                <button onClick={()=> signOut({ callbackUrl: "/signup" })} className="w-full cursor-pointer flex items-center gap-2 text-left px-4 pt-2 pb-3">
                  <LogOutIcon className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="*:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-3 grid grid-cols-1 gap-6 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card lg:px-6 py-6">
        
         {shops?.map((shop)=>(
          <Link key={shop?.businessName} href={`${shop?.id}/dashboard`}>
            <Card className="@container/card cursor-pointer">
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
        <CreatShop></CreatShop>
      </div>
    </div>
  );
}

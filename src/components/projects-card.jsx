"use client"
import {
  LifeBuoy,
  Lock,
  LogOutIcon,
  Shield,
  TrendingDownIcon,
  TrendingUpIcon,
  UserCircle2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
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
import { signOut } from "next-auth/react";

export function ProjectsCard() {
  return (
    <div>
      <div className="flex flex-row items-center justify-between p-6 gap-4 border-b bg-white dark:bg-background">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Apidoxy Logo" className="h-8 w-8" />
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
      <div className="*:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 grid grid-cols-1 gap-6 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card lg:px-6 py-6">
        <Link href="123/dashboard">
          <Card className="@container/card">
            <CardHeader className="relative">
              <CardDescription>Total Revenue</CardDescription>
              <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                $1,250.00
              </CardTitle>
              <div className="absolute right-4 top-4">
                <Badge
                  variant="outline"
                  className="flex gap-1 rounded-lg text-xs"
                >
                  <TrendingUpIcon className="size-3" />
                  +12.5%
                </Badge>
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Trending up this month <TrendingUpIcon className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Visitors for the last 6 months
              </div>
            </CardFooter>
          </Card>
        </Link>
        <Link href="123/dashboard">
          <Card className="@container/card">
            <CardHeader className="relative">
              <CardDescription>New Customers</CardDescription>
              <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                1,234
              </CardTitle>
              <div className="absolute right-4 top-4">
                <Badge
                  variant="outline"
                  className="flex gap-1 rounded-lg text-xs"
                >
                  <TrendingDownIcon className="size-3" />
                  -20%
                </Badge>
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Down 20% this period <TrendingDownIcon className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Acquisition needs attention
              </div>
            </CardFooter>
          </Card>
        </Link>

        <Link href="123/dashboard">
          <Card className="@container/card">
            <CardHeader className="relative">
              <CardDescription>Active Accounts</CardDescription>
              <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                45,678
              </CardTitle>
              <div className="absolute right-4 top-4">
                <Badge
                  variant="outline"
                  className="flex gap-1 rounded-lg text-xs"
                >
                  <TrendingUpIcon className="size-3" />
                  +12.5%
                </Badge>
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Strong user retention <TrendingUpIcon className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Engagement exceed targets
              </div>
            </CardFooter>
          </Card>
        </Link>
        <Link href="123/dashboard">
          <Card className="@container/card">
            <CardHeader className="relative">
              <CardDescription>Growth Rate</CardDescription>
              <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                4.5%
              </CardTitle>
              <div className="absolute right-4 top-4">
                <Badge
                  variant="outline"
                  className="flex gap-1 rounded-lg text-xs"
                >
                  <TrendingUpIcon className="size-3" />
                  +4.5%
                </Badge>
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Steady performance <TrendingUpIcon className="size-4" />
              </div>
              <div className="text-muted-foreground">
                Meets growth projections
              </div>
            </CardFooter>
          </Card>
        </Link>
      </div>
    </div>
  );
}

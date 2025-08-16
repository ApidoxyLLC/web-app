"use client";

import * as React from "react";
import { ChevronLeft, ChevronsUpDown, Plus } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import Link from "next/link";

import { Avatar,AvatarImage, AvatarFallback } from "./ui/avatar";
import { useParams, useRouter } from "next/navigation";
import useFetch from "@/hooks/useFetch";
export function TeamSwitcher( {teams} ) {
  const { isMobile } = useSidebar();
  const [activeTeam, setActiveTeam] = React.useState(teams?.[0]);
  const router = useRouter()
  const {shop} = useParams()
  const {data} = useFetch(`/${shop}`)
  const shops = useFetch(`/shops`)
  const imageUrl = `http://localhost:3000/api/v1/image/${shop}/${data?.configuration?.logo?.imageName}`;
  if (!activeTeam) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground">
                
                <Avatar className="h-10 w-10">
                  <AvatarImage src={imageUrl} />
                  <AvatarFallback>
                    {activeTeam?.businessName?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeTeam.businessName}
                </span>
                <span className="truncate text-xs">{activeTeam.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Shops
            </DropdownMenuLabel>
            {teams.map((team, index) => (
              <Link href={`/${team.id}/dashboard`}>
                <DropdownMenuItem
                  key={index}
                  onClick={() => {
                    setActiveTeam(team)
                  }}
                  className="gap-2 p-2"
                >
                  <Avatar className="h-10 w-10">
                  <AvatarImage src={`http://localhost:3000/api/v1/image/${team.id}/${shops.data?.configuration?.logo?.imageName}`}/>
                  <AvatarFallback>
                    {team?.businessName?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                  </Avatar>
                  {team.businessName}
                </DropdownMenuItem>
              </Link>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" asChild>
              <Link href="../shops#create">
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <Plus className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">
                  Create a new shop
                </div>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" asChild>
              <Link href="../shops">
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <ChevronLeft className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">
                  Back to dashboard
                </div>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

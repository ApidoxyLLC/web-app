"use client"

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { signOut } from "next-auth/react";
import Link from "next/link";

export function NavProjects({
  projects
}) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarMenu>
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              {item.name === "Logout" ?
              <div className="cursor-pointer" onClick={() => signOut({ callbackUrl: "/signup" })}>
                <item.icon />
                <span>{item.name}</span>
              </div> : <Link href={item.url}>
                <item.icon />
                <span>{item.name}</span>
              </Link>}
              
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

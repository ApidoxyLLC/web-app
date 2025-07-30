"use client"

import * as React from "react"
import {
  BadgeHelp,
  CreditCard,
  Factory,
  LogOut,
  MonitorSmartphoneIcon,
  Settings2,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { TeamSwitcher } from "./team-switcher"
import useFetch from "@/hooks/useFetch"

// This is sample datas.

const datas = {
  user: {
    name: "Oprotichita",
    email: "o@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Store Manager",
      url: "#",
      icon: Factory,
      isActive: true,
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
        },
        {
          title: "Orders",
          url: "/orders",
        },
        {
          title: "Categories",
          url: "/categories",
        },
        {
          title: "Products",
          url: "/products",
        },
        {
          title: "Customers",
          url: "/customers",
        },
      ],
    },
    {
      title: "Configuration",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Settings",
          url: "/settings",
        },
        {
          title: "Users & Permissions",
          url: "/permissions",
        },
      ],
    },
    {
      title: "Website & Apps",
      url: "#",
      icon: MonitorSmartphoneIcon,
      items: [
        {
          title: "Website",
          url: "/website",
        },
        {
          title: "Andorid",
          url: "/android",
        },
      ],
    },
    {
      title: "Subscriptions",
      url: "#",
      icon: CreditCard,
      items: [
        {
          title: "Billing History",
          url: "/history",
        },
        {
          title: "Plans",
          url: "/plans",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Logout",
      url: "../logout",
      icon: LogOut,
    },
    {
      name: "Support",
      url: "../support",
      icon: BadgeHelp,
    },
  ],
}

export function AppSidebar({
  ...props
}) {
  
  const { data, loading } = useFetch("/shops")
  if (loading) return;
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher shop={props.shop} teams={data?.data} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={datas.navMain} />
        <NavProjects projects={datas.projects} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

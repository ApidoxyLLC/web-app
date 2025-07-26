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

// This is sample data.
const data = {
  user: {
    name: "Oprotichita",
    email: "o@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  shops: [
    {
      name: "JCI Bangladesh",
      email: "admin@jci.org.bd",
      logo: "https://i.ibb.co/fVtsTKWv/icon.png",
    },
    {
      name: "Restarizer Inc",
      email: "company@example.com",
      logo: "https://i.pinimg.com/236x/87/e1/63/87e1632235613ea35be3809b8dac2628.jpg",
    },
    {
      name: "Shake over",
      email: "name@example.com",
      logo: "https://i.pinimg.com/236x/87/e1/63/87e1632235613ea35be3809b8dac2628.jpg",
    },
  ],
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
          title: "Templates",
          url: "/templates",
        },
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
        {
          title: "iOS",
          url: "/ios",
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
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher shop={props.shop} teams={data.shops} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

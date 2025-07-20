import { Card } from "@/components/ui/card";
import {
  BanknoteArrowUpIcon,
  BellElectricIcon,
  BellRing,
  BotIcon,
  LetterTextIcon,
  Scale,
  Share2,
  Truck,
  Wrench,
  Globe,
} from "lucide-react";
import Link from "next/link";
import React from "react";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
const features = [
  {
    icon: Wrench,
    title: "Shop Settings",
    link: "/configuration",
    description:
      "Design your space with drag-and-drop simplicity—create grids, lists, or galleries in seconds.",
  },
  {
    icon: Scale,
    title: "Shop Policy",
    link: "/policy",
    description:
      "Embed polls, quizzes, or forms to keep your audience engaged.",
  },
  {
    icon: Share2,
    title: "Social Links",
    link: "/social",
    description:
      "Generate summaries, auto-format content, or translate into multiple languages seamlessly.",
  },
  {
    icon: Truck,
    title: "Delivery Partners",
    link: "/delivery",
    description:
      "Connect with Spotify, Instagram, or your own media library for dynamic visuals and sound.",
  },
  {
    icon: BanknoteArrowUpIcon,
    title: "Payment Partners",
    link: "/payment",
    description:
      "Track engagement, clicks, and user activity with intuitive charts and reports.",
  },
  {
    icon: BellElectricIcon,
    title: "Real-time Updates",
    link: "/updates",
    description:
      "Connect with Spotify, Instagram, or your own media library for dynamic visuals and sound.",
  },
  {
    icon: LetterTextIcon,
    title: "SMS and Email",
    link: "/sms",
    description:
      "Track engagement, clicks, and user activity with intuitive charts and reports.",
  },
  {
    icon: BotIcon,
    title: "Support Chat",
    link: "/chat",
    description:
      "Comment, tag, and assign tasks directly within your documents.",
  },
  {
    icon: Globe,
    title: "SEO & Marketing Integrations",
    link: "/marketing",
    description:
      "Enhance visibility and growth with powerful SEO tools and marketing platform integrations.",
  },
];

const Page = () => {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex flex-row flex-1 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Configuration</BreadcrumbPage>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex-1"></div>
          <ModeToggle />
        </div>
      </header>
      <div className="min-h-screen flex items-center justify-center py-4">
        <div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-screen-lg  mx-auto px-6">
            {features.map((feature, index) => (
              <Link href={`./settings${feature.link}`} key={index}>
                <Card
                  className=" h-full  border rounded-xl py-6 px-5"
                  asChild
                >
                  <div className="mb-3 h-10 w-10 flex items-center justify-center bg-muted rounded-full">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <span className="text-lg -my-6 font-semibold">{feature.title}</span>
                  <p className="mt-1 text-foreground/80 text-[15px]">
                    {feature.description}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Page;

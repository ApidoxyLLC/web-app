"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useFetch from "@/hooks/useFetch";
import { cn } from "@/lib/utils";
import { CircleCheck, CircleHelp } from "lucide-react";
import { useState } from "react";

const tooltipContent = {
  styles: "Choose from a variety of styles to suit your preferences.",
  filters: "Choose from a variety of filters to enhance your portraits.",
  credits: "Use these credits to retouch your portraits.",
};

const YEARLY_DISCOUNT = 20;
const plans = [
  {
    name: "Basic",
    price: 0,
    description: "Perfect for individuals or startups to explore essential features.",
    features: [
      { title: "1 Subdomain" },
      { title: "No Custom Domain" },
      { title: "1 Android App Build" },
      { title: "1 Payment Gateway" },
      { title: "1 Delivery Partner" },
      { title: "1 SMS Gateway" },
      { title: "No additional users" },
      { title: "500 Push Notifications" },
      { title: "Up to 15 Products Listed" },
    ],
    buttonText: "Start with Basic",
  },
  {
    name: "Standard",
    price: 1000,
    isRecommended: true,
    description: "Ideal for small to medium businesses with growing demands.",
    features: [
      { title: "1 Subdomain" },
      { title: "1 Custom Domain" },
      { title: "2 Android App Builds" },
      { title: "2 Payment Gateway" },
      { title: "2 Delivery Partner" },
      { title: "2 SMS Gateway" },
      { title: "Multi-User Access (Up to 4 Users)" },
      { title: "5,000 Push Notifications" },
      { title: "Up to 100 Products Listed" },
    ],
    buttonText: "Upgrade to Standard",
    isPopular: true,
  },
  {
    name: "Premium",
    price: 2000,
    description: "All-inclusive access with advanced scalability and control.",
    features: [
      { title: "2 Subdomains" },
      { title: "3 Custom Domains" },
      { title: "3 Android App Builds" },
      { title: "3 Payment Gateway" },
      { title: "3 Delivery Partner" },
      { title: "3 SMS Gateway" },
      { title: "Advanced User Access" },
      { title: "Unlimited Push Notifications" },
      { title: "Unlimited Product Listings" },
    ],
    buttonText: "Go Premium",
  },
];
const {data, loading} = useFetch("/subscription-plans")



const Pricing = () => {
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState("monthly");

  return (
    <div className="min-h-screen flex flex-col items-center p-6">
      <Tabs
        value={selectedBillingPeriod}
        onValueChange={setSelectedBillingPeriod}
        className="mt-6"
      >
        <TabsList className="h-11 px-1.5 rounded-full">
          <TabsTrigger value="monthly" className="py-1.5 rounded-full">
            Monthly
          </TabsTrigger>
          <TabsTrigger value="yearly" className="py-1.5 rounded-full">
            Yearly (Save {YEARLY_DISCOUNT}%)
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mt-12 max-w-screen-lg mx-auto grid grid-cols-1 lg:grid-cols-3 items-center gap-8">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn("relative border rounded-xl p-6", {
              "border-[2px] border-primary py-10": plan.isPopular,
            })}
          >
            {plan.isPopular && (
              <Badge className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2">
                Most Popular
              </Badge>
            )}
            <h3 className="text-lg font-medium">{plan.name}</h3>
            <p className="mt-2 text-4xl font-bold">
              
              {selectedBillingPeriod === "monthly"
                ? plan.price
                : plan.price * ((100 - YEARLY_DISCOUNT) / 100) *12} BDT
              <span className="ml-1.5 text-sm text-muted-foreground font-normal">
                {selectedBillingPeriod === "monthly" ? "/month" : "/year"}
              </span>
            </p>
            <p className="mt-4 font-medium text-muted-foreground">
              {plan.description}
            </p>

            <Button
              variant={plan.isPopular ? "default" : "outline"}
              size="lg"
              className="w-full mt-6"
            >
              {plan.buttonText}
            </Button>
            <Separator className="my-8" />
            <ul className="space-y-2">
              {plan.features.map((feature) => (
                <li key={feature.title} className="flex items-start gap-1.5">
                  <CircleCheck className="h-4 w-4 mt-1 text-green-600" />
                  {feature.title}
                  {feature.tooltip && (
                    <Tooltip>
                      <TooltipTrigger className="cursor-help">
                        <CircleHelp className="h-4 w-4 mt-1 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent>{feature.tooltip}</TooltipContent>
                    </Tooltip>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Pricing;

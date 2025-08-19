"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useFetch from "@/hooks/useFetch";
import { cn } from "@/lib/utils";
import { CircleCheck, CircleHelp } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const YEARLY_DISCOUNT = 20;

const Pricing = () => {
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState("monthly");
  const { data, loading } = useFetch("/subscription-plans");
  const {shop}= useParams()
  const plans = data || [];

  const handleSubscribe = async (planSlug) => {
    try {
      const res = await fetch("/api/v1/invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planSlug,
          duration: selectedBillingPeriod,
          shopReferenceId: shop,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Error:", data);
        toast.error(data.message || "Something went wrong");
        return;
      }

      // Payment URL এ redirect
      window.location.href = data.redirectURL;
    } catch (err) {
      console.error("Payment Error:", err);
      toast.error("Payment initiation failed!");
    } 
  };
  if (loading) {
    return <div className="p-6 text-center">Loading plans...</div>;
  }

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
            key={plan._id}
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
                : plan.price * ((100 - YEARLY_DISCOUNT) / 100) * 12}{" "}
              BDT
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
              onClick={()=>{handleSubscribe(plan.slug)}}
            >
              {plan.buttonText}
            </Button>
            <Separator className="my-8" />
            <ul className="space-y-2">
              <li className="flex items-start gap-1.5">
                <CircleCheck className="h-4 w-4 mt-1 text-green-600" />
                {plan.services.website.subdomains} Subdomain
              </li>
              <li className="flex items-start gap-1.5">
                <CircleCheck className="h-4 w-4 mt-1 text-green-600" />
                {plan.services.website.customDomains} Custom Domain
              </li>
              <li className="flex items-start gap-1.5">
                <CircleCheck className="h-4 w-4 mt-1 text-green-600" />
                {plan.services.androidBuilds} Android App Builds
              </li>
              <li className="flex items-start gap-1.5">
                <CircleCheck className="h-4 w-4 mt-1 text-green-600" />
                {plan.services.paymentGateways} Payment Gateways
              </li>
              <li className="flex items-start gap-1.5">
                <CircleCheck className="h-4 w-4 mt-1 text-green-600" />
                {plan.services.deliveryGateways} Delivery Partners
              </li>
              <li className="flex items-start gap-1.5">
                <CircleCheck className="h-4 w-4 mt-1 text-green-600" />
                {plan.services.smsGateways} SMS Gateway
              </li>
              <li className="flex items-start gap-1.5">
                <CircleCheck className="h-4 w-4 mt-1 text-green-600" />
                {plan.services.userAccess} Additional Users
              </li>
              <li className="flex items-start gap-1.5">
                <CircleCheck className="h-4 w-4 mt-1 text-green-600" />
                {plan.services.pushNotifications.toLocaleString()} Push Notifications
              </li>
              <li className="flex items-start gap-1.5">
                <CircleCheck className="h-4 w-4 mt-1 text-green-600" />
                {plan.services.products.toLocaleString()} Products Listed
              </li>
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Pricing;

"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, SquareArrowOutUpRight, Trash2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { Card } from "./ui/card";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useParams } from "next/navigation";
import useFetch from "@/hooks/useFetch";

export default function Domain() {
  const [tab, setTab] = useState("default");
  const [subdomain, setSubdomain] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [loadingState, setLoadingState] = useState(false);
  const shop = useParams();
  const shopId = shop.shop;
  console.log(shopId)
  const { data, refetch, loading } = useFetch(`/${shopId}/domains`);
  const domainsList = data?.domains || [];
  console.log(domainsList)
  const allowedDomains = [
    "apidoxy.com",
    "apidoxy.shop",
    "apidoxy.bazar",
    "apidoxy.net",
    "apidoxy.store",
    "appcommerz.com",
  ];

  const copyToast = () => {
    toast("Copied", { description: "Link copied to clipboard" });
  };

  const apiPath = "/api/v1/add-domain";

  function SkeletonBox({ height = "h-7", width = "w-full" }) {
  return (
    <div
      className={`bg-gray-200 animate-pulse rounded-md ${height} ${width}`}
    ></div>
  );
}
  async function addCustomDomain() {
    const subdomainTrim = subdomain.trim().toLowerCase();
    const domain = selectedDomain;

    if (!subdomainTrim) {
      toast.error("Please enter a subdomain (e.g. `test`).");
      return;
    }
    if (subdomainTrim.length < 2 || subdomainTrim.length > 63) {
      toast.error("Subdomain must be between 2 and 63 characters.");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(subdomainTrim)) {
      toast.error("Subdomain can only contain letters, numbers and hyphens.");
      return;
    }
    if (!domain) {
      toast.error("Please select a domain from the list.");
      return;
    }
    if (!allowedDomains.includes(domain)) {
      toast.error("Selected domain is not allowed.");
      return;
    }

    setLoadingState(true);

    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain: subdomainTrim, domain, shopId }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result?.error || "Failed to add domain");
        return;
      }

      toast.success("Domain connected");
      setSubdomain("");
      setSelectedDomain("");
      refetch();
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setLoadingState(false);
    }
  }
  async function handleDeleteDomain(domainName) {
  if (!confirm(`Are you sure you want to delete the domain "${domainName}"?`)) return;

  setLoadingState(true);

  try {
    const res = await fetch(`/api/v1/${shopId}/domains`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domainToDelete: domainName,
        domainId: "", 
        shopId,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      toast.error(result?.error || "Failed to delete domain");
      return;
    }

    toast.success("Domain deleted successfull");
    refetch(); // ডোমেইন লিস্ট আবার ফ্রেশ করবে
  } catch (error) {
    console.error(error);
    toast.error("An unexpected error occurred.");
  } finally {
    setLoadingState(false);
  }
}

  const defaultDomain = domainsList[0] ? [{ name: domainsList[0], isActive: true, isDeletable: false }] : [];
  const customDomains = domainsList?.slice(1).map(d => ({ name: d, isActive: true, isDeletable: true }));

  return (
    <Card className="p-6">
      <Tabs defaultValue="default" className="w-full">
        <div className="flex flex-col md:flex-row gap-2 justify-between mb-3">
          <TabsList className="w-fit md:w-auto mb-2 md:mb-0">
            <TabsTrigger value="default" onClick={() => setTab("default")}>
              <span className="text-[13px]">Default Domain</span>
            </TabsTrigger>
            <TabsTrigger value="custom" onClick={() => setTab("custom")}>
              <span className="text-[13px]">Custom Domain</span>
            </TabsTrigger>
          </TabsList>

          {tab === "custom" && (
            <div className="flex flex-col md:flex-row gap-2">
              <Input
                id="custom-domain"
                type="text"
                placeholder="Subdomain (e.g. test)"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
              />
              <Select value={selectedDomain} onValueChange={(val) => setSelectedDomain(val)}>
                <SelectTrigger className="min-w-[180px]">
                  <SelectValue placeholder="Choose a domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {allowedDomains.map((d, i) => (
                      <SelectItem key={i} value={d} disabled={d !== "appcommerz.com"}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button className="h-9" onClick={addCustomDomain} disabled={loadingState}>
                {loadingState ? "Connecting..." : "Connect"}
              </Button>
            </div>
          )}
        </div>

        {/* Default domains list */}
        <TabsContent value="default">
          <div className={`flex flex-col justify-between ${loading || "border"} rounded-md`}>
            {loading ? (<div className="space-y-3">
                <SkeletonBox />
                <SkeletonBox />
              </div> ):

            defaultDomain.length === 0 ? (
              <div className="flex justify-center items-center p-10 text-sm italic">
                No domain connected
              </div>
            ) : (
              defaultDomain.map((item, index) => (
                <div key={index} className="flex flex-col">
                  <div className="h-10 flex items-center justify-between gap-1 pl-3 pr-1.5">
                    <span className="text-[13px]">{item.name}</span>
                    <Badge variant="secondary">{item.isActive ? "Active" : "Not active"}</Badge>
                    <div className="flex-1" />
                    {item.isDeletable && (
                      <Button size="icon" onClick={() => handleDeleteDomain(item.name)} variant="secondary" className="h-7 w-7" >
                        <Trash2 className="!h-3.5 !w-3.5" />
                      </Button>
                    )}
                    <Button size="icon" variant="secondary" className="h-7 w-7" asChild>
                      <Link href={"https://" + item.name} target="blank">
                        <SquareArrowOutUpRight className="!h-3.5 !w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7"
                      onClick={() => {
                        navigator.clipboard.writeText(item.name);
                        copyToast();
                      }}
                    >
                      <Copy className="!h-3.5 !w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Custom domains list */}
        <TabsContent value="custom">
          <div className="flex flex-col justify-between border rounded-md">
            {loading ? (
  <div className="space-y-3">
                <SkeletonBox />
                <SkeletonBox />
              </div> 
):

            customDomains.length === 0 ? (
              <div className="flex justify-center items-center p-10 text-sm italic">
                No domain connected
              </div>
            ) : (
              customDomains.map((item, index) => (
                <div key={index} className="flex flex-col">
                  <div className="h-10 flex items-center justify-between gap-1 pl-3 pr-1.5">
                    <span className="text-[13px]">{item.name}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary">{item.isActive ? "Active" : "Not active"}</Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {item.isActive ? (
                          <p>Domain is active</p>
                        ) : (
                          <p>
                            Add <strong>CNAME</strong> record in your DNS pointing to{" "}
                            <strong>desiree.apidoxy.com. </strong>
                            <Link href="https://google.com">Learn more</Link>
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                    <div className="flex-1" />
                    {item.isDeletable && (
                      <Button size="icon" onClick={() => handleDeleteDomain(item.name)} variant="secondary" className="h-7 w-7">
                        <Trash2 className="!h-3.5 !w-3.5" />
                      </Button>
                    )}
                    <Button size="icon" variant="secondary" className="h-7 w-7" asChild>
                      <Link href={"https://" + item.name} target="blank">
                        <SquareArrowOutUpRight className="!h-3.5 !w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7"
                      onClick={() => navigator.clipboard.writeText(item.name)}
                    >
                      <Copy className="!h-3.5 !w-3.5" />
                    </Button>
                  </div>
                  {index !== customDomains.length - 1 && <Separator />}
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

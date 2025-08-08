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

export default function Domain() {
  // make domains stateful so UI can update after adding
  const [domains, setDomains] = useState({
    default: [
      { name: "test.apidoxy.com", isActive: true, isDeletable: false },
      { name: "test2.apidoxy.com", isActive: true, isDeletable: true },
    ],
    custom: [
      { name: "apidoxy.com", isActive: true, isDeletable: true },
      { name: "darson.com", isActive: false, isDeletable: true },
    ],
  });

  // UI state
  const [tab, setTab] = useState("default");
  const [subdomain, setSubdomain] = useState(""); // user enters subdomain (e.g. "test")
  const [selectedDomain, setSelectedDomain] = useState(""); // one of allowed domains
  const [loading, setLoading] = useState(false);
  const shop = useParams()
  const shopId = shop.shop
  // allowed domains (keeps logic in one place)
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

  // NOTE: update this path to your actual API route
  const apiPath = "/api/v1/add-domain-to-vercel";

  async function addCustomDomain() {
    // basic client-side validation (server still validates)
    const subdomainTrim = subdomain.trim().toLowerCase();
    const domain = selectedDomain;
    console.log("kotai harai gelo domain",domain,shopId,subdomainTrim)
    if (!subdomainTrim) {
      toast.error("Please enter a subdomain (e.g. `test`).");
      return;
    }

    // subdomain constraints similar to your zod schema
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

    setLoading(true);

    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subdomain: subdomainTrim, domain, shopId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.error === "Validation error" && Array.isArray(data.details)) {
          data.details.forEach((d) => toast.error(`${d.field}: ${d.message}`));
        } else {
          toast.error(data?.error || "Failed to add domain");
        }
        return;
      }

      // success: response contains `domain` (fullDomain)
      toast.success("Domain connected");

      // Update UI: add to domains.custom
      const fullDomain = data?.domain || `${subdomainTrim}.${domain}`;
      setDomains((prev) => ({
        ...prev,
        custom: [
          ...prev.custom,
          { name: fullDomain, isActive: !!data?.verified, isDeletable: true },
        ],
      }));

      // reset inputs
      setSubdomain("");
      setSelectedDomain("");
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  // Render
  return (
    <Card className="p-6">
      <Tabs defaultValue="default" className="w-full">
        <div className="flex flex-col md:flex-row gap-2 justify-between mb-3">
          <TabsList className="w-fit md:w-auto mb-2 md:mb-0">
            <TabsTrigger
              value="default"
              onClick={() => {
                setTab("default");
              }}
            >
              <span className="text-[13px]">Default Domain</span>
            </TabsTrigger>
            <TabsTrigger
              value="custom"
              onClick={() => {
                setTab("custom");
              }}
            >
              <span className="text-[13px]">Custom Domain</span>
            </TabsTrigger>
          </TabsList>

          <div>
            {tab === "custom" && (
              <div className="flex flex-col md:flex-row gap-2">
                {/* subdomain input */}
                <Input
                  id="custom-domain"
                  type="text"
                  placeholder="Subdomain (e.g. test)"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                />

                {/* controlled Select */}
                <Select
                  value={selectedDomain}
                  onValueChange={(val) => setSelectedDomain(val)}
                >
                  <SelectTrigger className="min-w-[180px]">
                    <SelectValue placeholder="Choose a domain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {/* disable specific ones if you want */}
                      <SelectItem value="apidoxy.com" disabled>
                        apidoxy.com
                      </SelectItem>
                      <SelectItem value="apidoxy.shop" disabled>
                        apidoxy.shop
                      </SelectItem>
                      <SelectItem value="apidoxy.bazar" disabled>
                        apidoxy.bazar
                      </SelectItem>
                      <SelectItem value="apidoxy.net" disabled>
                        apidoxy.net
                      </SelectItem>
                      <SelectItem value="apidoxy.store" disabled>
                        apidoxy.store
                      </SelectItem>
                      <SelectItem value="appcommerz.com">
                        appcommerz.com
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Button
                  className="h-9"
                  onClick={addCustomDomain}
                  disabled={loading}
                >
                  {loading ? "Connecting..." : "Connect"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Default domains list */}
        <TabsContent value="default">
          <div className="flex flex-col justify-between border rounded-md">
            {domains.default.length === 0 ? (
              <div className="flex justify-center items-center p-10 text-sm italic">
                No domain connected
              </div>
            ) : (
              domains.default.map((item, index) => (
                <div key={index} className="flex flex-col">
                  <div className="h-10 flex items-center justify-between gap-1 pl-3 pr-1.5">
                    <span className="text-[13px]">{item.name}</span>
                    <Badge variant="secondary">
                      {item.isActive ? "Active" : "Not active"}
                    </Badge>
                    <div className="flex-1" />
                    {item.isDeletable && (
                      <Button size="icon" variant="secondary" className="h-7 w-7">
                        <Trash2 className="!h-3.5 !w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7"
                      asChild
                    >
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
                  {index != domains.default.length - 1 && <Separator />}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Custom domains list */}
        <TabsContent value="custom">
          <div className="flex flex-col justify-between border rounded-md">
            {domains.custom.length === 0 ? (
              <div className="flex justify-center items-center p-10 text-sm italic">
                No domain connected
              </div>
            ) : (
              domains.custom.map((item, index) => (
                <div key={index} className="flex flex-col">
                  <div className="h-10 flex items-center justify-between gap-1 pl-3 pr-1.5">
                    <span className="text-[13px]">{item.name}</span>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary">
                          {item.isActive ? "Active" : "Not active"}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        {item.isActive ? (
                          <p>Domain is active</p>
                        ) : (
                          <p>
                            Add <strong>CNAME</strong> record in your DNS
                            pointing to{" "}
                            <strong>desiree.apidoxy.com.{" "}</strong>
                            <Link href="https://google.com">Learn more</Link>
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>

                    <div className="flex-1" />
                    {item.isDeletable && (
                      <Button size="icon" variant="secondary" className="h-7 w-7">
                        <Trash2 className="!h-3.5 !w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7"
                      asChild
                    >
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
                  {index != domains.custom.length - 1 ? <Separator /> : null}
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}

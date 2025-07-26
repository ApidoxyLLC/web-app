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
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export default function Domain() {
  const copy = () => {
    toast("Copied", {
      description: "Link copied to clipboard",
    });
  };
  const addCustomDomain = () => {
    toast("Domain connected", {
      description:
        "Please add a CNAME record in your DNS pointing to test.apidoxy.com",
      action: {
        label: "Learn more",
        onClick: () => window.open("https://www.example.com", "_blank"),
      },
    });
  };
  const domains = {
    default: [
      {
        name: "test.apidoxy.com",
        isActive: true,
        isDeletable: false,
      },
      {
        name: "test.apidoxy.com",
        isActive: true,
        isDeletable: true,
      },
    ],
    custom: [
      {
        name: "apidoxy.com",
        isActive: true,
        isDeletable: true,
      },
      {
        name: "darson.com",
        isActive: false,
        isDeletable: true,
      },
    ],
  };
  const [domain, setDomain] = useState("default");
  const setDefaultDomain = () => {
    setDomain("default");
  };
  const setCustomDomain = () => {
    setDomain("custom");
  };
  console.log(domain);
  return (
    <Card className="p-6">
      <Tabs defaultValue="default" className=" w-full">
        <div className="flex flex-col md:flex-row gap-2 justify-between mb-3">
          <TabsList className="w-fit md:w-auto mb-2 md:mb-0">
            <TabsTrigger value="default" onClick={setDefaultDomain}>
              <span className="text-[13px]">Default Domain</span>
            </TabsTrigger>
            <TabsTrigger value="custom" onClick={setCustomDomain}>
              <span className="text-[13px]">Custom Domain</span>
            </TabsTrigger>
          </TabsList>
          <div className="mb-1">
            <div className="flex flex-col md:flex-row gap-2">
              <Input id="custom-domain" type="url" placeholder="Domain name" />
              {domain === "default" && (
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a domain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="apidoxy.com">apidoxy.com</SelectItem>
                      <SelectItem value="apidoxy.shop">apidoxy.shop</SelectItem>
                      <SelectItem value="apidoxy.bazar">
                        apidoxy.bazar
                      </SelectItem>
                      <SelectItem value="apidoxy.net">apidoxy.net</SelectItem>
                      <SelectItem value="apidoxy.store">
                        apidoxy.store
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
              <Button className="h-10" onClick={addCustomDomain}>
                Connect
              </Button>
            </div>
          </div>
        </div>
        <TabsContent value="default">
          <div className="flex flex-col justify-between border rounded-md">
            {domains.default.length == 0 ? (
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
                    <div className="flex-1"></div>
                    {item.isDeletable && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7"
                      >
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
                        copy();
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
        <TabsContent value="custom">
          <div className="flex flex-col justify-between border rounded-md">
            {domains.custom.length == 0 ? (
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
                            <strong>
                              desiree.apidoxy.com.{" "}
                              <Link href="https://google.com">Learn more</Link>
                            </strong>
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                    <div className="flex-1"></div>
                    {item.isDeletable && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7"
                      >
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

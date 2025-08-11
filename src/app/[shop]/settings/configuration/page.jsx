"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FaRegImages } from "react-icons/fa";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectValue,
} from "@/components/ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown, LoaderIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ControlGroup, ControlGroupItem } from "@/components/ui/control-group";
import {
  InputBase,
  InputBaseAdornment,
  InputBaseControl,
  InputBaseInput,
} from "@/components/ui/input-base";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import useFetch from "@/hooks/useFetch";

export default function StoreSettings() {
  const {shop} = useParams()
  const {data, loading} = useFetch(`/${shop}`)
  const {configuration} = data
  const [formData, setFormData] = useState({
    shop,
    businessName: "",
    email: "",
    phone: "",
    industry: "",
    country: "",
    address: "",
  });
  
  useEffect(()=>{
    setFormData({
      businessName: configuration?.businessName,
      email: configuration?.contact?.email,
      phone: configuration?.contact?.phone,
      industry: configuration?.industry,
      country: configuration?.country,
      address: configuration?.location,
    })
  },[configuration])
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(`/api/v1/settings/configuration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Shop updated successfully!");
      } else {
        console.error(data);
        alert(data.error || "Update failed");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };
  if(loading){
    return (
      <div className="flex h-64 items-center justify-center">
        <LoaderIcon className="h-8 w-8 animate-spin" />
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-muted/100 ">
      <div className="lg:col-span-2 h-fit flex flex-col gap-6">
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-md -mt-1 font-semibold">
              Business Information
            </h2>

            <div className="grid grid-cols-1 gap-6">
              <ControlGroup>
                <ControlGroupItem className="shadow-none h-10">
                  <InputBase>
                    <InputBaseAdornment>Business</InputBaseAdornment>
                  </InputBase>
                </ControlGroupItem>
                <ControlGroupItem className="w-full shadow-none">
                  <InputBase>
                    <InputBaseControl>
                      <InputBaseInput
                        placeholder="Enter your business name"
                        value={formData?.businessName}
                        onChange={(e) => handleChange("businessName", e.target.value)}
                      />
                    </InputBaseControl>
                  </InputBase>
                </ControlGroupItem>
              </ControlGroup>
              
              <Select
               value={formData.industry}
                onValueChange={(value) => handleChange("industry", value)}>
                <SelectPrimitive.Trigger
                  className={cn(
                    "flex h-10 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm  ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
                    "w-full"
                  )}
                >
                  <SelectValue placeholder="Select industry" />
                  <SelectPrimitive.Icon asChild>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </SelectPrimitive.Icon>
                </SelectPrimitive.Trigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Industry</SelectLabel>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <ControlGroup>
                <ControlGroupItem className="shadow-none h-10">
                  <InputBase>
                    <InputBaseAdornment>Email</InputBaseAdornment>
                  </InputBase>
                </ControlGroupItem>
                <ControlGroupItem className="w-full shadow-none">
                  <InputBase>
                    <InputBaseControl>
                      <InputBaseInput
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                      />
                    </InputBaseControl>
                  </InputBase>
                </ControlGroupItem>
              </ControlGroup>

              <div>
                <ControlGroup>
                  <ControlGroupItem className="shadow-none h-10">
                    <InputBase>
                      <InputBaseAdornment>Phone</InputBaseAdornment>
                    </InputBase>
                  </ControlGroupItem>
                  <ControlGroupItem className="w-full shadow-none">
                    <InputBase>
                      <InputBaseControl>
                        <InputBaseInput
                          placeholder="+880123456789"
                          value={formData.phone}
                          onChange={(e) => handleChange("phone", e.target.value)}
                        />
                      </InputBaseControl>
                    </InputBase>
                  </ControlGroupItem>
                </ControlGroup>
                <p className="text-xs text-gray-500 mt-1">
                  Include country code
                </p>
              </div>

              <Select
                value={formData.country}
                onValueChange={(value) => handleChange("country", value)}>
                <SelectPrimitive.Trigger
                  className={cn(
                    "flex h-10 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm  ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
                    "w-full"
                  )}
                >
                  <SelectValue placeholder="Select Country" />
                  <SelectPrimitive.Icon asChild>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </SelectPrimitive.Icon>
                </SelectPrimitive.Trigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Country</SelectLabel>
                    <SelectItem value="Bangladesh">Bangladesh</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <ControlGroup>
                <ControlGroupItem className="shadow-none h-10">
                  <InputBase>
                    <InputBaseAdornment>Address</InputBaseAdornment>
                  </InputBase>
                </ControlGroupItem>
                <ControlGroupItem className="w-full shadow-none">
                  <InputBase>
                    <InputBaseControl>
                      <InputBaseInput
                        placeholder="123 Main St, City"
                        value={formData.address}
                        onChange={(e) => handleChange("address", e.target.value)}
                      />
                    </InputBaseControl>
                  </InputBase>
                </ControlGroupItem>
              </ControlGroup>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleUpdate}>Update Shop Info</Button>
            </div>
          </CardContent>
        </Card>
         <Card>
          <CardContent className="space-y-4">
            <div>
              <h2 className="text-md font-semibold pt-5">Language Settings</h2>
              <div className="flex flex-col gap-3 mt-2 md:flex-row md:items-center md:justify-between">
                <label className="block  text-sm text-gray-400 font-medium ">
                  Default Language
                </label>
                <Select>
                  <SelectPrimitive.Trigger
                    className={cn(
                      "flex h-10 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm  ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
                      "w-44"
                    )}
                  >
                    <SelectValue placeholder="Select Language" />
                    <SelectPrimitive.Icon asChild>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </SelectPrimitive.Icon>
                  </SelectPrimitive.Trigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Language</SelectLabel>
                      <SelectItem value="bn_BD">Bengali(Bangladehs)</SelectItem>
                      <SelectItem value="en_US">English(US)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button>Update Store Settings</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
       

        <Card>
          <CardContent className="p-6 pt-5 text-center space-y-4">
            <h2 className="text-md font-semibold mb-4 text-start">Store Logo</h2>
            <div className="w-full h-28 bg-primary-foreground border-2 border-dashed flex items-center justify-center rounded-md cursor-pointer">
              <FaRegImages className="text-4xl" />
            </div>
            <div className="pt-1">
              <Button className="w-full">Upload Logo</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

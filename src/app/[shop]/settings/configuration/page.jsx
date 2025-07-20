import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FiCopy } from "react-icons/fi";
import { FaRegImages } from "react-icons/fa";
import { BsQrCode } from "react-icons/bs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import { ControlGroup, ControlGroupItem } from "@/components/ui/control-group";
import {
  InputBase,
  InputBaseAdornment,
  InputBaseControl,
  InputBaseInput,
} from "@/components/ui/input-base";

export default function StoreSettings() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-muted/100 ">
      <div className="lg:col-span-2 h-fit flex flex-col gap-6">
        <Card>
          <CardContent className=" space-y-4  p-6">
            <h2 className="text-md -mt-1 font-semibold ">
              Business Information
            </h2>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <ControlGroup>
                  <ControlGroupItem className="shadow-none h-10">
                    <InputBase>
                      <InputBaseAdornment>Business </InputBaseAdornment>
                    </InputBase>
                  </ControlGroupItem>
                  <ControlGroupItem className="w-full shadow-none">
                    <InputBase>
                      <InputBaseControl>
                        <InputBaseInput placeholder="Enter your business name" />
                      </InputBaseControl>
                    </InputBase>
                  </ControlGroupItem>
                </ControlGroup>
              </div>

              <Select>
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

              <div>
                <ControlGroup>
                  <ControlGroupItem className="shadow-none h-10">
                    <InputBase>
                      <InputBaseAdornment>Email</InputBaseAdornment>
                    </InputBase>
                  </ControlGroupItem>
                  <ControlGroupItem className="w-full shadow-none">
                    <InputBase>
                      <InputBaseControl>
                        <InputBaseInput placeholder="you@example.com" />
                      </InputBaseControl>
                    </InputBase>
                  </ControlGroupItem>
                </ControlGroup>
              </div>

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
                        <InputBaseInput placeholder="+1234567890" />
                      </InputBaseControl>
                    </InputBase>
                  </ControlGroupItem>
                </ControlGroup>
                <p className="text-xs text-gray-500 mt-1">
                  Include country code
                </p>
              </div>

              <Select>
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

              <div>
                <ControlGroup>
                  <ControlGroupItem className="shadow-none h-10">
                    <InputBase>
                      <InputBaseAdornment>Address</InputBaseAdornment>
                    </InputBase>
                  </ControlGroupItem>
                  <ControlGroupItem className="w-full shadow-none">
                    <InputBase>
                      <InputBaseControl>
                        <InputBaseInput placeholder="123 Main St, City" />
                      </InputBaseControl>
                    </InputBase>
                  </ControlGroupItem>
                </ControlGroup>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button>Update Shop Info</Button>
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
        <Card className="">
          <CardContent className="p-6 pt-5 text-center space-y-4">
            <h2 className=" mb-4 text-md font-semibold text-start">Store QR</h2>
            <div className="w-full h-40  flex flex-col items-center justify-center rounded-md">
              <BsQrCode className="text-9xl"></BsQrCode>
              <p className="text-sm pt-2">Scan to visit</p>
            </div>
            <div className="mt-2 flex items-center justify-between border p-2 rounded-md overflow-x-auto">
              <span className="text-sm text-gray-400">https://apidoxy.com</span>
              <FiCopy className="cursor-pointer"></FiCopy>
            </div>
            <div className="pt-1">
              <Button className=" w-full">Save QR</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 pt-5 text-center space-y-4">
            <h2 className="text-md font-semibold mb-4 text-start">
              Store Logo
            </h2>
            <div className="w-full h-28 bg-primary-foreground border-2 border-dashed flex items-center justify-center rounded-md cursor-pointer">
              <FaRegImages className="text-4xl"></FaRegImages>
            </div>
            <div className="pt-1">
              <Button className=" w-full">Upload Logo</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

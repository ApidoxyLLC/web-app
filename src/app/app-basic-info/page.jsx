import React from "react";
import Image from "next/image";
import logo from "../../../public/favicon.ico";

import { Card, CardContent } from "@/components/ui/card";

import {
  InputBase,
  InputBaseAdornment,
  InputBaseControl,
  InputBaseInput,
} from "@/components/ui/input-base";

import { ControlGroup, ControlGroupItem } from "@/components/ui/control-group";

import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModeToggle } from "@/components/mode-toggle";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
// import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
const AppBasicInfo = () => {
  return (
    <div>
      <div className="flex flex-row items-center gap-6">
        {/* <ModeToggle />
        <Popover>
          <PopoverTrigger asChild>
            <div className="cursor-pointer">
              <Avatar className="h-10 w-10">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0 border bg-muted/100 shadow-lg rounded-xl relative  z-50 mr-2">
            <div className="p-4 border-b trap ">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">John Doe</div>
                  <div className="text-xs text-muted-foreground">
                    john@example.com
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col">
              <button className="w-full flex items-center gap-2 text-left px-4 py-2 hover:bg-muted transition">
                <UserCircle2 className="w-4 h-4" />
                Account
              </button>
              <button className="w-full flex items-center gap-2 text-left px-4 py-2 hover:bg-muted transition">
                <Shield className="w-4 h-4" />
                Security
              </button>
              <button className="w-full flex items-center gap-2 text-left px-4 py-2 hover:bg-muted transition">
                <Lock className="w-4 h-4" />
                Privacy
              </button>
              <div className="border-t my-1" />
              <button className="w-full flex items-center gap-2 text-left px-4 py-2 hover:bg-muted transition">
                <LifeBuoy className="w-4 h-4" />
                Support
              </button>
              <div className="border-t my-1" />
              <button className="w-full flex items-center gap-2 text-left px-4 py-2 hover:bg-muted transition">
                <LogOutIcon className="w-4 h-4" />
                Logout
              </button>
            </div>
          </PopoverContent>
        </Popover> */}
      </div>
      <Card className="overflow-hidden flex justify-center mt-10  border-none p-0 shadow-none ">
        <CardContent className="grid p-0 md:grid-cols-2 w-10/12  ">
          {/* Left Image Section */}
          <div className="flex flex-col items-center justify-center ">
            <Image src={logo} width={240} alt="Apidoxy Logo" />
            <p className="-mt-6 text-blue-400 text-2xl italic font-bold">
              Apidoxy
            </p>
            <p className="text-blue-400 text-xl italic">Easy Apps Anytime</p>
          </div>

          {/* Right Form Section */}
          <form className="p-6 md:p-8 w-full">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Business Info</h1>
                <p className="text-muted-foreground text-balance">
                  Set up your business details to continue
                </p>
              </div>

              {/* Country Field */}
              <ControlGroup className="w-full">
                <ControlGroupItem>
                  <InputBase>
                    <InputBaseAdornment>Country</InputBaseAdornment>
                  </InputBase>
                </ControlGroupItem>
                <ControlGroupItem className="flex-1 h-4">
                  <InputBase>
                    <InputBaseControl>
                      <Select>
                        <SelectTrigger className="w-full border-none shadow-none">
                          <SelectValue placeholder="Select Country" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bd">Bangladesh</SelectItem>
                          <SelectItem value="in">India</SelectItem>
                          <SelectItem value="us">USA</SelectItem>
                        </SelectContent>
                      </Select>
                    </InputBaseControl>
                  </InputBase>
                </ControlGroupItem>
              </ControlGroup>

              {/* Industry Field */}
              <ControlGroup className="w-full">
                <ControlGroupItem>
                  <InputBase>
                    <InputBaseAdornment>Industry</InputBaseAdornment>
                  </InputBase>
                </ControlGroupItem>
                <ControlGroupItem className="flex-1 h-4">
                  <InputBase>
                    <InputBaseControl>
                      <Select>
                        <SelectTrigger className="w-full border-none shadow-none">
                          <SelectValue placeholder="Select Industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tech">Tech</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                        </SelectContent>
                      </Select>
                    </InputBaseControl>
                  </InputBase>
                </ControlGroupItem>
              </ControlGroup>

              {/* Business Name Field */}
              <ControlGroup className="w-full">
                <ControlGroupItem>
                  <InputBase>
                    <InputBaseAdornment>Business Name</InputBaseAdornment>
                  </InputBase>
                </ControlGroupItem>
                <ControlGroupItem className="flex-1">
                  <InputBase>
                    <InputBaseControl>
                      <InputBaseInput
                        name="businessName"
                        placeholder="Enter your business name"
                      />
                    </InputBaseControl>
                  </InputBase>
                </ControlGroupItem>
              </ControlGroup>

              {/* Business Location Field */}
              <ControlGroup className="w-full">
                <ControlGroupItem>
                  <InputBase>
                    <InputBaseAdornment>Location</InputBaseAdornment>
                  </InputBase>
                </ControlGroupItem>
                <ControlGroupItem className="flex-1">
                  <InputBase>
                    <InputBaseControl>
                      <InputBaseInput
                        name="businessLocation"
                        placeholder="Enter location (Optional)"
                      />
                    </InputBaseControl>
                  </InputBase>
                </ControlGroupItem>
              </ControlGroup>

              {/* Submit Button */}
              <Button type="submit" className="w-full">
                Next (✓)
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppBasicInfo;

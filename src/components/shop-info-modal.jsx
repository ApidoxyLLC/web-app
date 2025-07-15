"use client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  InputBase,
  InputBaseAdornment,
  InputBaseControl,
  InputBaseInput,
} from "@/components/ui/input-base";

import { ControlGroup, ControlGroupItem } from "@/components/ui/control-group";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
export default function AlertDialogDemo() {
    const router = useRouter()
    const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const formData = {
                        country: form.get("country"),
                        industry: form.get("industry"),
                        businessName: form.get("businessName"),
                        location: form.get("businessLocation"),
                      };

    // if(!name){
    //   return toast.error("Name is required");

    // }
    // if(!phone){
    //   return toast.error("Phone is required");

    // }
    // if(!password){
    //   return toast.error("Password is required");

    // }
    try{
      const res = await fetch("http://localhost:3000/api/v1/shops",{
        method:"POST",
        headers:{
          "Content-type" :"application/json"
        },
        body:JSON.stringify(formData)
      })
      console.log(res)
      if(res.ok){

        alert("shop created")
        console.log(res)
        router.push("http://localhost:3000/123/dashboard")
      }
      else{
        alert("err")
      }
    }catch(err){
      console.log(err)
    }
  };
  return (
    <AlertDialog >
      <AlertDialogTrigger asChild>
        <Button variant="outline">Creat a business</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader> 
        <form onSubmit={handleSubmit} className="p-6 md:p-8 w-full">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Business Info</h1>
                <p className="text-muted-foreground text-balance">
                  Set up your business details to continue
                </p>
              </div>
              <ControlGroup className="w-full">
                <ControlGroupItem>
                  <InputBase>
                    <InputBaseAdornment>Country</InputBaseAdornment>
                  </InputBase>
                </ControlGroupItem>
                <ControlGroupItem className="flex-1 h-4">
                  <InputBase >
                    <InputBaseControl>
                      <Select name="country">
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

              <ControlGroup className="w-full">
                <ControlGroupItem>
                  <InputBase>
                    <InputBaseAdornment>Industry</InputBaseAdornment>
                  </InputBase>
                </ControlGroupItem>
                <ControlGroupItem className="flex-1 h-4">
                  <InputBase>
                    <InputBaseControl>
                      <Select name="industry"> 
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
                Next
              </Button>
            </div>
        </form>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
}
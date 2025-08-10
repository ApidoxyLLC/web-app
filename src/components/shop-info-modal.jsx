"use client";

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
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function CreatShop() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const formData = {
      country: form.get("country"),
      industry: form.get("industry"),
      businessName: form.get("businessName"),
      location: form.get("businessLocation"),
    };
    try {
      const res = await fetch("/api/v1/shops", {
        method: "POST",
        headers: {
          "Content-type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success("Shop created");
        setOpen(false)
        router.push(`/`);
      } else {
        toast.error("Error creating shop");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <Button variant="outline" className="h-full rounded-xl shadow-sm text-xl" onClick={() => setOpen(true)}>
        Create a Business
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full p-6 relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-gray-500 hover:text-black text-xl"
            >
              &times;
            </button>

            <form onSubmit={handleSubmit} className="p-2 md:p-4 w-full">
              <div className="flex flex-col gap-6">
                <div className="text-center">
                  <h1 className="text-2xl font-bold">Business Info</h1>
                  <p className="text-muted-foreground text-sm">
                    Set up your business details to continue
                  </p>
                </div>

                {/* Country */}
                <ControlGroup className="w-full">
                  <ControlGroupItem>
                    <InputBase>
                      <InputBaseAdornment>Country</InputBaseAdornment>
                    </InputBase>
                  </ControlGroupItem>
                  <ControlGroupItem className="flex-1 h-4">
                    <InputBase>
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

                {/* Industry */}
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

                {/* Business Name */}
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

                {/* Location */}
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

                {/* Submit */}
                <Button type="submit" className="w-full">
                  Next
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

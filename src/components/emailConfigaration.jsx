"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ControlGroup, ControlGroupItem } from "@/components/ui/control-group";
import {
  InputBase,
  InputBaseAdornment,
  InputBaseControl,
  InputBaseInput,
} from "@/components/ui/input-base";
import { useParams } from "next/navigation";
import { toast } from "sonner";

const emailFields = [
  { label: "SMTP", name: "smtp", type: "text" },
  { label: "Port", name: "port", type: "text" },
  { label: "Username", name: "username", type: "text" },
  { label: "Password", name: "password", type: "password" },
];

export default function EmailConfigDashboard() {
  const [formData, setFormData] = useState({});
  const [savedData, setSavedData] = useState(null);
  const {shop} = useParams()
  const handleAdd = async () => {
    const payload = {
      shop,
      provider: "smtp",
      ...formData
    }
    try {
    const response = await fetch("/api/v1/sms-email-services", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    if (response.ok) {
      toast.success("Configured Email Service");
      setSavedData(formData);
      setFormData({});
    } else {
      toast.error(result?.error || "Failed to update");
    }
  } catch (error) {
    console.error("Error saving provider:", error);
  }
  };

  const handleDelete = () => {
    setSavedData(null);
  };

  return (
    <div className=" bg-muted/100 ">
      <Card>
        <CardContent className="space-y-6">
          <p className="text-md pt-4 font-semibold">Configure Email Service</p>
          {!savedData && (
            <div className="flex flex-col gap-4 mt-4">
              {emailFields.map((f) => (
                <ControlGroup key={f.name}>
                  <ControlGroupItem className="shadow-none">
                    <InputBase className="h-10">
                      <InputBaseAdornment className=" w-[80px]">
                        {f.label}
                      </InputBaseAdornment>
                    </InputBase>
                  </ControlGroupItem>
                  <ControlGroupItem className="w-full shadow-none">
                    <InputBase>
                      <InputBaseControl>
                        <InputBaseInput
                          type={f.type}
                          required
                          value={formData[f.name] || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              [f.name]: e.target.value,
                            }))
                          }
                          placeholder={`Enter ${f.label}`}
                        />
                      </InputBaseControl>
                    </InputBase>
                  </ControlGroupItem>
                </ControlGroup>
              ))}
              <div className="flex justify-end">
                <Button onClick={handleAdd} className="mt-4" >
                Add <span className="text-xl">+</span>
              </Button>
              </div>
            </div>
          )}

          {savedData && (
            <div className="mt-6 border p-4 rounded-md">
              <h4 className="font-semibold mb-4">Email Configuration</h4>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(savedData).map(([key, value]) => (
                  <p
                    key={key}
                    className="text-sm border rounded-md py-2 px-3 col-span-1"
                  >
                    <strong>{key}</strong>: {value}
                  </p>
                ))}
                <Button
                  variant="destructive"
                  className="col-span-2"
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

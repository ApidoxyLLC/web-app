"use client";

import EmailConfigDashboard from "@/components/emailConfigaration";
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
import { useState } from "react";

const smsProviders = [
  {
    name: "Balk SMS BD",
    id: "bulk_sms_bd",
    fields: [
      { label: "API Key", name: "apiKey", type: "text" },
      { label: "Sender ID", name: "senderId", type: "text" },
    ],
  },
  {
    name: "Alpha Net BD",
    id: "alpha_net_bd",
    fields: [
      { label: "API Key", name: "apiKey", type: "text" },
      { label: "Sender ID", name: "senderId", type: "text" },
    ],
  },
  {
    name: "ADN Diginet",
    id: "adn_diginet_bd",
    fields: [
      { label: "API Key", name: "apiKey", type: "text" },
      { label: "Sender ID", name: "senderId", type: "text" },
      { label: "Client ID", name: "clientId", type: "text" },
      { label: "Client Secret", name: "clientSecret", type: "password" },
    ],
  },
];

export default function Dashboard() {
  const [selected, setSelected] = useState("Balk SMS BD");
  const [formData, setFormData] = useState({});
  const [savedData, setSavedData] = useState({});
  const {shop} = useParams()
  const handleAdd = async () => {
  const provider = smsProviders.find((p) => p.name === selected);
  if (!provider) return;

  const payload = {
    provider: provider.id,
    shop,
    ...formData
  };
  console.log(payload)

  try {
    const response = await fetch("/api/v1/sms-services", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to save SMS provider");
    }

    const result = await response.json();

    // Update local state on success
    setSavedData((prev) => ({ ...prev, [provider.id]: formData }));
    setFormData({});
    console.log("Success:", result);
  } catch (error) {
    console.error("Error saving provider:", error);
  }
};

  const handleDelete = (id) => {
    const newSaved = { ...savedData };
    delete newSaved[id];
    setSavedData(newSaved);
  };

  const currentProvider = smsProviders.find((p) => p.name === selected);
  const isAdded = savedData[currentProvider?.id];

  return (
    <div className="p-6 bg-muted/100 h-full space-y-6">
      <Card>
        <CardContent className="space-y-6">
          <p className="text-md pt-4 font-semibold">Integrate SMS Service</p>

          <div className="flex gap-4">
            {smsProviders.map((p) => (
              <Button
                key={p.id}
                variant="outline"
                onClick={() => setSelected(p.name)}
                className={`border-2 rounded-md ${
                  selected === p.name ? "border-foreground" : ""
                }`}
              >
                {p.name}
              </Button>
            ))}
          </div>

          {!isAdded && currentProvider && (
            <div>
              <div className="flex flex-col gap-4 mt-4">
                {currentProvider.fields.map((f) => (
                  <ControlGroup key={f.name}>
                    <ControlGroupItem className="shadow-none">
                      <InputBase className="h-10">
                        <InputBaseAdornment className="text-xs w-[70px] ">
                          {f.label}
                        </InputBaseAdornment>
                      </InputBase>
                    </ControlGroupItem>
                    <ControlGroupItem className="w-full shadow-none">
                      <InputBase>
                        <InputBaseControl>
                          <InputBaseInput
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                [f.name]: e.target.value,
                              }))
                            }
                            placeholder={`Enter ${f.label}`}
                            type={f.type}
                            required
                          />
                        </InputBaseControl>
                      </InputBase>
                    </ControlGroupItem>
                  </ControlGroup>
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                onClick={handleAdd}
                className="mt-4"
              >
                Add <span className="text-xl">+</span>
              </Button>
              </div>
            </div>
          )}

          {(() => {
            const current = smsProviders.find((p) => p.name === selected);
            console.log("cur",current)
            if (!current) return null;

            const info = savedData[current.id];
            console.log(info)
            if (!info) return null;

            return (
              <div key={current.id} className="mt-6 border p-4 rounded-md">
                <h4 className="font-semibold mb-4">{current.label}</h4>

                <div className={`grid grid-cols-2 items-center gap-6`}>
                  {Object.entries(info).map(([fieldName, value]) => (
                    <p
                      key={fieldName}
                      className="text-sm border rounded-md py-[9px] col-span-1 pl-4"
                    >
                      <strong>{fieldName}</strong>: {value}
                    </p>
                  ))}
                  <Button
                    variant="destructive"
                    className="col-span-2"
                    onClick={() => handleDelete(current.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
      <EmailConfigDashboard></EmailConfigDashboard>
    </div>
  );
}

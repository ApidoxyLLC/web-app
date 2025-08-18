"use client";
import AdvancePaymentCard from "@/components/paymentGateway";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ControlGroup, ControlGroupItem } from "@/components/ui/control-group";
import { Input } from "@/components/ui/input";
import {
  InputBase,
  InputBaseAdornment,
  InputBaseControl,
  InputBaseInput,
} from "@/components/ui/input-base";
import { Label } from "@/components/ui/label";
import { useState } from "react";
const payment = [
  {
    name: "Cash On Delivery",
    id: "cashOnDelivery",
    fields: [],
    disabled: false
  },
  {
    name: "Bkash",
    id: "bkash",
    fields: [
      { label: "Merchant App Key", name: "app_key", type: "text" },
      { label: "Merchant Secret Key", name: "secret_key", type: "text" },
      { label: "Merchant Username", name: "username", type: "text" },
      { label: "Merchant Password", name: "password", type: "password" },
    ],
    disabled: true
  },
];
export default function Dashboard() {
  const [selected, setSelected] = useState("Cash On Delivery");
  const [formData, setFormData] = useState({});
  const [savedData, setSavedData] = useState({});

  const handleAdd = () => {
    const provider = payment.find((p) => p.name === selected);
    if (!provider) return;
    setSavedData((prev) => ({ ...prev, [provider.id]: formData }));
    setFormData({});
  };

  const handleDelete = (id) => {
    const newSaved = { ...savedData };
    delete newSaved[id];
    setSavedData(newSaved);
  };

  const currentProvider = payment.find((p) => p.name === selected);
  const isAdded = savedData[currentProvider?.id];
  return (
    <div className="p-6 bg-muted/100 h-full space-y-6">
      <Card className="shadow-none">
        <CardContent className="space-y-6">
          <p className="text-md pt-4 font-semibold">
            Integrate Payment Service
          </p>

          <div className="flex gap-4">
            {payment.map((p) => (
              <Button
                key={p.id}
                variant="outline"
                onClick={() => setSelected(p.name)}
                className={`border-2 rounded-md ${
                  selected === p.name ? "border-foreground" : ""
                }`}
                disabled={p.disabled}
              >
                {p.name}
              </Button>
            ))}
          </div>

          {!isAdded && currentProvider.name !== "Cash On Delivery" && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 mt-4 border rounded-lg p-6">
                <p className="font-semibold">
                  Configure {currentProvider.name}
                </p>
                {currentProvider.fields.map((f) => (
                  <ControlGroup key={f.name}>
                    <ControlGroupItem className="shadow-none">
                      <InputBase className="h-10">
                        <InputBaseAdornment className=" w-[130px] ">
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
                                [f.label]: e.target.value,
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
              <AdvancePaymentCard></AdvancePaymentCard>
            </div>
          )}
          <div className="w-full">
            <Label htmlFor="massage" className="font-semibold">
              Payment process message note
            </Label>
            <Input id="massage" type="email" className="mt-1" />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleAdd}  >
            Add <span className="text-xl">+</span>
          </Button>
          </div>

          {(() => {
            const current = payment.find((p) => p.name === selected);
            if (!current) return null;

            const info = savedData[current.id];
            if (!info) return null;

            return (
              <div key={current.id} className="mt-6 border p-4 rounded-md">
                <h4 className="font-semibold mb-4">{current.name}</h4>

                <div className={`grid grid-cols-2 items-center gap-6`}>
                  {Object.entries(info).map(([fieldName, value]) => (
                    <p
                      key={fieldName}
                      className="text-sm border rounded-md py-[9px] col-span-1 pl-4"
                    >
                      <strong>{fieldName}</strong>: {value}
                    </p>
                  ))}
                  
                </div>
                <div className="flex justify-end mt-6">
                  <Button
                    variant="destructive"
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
    </div>
  );
}

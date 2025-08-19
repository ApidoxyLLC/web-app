"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import useFetch from "@/hooks/useFetch";
import { useParams } from "next/navigation";
import { LoaderIcon } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const { shop } = useParams();

  const [notifyMethod, setNotifyMethod] = useState("email");
  const [input, setInput] = useState({
    email: "",
    phone: "",
    whatsapp: "",
  });
  const [edit, setEdit] = useState(false);
  const [btn, setBtn] = useState(false);
  const [loadingState, setloadingState] = useState(false);
  // const [count, setCount] = useState("1");
  const [orderCount, setOrderCount] = useState("1");
  const [hourCount, setHourCount] = useState("1");
  
  const [triggerBasis, setTriggerBasis] = useState("order");

  const { data, loading } = useFetch(`/${shop}`);
  const { realTimeUpdates } = data || {};

  useEffect(() => {
    if (realTimeUpdates?.notification) {
      const notif = realTimeUpdates.notification;

      setNotifyMethod(notif.preferredChannel || "email");

      setInput({
        email: notif.email || "",
        phone: notif.phone || "", 
        whatsapp: notif.whatsapp || "",
      });

      if (notif.orderNotifications?.enabled) {
        setTriggerBasis("order");
        setOrderCount(String(notif.orderNotifications.frequency || "1"));
      } else if (notif.hourlyNotification?.enabled) {
        setTriggerBasis("hourly");
        setHourCount(String(notif.hourlyNotification.intervalHours || "1"));
      } else {
        setTriggerBasis("order");
        setHourCount("1");
        setOrderCount("1")
      }
    }
  }, [realTimeUpdates]);

  const saveBtn = async () => {
    setloadingState(true);

    try {
      const res = await fetch("/api/v1/settings/notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop,
          triggerBasis,
          count :  triggerBasis === "order" ? orderCount : hourCount ,
          notifyVia: [notifyMethod],
          email: notifyMethod === "email" ? input.email : null,
          phone: notifyMethod === "sms" ? input.phone : null,
          whatsapp: notifyMethod === "whatsapp" ? input.whatsapp : null,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success("Notification settings updated successfully");
        setEdit(false);
        setBtn(false);
      } else {
        toast.error(result?.error || "Something went wrong");
      }
    } catch (error) {
      console.error("API Error:", error);
      toast.error("Failed to update notification settings");
    } finally {
      setloadingState(false);
    }
  };
  if(loading){
    return(
      <div className="flex h-64 items-center justify-center">
        <LoaderIcon className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-muted/100 h-full p-6 grid grid-cols-3 gap-6">
      <div className="col-span-2 flex flex-col gap-6">
        <Card>
          <CardContent>
            <p className="text-md font-semibold pb-2">Notify Me For</p>
            <RadioGroup
              value={triggerBasis}
              onValueChange={(val) => setTriggerBasis(val)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="order" id="r1" />
                <Label htmlFor="r1">Every</Label>
                <select
                  className="border rounded-lg"
                  value={orderCount}
                  onChange={(e) => setOrderCount(e.target.value)}
                >
                  {[...Array(9)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <Label htmlFor="r1">orders</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hourly" id="r2" />
                <Label htmlFor="r2">Every</Label>
                <select
                  className="border rounded-lg"
                  value={hourCount}
                  onChange={(e) => setHourCount(e.target.value)}
                >
                  {[...Array(9)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
                <Label htmlFor="r2">hours</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <p className="text-md font-semibold pb-2">Notify With Me</p>
            <RadioGroup value={notifyMethod} onValueChange={setNotifyMethod}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="n1" />
                <Label htmlFor="n1">Via Email</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sms" id="n2" />
                <Label htmlFor="n2">Via SMS</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="whatsapp" id="n3" />
                <Label htmlFor="n3">Via Whatsapp</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardContent className="col-span-1 flex gap-3 items-end">
            {notifyMethod === "email" && (
              <div className="space-y-2">
                <h3 className="text-md font-semibold">Email</h3>
                <Input
                  type="email"
                  value={input.email}
                  readOnly={!edit}
                  onChange={(e) => {
                    setInput({ ...input, email: e.target.value });
                    setBtn(true);
                  }}
                  required
                />
              </div>
            )}

            {notifyMethod === "sms" && (
              <div className="space-y-2">
                <h3 className="text-md font-semibold">Phone Number</h3>
                <Input
                  type="text"
                  value={input.phone}
                  readOnly={!edit}
                  onChange={(e) => {
                    setInput({ ...input, phone: e.target.value });
                    setBtn(true);
                  }}
                  required
                />
              </div>
            )}

            {notifyMethod === "whatsapp" && (
              <div className="space-y-2">
                <h3 className="text-md font-semibold">WhatsApp Number</h3>
                <Input
                  type="text"
                  value={input.whatsapp}
                  readOnly={!edit}
                  onChange={(e) => {
                    setInput({ ...input, whatsapp: e.target.value });
                    setBtn(true);
                  }}
                  required
                />
              </div>
            )}

            {btn ? (
              <Button onClick={saveBtn} disabled={loadingState}>
                {loadingState ? "Updating..." : "Update"}
              </Button>
            ) : (
              <Button onClick={() => setEdit(true)}>Edit</Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

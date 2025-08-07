"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useParams } from "next/navigation";
import { useState } from "react";
// OTP component imported but not used (temporarily)
// import {
//   InputOTP,
//   InputOTPGroup,
//   InputOTPSlot,
// } from "@/components/ui/input-otp";

export default function Dashboard() {
  const [notifyMethod, setNotifyMethod] = useState("email");
  const [input, setInput] = useState({
    email: "user@example.com",
    phone: "+880123456789",
    whatsapp: "+880123456789",
  });
  const [edit, setEdit] = useState(false);
  const [btn, setBtn] = useState(false);
  const [clickOtp, setClickOtp] = useState(false);
  const [otp, setOtp] = useState(0);
  const [count, setCount] = useState("1");
  const [triggerBasis, setTriggerBasis] = useState("order");
  const {shop} = useParams()
  const [loading, setLoading] = useState(false);
  const saveBtn = async () => {
    setLoading(true);
    // OTP verification temporarily disabled
    // if (otp === 1234) {
    try {
      const res = await fetch("/api/v1/settings/notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop, 
          triggerBasis,
          count,
          notifyVia: [notifyMethod],
          email: notifyMethod === "email" ? input.email : null,
          phone: notifyMethod === "sms" ? input.phone : null,
          whatsapp: notifyMethod === "whatsapp" ? input.whatsapp : null,
        }),
      });
      console.log(shop, 
          triggerBasis,
          count,
           [notifyMethod],
    notifyMethod === "email" ? input.email : null,
    notifyMethod === "sms" ? input.phone : null,
          notifyMethod === "whatsapp" ? input.whatsapp : null,)
      const result = await res.json();
      if (res.ok) {
        alert("Notification settings updated successfully");
        setEdit(false);
        setBtn(false);
        setClickOtp(false);
      } else {
        alert(result?.error || "Something went wrong");
      }
    } catch (error) {
      console.error("API Error:", error);
      alert("Failed to update notification settings");
    } finally {
    setLoading(false); // Stop loading
  }
    // } else {
    //   alert("OTP is invalid");
    // }
  };

  return (
    <div className="bg-muted/100 h-full p-6 grid grid-cols-3 gap-6">
      <div className="col-span-2 flex flex-col gap-6">
        <Card>
          <CardContent>
            <p className="text-md font-semibold pb-2">Notify Me For</p>
            <RadioGroup
              defaultValue="order"
              onValueChange={(val) => setTriggerBasis(val)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="order" id="r1" />
                <Label htmlFor="r1">Every</Label>
                <select
                  className="border rounded-lg"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
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
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
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
            <RadioGroup defaultValue="email" onValueChange={setNotifyMethod}>
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
  <Button
    onClick={() => {
      saveBtn();
    }}
    disabled={loading}
  >
    {loading ? "Updating..." : "Update"}
  </Button>
) : (
  <Button onClick={() => setEdit(true)}>
    Edit
  </Button>
)}

          </CardContent>

          {/* OTP Section - Temporarily disabled */}
          {/* {clickOtp && (
            <CardContent className="flex gap-3">
              <InputOTP
                maxLength={4}
                onChange={(value) => {
                  setOtp(Number(value));
                }}
              >
                <InputOTPGroup className="flex gap-[7px]">
                  <InputOTPSlot index={0} className="rounded-md border-l" />
                  <InputOTPSlot index={1} className="rounded-md border-l" />
                  <InputOTPSlot index={2} className="rounded-md border-l" />
                  <InputOTPSlot index={3} className="rounded-md border-l" />
                </InputOTPGroup>
              </InputOTP>
              <Button onClick={saveBtn}>Save</Button>
            </CardContent>
          )} */}
        </Card>
      </div>
    </div>
  );
}

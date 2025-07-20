"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

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
  console.log(otp);
  const saveBtn = () => {
    if (otp === 1234) {
      alert("Verification Successful");
      setEdit(false);
      setBtn(false);
      setClickOtp(false);
    } else {
      alert("OTP is invaild");
    }
  };
  return (
    <div className="bg-muted/100 h-full p-6 grid grid-cols-3 gap-6">
      <div className="col-span-2 flex flex-col gap-6">
        <Card>
          <CardContent className="py-6">
            <p className="text-md font-semibold pb-2">Notify Me For</p>
            <RadioGroup defaultValue="order">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="order" id="r1" />
                <Label htmlFor="r1">Every</Label>
                <select className="border rounded-lg">
                  <option value="">1</option>
                  <option value="">2</option>
                  <option value="">3</option>
                  <option value="">4</option>
                  <option value="">5</option>
                  <option value="">6</option>
                  <option value="">7</option>
                  <option value="">8</option>
                  <option value="">9</option>
                </select>
                <Label htmlFor="r1">orders</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hour" id="r2" />
                <Label htmlFor="r2">Every</Label>
                <select className="border rounded-lg">
                  <option value="">1</option>
                  <option value="">2</option>
                  <option value="">3</option>
                  <option value="">4</option>
                  <option value="">5</option>
                  <option value="">6</option>
                  <option value="">7</option>
                  <option value="">8</option>
                  <option value="">9</option>
                </select>
                <Label htmlFor="r2">hours</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <p className="text-md font-semibold pb-2">Notify With Me</p>
            <RadioGroup defaultValue="email" onValueChange={setNotifyMethod}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="r1" />
                <Label htmlFor="r1">Via Email</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sms" id="r2" />
                <Label htmlFor="r2">Via SMS</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="whatsapp" id="r3" />
                <Label htmlFor="r3">Via Whatsapp</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>
      <div>
        <Card>
          <CardContent className="col-span-1 pt-6 flex gap-3 items-end">
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
                  required={true}
                />
              </div>
            )}

            {notifyMethod === "sms" && (
              <div className="space-y-2">
                <h3 className="text-md font-semibold">Phone Number</h3>
                <Input
                  type="email"
                  value={input.phone}
                  readOnly={!edit}
                  onChange={(e) => {
                    setInput({ ...input, phone: e.target.value });
                    setBtn(true);
                  }}
                  required={true}
                />
              </div>
            )}

            {notifyMethod === "whatsapp" && (
              <div className="space-y-2">
                <h3 className="text-md font-semibold">WhatsApp Number</h3>
                <Input
                  type="email"
                  value={input.whatsapp}
                  readOnly={!edit}
                  onChange={(e) => {
                    setInput({ ...input, whatsapp: e.target.value });
                    setBtn(true);
                  }}
                  required={true}
                />
              </div>
            )}
            {btn ? (
              <Button
                variant="outline"
                onClick={() => {
                  setClickOtp(true);
                  alert("OTP Sended");
                }}
              >
                Verify
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setEdit(true);
                }}
              >
                Edit
              </Button>
            )}
          </CardContent>
          {clickOtp && (
            <CardContent className=" flex gap-3">
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
          )}
        </Card>
      </div>
    </div>
  );
}

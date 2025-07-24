"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ControlGroup, ControlGroupItem } from "@/components/ui/control-group";
import {
  InputBase,
  InputBaseAdornment,
  InputBaseControl,
  InputBaseInput,
} from "@/components/ui/input-base";
import { useState } from "react";

export default function Dashboard() {
  const [selected, setSelected] = useState("facebook");
  // const
  return (
    <div
      className="bg-muted/100 p-6 h-full
    "
    >
      <Card>
        <CardContent className="space-y-6">
          <p className="text-md pt-4 font-semibold">Chat Support</p>

          <div className="flex gap-6">
            <Button
              variant="outline"
              onClick={() => setSelected("facebook")}
              className={`border-2 rounded-md ${
                selected === "facebook" ? "border-foreground" : ""
              }`}
            >
              Facebook
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelected("whatsapp")}
              className={`border-2 rounded-md ${
                selected === "whatsapp" ? "border-foreground" : ""
              }`}
            >
              Whatsapp
            </Button>
          </div>
          <div>
            {selected === "facebook" && (
              <ControlGroup className="h-10">

                <ControlGroupItem className="shadow-none">
                  <InputBase>
                    <InputBaseAdornment className="text-xs w-[100px]">
                      Facebook Page ID
                    </InputBaseAdornment>
                  </InputBase>
                </ControlGroupItem>
                <ControlGroupItem className="w-full shadow-none">
                  <InputBase>
                    <InputBaseControl>
                      <InputBaseInput
                        type="url"
                        placeholder="https://facebook.com/your-page"
                        required
                      />
                    </InputBaseControl>
                  </InputBase>
                </ControlGroupItem>
              </ControlGroup>
            )}
            {selected === "whatsapp" && (
              <ControlGroup className="h-10">
                <ControlGroupItem className="shadow-none">
                  <InputBase>
                    <InputBaseAdornment className="text-xs w-[105px]">
                      Whatsapp Number
                    </InputBaseAdornment>
                  </InputBase>
                </ControlGroupItem>
                <ControlGroupItem className="w-full shadow-none">
                  <InputBase>
                    <InputBaseControl>
                      <InputBaseInput
                        placeholder={`https://wa.me/8801XXXXXXXXX`}
                        type="number"
                        required
                      />
                    </InputBaseControl>
                  </InputBase>
                </ControlGroupItem>
              </ControlGroup>
            )}
          </div>
          <div>
            <Button className="mt-4 w-full" variant="outline">
              Update Chat Support Info. <span className="text-xl"></span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

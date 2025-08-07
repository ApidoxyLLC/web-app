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
import { useParams } from "next/navigation";
import { useState } from "react";

export default function Dashboard() {
  const {shop} =useParams()
  const [selected, setSelected] = useState("facebook");
  const [formData, setFormData] = useState({
    facebookLink : "",
    whatsappLink : ""
  })
 
 const handleSubmit = async () => {
  const mainData = {
    shop,
    provider: selected,
    link: selected === "facebook" ? formData.facebookLink : formData.whatsappLink,
  };

  try {
    const res = await fetch(`/api/v1/settings/support-chat`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mainData),
    });

    const data = await res.json();

    if (res.ok) {
      alert("Shop updated successfully!");
      setFormData({
        facebookLink: "",
        whatsappLink: ""
      });
    } else {
      console.error(data);
      alert(data.error || "Update failed");
    }
  } catch (err) {
    console.error(err);
    alert("Something went wrong");
  }
};

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
                        onChange={(e)=>{
                          setFormData((prev) =>({
                            ...prev,facebookLink: e.target.value
                          }))
                        }}
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
                         onChange={(e)=>{
                          setFormData((prev) =>({
                            ...prev,whatsappLink: e.target.value
                          }))
                        }}
                      />
                    </InputBaseControl>
                  </InputBase>
                </ControlGroupItem>
              </ControlGroup>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSubmit}>
              Update Chat Support Info. <span className="text-xl"></span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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
import useFetch from "@/hooks/useFetch";
import { LoaderIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const chatSupportDTOSchema = z.object({
  shop: z.string(),
  provider: z.enum(["facebook", "whatsapp"]),
  link: z.string().url(),
});

export default function Dashboard() {
  const { shop } = useParams();
  const [selected, setSelected] = useState("facebook");
  const [formData, setFormData] = useState({
    facebook: "",
    whatsapp: "",
  });
  const [loadingState, setloadingState] = useState(false)
  const { data, loading } = useFetch(`/${shop}`);

  // Populate formData from fetched supportChat array
  useEffect(() => {
    if (data?.supportChat && Array.isArray(data.supportChat)) {
      const links = {
        facebook: "",
        whatsapp: "",
      };

      data.supportChat.forEach((item) => {
        if (item.provider === "facebook") {
          links.facebook = item.link || "";
        }
        if (item.provider === "whatsapp") {
          // Extract phone number from full URL if possible
          // e.g., from https://wa.me/8801XXXX => 8801XXXX
          try {
            const url = new URL(item.link);
            if (url.hostname === "wa.me") {
              links.whatsapp = url.pathname.replace("/", "");
            } else {
              links.whatsapp = item.link; // fallback full URL
            }
          } catch {
            links.whatsapp = item.link; // fallback full URL
          }
        }
      });

      setFormData(links);
    }
  }, [data]);

  const handleSubmit = async () => {
    setloadingState(true)
    let link = "";
    if (selected === "facebook") {
      link = formData.facebook.trim();
    } else if (selected === "whatsapp") {
      // Build full WhatsApp URL from phone number
      const phoneNumber = formData.whatsapp.trim();
      if (!phoneNumber) {
        toast.error("Please enter a valid WhatsApp number");
        return;
      }
      link = `https://wa.me/${phoneNumber}`;
    }

    const mainData = {
      shop,
      provider: selected,
      link,
    };

    // Validate with zod schema before sending
    try {
      chatSupportDTOSchema.parse(mainData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(
          "Validation error: " +
            error.errors.map((e) => e.message).join(", ")
        );
      } else {
        toast.error("Invalid input");
      }
      return;
    }

    try {
      const res = await fetch(`/api/v1/settings/support-chat`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mainData),
      });

      const resData = await res.json();

      if (res.ok) {
        toast.success("Shop updated successfully!");
        // Optionally reload data or clear form here
      } else {
        console.error(resData);
        toast.error(resData.error || "Update failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally{
      setloadingState(false)
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoaderIcon className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-muted/100 p-6 h-full">
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
                      Facebook Page URL
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
                        value={formData.facebook}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            facebook: e.target.value,
                          }))
                        }
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
                        type="text"
                        placeholder="8801XXXXXXXXX"
                        required
                        pattern="[0-9]+"
                        value={formData.whatsapp}
                        onChange={(e) => {
                          // Optional: allow only digits
                          const val = e.target.value;
                          if (/^\d*$/.test(val)) {
                            setFormData((prev) => ({
                              ...prev,
                              whatsapp: val,
                            }));
                          }
                        }}
                      />
                    </InputBaseControl>
                  </InputBase>
                </ControlGroupItem>
              </ControlGroup>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={loadingState} >
              {loadingState ? "Updating..." : "Update"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

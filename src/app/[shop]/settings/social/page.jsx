"use client"
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ControlGroup, ControlGroupItem } from "@/components/ui/control-group";
import {
  InputBase,
  InputBaseAdornment,
  InputBaseControl,
  InputBaseInput,
} from "@/components/ui/input-base";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import useFetch from "@/hooks/useFetch";
import { LoaderIcon } from "lucide-react";

export default function BusinessInfoForm() {
  const { shop } = useParams();
  const { data, loading } = useFetch(`/${shop}`);
  const socialLinks = data?.socialLinks || [];

  const socialLinksJson = [
    { name: "facebook", label: "Facebook", placeholder: "https://facebook.com/your-page" },
    { name: "telegram", label: "Telegram", placeholder: "https://t.me/your-channel" },
    { name: "linkedin", label: "LinkedIn", placeholder: "https://www.linkedin.com/in/your-name" },
    { name: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/8801XXXXXXXXX" },
    { name: "youtube", label: "YouTube", placeholder: "https://www.youtube.com/your-channel" },
    { name: "discord", label: "Discord", placeholder: "https://discord.gg/your-server" },
    { name: "twitter", label: "Twitter", placeholder: "https://twitter.com/your-handle" },
    { name: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/your-handle" },
    { name: "tiktok", label: "TikTok", placeholder: "https://www.tiktok.com/@your-profile" },
  ];

  const [formData, setFormData] = useState(
    socialLinksJson.reduce((acc, link) => ({ ...acc, [link.name]: "" }), {})
  );
  const [updating, setUpdating] = useState(false); 

  useEffect(() => {
    if (socialLinks.length > 0) {
      const updatedData = {};
      socialLinksJson.forEach((link) => {
        updatedData[link.name] =
          socialLinks.find((item) => item.platform === link.name)?.link || "";
      });
      setFormData(updatedData);
    }
  }, [socialLinks]);

  const handleChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async () => {
  setUpdating(true);
  try {
    const payload = { shop, ...formData }; 

    const res = await fetch(`/api/v1/settings/social-links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const response = await res.json();
    if (res.ok) {
      toast.success("Shop updated successfully!");
    } else {
      toast.error(response.error || "Update failed");
    }
  } catch (err) {
    toast.error("Something went wrong");
  } finally {
    setUpdating(false);
  }
};


  return (
    <CardContent className="p-6 pt-5">
      <h2 className="text-md font-semibold pb-4">Social Links</h2>
      {loading ? <div className="flex h-64 items-center justify-center">
        <LoaderIcon className="h-8 w-8 animate-spin" />
      </div> : <div>
              <div className="grid md:grid-cols-2 grid-cols-1 gap-6">
        {socialLinksJson.map((link, index) => (
          <ControlGroup key={index}>
            <ControlGroupItem>
              <InputBase>
                <InputBaseAdornment>{link.label}</InputBaseAdornment>
              </InputBase>
            </ControlGroupItem>
            <ControlGroupItem className="w-full">
              <InputBase>
                <InputBaseControl>
                  <InputBaseInput
                    placeholder={link.placeholder}
                    value={formData[link.name] || ""}
                    onChange={(e) => handleChange(link.name, e.target.value)}
                  />
                </InputBaseControl>
              </InputBase>
            </ControlGroupItem>
          </ControlGroup>
        ))}
      </div>
      <div className="flex justify-end pt-6">
        <Button
          onClick={handleSubmit}
          disabled={updating} // disable only during update
        >
          {updating ? "Updating..." : "Update Shop Info"}
        </Button>
      </div>
</div>}
    </CardContent>
  );
}

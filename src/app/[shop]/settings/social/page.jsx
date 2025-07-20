import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ControlGroup, ControlGroupItem } from "@/components/ui/control-group";
import {
  InputBase,
  InputBaseAdornment,
  InputBaseControl,
  InputBaseInput,
} from "@/components/ui/input-base";
export default function BusinessInfoForm() {
  const socialLinks = [
    { label: "Facebook", placeholder: "https://facebook.com/your-page" },
    { label: "Telegram", placeholder: "https://t.me/your-channel" },
    { label: "LinkedIn", placeholder: "https://www.linkedin.com/in/your-name" },
    { label: "WhatsApp", placeholder: "https://wa.me/8801XXXXXXXXX" },
    { label: "YouTube", placeholder: "https://www.youtube.com/your-channel" },
    { label: "Discord", placeholder: "https://discord.gg/your-server" },
    {
      label: "Instagram",
      placeholder: "https://www.instagram.com/your-handle",
    },
    { label: "Amazon", placeholder: "https://www.amazon.com/your-storefront" },
    { label: "TikTok", placeholder: "https://www.tiktok.com/@your-profile" },
    { label: "Walmart", placeholder: "https://www.walmart.com/your-store" },
    { label: "Daraz", placeholder: "https://www.daraz.com/your-shop" },
  ];

  return (
    <CardContent className="p-6 pt-5">
      <h2 className="text-md font-semibold pb-4">Business Information</h2>
      <div className="grid md:grid-cols-2 grid-cols-1 gap-6">
        {socialLinks.map((link, index) => (
          <ControlGroup key={index}>
            <ControlGroupItem>
              <InputBase>
                <InputBaseAdornment>{link.label}</InputBaseAdornment>
              </InputBase>
            </ControlGroupItem>
            <ControlGroupItem className="w-full">
              <InputBase>
                <InputBaseControl>
                  <InputBaseInput placeholder={link.placeholder} />
                </InputBaseControl>
              </InputBase>
            </ControlGroupItem>
          </ControlGroup>
        ))}
      </div>
      <div className="flex justify-end pt-6">
        <Button>Update Shop Info</Button>
      </div>
    </CardContent>
  );
}

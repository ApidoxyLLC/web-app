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
import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
export default function BusinessInfoForm() {
  
  const {shop} = useParams()
  const socialLinks = [
    { name: "facebook", label: "Facebook", placeholder: "https://facebook.com/your-page" },
    { name: "telegram", label: "Telegram", placeholder: "https://t.me/your-channel" },
    { name: "linkedin", label: "LinkedIn", placeholder: "https://www.linkedin.com/in/your-name" },
    { name: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/8801XXXXXXXXX" },
    { name: "youtube", label: "YouTube", placeholder: "https://www.youtube.com/your-channel" },
    { name: "discord", label: "Discord", placeholder: "https://discord.gg/your-server" },
    { name: "twitter", label: "Twitter", placeholder: "https://twitter.com/your-handle" },
    {
      name: "instagram", 
      label: "Instagram",
      placeholder: "https://www.instagram.com/your-handle",
    },
    { name: "tiktok", label: "TikTok", placeholder: "https://www.tiktok.com/@your-profile" },
  ];
  const [formData, setFormData] = useState({
    facebook:"",
    telegram:"",
    twitter:"",
    linkedin:"",
    whatsapp:"",
    youtube:"",
    discord:"",
    instagram:"",
    tiktok:"",
  })

  
  const handleChange =(name,value)=>{
    setFormData((prev)=>({
      ...prev,
      [name]:value
    }))
  }

  const handleSubmit = async ()=>{
    try{
       const cleanedSocialLinks = Object.fromEntries(
      Object.entries(formData).filter(
        ([_, value]) => value && value.startsWith("http")
      )
    );

    const finalData = {
      shop,
      ...cleanedSocialLinks,
    };
      const res = await fetch(`/api/v1/settings/social-links`,{
        method:"POST",
        headers:{
          "Content-type":"application/json"
        },
        body: JSON.stringify( finalData )
      })
      
      const data = await res.json();
      if (res.ok) {
        toast.success("Shop updated successfully!");
      } else {
        console.error(data,res);
        toast.error(data.error || "Update failed");
      }

    }catch(err){
      console.log(err)
    }
  }

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
                  <InputBaseInput placeholder={link.placeholder}
                    value={formData[link.name]}
                    onChange={(e) => handleChange(link.name, e.target.value)}/>
                </InputBaseControl>
              </InputBase>
            </ControlGroupItem>
          </ControlGroup>
        ))}
      </div>
      <div className="flex justify-end pt-6">
        <Button onClick={handleSubmit}>Update Shop Info</Button>
      </div>
    </CardContent>
  );
}

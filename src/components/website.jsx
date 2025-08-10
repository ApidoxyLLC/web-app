"use client";

import { Textarea } from "@/components/ui/textarea";
import PicturePreviewInput from "./picture-preview-input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

export default function Website() {
  const {shop} = useParams()
  const [pic, setPic] = useState(null)
  const [formData, setFormData] = useState({
    shop,
    title: "",
    logo: "",
    metaDescription: "",
    metaTags: "",
  })
  console.log(formData)
  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("shop", shop);

    const res = await fetch("/api/v1/upload-image", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Image upload failed");
    }

    const imageUrl = `http://localhost:3000/api/v1/image/${shop}/${data.data.fileName}`;
    setPic(imageUrl);

  return data?.data?.fileName;
  };
  const handleChange = (key,value)=>{
    setFormData((prev)=>({
      ...prev,
      [key]: value
    }))
  }
  const handleSubmit = async()=>{
    try{
      const res = await fetch("/api/v1/apps/web", {
      method:"POST",
      headers:{
        "Content-type":"application/json"
      },
      body: JSON.stringify(formData)
    })
    console.log(res)
    if(res.ok){
      setFormData({title: "",
    logo: "",
    metaDescription: "",
    metaTags: "",})
      toast.success("Website info saved and deployment started!");
    }
    }catch(err){
      console.log(err)
      toast.error("Something went wrong while submitting. Please try again.");
    }
  }
  return (
    <Card className="flex-1 py-0">
      <CardHeader className="py-4">
        <p className="text-md font-semibold">Website initialization</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 -mt-7">
          <Input placeholder="Website Title"  onChange={(e)=> handleChange("title", e.target.value)} />
          <div className="flex flex-row gap-4">
            <PicturePreviewInput size={80} picture={pic ? pic : null}
              onChange={async (file) => {
    if (file instanceof File) {
      try {
        const uploadedUrl = await uploadImage(file);
        console.log("poc okoi",uploadedUrl)
        setFormData(prev => ({...prev, logo:uploadedUrl}))
        } catch (err) {
        console.error("Upload failed", err);
        alert("Image upload failed");
      }
    }else{
      console.log("err")
    }}}/>
            <Textarea placeholder="Meta description" onChange={(e)=> handleChange("metaDescription", e.target.value)}  />
          </div>
          <div className="flex flex-row gap-4 mb-6 md:mb-0">
            <Input placeholder="Website meta tags" onChange={(e)=> handleChange("metaTags", e.target.value)}  />
            <Button className="h-10" onClick={handleSubmit}>Save and Deploy</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

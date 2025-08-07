"use client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TbCopy } from "react-icons/tb";
import { useState } from "react";
import { ControlGroup, ControlGroupItem } from "@/components/ui/control-group";
import {
  InputBase,
  InputBaseAdornment,
  InputBaseControl,
  InputBaseInput,
} from "@/components/ui/input-base";
import facebook from "../../../../../public/images/facebook.png";
import google from "../../../../../public/images/google.svg";
import googleTag from "../../../../../public/images/google_tag_manager.png";
import facebookConversion from "../../../../../public/images/facebookConversion.png";
import Image from "next/image";
import { useParams } from "next/navigation";
import { toast } from "sonner";
export default function MarketingSeoTools() {
  const [copied, setCopied] = useState(false);
  const [formData, setFormData]  = useState({
    googleTagManager:{
      gtmId:""
    },
    facebookPixel:{
      pixelId:"",
      accessToken:"",
      testEventId:""
    }
  })
  const {shop} = useParams()

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleSubmit = async () => {
  const payload = {
    shop,
    googleTagManager:
      formData.googleTagManager.gtmId.trim() !== ""
        ? { gtmId: formData.googleTagManager.gtmId }
        : undefined,
    facebookPixel:
      formData.facebookPixel.pixelId.trim() !== "" &&
      formData.facebookPixel.accessToken.trim() !== ""
        ? {
            pixelId: formData.facebookPixel.pixelId,
            accessToken: formData.facebookPixel.accessToken,
            testEventId:
              formData.facebookPixel.testEventId.trim() || undefined,
          }
        : undefined,
  };

  try {
    const res = await fetch("/api/v1/settings/seo-marketing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Failed to submit marketing data");
    toast.success("Marketing data updated successfully!");
  } catch (err) {
    toast.error(err.message);
  }
};
  return (
    <div
      className=" bg-muted/100 h-full
     mx-auto w-full p-6 "
    >
      <Card className="space-y-6 rounded-lg p-6 shadow-sm">
        <div>
          <h2 className="text-md font-semibold">Marketing & SEO Tools</h2>
          <p className="text-sm text-red-500 mt-2">
            To setup GTM or facebook pixel, please setup your shop domain first.
          </p>
        </div>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-md ">
              <Image src={google} alt="Google" width={25} />
              Sitemaps for Search Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="">
            <p className="text-sm text-gray-500 -mt-5 mb-5">
              Add sitemaps to Google Search Console to rank your website.
            </p>
            <div className="relative ">
              <Input
                value="https://shop.apidoxy.com/api/108627/sitemaps.xml"
                readOnly
                className="bg-muted/100 text-center font-semibold h-10"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute border-none right-2 top-1/2 -translate-y-1/2 bg-muted/100"
                onClick={() =>
                  handleCopy("https://shop.apidoxy.com/api/108627/sitemaps.xml")
                }
              >
                <TbCopy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-md">
              <Image src={facebook} alt="Google" width={25} />
              Facebook Data Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm  text-gray-500 -mt-5 mb-5">
              Add/Upload data feed to the Facebook catalog.
            </p>
            <div className="relative">
              <Input
                value="https://shop.apidoxy.com/api/108627/facebook-product-feed.xml"
                readOnly
                className="bg-muted/100 text-center font-semibold h-10"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute border-none right-2 top-1/2 -translate-y-1/2 bg-muted/100"
                onClick={() =>
                  handleCopy(
                    "https://shop.apidoxy.com/api/108627/facebook-product-feed.xml"
                  )
                }
              >
                <TbCopy />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-md">
              <Image src={googleTag} alt="Google" width={25} />
              Setup Google Tag Manager
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ControlGroup>
              <ControlGroupItem className="shadow-none w-20 h-10 font-semibold">
                <InputBase>
                  <InputBaseAdornment>GTM ID</InputBaseAdornment>
                </InputBase>
              </ControlGroupItem>
              <ControlGroupItem className="w-full shadow-none">
                <InputBase>
                  <InputBaseControl>
                    <InputBaseInput placeholder="GTM ID" onChange={(e)=>{
                      setFormData((prev) => ({
                        ...prev,
                        googleTagManager: {
                          gtmId: e.target.value,
                        },
                      }));
                    }} />
                  </InputBaseControl>
                </InputBase>
              </ControlGroupItem>
            </ControlGroup>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-md">
              <Image src={facebookConversion} alt="Google" width={25} />
              Setup Facebook Conversion API and Pixel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <ControlGroup>
                <ControlGroupItem className="shadow-none w-[86px] h-10 font-semibold">
                  <InputBase>
                    <InputBaseAdornment>Pixel ID</InputBaseAdornment>
                  </InputBase>
                </ControlGroupItem>
                <ControlGroupItem className="w-full shadow-none">
                  <InputBase>
                    <InputBaseControl>
                      <InputBaseInput placeholder="Pixel ID" onChange={(e) =>
    setFormData((prev) => ({
      ...prev,
      facebookPixel: {
        ...prev.facebookPixel,
        pixelId: e.target.value,
      },
    }))
  }/>
                    </InputBaseControl>
                  </InputBase>
                </ControlGroupItem>
              </ControlGroup>
            </div>
            <div>
              <ControlGroup>
                <ControlGroupItem className="shadow-none w-[184px] h-10 font-semibold">
                  <InputBase>
                    <InputBaseAdornment>Pixel Access Token</InputBaseAdornment>
                  </InputBase>
                </ControlGroupItem>
                <ControlGroupItem className="w-full shadow-none">
                  <InputBase>
                    <InputBaseControl>
                      <InputBaseInput placeholder="Pixel Access Token" onChange={(e) =>
    setFormData((prev) => ({
      ...prev,
      facebookPixel: {
        ...prev.facebookPixel,
        accessToken: e.target.value,
      },
    }))
  }/>
                    </InputBaseControl>
                  </InputBase>
                </ControlGroupItem>
              </ControlGroup>
            </div>
            <div>
              <ControlGroup>
                <ControlGroupItem className="shadow-none w-[180px] h-10 font-semibold">
                  <InputBase>
                    <InputBaseAdornment>Pixel Test Event ID</InputBaseAdornment>
                  </InputBase>
                </ControlGroupItem>
                <ControlGroupItem className="w-full shadow-none">
                  <InputBase>
                    <InputBaseControl>
                      <InputBaseInput placeholder="Pixel Test Event ID (Just to test. Clear after testing is done)" onChange={(e) =>
    setFormData((prev) => ({
      ...prev,
      facebookPixel: {
        ...prev.facebookPixel,
        testEventId: e.target.value,
      },
    }))
  }/>
                    </InputBaseControl>
                  </InputBase>
                </ControlGroupItem>
              </ControlGroup>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button onClick={handleSubmit}>Update</Button>
        </div>
      </Card>
    </div>
  );
}

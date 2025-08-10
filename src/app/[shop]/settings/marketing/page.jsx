"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TbCopy } from "react-icons/tb";
import { useState, useEffect } from "react";
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
import useFetch from "@/hooks/useFetch";

export default function MarketingSeoTools() {
  const [copied, setCopied] = useState(false);
  const { shop } = useParams();

  const { data, loading, refetch } = useFetch(`/${shop}/seo-marketing`);

  const [formData, setFormData] = useState({
    googleTagManager: {
      gtmId: "",
    },
    facebookPixel: {
      pixelId: "",
      accessToken: "",
      testEventId: "",
    },
  });

 useEffect(() => {
  if (data) {
    setFormData({
      googleTagManager: {
        gtmId: data.googleTagManager?.gtmId || "",
      },
      facebookPixel: {
        pixelId: data.facebookPixel?.pixelId || "",
        accessToken: data.facebookPixel?.accessToken || "",
        testEventId: data.facebookPixel?.testEventId || "",
      },
    });
  }
}, [data]);


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
              testEventId: formData.facebookPixel.testEventId.trim() || undefined,
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
      refetch(); // ডাটা আপডেট হলে পুনরায় ফেচ করো
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="bg-muted/100 h-full mx-auto w-full p-6">
      <Card className="space-y-6 rounded-lg p-6 shadow-sm">
        <div>
          <h2 className="text-md font-semibold">Marketing & SEO Tools</h2>
          <p className="text-sm text-red-500 mt-2">
            To setup GTM or facebook pixel, please setup your shop domain first.
          </p>
        </div>

        {/* Sitemaps UI */}
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
                value={`https://shop.apidoxy.com/api/${shop}/sitemaps.xml`}
                readOnly
                className="bg-muted/100 text-center font-semibold h-10"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute border-none right-2 top-1/2 -translate-y-1/2 bg-muted/100"
                onClick={() =>
                  handleCopy(`https://shop.apidoxy.com/api/${shop}/sitemaps.xml`)
                }
              >
                <TbCopy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Facebook Data Feed UI */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-md">
              <Image src={facebook} alt="Facebook" width={25} />
              Facebook Data Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm  text-gray-500 -mt-5 mb-5">
              Add/Upload data feed to the Facebook catalog.
            </p>
            <div className="relative">
              <Input
                value={`https://shop.apidoxy.com/api/${shop}/facebook-product-feed.xml`}
                readOnly
                className="bg-muted/100 text-center font-semibold h-10"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute border-none right-2 top-1/2 -translate-y-1/2 bg-muted/100"
                onClick={() =>
                  handleCopy(
                    `https://shop.apidoxy.com/api/${shop}/facebook-product-feed.xml`
                  )
                }
              >
                <TbCopy />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Google Tag Manager Setup */}
        <Card className="shadow-none">
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-md">
      <Image src={googleTag} alt="Google" width={25} />
      Setup Google Tag Manager
    </CardTitle>
  </CardHeader>
  <CardContent>
    {formData.googleTagManager.gtmId ? (
      <div className="">
        <p className="text-sm border rounded-md py-[9px] px-4">
          <strong>GTM ID:</strong> {formData.googleTagManager.gtmId}
        </p>
        <div className="flex justify-end mt-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete("googleTagManager")}
          >
            Delete
          </Button>
        </div>
      </div>
    ) : (
      <ControlGroup>
        <ControlGroupItem className="shadow-none w-20 h-10 font-semibold">
          <InputBase>
            <InputBaseAdornment>GTM ID</InputBaseAdornment>
          </InputBase>
        </ControlGroupItem>
        <ControlGroupItem className="w-full shadow-none">
          <InputBase>
            <InputBaseControl>
              <InputBaseInput
                placeholder="GTM ID"
                value={formData.googleTagManager.gtmId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    googleTagManager: { gtmId: e.target.value },
                  }))
                }
              />
            </InputBaseControl>
          </InputBase>
        </ControlGroupItem>
      </ControlGroup>
    )}
  </CardContent>
</Card>


        <Card className="shadow-none">
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-md">
      <Image src={facebookConversion} alt="Facebook" width={25} />
      Setup Facebook Conversion API and Pixel
    </CardTitle>
  </CardHeader>
  <CardContent>
    {formData.facebookPixel.pixelId && formData.facebookPixel.accessToken ? (
      <div className="flex gap-4">
        <p className="text-sm border rounded-md py-[9px] px-4">
          <strong>Pixel ID:</strong> {formData.facebookPixel.pixelId}
        </p>
        <p className="text-sm border rounded-md py-[9px] px-4">
          <strong>Access Token:</strong>{" "}
          <input
            type="password"
            value={formData.facebookPixel.accessToken}
            readOnly
            className="bg-transparent border-none outline-none"
          />
        </p>
        {formData.facebookPixel.testEventId && (
          <p className="text-sm border rounded-md py-[9px] px-4">
            <strong>Test Event ID:</strong> {formData.facebookPixel.testEventId}
          </p>
        )}
        <div className="flex justify-end mt-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete("facebookPixel")}
          >
            Delete
          </Button>
        </div>
      </div>
    ) : (
      <>
        {/* Your existing InputBase fields here for Pixel ID, Access Token, Test Event ID */}
      </>
    )}
  </CardContent>
</Card>


        <div className="flex justify-end">
          <Button onClick={handleSubmit}>Update</Button>
        </div>
      </Card>
    </div>
  );
}

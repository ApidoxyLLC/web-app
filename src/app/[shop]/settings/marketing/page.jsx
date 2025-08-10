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

// Skeleton Component
function SkeletonBox({ height = "h-10", width = "w-full" }) {
  return (
    <div
      className={`bg-gray-200 animate-pulse rounded-md ${height} ${width}`}
    ></div>
  );
}

export default function MarketingSeoTools() {
  const [copied, setCopied] = useState(false);
  const { shop } = useParams();

  const { data, loading, refetch } = useFetch(`/${shop}/seo-marketing`);

  // Saved data (from DB)
  const [formData, setFormData] = useState({
    googleTagManager: { gtmId: "" },
    facebookPixel: { pixelId: "", accessToken: "", testEventId: "" },
  });

  // Temp input states (for update form only)
  const [tempGtmId, setTempGtmId] = useState("");
  const [tempPixelData, setTempPixelData] = useState({
    pixelId: "",
    accessToken: "",
    testEventId: "",
  });

  useEffect(() => {
    if (data) {
      setFormData({
        googleTagManager: { gtmId: data.googleTagManager?.gtmId || "" },
        facebookPixel: {
          pixelId: data.facebookPixel?.pixelId || "",
          accessToken: data.facebookPixel?.accessToken || "",
          testEventId: data.facebookPixel?.testEventId || "",
        },
      });

      // reset temp states
      setTempGtmId("");
      setTempPixelData({
        pixelId: "",
        accessToken: "",
        testEventId: "",
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
      googleTagManager: tempGtmId.trim()
        ? { gtmId: tempGtmId }
        : undefined,
      facebookPixel:
        tempPixelData.pixelId.trim() && tempPixelData.accessToken.trim()
          ? {
              pixelId: tempPixelData.pixelId,
              accessToken: tempPixelData.accessToken,
              testEventId: tempPixelData.testEventId.trim() || undefined,
            }
          : undefined,
    };

    try {
      const res = await fetch("/api/v1/settings/seo-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to submit marketing data");
      toast.success("Marketing data updated successfully!");
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (type) => {
  try {
    const res = await fetch(`/api/v1/${shop}/seo-marketing`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketingType: type }), 
    });

    if (!res.ok) throw new Error("Failed to delete data");
    toast.success(`${type} deleted successfully!`);
    refetch();
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
            To setup GTM or Facebook pixel, please setup your shop domain first.
          </p>
        </div>

        {/* Sitemaps */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-md ">
              <Image src={google} alt="Google" width={25} />
              Sitemaps for Search Engine
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonBox />
            ) : (
              <div className="relative">
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
                    handleCopy(
                      `https://shop.apidoxy.com/api/${shop}/sitemaps.xml`
                    )
                  }
                >
                  <TbCopy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Facebook Feed */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-md">
              <Image src={facebook} alt="Facebook" width={25} />
              Facebook Data Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonBox />
            ) : (
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
            )}
          </CardContent>
        </Card>

        {/* Google Tag Manager */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-md">
              <Image src={googleTag} alt="Google" width={25} />
              Setup Google Tag Manager
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SkeletonBox />
            ) : formData.googleTagManager.gtmId ? (
              <>
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
              </>
            ) : (
              <>
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
                          value={tempGtmId}
                          onChange={(e) => setTempGtmId(e.target.value)}
                        />
                      </InputBaseControl>
                    </InputBase>
                  </ControlGroupItem>
                </ControlGroup>
                <div className="flex justify-end mt-4">
                  <Button onClick={handleSubmit}>Update</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Facebook Pixel */}
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-md">
              <Image src={facebookConversion} alt="Facebook" width={25} />
              Setup Facebook Conversion API and Pixel
            </CardTitle>
          </CardHeader>
          <CardContent className="w-full">
            {loading ? (
              <div className="space-y-3">
                <SkeletonBox />
                <SkeletonBox />
                <SkeletonBox />
              </div>
            ) : formData.facebookPixel.pixelId &&
              formData.facebookPixel.accessToken ? (
              <div>
                <div className="grid grid-cols-3 gap-4 w-full">
                  <p className="text-sm border rounded-md py-[9px] px-4">
                    <strong>Pixel ID:</strong> {formData.facebookPixel.pixelId}
                  </p>
                  <p className="text-sm border rounded-md py-[9px] px-4 flex gap-2">
                    <strong>Access Token:</strong>
                    <input
                      type="password"
                      value
                      readOnly
                      className="bg-transparent border-none outline-none w-32"
                    />
                  </p>
                  {formData.facebookPixel.testEventId && (
                    <p className="text-sm border rounded-md py-[9px] px-4">
                      <strong>Test Event ID:</strong>{" "}
                      {formData.facebookPixel.testEventId}
                    </p>
                  )}
                </div>
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
                <div className="space-y-3">
                  {/* Pixel ID */}
                  <ControlGroup>
                    <ControlGroupItem className="shadow-none w-[86px] h-10 font-semibold">
                      <InputBase>
                        <InputBaseAdornment>Pixel ID</InputBaseAdornment>
                      </InputBase>
                    </ControlGroupItem>
                    <ControlGroupItem className="w-full shadow-none">
                      <InputBase>
                        <InputBaseControl>
                          <InputBaseInput
                            placeholder="Pixel ID"
                            value={tempPixelData.pixelId}
                            onChange={(e) =>
                              setTempPixelData((prev) => ({
                                ...prev,
                                pixelId: e.target.value,
                              }))
                            }
                          />
                        </InputBaseControl>
                      </InputBase>
                    </ControlGroupItem>
                  </ControlGroup>

                  {/* Pixel Access Token */}
                  <ControlGroup>
                    <ControlGroupItem className="shadow-none w-[184px] h-10 font-semibold">
                      <InputBase>
                        <InputBaseAdornment>
                          Pixel Access Token
                        </InputBaseAdornment>
                      </InputBase>
                    </ControlGroupItem>
                    <ControlGroupItem className="w-full shadow-none">
                      <InputBase>
                        <InputBaseControl>
                          <InputBaseInput
                            placeholder="Pixel Access Token"
                            value={tempPixelData.accessToken}
                            onChange={(e) =>
                              setTempPixelData((prev) => ({
                                ...prev,
                                accessToken: e.target.value,
                              }))
                            }
                          />
                        </InputBaseControl>
                      </InputBase>
                    </ControlGroupItem>
                  </ControlGroup>

                  {/* Pixel Test Event ID */}
                  <ControlGroup>
                    <ControlGroupItem className="shadow-none w-[180px] h-10 font-semibold">
                      <InputBase>
                        <InputBaseAdornment>
                          Pixel Test Event ID
                        </InputBaseAdornment>
                      </InputBase>
                    </ControlGroupItem>
                    <ControlGroupItem className="w-full shadow-none">
                      <InputBase>
                        <InputBaseControl>
                          <InputBaseInput
                            placeholder="Pixel Test Event ID (Optional)"
                            value={tempPixelData.testEventId}
                            onChange={(e) =>
                              setTempPixelData((prev) => ({
                                ...prev,
                                testEventId: e.target.value,
                              }))
                            }
                          />
                        </InputBaseControl>
                      </InputBase>
                    </ControlGroupItem>
                  </ControlGroup>
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={handleSubmit}>Update</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Card>
    </div>
  );
}

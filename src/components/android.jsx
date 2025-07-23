'use client'

import SuperEllipse from "react-superellipse";
import Iphone from "@/components/iphone";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import PicturePreviewInput from "./picture-preview-input";
import { Button } from "./ui/button";
import RSPVInput from "./rspv-input";
import { CircleCheckIcon, CircleX, CircleXIcon, PlusIcon } from "lucide-react";
import Image from "next/image";
import { Preset } from "react-superellipse";

export default function Android() {

    const isValidSHA1 = (hash) => {
      if (hash === null || hash === "") {
        return null;
      }

      const sha1Regex = /^[a-fA-F0-9]{40}$/;
      return sha1Regex.test(hash);
    }


    const isValidSHA256 = (hash) => {
      if (hash === null || hash === "") {
        return null;
      }

      const sha256Regex = /^[a-fA-F0-9]{64}$/;
      return sha256Regex.test(hash);
    }


    function isValidAppNickname(nickname) {
      if (nickname === null || nickname === "") {
        return null;
      }

      const regex = /^[a-zA-Z0-9 _-]{3,50}$/;
      return regex.test(nickname);
    }

    function isValidPackageName(packageName) {
      if (packageName === null || packageName === "") {
        return null;
      }

      const regex = /^(?!\.)(?!.*\.\.)([a-z0-9]+(\.[a-z0-9]+)+)$/;
      return regex.test(packageName) && packageName.length <= 100;
    }

      function isValidVersionCode(name) {
        if (name === null || name === "") {
          return null;
        }

        const regex = /^\d+\.\d+\.\d+$/;
        return regex.test(name);
      }


    const [appName, setAppName] = useState("");
    const [packageName, setPackageName] = useState("");
    const [versionCode, setVersionCode] = useState("");
    const [splashColor, setSplashColor] = useState("#ffffff");
    const [icon, setIcon] = useState(null);
    const [splashLogo, setSplashLogo] = useState(null);
    const [branding, setBranding] = useState(null);
    const [sha1, setSha1] = useState("");
    const [sha256, setSha256] = useState("");
    
    const changeAppName = (e) => {
      setAppName(e.target.value);
    }
    const changePackageName = (e) => {
      setPackageName(e.target.value);
    }
    const changeVersionCode = (e) => {
      setVersionCode(e.target.value);
    }
    const changeSha1 = (e) => {
      setSha1(e.target.value);
    }
    const changeSha256 = (e) => {
      setSha256(e.target.value);
    }
    return(
         <div className="flex flex-col lg:flex-row">
          <div className="flex-1 flex flex-col gap-6">
            <Card className="flex-1">
              <CardHeader className="py-4">
                <p className="text-sm font-semibold">Android App Configure</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <RSPVInput
                  label="App nickname"
                  placeholder="App nickname"
                  helperText="This can be 3-30 character"
                  hasError={false}
                  maxLength={30}
                  onChange={changeAppName}
                  suffix={
                    isValidAppNickname(appName) == null ? null :
                    isValidAppNickname(appName) ?
                    <CircleCheckIcon size={18} className="stroke-green-600" /> : <CircleXIcon size={18} className="stroke-destructive" />
                  }
                />

                <RSPVInput
                  label="Package name"
                  placeholder="com.company.appname"
                  maxLength={30}
                  helperText="This can be 3-30 character"
                  hasError={false}
                  onChange={changePackageName}
                  suffix={
                    isValidPackageName(packageName) == null ? null :
                    isValidPackageName(packageName) ?
                    <CircleCheckIcon size={18} className="stroke-green-600" /> : <CircleXIcon size={18} className="stroke-destructive" />
                  }
                />

                <RSPVInput
                  label="Version code"
                  placeholder="10"
                  helperText="This can be 3-30 character"
                  hasError={false}
                  onChange={changeVersionCode}
                  suffix={
                    isValidVersionCode(versionCode) == null ? null :
                    isValidVersionCode(versionCode) ?
                    <CircleCheckIcon size={18} className="stroke-green-600" /> : <CircleXIcon size={18} className="stroke-destructive" />
                  }
                />

                <RSPVInput
                  label="Splash screen color"
                  type="color"
                  placeholder="10.0.20"
                  helperText="This can be 3-30 character"
                  defaultValue={splashColor}
                  onChange={setSplashColor}
                  hasError={false}
                />

                <div className="flex flex-row gap-4 flex-wrap">
                  <PicturePreviewInput width={100} height={100} label="Square size App icon" picture={icon} onChange={setIcon} />
                  <PicturePreviewInput width={100} height={100} label="Square size splash screen logo" picture={splashLogo} onChange={setSplashLogo} />
                  <PicturePreviewInput width={250} height={100} label="Branding image with 5:2 ratio" picture={branding} onChange={setBranding} />
                </div>

                <RSPVInput
                  label="SHA 1"
                  placeholder="SHA1 certificate fingerprint (optional)"
                  hasError={false}
                  onChange={changeSha1}
                  suffix={
                    isValidSHA1(sha1) == null ? null :
                    isValidSHA1(sha1) ?
                    <CircleCheckIcon size={18} className="stroke-green-600" /> : <CircleXIcon size={18} className="stroke-destructive" />
                  }
                />

                <RSPVInput
                  label="SHA 256"
                  placeholder="SHA256 certificate fingerprint (optional)"
                  hasError={false}
                  onChange={changeSha256}
                  suffix={
                    isValidSHA256(sha256) == null ? null :
                    isValidSHA256(sha256) ?
                    <CircleCheckIcon size={18} className="stroke-green-600" /> : <CircleXIcon size={18} className="stroke-destructive" />
                  }
                />

                <div className="flex flex-row gap-4">
                  <RSPVInput
                    label="Firebase JSON"
                    type="file"
                    placeholder="Firebase service json (optional)"
                    hasError={false}
                  />
                  <Button size="sm">Save and Build app</Button>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="px-6 flex flex-row lg:flex-col gap-6 justify-start items-start">
            <div className="w-60">
              <Iphone width={240} color={splashColor} icon={ splashLogo && <Image src={splashLogo} width={100} height={100} alt="" />} branding={ branding && <Image src={branding} width={100} height={100} className="w-full aspect-5/2" alt="" />} />
            </div>
            {
              icon &&
              <div className="flex flex-row justify-around w-full">
                <div className="flex flex-col items-center gap-2">
                  <SuperEllipse r1={0.15} r2={0.5} style={{width: 64, height: 64}}>
                    <Image src={icon} className="mask mask-squircle" width={64} height={64} alt=""/>
                  </SuperEllipse>
                  <div className="text-xs text-center w-24 truncate">
                    {appName}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <SuperEllipse r1={0.22} r2={0.5} style={{width: 64, height: 64}}>
                    <Image src={icon} className="mask mask-squircle" width={64} height={64} alt=""/>
                  </SuperEllipse>
                  <div className="text-xs text-center w-24 truncate">
                    {appName}
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
    )
}
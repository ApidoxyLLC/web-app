"use client"
import Android from "@/components/android";
import AndroidBuild from "@/components/android-build"
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    setShowOverlay(true);
  }, []);

  const apps = [
    // { 
    // id: '123456789',
    // nickname: 'JCI Bangladesh', 
    // packageName: 'com.jci.bangladesh', 
    // version: '10.0.1', 
    // icon: 'https://i.ibb.co/fVtsTKWv/icon.png', 
    // splashScreenBackgroundColor: '#ffffff', 
    // splashScreenLogo: '', 
    // sha1: '', 
    // sha256: '', 
    // firebaseServiceJson: null, 
    // defaulthost: '', 
    // oneSignalId: '', 
    // buildStartAt: '', 
    // builderStatus: 1, 
    // 1-10 
    // builderMessage: '', 
    // bundleType: 'apk', 
    // apk, aab 
    // buildCompletedAt: null, 
    // downloadUrl: '', 
    // }, 
    // { 
    // id: '0123456789', 
    // nickname: 'JCI Bangladesh', 
    // packageName: 'com.jci.bangladesh', 
    // version: '10.0.1', 
    // icon: 'https://i.ibb.co/fVtsTKWv/icon.png', 
    // splashScreenBackgroundColor: '#ffffff', 
    // splashScreenLogo: '', 
    // sha1: '', 
    // sha256: '', 
    // firebaseServiceJson: null, 
    // defaulthost: '', 
    // oneSignalId: '', 
    // buildStartAt: '', 
    // builderStatus: 1, 
    // 1-10 // builderMessage: '', 
    // bundleType: 'apk', 
    // apk, aab 
    // buildCompletedAt: null, 
    // downloadUrl: '',
    // }
  ];

  return (
    <div className=" bg-muted/100 p-6 relative">
      <div className="relative">
        <div className=" flex flex-col gap-6 ">
          
        <AndroidBuild apps={apps} />
        <Android />
        </div>

        {showOverlay && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-lg z-20 flex items-center justify-center">
            <h2 className="text-2xl font-bold text-white">Exciting! App Coming Soon</h2>
          </div>
        )}
      </div>
    </div>
  );
}

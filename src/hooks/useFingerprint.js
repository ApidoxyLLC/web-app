import { useEffect, useState } from 'react';
import fingerprintjs from '@fingerprintjs/fingerprintjs';

export default function useFingerprint() {
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
      function getBrowser(userAgent) {
        if (/Edg/.test(userAgent)) return 'Edge';
        if (/OPR/.test(userAgent)) return 'Opera';
        if (/Chrome/.test(userAgent) && !/Edg|OPR/.test(userAgent)) return 'Chrome';
        if (/Firefox/.test(userAgent)) return 'Firefox';
        if (/Safari/.test(userAgent) && !/Chrome|Chromium/.test(userAgent)) return 'Safari';
        if (/MSIE|Trident/.test(userAgent)) return 'Internet Explorer';
        return 'Unknown';
      }
      function getOS() {
        const userAgent = window.navigator.userAgent || window.navigator.vendor || window.opera;

        if (/windows phone/i.test(userAgent)) return "Windows Phone";
        if (/win/i.test(userAgent)) return "Windows";
        if (/android/i.test(userAgent)) return "Android";
        if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) return "iOS";
        if (/Macintosh|Mac OS X/i.test(userAgent)) return "macOS";
        if (/Linux/i.test(userAgent)) return "Linux";

        return "Unknown";
      }
      async function getPlatform() {
        if (navigator.userAgentData) {
          return navigator.userAgentData.platform;
        } else {
          return getOS(); // fallback to traditional method
        }
      }

      function detectOS(userAgent = navigator.userAgent) {
        userAgent = userAgent.toLowerCase();

        if (userAgent.includes("windows nt")) return "Windows";
        if (userAgent.includes("android")) return "Android";
        if (userAgent.includes("iphone") || userAgent.includes("ipad")) return "iOS";
        if (userAgent.includes("macintosh") || userAgent.includes("mac os")) return "macOS";
        if (userAgent.includes("linux")) return "Linux";
        if (userAgent.includes("cros")) return "Chrome OS";

        return "Unknown";
      }


    const loadMetadata = async () => {
      // Load FingerprintJS
      const fp = await fingerprintjs.load();
      const result = await fp.get();
      const fingerprintId = result.visitorId;
      

      const userAgent = navigator.userAgent;
      const browser = getBrowser(userAgent)
      const os = getOS()

      const _os = detectOS()
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const screen = {
        width: window.screen.width,
        height: window.screen.height,
      };
      const platform = navigator.platform;
      const platform_ = await getPlatform()
      // Get IP address from a public API
      let ipAddress = 'unknown';
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        ipAddress = data.ip;
      } catch (e) {
        console.error('Failed to get IP address', e);
      }

      setMetadata({
        fingerprintId,
        userAgent,
        os,
        _os,
        browser,
        timezone,
        screen,
        platform,
        platform_,
        ipAddress,
      });
    };

    loadMetadata();
  }, []);

  return metadata;
}

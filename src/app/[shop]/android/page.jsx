import Android from "@/components/android";
import AndroidBuild from "@/components/android-build"


export const metadata = {
  title: 'Android | Website & Apps',
  description: '...',
}
export default function Dashboard() {
    const apps = [
      // {
      //   id: '123456789',
      //   nickname: 'JCI Bangladesh',
      //   packageName: 'com.jci.bangladesh',
      //   version: '10.0.1',
      //   icon: 'https://i.ibb.co/fVtsTKWv/icon.png',
      //   splashScreenBackgroundColor: '#ffffff',
      //   splashScreenLogo: '',
      //   sha1: '',
      //   sha256: '',
      //   firebaseServiceJson: null,
      //   defaulthost: '',
      //   oneSignalId: '',
      //   buildStartAt: '',
      //   builderStatus: 1, // 1-10
      //   builderMessage: '',
      //   bundleType: 'apk', // apk, aab
      //   buildCompletedAt: null,
      //   downloadUrl: '',
      // },
      // {
      //   id: '0123456789',
      //   nickname: 'JCI Bangladesh',
      //   packageName: 'com.jci.bangladesh',
      //   version: '10.0.1',
      //   icon: 'https://i.ibb.co/fVtsTKWv/icon.png',
      //   splashScreenBackgroundColor: '#ffffff',
      //   splashScreenLogo: '',
      //   sha1: '',
      //   sha256: '',
      //   firebaseServiceJson: null,
      //   defaulthost: '',
      //   oneSignalId: '',
      //   buildStartAt: '',
      //   builderStatus: 1, // 1-10
      //   builderMessage: '',
      //   bundleType: 'apk', // apk, aab
      //   buildCompletedAt: null,
      //   downloadUrl: '',
      // }
    ];
    return(
      <div className="bg-accent-foreground/10 p-6 flex flex-col gap-6">
        <AndroidBuild apps={apps} />
        <Android />
      </div>
    )
}
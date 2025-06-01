import { getFingerprint } from "@/lib/fingerprint"

export default function useFingerprint() {
  useEffect(() => {
    getFingerprint().then((result) => {
      console.log('Fingerprint:', result);
      // Optionally store or send it to the backend
    });
  }, []);

  // return <div>Subscription Page</div>;
}
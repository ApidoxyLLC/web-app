import VerifyOTPPage from "@/components/verifyPhone";
import { Suspense } from "react";

const page = () => {
  return (
    <div>
      <Suspense><VerifyOTPPage/></Suspense>
    </div>
  );
};

export default page;

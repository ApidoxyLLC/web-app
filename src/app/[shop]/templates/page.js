import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const TemplatePage = () => {
  return (
    <div className="min-h-screen p-8 space-y-8 text-gray-900 dark:text-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col justify-between ">
          <p className="text-lg font-medium pb-3 px-6 -mt-3  border-b border-muted/100">
            Desiree
          </p>
          <CardContent className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Preview coming...</p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button variant="default">Use</Button>
          </CardFooter>
        </Card>
        <Card className="flex flex-col justify-between ">
          <p className="text-lg font-medium pb-3 px-6 -mt-3  border-b border-muted/100">
            Stylo
          </p>
          <CardContent className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Preview coming...</p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button variant="default">Use</Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col justify-between">
          <p className="text-lg font-medium pb-3 px-6 -mt-3  border-b border-muted/100">
            Coming Soon
          </p>
          <CardContent className="flex flex-col items-center justify-center gap-2">
            <p className="text-xl font-semibold text-blue-500 ">
              More <span className="text-2xl">+</span>{" "}
            </p>
          </CardContent>
          <div></div>
        </Card>
      </div>
    </div>
  );
};

export default TemplatePage;

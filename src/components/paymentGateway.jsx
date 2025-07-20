"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdvancePaymentCard() {
  const [selectedOption, setSelectedOption] = useState("");
  const [percentage, setPercentage] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");

  const handleCheckboxChange = (value) => {
    setSelectedOption((prev) => (prev === value ? "" : value));
  };

  return (
    <Card className="w-full mx-auto shadow-none">
      <CardHeader>
        <CardTitle className="text-md font-semibold">
          Set your advance payment
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select how much amount you want to get advance from customer.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="full"
            checked={selectedOption === "full"}
            onCheckedChange={() => handleCheckboxChange("full")}
          />
          <Label htmlFor="full">Full Payment</Label>
        </div>

        <div className="flex items-center space-x-3">
          <Checkbox
            id="delivery"
            checked={selectedOption === "delivery"}
            onCheckedChange={() => handleCheckboxChange("delivery")}
          />
          <Label htmlFor="delivery">Delivery Charge Only</Label>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="percentage"
              checked={selectedOption === "percentage"}
              onCheckedChange={() => handleCheckboxChange("percentage")}
            />
            <Label htmlFor="percentage">Percentage</Label>
          </div>
          {selectedOption === "percentage" && (
            <Input
              type="number"
              placeholder="Enter percentage"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
              className="w-full max-w-xs"
            />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="fixed"
              checked={selectedOption === "fixed"}
              onCheckedChange={() => handleCheckboxChange("fixed")}
            />
            <Label htmlFor="fixed">Fixed Amount</Label>
          </div>
          {selectedOption === "fixed" && (
            <Input
              type="number"
              placeholder="Enter fixed amount"
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value)}
              className="w-full max-w-xs"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  ControlGroup,
  ControlGroupItem,
} from "@/components/ui/control-group";
import {
  InputBase,
  InputBaseAdornment,
  InputBaseControl,
  InputBaseInput,
} from "@/components/ui/input-base";
import { TagInput } from 'emblor';
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Button } from "./ui/button";



export default function NewProductRight() {
  const [tags, setTag] = useState([]);
  const [activeTagIndex, setActiveTagIndex] = useState(null);
  return (
   <div className="flex-1 flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Select defaultValue="active">
            <SelectTrigger className="w-full flex-1">
                <SelectValue placeholder="Select a status" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                </SelectGroup>
            </SelectContent>
            </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product organization</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ControlGroup>
            <ControlGroupItem>
              <InputBase>
                <InputBaseAdornment>Type</InputBaseAdornment>
              </InputBase>
            </ControlGroupItem>
            <ControlGroupItem className="flex-1">
              <InputBase>
                <InputBaseControl>
                  <InputBaseInput/>
                </InputBaseControl>
              </InputBase>
            </ControlGroupItem>
          </ControlGroup>
          <ControlGroup>
            <ControlGroupItem>
              <InputBase>
                <InputBaseAdornment>Vendor</InputBaseAdornment>
              </InputBase>
            </ControlGroupItem>
            <ControlGroupItem className="flex-1">
              <InputBase>
                <InputBaseControl>
                  <InputBaseInput/>
                </InputBaseControl>
              </InputBase>
            </ControlGroupItem>
          </ControlGroup>
          <TagInput
            placeholder="Add tag"
            tags={tags}
            setTags={(newTags) => {
                setTag(newTags);
            }}
            activeTagIndex={activeTagIndex}
            setActiveTagIndex={setActiveTagIndex}
        />
        </CardContent>
      </Card>

      <Button className="cursor-pointer w-full">
        Save product
      </Button>
    </div>

  );
}
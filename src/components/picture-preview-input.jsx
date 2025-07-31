"use client";

import { ImageIcon, XIcon } from "lucide-react";
import Image from "next/image";
import Dropzone from "react-dropzone";
import { cn } from "@/lib/utils";

const ImagePreview = ({ width, height, url, onRemove }) => {
  // console.log(url)
  return (
  
  <div
    className="relative border border-border rounded-md overflow-hidden"
    style={{ width: `${width}px`, height: `${height}px` }}
  >
    <button
      className="absolute top-1 right-1 bg-destructive text-primary-foreground p-1 rounded hover:opacity-90"
      onClick={onRemove}
    >
      <XIcon className="h-4 w-4 stroke-destructive-foreground" />
    </button>
    <Image
      src={url}
      alt="lskdjf"
      width={width}
      height={height}
      className="w-full h-full object-contain"
    />
  </div>
);
}


export default function PicturePreviewInput({ width = 100, height = 100, label, picture, onChange }) {
  console.log("pictureee",picture)
  return (
    <div style={{ width: `${width}px`, height: `${height}px` }}>
      {picture ? (
        <ImagePreview
          width={width}
          height={height}
          url={picture}
          onRemove={() => onChange(null)}
        />
      ) : (
        <Dropzone
          onDrop={(acceptedFiles) => {
            const file = acceptedFiles[0];
            if (file) {
              const imageUrl = URL.createObjectURL(file);
              onChange(file);
            }
          }}
          accept={{
            "image/*": [".png", ".jpg", ".jpeg", ".webp"],
          }}
          maxFiles={1}
        >
          {({ getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject }) => (
            <div
              {...getRootProps()}
              className={cn(
                "border border-dashed flex items-center justify-center rounded-md cursor-pointer",
                {
                  "border-primary bg-secondary": isDragActive && isDragAccept,
                  "border-destructive bg-destructive/20": isDragActive && isDragReject,
                }
              )}
              style={{ width: `${width}px`, height: `${height}px` }}
            >
              <input {...getInputProps()} />
              {
                label &&
                <p className="text-xs text-muted-foreground text-center p-2">{label}</p>
              }
              {
                !label &&
                <ImageIcon className="h-8 w-8" strokeWidth={1.5} />
              }
            </div>
          )}
        </Dropzone>
      )}
    </div>
  );
}

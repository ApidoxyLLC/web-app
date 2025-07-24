"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

export default function CarouselWithThumbs() {
  const images = [
    "https://cdn.dribbble.com/userupload/23744973/file/original-c2466431951d7f3c8f5ac2d6e7a84d5b.jpg?resize=752x&vertical=center",
    "https://cdn.dribbble.com/userupload/9682587/file/original-612514a2fcdaff7552bc1ac71c57554a.png?resize=752x&vertical=center",
    "https://cdn.dribbble.com/userupload/23744973/file/original-c2466431951d7f3c8f5ac2d6e7a84d5b.jpg?resize=752x&vertical=center",
    "https://cdn.dribbble.com/userupload/9682587/file/original-612514a2fcdaff7552bc1ac71c57554a.png?resize=752x&vertical=center",
    "https://cdn.dribbble.com/userupload/23744973/file/original-c2466431951d7f3c8f5ac2d6e7a84d5b.jpg?resize=752x&vertical=center",
    "https://cdn.dribbble.com/userupload/9682587/file/original-612514a2fcdaff7552bc1ac71c57554a.png?resize=752x&vertical=center",
    "https://cdn.dribbble.com/userupload/23744973/file/original-c2466431951d7f3c8f5ac2d6e7a84d5b.jpg?resize=752x&vertical=center",
    "https://cdn.dribbble.com/userupload/9682587/file/original-612514a2fcdaff7552bc1ac71c57554a.png?resize=752x&vertical=center",
  ];

  const [api, setApi] = useState(null);
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  const handleThumbClick = useCallback(
    (index) => {
      api?.scrollTo(index);
    },
    [api]
  );

  return (
    <div className="mx-auto max-w-sm">
      {/* Main Carousel */}
      <Carousel setApi={setApi} className="w-full p-6 pb-0">
        <CarouselContent>
          {images.map((src, index) => (
            <CarouselItem key={index}>
              <Card className="py-0">
                <CardContent className="flex aspect-video items-center justify-center p-0">
                  <img
                    src={src}
                    alt={`Slide ${index + 1}`}
                    className="w-full h-full object-cover rounded-md"
                  />
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <Carousel className="mt-3 mb-3 w-2/3 max-w-xs mx-auto ">
        <CarouselContent className="flex my-1">
          {images.map((src, index) => (
            <CarouselItem
              key={index}
              className={cn(
                "basis-1/5 cursor-pointer",
                current === index + 1 ? "opacity-100" : "opacity-50"
              )}
              onClick={() => handleThumbClick(index)}
            >
              <Card className="py-0">
                <CardContent className="p-0 flex  items-center justify-center">
                  <p className="text-xl font-bold">{index + 1}</p>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}

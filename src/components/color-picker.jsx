'use client'

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function ColorPicker({defaultColor, onChangeColor}) {
  return (
    <SolidColorPicker background={defaultColor} setBackground={onChangeColor} />
  )
}

export function SolidColorPicker({ background, setBackground, className }) {
  const solids = [
    '#E2E2E2',
    '#ff75c3',
    '#ffa647',
    '#ffe83f',
    '#9fff5b',
    '#70e2ff',
    '#cd93ff',
    '#09203f',
  ]

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            'w-full px-1 justify-start text-left font-normal text-muted-foreground bg-transparent hover:bg-transparent',
            className
          )}
        >
          <div className="w-full flex items-center gap-2">
            {background ? (
              <div
                className="h-4 w-4 rounded !bg-center !bg-cover transition-all"
                style={{ background }}
              ></div>
            ) : (
              <div className="h-4 w-4 bg-white rounded"></div>
            )}
            <div className="truncate flex-1">
              {background ? background : 'Pick a color'}
            </div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="flex flex-wrap gap-1">
          {solids.map((s) => (
            <div
              key={s}
              style={{ background: s }}
              className="rounded-md h-6 w-6 cursor-pointer active:scale-105"
              onClick={() => setBackground(s)}
            />
          ))}
        </div>
        <Input
          id="custom"
          value={background}
          className="col-span-2 h-8 mt-4"
          onChange={(e) => setBackground(e.currentTarget.value)}
        />
      </PopoverContent>
    </Popover>
  )
}

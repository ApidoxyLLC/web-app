import * as React from "react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { FloatingLabelInput } from "./ui/floating-label-input";
import { ColorPicker } from "./color-picker";

const RSPVInput = React.forwardRef(
  (
    {
      label,
      type = "text",
      placeholder,
      suffix,
      helperText,
      hasError = false,
      maxLength,
      defaultValue,
      value,
      onChange,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn("w-full", className)}>
        {/* Desktop layout */}{" "}
        <div
          className={cn(
            "hidden sm:flex items-center rounded-md w-full h-10 bg-background",
            hasError && "border-destructive focus-within:ring-destructive"
          )}
        >
          {label && (
            <>
              <label className="px-3 text-sm text-muted-foreground whitespace-nowrap shrink-0 font-medium">
                {label}
              </label>
              <Separator orientation="vertical" className="h-full" />
            </>
          )}

          {type === "color" ? (
            <ColorPicker
              className="hover:bg-transparent"
              defaultColor={defaultValue}
              maxLength={maxLength}
              onChangeColor={onChange}
            />
          ) : (
            <Input
              ref={ref}
              className={cn(
                "focus-visible:ring-0 focus-visible:ring-offset-0",
                label && "rounded-l-none border-l-0"
              )}
              type={type}
              value={value}
              onChange={onChange}
              maxLength={maxLength}
              placeholder={placeholder}
              {...props}
            />
          )}

          {suffix && (
            <div className="px-3 text-sm text-muted-foreground whitespace-nowrap shrink-0">
              {suffix}
            </div>
          )}
        </div>
        {/* Mobile layout */}
        <div className={cn("flex flex-col gap-1 sm:hidden")}>
          <FloatingLabelInput
            ref={ref}
            label={label}
            type={type}
            value={value}
            onChange={onChange}
            maxLength={maxLength}
            placeholder={placeholder}
            className={cn(
              "border border-input focus-visible:ring-1",
              hasError && "border-destructive focus-visible:ring-destructive"
            )}
            {...props}
          />
        </div>
        {/* Helper text */}
        {helperText && (
          <p
            className={cn(
              "text-xs mt-1",
              hasError ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

RSPVInput.displayName = "RSPVInput";

export default RSPVInput;

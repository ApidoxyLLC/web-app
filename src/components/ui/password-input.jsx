import { EyeIcon, EyeOffIcon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import {
  InputBase,
  InputBaseAdornment,
  InputBaseAdornmentButton,
  InputBaseControl,
  InputBaseInput,
} from "@/components/ui/input-base";
import * as PasswordInputPrimitive from "@/components/ui/password-input-primitive";

function PasswordInput({
  visible,
  defaultVisible,
  onVisibleChange,
  ...props
}) {
  return (
    <PasswordInputPrimitive.Root
      visible={visible}
      defaultVisible={defaultVisible}
      onVisibleChange={onVisibleChange}>
      <InputBase data-slot="password-input" {...props} />
    </PasswordInputPrimitive.Root>
  );
}

function PasswordInputAdornment(
  props,
) {
  return <InputBaseAdornment data-slot="password-input-adornment" {...props} />;
}

function PasswordInputAdornmentButton(
  props,
) {
  return (<InputBaseAdornmentButton data-slot="password-input-adornment-button" {...props} />);
}

function PasswordInputInput(
  props,
) {
  return (
    <InputBaseControl>
      <PasswordInputPrimitive.Input data-slot="password-input-input" asChild {...props}>
        <InputBaseInput />
      </PasswordInputPrimitive.Input>
    </InputBaseControl>
  );
}

function PasswordInputAdornmentToggle({
  className,
  ...props
}) {
  return (
    <InputBaseAdornment>
      <InputBaseAdornmentButton asChild>
        <PasswordInputPrimitive.Toggle
          data-slot="password-input-adornment-toggle"
          className={cn("group", className)}
          {...props}>
          <EyeIcon className="hidden size-4 group-data-[state=visible]:block" />
          <EyeOffIcon className="block size-4 group-data-[state=visible]:hidden" />
        </PasswordInputPrimitive.Toggle>
      </InputBaseAdornmentButton>
    </InputBaseAdornment>
  );
}

export {
  PasswordInput,
  PasswordInputAdornment,
  PasswordInputAdornmentButton,
  PasswordInputInput,
  PasswordInputAdornmentToggle,
};

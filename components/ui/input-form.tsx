import * as React from "react";
import { cn } from "@/lib/utils";
import { Control, FieldValues, Path } from "react-hook-form";
import { Input } from "./input";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";

export interface InputFormProps<T extends FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "name"> {
  label?: string;
  containerClassName?: string;
  description?: string;
  control: Control<T>;
  name: Path<T>;
}

function InputForm<T extends FieldValues>({
  className,
  containerClassName,
  name,
  label,
  control,
  description,
  ...props
}: InputFormProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, formState }) => (
        <FormItem className={cn("w-full space-y-1", containerClassName)}>
          {label && (
            <FormLabel htmlFor={name}>
              {label}{" "}
              {props?.required && <span className="text-destructive">*</span>}
            </FormLabel>
          )}

          <FormControl>
            <Input
              {...field}
              {...props}
              id={name}
              disabled={formState.isSubmitting || props.disabled}
              className={className}
            />
          </FormControl>

          {description && <FormDescription>{description}</FormDescription>}

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

InputForm.displayName = "InputForm";

export { InputForm };

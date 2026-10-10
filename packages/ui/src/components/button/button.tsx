import * as React from "react";
import { type AriaButtonProps, useButton } from "@react-aria/button";
import { mergeProps } from "@react-aria/utils";
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "mxcn";

export const buttonVariants = cva(
  "rounded-lg font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-[color,background-color,border-color,box-shadow,filter] duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent",
  {
    variants: {
      variant: {
        default:
          "bg-white hover:bg-gray-100 text-neutral-900 shadow-sm border border-gray-300 dark:bg-secondary dark:hover:bg-quinary dark:text-white dark:border-quinary",
        cancel:
          "bg-transparent hover:bg-gray-200/70 text-gray-800 dark:text-gray-200 dark:hover:bg-secondary/70",
        danger:
          "bg-red-600 hover:bg-red-700 border border-red-700 text-white shadow-sm dark:border-red-500/40",
        success:
          "bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 text-white shadow-sm dark:border-emerald-500/40",
        transparent:
          "bg-transparent text-black dark:text-white hover:bg-gray-100 dark:hover:bg-secondary/70",
        link: "bg-transparent hover:bg-transparent text-gray-800 dark:text-gray-200 px-0 p-1 underline",
        blue: "bg-blue-600 hover:bg-blue-700 border border-blue-700 text-white shadow-sm dark:border-blue-500/40",
        amber:
          "bg-amber-500 hover:bg-amber-600 border border-amber-600 text-black shadow-sm dark:border-amber-400/40",
      },
      size: {
        xs: "p-0.5 px-2",
        sm: "p-1 px-4",
        md: "p-1.5 px-4",
        lg: "p-2 px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

type BaseButtonProps = Omit<React.JSX.IntrinsicElements["button"], "onPress"> & AriaButtonProps;
export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
export type ButtonProps = BaseButtonProps & ButtonVariantProps;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant,
      size,
      className,
      isDisabled,
      disabled,
      onPress,
      onPressChange,
      onPressStart,
      onPressEnd,
      onPressUp,
      excludeFromTabOrder,
      ...rest
    },
    ref,
  ) => {
    const { buttonProps } = useButton(
      {
        onPress,
        onPressChange,
        onPressStart,
        onPressEnd,
        onPressUp,
        isDisabled: isDisabled ?? disabled,
        excludeFromTabOrder,
        ...rest,
      },
      ref as React.RefObject<HTMLButtonElement>,
    );

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        {...mergeProps(rest, buttonProps)}
        ref={ref}
      />
    );
  },
);

Button.displayName = "Button";

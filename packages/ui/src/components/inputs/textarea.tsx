import * as React from "react";
import { cn } from "mxcn";

type Props = Omit<React.JSX.IntrinsicElements["textarea"], "id" | "ref"> & {
  errorMessage?: string | null;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, Props>(
  ({ errorMessage, ...rest }, ref) => (
    <textarea
      ref={ref}
      {...rest}
      className={cn(
        "w-full p-1.5 px-3 rounded-lg border outline-none disabled:cursor-not-allowed disabled:opacity-80 resize-y",
        "min-h-[3em] transition-colors placeholder:opacity-50",
        "bg-white dark:bg-secondary dark:text-white",
        "border-gray-200 dark:border-quinary focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20",
        errorMessage &&
          "border-red-500 dark:border-red-500 focus:border-red-700 dark:focus:border-red-700",
        rest.className,
      )}
    />
  ),
);
Textarea.displayName = "Textarea";

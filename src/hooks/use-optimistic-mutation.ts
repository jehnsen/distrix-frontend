"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

interface OptimisticOptions<TValue> {
  /** Current value the UI is rendering. */
  value: TValue;
  /** Applies the optimistic change locally. */
  setValue: (value: TValue) => void;
  /** Toast copy on success. */
  successMessage: (next: TValue) => string;
  /** Names what failed, e.g. "mark the delivery dispatched". */
  what: string;
}

/**
 * Applies a change immediately, rolls the previous value back if the mock layer
 * rejects it, and says which action failed rather than "something went wrong".
 */
export function useOptimisticMutation<TValue>({
  value,
  setValue,
  successMessage,
  what,
}: OptimisticOptions<TValue>) {
  const [pending, setPending] = useState(false);

  const mutate = useCallback(
    async (next: TValue, commit: () => Promise<unknown>) => {
      const previous = value;
      setValue(next);
      setPending(true);
      try {
        await commit();
        toast.success(successMessage(next));
      } catch (error) {
        setValue(previous);
        toast.error(`Could not ${what}`, {
          description:
            error instanceof Error
              ? `${error.message} Nothing was changed.`
              : "The change was rolled back. Nothing was saved.",
        });
      } finally {
        setPending(false);
      }
    },
    [value, setValue, successMessage, what],
  );

  return { mutate, pending };
}

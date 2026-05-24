import { useCallback, useRef, useState } from 'react';

type ToastState = { message: string; key: number } | null;

export const useToast = () => {
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, key: Date.now() });
    timerRef.current = setTimeout(() => setToast(null), 2800);
  }, []);

  return { toast, showToast };
};

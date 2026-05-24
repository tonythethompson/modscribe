import { useEffect, useState } from 'react';

const DESK_BREAKPOINT = 900;

export const useMediaLayout = () => {
  const [isDeskLayout, setIsDeskLayout] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= DESK_BREAKPOINT
  );

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESK_BREAKPOINT}px)`);
    const onChange = () => setIsDeskLayout(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return { isDeskLayout, isMobile: !isDeskLayout };
};

// src/hooks/useNavigationLoader.ts
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function useNavigationLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [previousPath, setPreviousPath] = useState("");

  useEffect(() => {
    // When pathname changes, stop loading
    if (previousPath && pathname !== previousPath) {
      setLoading(false);
    }
    setPreviousPath(pathname);
  }, [pathname, previousPath]);

  const startLoading = () => {
    setLoading(true);
  };

  const stopLoading = () => {
    setLoading(false);
  };

  return { loading, startLoading, stopLoading };
}

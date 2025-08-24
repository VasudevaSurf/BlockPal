"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

// Always redirect to auth page (which is now wallet setup):
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/auth");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E2AF19]"></div>
    </div>
  );
}

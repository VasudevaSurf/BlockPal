"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

export default function Home() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/auth");
    }
  }, [isAuthenticated, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#0F0F0F" }}
    >
      <div
        className="animate-spin rounded-full h-12 w-12 border-b-2"
        style={{ borderColor: "#D4A853" }}
      ></div>
    </div>
  );
}

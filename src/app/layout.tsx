// src/app/layout.tsx - UPDATED with auth check and wallet cleanup
"use client";

import "./globals.css";
import { Provider } from "react-redux";
import { store } from "@/store";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import { ToastProvider } from "@/contexts/ToastContext";
import {
  mayekaBoldDemo,
  mayekaDemiBoldDemo,
  mayeka,
  satoshi,
} from "@/lib/fonts";
import WalletErrorBoundary from "@/components/wallet/WalletErrorBoundary";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { performCompleteCleanup } from "@/utils/walletCleanup";

// ✅ NEW: Component to handle wallet cleanup on auth failure
function WalletCleanupHandler() {
  const pathname = usePathname();

  useEffect(() => {
    // Only check on auth page
    if (pathname === "/auth") {
      // Check if we have a token
      const checkAuth = async () => {
        try {
          const response = await fetch("/api/auth/me", {
            credentials: "include",
          });

          if (!response.ok) {
            console.log("🧹 Auth failed, cleaning up wallet connections");
            performCompleteCleanup();
          }
        } catch (error) {
          console.log("🧹 Auth check failed, cleaning up wallet connections");
          performCompleteCleanup();
        }
      };

      checkAuth();
    }
  }, [pathname]);

  return null;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
            @font-face {
              font-family: 'Mayeka Bold Demo';
              src: url('/fonts/Mayeka_Bold_Demo.otf') format('opentype');
              font-weight: 700;
              font-style: normal;
              font-display: swap;
            }
            
            @font-face {
              font-family: 'Mayeka Demi Bold Demo';
              src: url('/fonts/Mayeka_Demi_Bold_Demo.otf') format('opentype');
              font-weight: 600;
              font-style: normal;
              font-display: swap;
            }
            
            @font-face {
              font-family: 'Satoshi';
              src: url('/fonts/Satoshi-Regular.otf') format('opentype');
              font-weight: 400;
              font-style: normal;
              font-display: swap;
            }
            
            @font-face {
              font-family: 'Satoshi';
              src: url('/fonts/Satoshi-Medium.otf') format('opentype');
              font-weight: 500;
              font-style: normal;
              font-display: swap;
            }
            
            @font-face {
              font-family: 'Satoshi';
              src: url('/fonts/Satoshi-Bold.otf') format('opentype');
              font-weight: 700;
              font-style: normal;
              font-display: swap;
            }
          `,
          }}
        />
      </head>
      <body
        className={`${mayekaBoldDemo.variable} ${mayekaDemiBoldDemo.variable} ${mayeka.variable} ${satoshi.variable} antialiased`}
      >
        <Provider store={store}>
          <ToastProvider>
            <WalletErrorBoundary>
              <WalletCleanupHandler />
              <WalletProvider>{children}</WalletProvider>
            </WalletErrorBoundary>
          </ToastProvider>
        </Provider>
      </body>
    </html>
  );
}

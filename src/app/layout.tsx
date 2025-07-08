"use client";

import "./globals.css";
import { Provider } from "react-redux";
import { store } from "@/store";
import {
  mayekaBoldDemo,
  mayekaDemiBoldDemo,
  mayeka,
  satoshi,
} from "@/lib/fonts";

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
        {/* Note: Add your custom fonts (Mayeka Bold Demo, Satoshi) to public/fonts/ folder */}
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
        <Provider store={store}>{children}</Provider>
      </body>
    </html>
  );
}

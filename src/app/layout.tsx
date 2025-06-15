"use client";

import "./globals.css";
import { Provider } from "react-redux";
import { store } from "@/store";

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
              src: url('/fonts/MayekaBoldDemo.woff2') format('woff2'),
                   url('/fonts/MayekaBoldDemo.woff') format('woff'),
                   url('/fonts/MayekaBoldDemo.ttf') format('truetype');
              font-weight: bold;
              font-style: normal;
              font-display: swap;
            }
            
            @font-face {
              font-family: 'Satoshi';
              src: url('/fonts/Satoshi-Regular.woff2') format('woff2'),
                   url('/fonts/Satoshi-Regular.woff') format('woff'),
                   url('/fonts/Satoshi-Regular.ttf') format('truetype');
              font-weight: 400;
              font-style: normal;
              font-display: swap;
            }
            
            @font-face {
              font-family: 'Satoshi';
              src: url('/fonts/Satoshi-Medium.woff2') format('woff2'),
                   url('/fonts/Satoshi-Medium.woff') format('woff'),
                   url('/fonts/Satoshi-Medium.ttf') format('truetype');
              font-weight: 500;
              font-style: normal;
              font-display: swap;
            }
            
            @font-face {
              font-family: 'Satoshi';
              src: url('/fonts/Satoshi-Bold.woff2') format('woff2'),
                   url('/fonts/Satoshi-Bold.woff') format('woff'),
                   url('/fonts/Satoshi-Bold.ttf') format('truetype');
              font-weight: 700;
              font-style: normal;
              font-display: swap;
            }
          `,
          }}
        />
      </head>
      <body className="bg-black text-white">
        <Provider store={store}>{children}</Provider>
      </body>
    </html>
  );
}

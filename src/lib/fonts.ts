import localFont from "next/font/local";

export const mayeka = localFont({
  src: "../public/fonts/mayeka-bold-demo.woff2",
  variable: "--font-mayeka",
  weight: "700",
  display: "swap",
});

export const satoshi = localFont({
  src: [
    {
      path: "../public/fonts/satoshi-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/satoshi-medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/satoshi-bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

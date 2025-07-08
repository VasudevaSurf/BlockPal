import localFont from "next/font/local";

export const mayekaBoldDemo = localFont({
  src: "../../public/fonts/Mayeka_Bold_Demo.otf",
  variable: "--font-mayeka-bold-demo",
  weight: "700",
  display: "swap",
});

export const mayeka = localFont({
  src: [
    {
      path: "../../public/fonts/Mayeka_Thin_Demo.otf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../../public/fonts/Mayeka_Light_Demo.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/Mayeka_Regular_Demo.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Mayeka_Demi_Bold_Demo.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/Mayeka_Bold_Demo.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-mayeka",
  display: "swap",
});

export const satoshi = localFont({
  src: [
    {
      path: "../../public/fonts/Satoshi-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/Satoshi-LightItalic.otf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../../public/fonts/Satoshi-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Satoshi-Italic.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/Satoshi-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/Satoshi-MediumItalic.otf",
      weight: "500",
      style: "italic",
    },
    {
      path: "../../public/fonts/Satoshi-Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/Satoshi-BoldItalic.otf",
      weight: "700",
      style: "italic",
    },
    {
      path: "../../public/fonts/Satoshi-Black.otf",
      weight: "900",
      style: "normal",
    },
    {
      path: "../../public/fonts/Satoshi-BlackItalic.otf",
      weight: "900",
      style: "italic",
    },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

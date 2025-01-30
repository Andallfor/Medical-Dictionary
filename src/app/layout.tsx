import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medical Dictionary"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://cdn.jsdelivr.net/npm/remixicon@4.5.0/fonts/remixicon.css" rel="stylesheet"/>
      </head>
      <body className="bg-surface0 text-primary0">
        {children}
      </body>
    </html>
  );
}

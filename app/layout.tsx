import type { Metadata } from "next";
import "./globals.css";
import "./calendar.css";

export const metadata: Metadata = {
  title: "Vexyr — Voice AI for Modern Business",
  description: "Vexyr gives small businesses an AI voice agent that books appointments, takes orders, handles returns, and grows your reputation — 24 hours a day.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}

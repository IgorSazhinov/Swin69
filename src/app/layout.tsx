import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Свинтус Онлайн",
  description: "Карточная игра",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
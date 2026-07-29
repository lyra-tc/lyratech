import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Lyratech Dashboard",
  description: "Panel de administración Lyratech",
  icons: [
    {
      rel: "icon",
      url: "/favicon-light.ico",
      media: "(prefers-color-scheme: light)",
    },
    {
      rel: "icon",
      url: "/favicon-dark.ico",
      media: "(prefers-color-scheme: dark)",
    },
  ],
};

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-beige font-montserrat">{children}</body>
    </html>
  );
}

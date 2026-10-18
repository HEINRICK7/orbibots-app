import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "@fontsource-variable/inter";
import "@fontsource/ibm-plex-mono/400.css";
import "antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "OrbiBots Studio · Agent Builder",
  description: "Construa e teste agentes especialistas no OrbiBots.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}

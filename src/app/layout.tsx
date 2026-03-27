import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Steven Multi-Agent | AI Trading Intelligence",
  description: "21 Agentic Design Patterns for professional gold trading analysis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-64 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

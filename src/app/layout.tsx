import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Steven Multi-Agent | AI Trading Intelligence",
  description: "21 Agentic Design Patterns for professional gold trading analysis",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          {/* Desktop: push right by sidebar width; Mobile: full width with top/bottom padding */}
          <main className="flex-1 md:ml-60 overflow-auto
            pt-16 pb-20 px-4
            md:pt-6 md:pb-6 md:px-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

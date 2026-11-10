import "./globals.css";
import Providers from "@/components/Providers";

export const metadata = {
  title: "Mess Management System",
  description: "Lightweight college mess attendance and menu management",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#fbfaf8] text-stone-900 antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

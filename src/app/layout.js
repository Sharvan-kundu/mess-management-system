import "./globals.css";
import Providers from "@/components/Providers";

export const metadata = {
  title: "Mess Management System",
  description: "Lightweight college mess attendance and menu management",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

"use client";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2500,
          style: {
            background: "#292524",
            color: "#fafaf9",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 500,
            border: "1px solid #44403c",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
            padding: "10px 14px",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#292524",
            },
          },
          error: {
            iconTheme: {
              primary: "#f43f5e",
              secondary: "#292524",
            },
          },
        }}
      />
    </SessionProvider>
  );
}

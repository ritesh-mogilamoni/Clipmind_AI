import "../index.css";
import { AuthProvider } from "../context/AuthContext";

export const metadata = {
  title: "ClipMind AI - Autonomous Multimodal Video Intelligence",
  description:
    "AI-powered multimodal video transcription, speaker detection, sentiment analysis, and smart clip generation.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#050811] text-[#F8FAFC] antialiased selection:bg-indigo-500 selection:text-white min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

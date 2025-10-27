import "./globals.css";
import { Inter } from "next/font/google";
import { SupabaseProvider } from "../components/SupabaseProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Floorball Scoretracker",
  description: "Track weekly floorball games with live scoring and season leaderboard."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <SupabaseProvider supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey}>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}

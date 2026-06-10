import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, Caveat } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/nav/BottomNav";
import { EnableNotifications } from "@/components/push/EnableNotifications";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { createClient } from "@/lib/supabase/server";
import { resolveFeatures, type Features } from "@/lib/hyetas/features";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HYETAS",
  description:
    "Have you ever seen a man throw a shoe — household load, lifted.",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "HYETAS",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const c = await cookies();
  const memberId = c.get("hyetas_member_id")?.value ?? null;
  const deviceHouseholdId = c.get("hyetas_household_id")?.value ?? null;

  let memberName: string | null = null;
  let householdId: string | null = deviceHouseholdId;
  let features: Features = resolveFeatures(null); // default: everything on

  const supabase = await createClient();
  if (memberId) {
    const { data } = await supabase
      .from("members")
      .select("name, household_id")
      .eq("id", memberId)
      .maybeSingle();
    memberName = data?.name ?? null;
    householdId = (data?.household_id as string | undefined) ?? householdId;
  }
  if (householdId) {
    const { data: hh } = await supabase
      .from("households")
      .select("features")
      .eq("id", householdId)
      .maybeSingle();
    features = resolveFeatures(hh?.features ?? null);
  }

  return (
    <html lang="en" className={`${inter.variable} ${caveat.variable}`}>
      <body className="min-h-dvh font-body text-slate-100 antialiased hyetas-bg">
        {memberId && memberName ? (
          <EnableNotifications memberId={memberId} memberName={memberName} />
        ) : null}
        {memberId && memberName ? <InstallPrompt /> : null}
        <div className="pb-24">{children}</div>
        <BottomNav features={features} />
      </body>
    </html>
  );
}

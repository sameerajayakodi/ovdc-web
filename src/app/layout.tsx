import type { Metadata, Viewport } from "next";
import { Archivo, Cormorant_Garamond } from "next/font/google";
import { PreferencesProvider } from "@/components/providers/Preferences";
import { Reveal } from "@/components/providers/Reveal";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ovdc.lk"),
  title: {
    default: "OVDC · Luxury apartments in Sri Lanka | Ocean View Development Company",
    template: "%s | OVDC",
  },
  description:
    "Luxury apartments, townhouses and villas along Sri Lanka’s western coast. Explore every residence in 3D, take a 360° tour and book a site visit.",
  openGraph: {
    type: "website",
    siteName: "OVDC · Ocean View Development Company",
    locale: "en_LK",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1b2d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cormorant.variable} ${archivo.variable}`}>
      <body>
        <PreferencesProvider>
          {children}
          <Reveal />
        </PreferencesProvider>
      </body>
    </html>
  );
}

import { Archivo, Hanken_Grotesk } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import Loader from "@/components/Loader";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthProvider from "@/components/AuthProvider";
import VehicleOnboarding from "@/components/VehicleOnboarding";

const display = Archivo({ subsets: ["latin"], variable: "--font-display", axes: ["wdth"], display: "swap" });
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata = {
  title: "PlugNPark: parking and EV charging, live",
  description: "Find a free parking bay and a working EV charger before you leave home.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <AuthProvider>
          <Loader>
            <Navbar />
            <VehicleOnboarding />
            {children}
            <Footer />
          </Loader>
        </AuthProvider>
      </body>
    </html>
  );
}

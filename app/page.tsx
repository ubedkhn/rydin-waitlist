"use client";

import { useEffect, useState } from "react";
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { readPass } from "@/lib/rydin/storage";
import { Header } from "@/components/site/Header";
import { StickyCta } from "@/components/site/StickyCta";
import { SocialBar } from "@/components/site/SocialBar";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/hero/Hero";
import { TelemetryStrip } from "@/components/sections/TelemetryStrip";
import { SavingsCalculator } from "@/components/sections/SavingsCalculator";
import { BentoGrid } from "@/components/bento/BentoGrid";
import { ReferralRewards } from "@/components/sections/ReferralRewards";
import { FaqAccordion } from "@/components/sections/FaqAccordion";
import { WaitlistProvider } from "@/components/waitlist/WaitlistProvider";
import { RoadDivider } from "@/components/ui/primitives";

/**
 * Rydin waitlist — page assembly with elevated commuterCount state.
 *
 * State elevation connects the live Firestore intake and immediate form
 * submissions directly with the TelemetryStrip and derivative fuel savings.
 */
export default function Page() {
  const [commuterCount, setCommuterCount] = useState<number>(200);

  useEffect(() => {
    let active = true;

    // Check stored pass so counter immediately accounts for confirmed spot
    const local = readPass();
    if (local?.basePosition) {
      setCommuterCount((prev) => Math.max(prev, local.basePosition));
    }

    async function initCommuterCount() {
      try {
        const waitlistCol = collection(db, "waitlist_users");
        const countSnapshot = await getCountFromServer(waitlistCol);
        const totalInCollection = countSnapshot.data().count;
        if (active) {
          setCommuterCount((prev) => Math.max(prev, 200 + totalInCollection));
        }
      } catch (err) {
        console.warn("Telemetry count fetch fallback:", err);
      }
    }

    void initCommuterCount();

    return () => {
      active = false;
    };
  }, []);

  const handleSuccess = () => {
    setCommuterCount((prev) => prev + 1);
  };

  return (
    <WaitlistProvider>
      <Header />

      <main>
        <Hero onSuccess={handleSuccess} />
        <TelemetryStrip commuterCount={commuterCount} />
        <SavingsCalculator />
        <RoadDivider />
        <BentoGrid />
        <RoadDivider />
        <ReferralRewards />
        <FaqAccordion />
      </main>

      <Footer />
      <StickyCta />
      <SocialBar />
    </WaitlistProvider>
  );
}

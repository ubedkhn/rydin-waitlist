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
 * Rydin waitlist — page assembly.
 *
 * Everything sits inside a single WaitlistProvider so the header lookup, the
 * hero card, the telemetry strip, the rewards ladder, the sticky bar and the
 * footer all read one source of truth. Without that they would each keep their
 * own copy of "has this person joined?" and visibly disagree.
 *
 * Order is an argument, not a layout: the problem and the ask (hero), proof
 * that others already agreed (telemetry), the reader's own numbers (calculator),
 * how it works and why it's safe (bento), what they get for spreading it
 * (rewards), the objections (FAQ), then the last ask (footer).
 */
export default function Page() {
  return (
    <WaitlistProvider>
      <Header />

      <main>
        <Hero />
        <TelemetryStrip />
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

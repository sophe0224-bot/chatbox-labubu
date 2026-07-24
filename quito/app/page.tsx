import type { Metadata } from "next";
import MediaSeedingSimulator from "./MediaSeedingSimulator";

export const metadata: Metadata = {
  title: "LABUBU Experience Chatbox",
  description:
    "A bilingual Labubu-style chatbox experience for personality, identity, social proof, FOMO, and media literacy.",
};

export default function Home() {
  return <MediaSeedingSimulator />;
}

import type { Metadata } from "next";
import ChatBox from "./ChatBox";

export const metadata: Metadata = {
  title: "LABUBU Experience Chatbox",
  description:
    "A bilingual Labubu-style chatbox exploring how identity, social proof, and FOMO shape collector desire.",
};

export default function Home() {
  return <ChatBox />;
}

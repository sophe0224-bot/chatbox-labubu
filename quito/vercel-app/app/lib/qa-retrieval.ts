// Local, offline "Q&A retrieval" for the Labubu research chatbox.
// This is intentionally simple: a small set of keyword-tagged answers,
// matched by substring against the visitor's message. No external API,
// no model call — swap `retrieveAnswer` for a real backend/LLM call later
// without changing anything else in the UI.

export type Lang = "zh" | "en";

type QaEntry = {
  id: string;
  keywords: Record<Lang, string[]>;
  answer: Record<Lang, string>;
};

const QA_DATASET: QaEntry[] = [
  {
    id: "what-is-labubu",
    keywords: {
      zh: ["labubu是什么", "什么是labubu", "介绍", "labubu 是"],
      en: ["what is labubu", "who is labubu", "introduce"],
    },
    answer: {
      zh: "Labubu 是泡泡玛特旗下的精灵角色玩具。这个 chatbox 不是商店，而是一个研究媒体如何影响收藏欲望的模拟实验。",
      en: "Labubu is a collectible character from POP MART. This chatbox isn't a store — it's a research simulation of how media shapes collector desire.",
    },
  },
  {
    id: "why-like",
    keywords: {
      zh: ["为什么喜欢", "为什么想要", "喜欢的原因"],
      en: ["why do i like", "why would i want", "why like"],
    },
    answer: {
      zh: "研究发现，喜欢往往从情感价值开始：可爱的角色能带来情绪安慰，之后才逐渐和身份、审美联系在一起。",
      en: "Research suggests liking often starts with emotional value — a cute character offers comfort — before it connects to identity and personal style.",
    },
  },
  {
    id: "social-proof",
    keywords: {
      zh: ["大家都有", "社群", "跟风", "流行", "trending"],
      en: ["everyone has", "community", "trending", "bandwagon", "popular"],
    },
    answer: {
      zh: "当页面强调“大家都在讨论”而不是“立即购买”时，这在触发从众效应（bandwagon effect）和社会认同（social proof）。",
      en: "When a page emphasizes 'everyone is talking about this' instead of 'buy now', it's triggering the bandwagon effect and social proof.",
    },
  },
  {
    id: "fomo-scarcity",
    keywords: {
      zh: ["稀缺", "限量", "抢购", "错过", "fomo", "库存"],
      en: ["scarce", "limited", "rare", "miss out", "fomo", "stock"],
    },
    answer: {
      zh: "稀缺提示（限量、库存紧张）通常在用户已经产生兴趣后才出现，用来放大 FOMO（错失恐惧），而不是一开始就用来吸引注意。",
      en: "Scarcity cues (limited stock, low inventory) usually appear after interest already exists — they amplify FOMO rather than create the initial hook.",
    },
  },
  {
    id: "price-purchase",
    keywords: {
      zh: ["多少钱", "价格", "购买", "在哪买", "下单"],
      en: ["price", "cost", "buy", "purchase", "where to buy"],
    },
    answer: {
      zh: "这里不展示价格也不支持购买 —— 这是一个媒体素养实验，目的是帮助你观察自己的欲望是如何被内容一步步引导的，而不是促成消费。",
      en: "There are no prices or checkout here — this is a media-literacy experiment meant to help you notice how desire gets shaped, not to drive a purchase.",
    },
  },
];

const FALLBACK_ANSWER: Record<Lang, string> = {
  zh: "可以试着问我：为什么会喜欢 Labubu？稀缺感是怎么起作用的？或者 Labubu 是什么？",
  en: "Try asking things like: Why do people like Labubu? How does scarcity work? Or: what is Labubu?",
};

export function retrieveAnswer(rawMessage: string, lang: Lang): string {
  const message = rawMessage.trim().toLowerCase();

  for (const entry of QA_DATASET) {
    const matched = entry.keywords[lang].some((keyword) =>
      message.includes(keyword.toLowerCase()),
    );
    if (matched) return entry.answer[lang];
  }

  return FALLBACK_ANSWER[lang];
}

"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getOrCreateUser, type AnonymousUser } from "./lib/anonymous-user";
import {
  MAX_MESSAGE_LENGTH,
  MAX_MESSAGES_PER_USER,
  getRemainingMessages,
  logInteraction,
} from "./lib/interaction-tracker";
import { retrieveAnswer, type Lang } from "./lib/qa-retrieval";

type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
};

const copy = {
  zh: {
    brand: "LABUBU 体验 Chatbox",
    brandSub: "media desire lab",
    language: "语言",
    reset: "重置对话",
    placeholder: "输入你的问题，比如“为什么大家喜欢 Labubu？”",
    send: "发送",
    remaining: (n: number) => `还可以发送 ${n} 条消息`,
    limitReached: `已达到消息上限（${MAX_MESSAGES_PER_USER} 条）。`,
    tooLong: `消息不能超过 ${MAX_MESSAGE_LENGTH} 个字符。`,
    welcomeNew:
      "欢迎来到 LABUBU 研究 Chatbox。这是一个媒体素养实验，不是商店。问我任何关于“为什么会想要 Labubu”的问题吧。",
    welcomeBack: "欢迎回来！继续问我关于 Labubu 收藏心理的问题吧。",
    ethical:
      "说明：这是行为模拟/媒体素养实验，不出售商品，也不伪造库存或倒计时。",
  },
  en: {
    brand: "LABUBU Experience Chatbox",
    brandSub: "media desire lab",
    language: "Language",
    reset: "Reset chat",
    placeholder: 'Ask something, e.g. "Why do people like Labubu?"',
    send: "Send",
    remaining: (n: number) => `${n} messages left`,
    limitReached: `You've reached the message limit (${MAX_MESSAGES_PER_USER}).`,
    tooLong: `Messages can't be longer than ${MAX_MESSAGE_LENGTH} characters.`,
    welcomeNew:
      "Welcome to the LABUBU research chatbox. This is a media-literacy experiment, not a store. Ask me anything about why people want a Labubu.",
    welcomeBack: "Welcome back! Ask me more about Labubu collector psychology.",
    ethical:
      "Note: this is a behavior simulation / media-literacy experiment. It does not sell products or fake stock or countdowns.",
  },
} satisfies Record<Lang, unknown>;

const EMPTY_USER: AnonymousUser = { userId: "", isReturning: false };

function welcomeMessage(text: string): ChatMessage {
  return { id: "welcome", role: "bot", text };
}

export default function ChatBox() {
  const [lang, setLang] = useState<Lang>("zh");
  // Server render always starts from a signed-out-looking state. The real,
  // localStorage-derived user is filled in by the effect below, once we're
  // definitely running in the browser — this avoids a hydration mismatch
  // between what the server rendered and what a returning visitor sees.
  const [user, setUser] = useState<AnonymousUser>(EMPTY_USER);
  const [messages, setMessages] = useState<ChatMessage[]>([
    welcomeMessage(copy.zh.welcomeNew),
  ]);
  const [input, setInput] = useState("");
  const [remaining, setRemaining] = useState(MAX_MESSAGES_PER_USER);
  const [error, setError] = useState<string | null>(null);
  const t = copy[lang];

  useEffect(() => {
    const loadedUser = getOrCreateUser();
    setUser(loadedUser);
    setRemaining(getRemainingMessages(loadedUser.userId));
    if (loadedUser.isReturning) {
      setMessages([welcomeMessage(copy.zh.welcomeBack)]);
    }
  }, []);

  const ready = user.userId !== "";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!ready) return;

    const result = logInteraction(user.userId, input);

    if (!result.ok) {
      if (result.reason === "too_long") setError(t.tooLong);
      if (result.reason === "rate_limited") setError(t.limitReached);
      return;
    }

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      text: input.trim(),
    };
    const botMessage: ChatMessage = {
      id: `${Date.now()}-bot`,
      role: "bot",
      text: retrieveAnswer(userMessage.text, lang),
    };

    setMessages((prev) => [...prev, userMessage, botMessage]);
    setRemaining(result.remaining);
    setInput("");
  }

  function reset() {
    setMessages([welcomeMessage(user.isReturning ? t.welcomeBack : t.welcomeNew)]);
    setError(null);
  }

  const limitReached = ready && remaining <= 0;

  return (
    <main className="chatbox-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">L</span>
          <span>
            <strong>{t.brand}</strong>
            <small>{t.brandSub}</small>
          </span>
        </div>
        <div className="header-actions" aria-label={t.language}>
          <button
            className={lang === "zh" ? "language active" : "language"}
            onClick={() => setLang("zh")}
            type="button"
          >
            中文
          </button>
          <button
            className={lang === "en" ? "language active" : "language"}
            onClick={() => setLang("en")}
            type="button"
          >
            EN
          </button>
          <button className="reset-button" onClick={reset} type="button">
            {t.reset}
          </button>
        </div>
      </header>

      <section className="chat-window">
        <div className="message-stream">
          {messages.map((message) => (
            <article className={`message-row ${message.role}`} key={message.id}>
              <div className="avatar">{message.role === "bot" ? "L" : "U"}</div>
              <div className="message-bubble">
                <p>{message.text}</p>
              </div>
            </article>
          ))}
        </div>

        {error ? <p className="limit-notice">{error}</p> : null}

        <form className="composer" onSubmit={handleSubmit}>
          <label htmlFor="chat-input">message</label>
          <input
            disabled={!ready || limitReached}
            id="chat-input"
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t.placeholder}
            value={input}
          />
          <button
            className="send-button"
            disabled={!ready || limitReached || !input.trim()}
            type="submit"
          >
            {t.send}
          </button>
        </form>

        <div className="composer-meta">
          <span>{t.remaining(remaining)}</span>
        </div>

        <div className="ethics-card">
          <p>{t.ethical}</p>
        </div>
      </section>
    </main>
  );
}

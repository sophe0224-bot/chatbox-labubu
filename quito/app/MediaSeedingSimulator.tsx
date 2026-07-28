"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getOrCreateUserId } from "./lib/anonymous-user";
import { getTokenSnapshot, logInteraction, TOKEN_BUDGET } from "./lib/interaction-tracker";
import knowledgeBase from "./lib/Labubu_100_QA.json";

type Lang = "zh" | "en";

type KnowledgeEntry = {
  question: string;
  answer: string;
};

type ChatReply = {
  id: string;
  question: string;
  answer: string;
};

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "can", "did", "do", "does",
  "for", "from", "how", "i", "in", "is", "it", "labubu", "of", "on", "or",
  "the", "this", "to", "was", "what", "when", "where", "which", "who", "why",
  "with", "would", "you",
]);

function terms(value: string): string[] {
  const expanded = value
    .replace(/谁创造|创作者|作者/g, " creator ")
    .replace(/起源|来源|故事/g, " origin story ")
    .replace(/盲盒/g, " blind box ")
    .replace(/稀缺|限量|缺货/g, " scarcity limited ")
    .replace(/转售|二手|炒价/g, " resale price ")
    .replace(/假货|仿品/g, " counterfeit fake ")
    .replace(/明星|名人/g, " celebrity ")
    .replace(/丽莎/g, " Lisa ")
    .replace(/时尚|穿搭/g, " fashion style ")
    .replace(/上瘾|心理/g, " psychology reinforcement ")
    .replace(/过度消费|浪费/g, " overconsumption waste ");

  return expanded
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function retrieveKnowledgeAnswer(
  query: string,
  lang: Lang,
  previousQuestion?: string,
): string {
  const adaptiveReply = buildAdaptiveReply(query, lang, previousQuestion);
  if (adaptiveReply) return adaptiveReply;

  const shortFollowUp = terms(query).length <= 2 && previousQuestion;
  const searchQuery = shortFollowUp ? `${previousQuestion} ${query}` : query;
  const queryTerms = new Set(terms(searchQuery));
  let best: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of knowledgeBase as KnowledgeEntry[]) {
    const questionTerms = terms(entry.question);
    const overlap = questionTerms.reduce(
      (score, word) => score + (queryTerms.has(word) ? 1 : 0),
      0,
    );
    const phraseBonus = entry.question.toLowerCase().includes(searchQuery.toLowerCase())
      || searchQuery.toLowerCase().includes(entry.question.toLowerCase())
      ? 3
      : 0;
    const score = overlap + phraseBonus;
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  if (best && bestScore > 0) {
    return humanizeAnswer(best.answer, query, best.question, lang, Boolean(shortFollowUp));
  }
  return lang === "zh"
    ? "我暂时没有在已学习的 Labubu 文章中找到足够匹配的信息。你可以换一种问法，或询问 Labubu 的起源、盲盒心理、明星传播、稀缺性、转售或过度消费。"
    : "I could not find a strong match in the supplied Labubu articles. Try asking about Labubu's origins, blind-box psychology, celebrity influence, scarcity, resale, fashion, or overconsumption.";
}

function buildAdaptiveReply(
  query: string,
  lang: Lang,
  previousQuestion?: string,
): string | null {
  const normalized = query.toLowerCase();
  const joined = `${previousQuestion ?? ""} ${query}`.toLowerCase();
  const saysNo = /不想|不要|不需要|没兴趣|不喜欢|算了|观望|拒绝|停一下|冷静|not|don't|do not|no |avoid|pass|skip|unsure|wait/.test(normalized);
  const saysWant = /想要|想买|喜欢|要买|心动|加入|收藏|跟上|落下|怕错过|everyone|friend|friends|want|buy|like|own|join|miss out|left out|fomo/.test(normalized);
  const social = /朋友|大家|别人|同学|身边|话题|圈子|群体|社群|跟风|落下|everyone|friend|friends|peer|group|community|trend|left out/.test(joined);
  const budget = /钱|价格|贵|预算|花费|省钱|price|expensive|budget|cost|money|spend/.test(joined);
  const cute = /可爱|治愈|开心|压力|情绪|cute|comfort|stress|happy|mood/.test(joined);
  const rare = /隐藏|稀有|限量|缺货|抽中|rare|secret|limited|sold out|low stock/.test(joined);
  const fake = /假|仿|真假|counterfeit|fake|lafufu/.test(joined);
  const style = /穿搭|包|风格|搭配|审美|fashion|style|bag|outfit|aesthetic/.test(joined);
  const origin = /谁|创作|起源|来源|故事|creator|created|origin|story|history/.test(joined);

  if (social && saysNo) {
    return lang === "zh"
      ? "你这个回答更像是在识别社交压力，而不是单纯表达“我想买”。当你说“不想被朋友的话题落下”时，真正的驱动力可能是归属感和害怕错过讨论。\n\n可以先问自己一句：如果朋友明天不聊 Labubu 了，我还会想拥有它吗？"
      : "That answer points more to social pressure than simple desire. Saying you do not want to be left out of your friends' conversation means the driver may be belonging and fear of missing the discussion.\n\nA useful check is: if your friends stopped talking about Labubu tomorrow, would you still want one?";
  }
  if (social && saysWant) {
    return lang === "zh"
      ? "这更像社会认同在起作用：当身边的人都拥有或讨论 Labubu 时，它会变成加入群体的信号，而不只是一个玩具。\n\n下一步可以区分两件事：你是喜欢 Labubu 本身，还是更想参与朋友之间的话题？"
      : "That sounds like social proof at work: when people around you own or discuss Labubu, it becomes a signal of belonging, not just a toy.\n\nThe next distinction is whether you like Labubu itself, or whether you mainly want to join the conversation around it.";
  }
  if (budget) {
    return lang === "zh"
      ? "你的回答已经转向理性决策了。Labubu 的风险不一定是单个价格，而是盲盒、配件、重复款和转售价格叠加后的总花费。\n\n更稳的做法是先设一个上限：如果超过这个预算，就把它当作内容兴趣，而不是购买计划。"
      : "Your answer moves the conversation toward a more rational decision. The risk with Labubu is often not one single price, but the total cost of blind boxes, accessories, duplicates, and resale markups.\n\nA stronger choice is to set a limit first: past that budget, treat it as content interest rather than a purchase plan.";
  }
  if (rare) {
    return lang === "zh"
      ? "你提到的是稀缺感触发：隐藏款、限量和缺货会让人感觉机会正在消失。这个机制会提高兴趣，但不一定说明你真的需要它。\n\n可以先暂停一下：你想要的是这个具体款式，还是“抽中稀有款”的刺激？"
      : "You are pointing to a scarcity trigger: secret editions, limited releases, and low-stock signals make the opportunity feel like it is disappearing. That can raise desire without proving you truly need it.\n\nPause on this: do you want this specific design, or the thrill of getting something rare?";
  }
  if (fake) {
    return lang === "zh"
      ? "这类担心很实际。越热门、越难买的款式，越容易出现仿品和真假争议；只靠一个外观细节通常不够可靠。\n\n如果你还在犹豫，可以把“能否确认来源”作为是否购买的第一条件。"
      : "That concern is practical. The more popular and scarce a release becomes, the more likely counterfeits and authenticity disputes appear; one visual clue is usually not enough.\n\nIf you are unsure, make source verification the first condition before buying.";
  }
  if (style) {
    return lang === "zh"
      ? "你的回答偏向身份表达：Labubu 在这里不是普通玩具，而是包挂、穿搭和审美标签的一部分。\n\n可以继续想：它是否真的适合你的风格，还是只是因为你最近频繁看到别人这样搭配？"
      : "Your answer leans toward identity expression: Labubu is acting less like a normal toy and more like a bag charm, styling cue, or aesthetic label.\n\nThe useful question is whether it genuinely fits your style, or whether you are responding to seeing the same styling repeatedly.";
  }
  if (cute) {
    return lang === "zh"
      ? "这说明情绪价值在起作用。可爱、治愈和缓解压力的内容，会让 Labubu 先和心情绑定，再和购买绑定。\n\n这不一定是坏事，但你可以分清楚：我是现在需要一点安慰，还是长期真的想收藏？"
      : "That shows emotional value is driving the response. Cute, comforting, stress-relief content connects Labubu to mood first, and buying second.\n\nThat is not automatically bad, but it helps to separate the two: do you need comfort right now, or do you genuinely want to collect it long term?";
  }
  if (origin) {
    return lang === "zh"
      ? "你问的是背景线索。Labubu 原本来自艺术家龙家升的《The Monsters》故事世界，后来通过 Pop Mart 的授权和盲盒体系进入大众收藏市场。\n\n所以它的吸引力同时来自角色故事、设计风格和商业传播。"
      : "You are asking about background. Labubu began in artist Kasing Leung's The Monsters story world, then reached a mass collecting audience through Pop Mart licensing and blind-box distribution.\n\nSo its appeal comes from character lore, visual design, and commercial media circulation at the same time.";
  }
  if (saysNo) {
    return lang === "zh"
      ? "你的回答是在给冲动降温。这里最重要的不是立刻判断“买不买”，而是看清是哪一种内容影响了你：情绪、身份、社群，还是稀缺感。\n\n如果你已经在观望，说明你正在把欲望重新拉回选择权。"
      : "Your answer is cooling down the impulse. The key is not to decide immediately whether to buy, but to identify what influenced you: emotion, identity, community, or scarcity.\n\nIf you are already waiting, you are moving the decision back into your own control.";
  }
  if (saysWant) {
    return lang === "zh"
      ? "你表达的是兴趣上升。下一步不要只问“我想不想要”，而要问“我为什么现在更想要”：是因为它可爱、适合我的风格、朋友也在聊，还是因为担心之后买不到？"
      : "You are describing rising interest. The next step is not only asking whether you want it, but why you want it more now: because it is cute, fits your style, your friends are discussing it, or you worry it may disappear later.";
  }

  return null;
}

function humanizeAnswer(
  answer: string,
  query: string,
  matchedQuestion: string,
  lang: Lang,
  continued: boolean,
): string {
  const score = [...query].reduce((total, char) => total + char.charCodeAt(0), 0);
  const displayAnswer = lang === "zh"
    ? localizeKnowledgeAnswer(answer, matchedQuestion)
    : answer;
  const openings = lang === "zh"
    ? continued
      ? ["对，顺着刚才的话题来说，", "这个追问很关键。", "继续刚才那一点，"]
      : ["简单来说，", "这是个很好的问题。", "这里最关键的是："]
    : continued
      ? ["Yes—and building on that, ", "That connects directly to the last point. ", "Good follow-up. "]
      : ["Short answer: ", "The key idea is this: ", "A useful way to see it is: "];
  const opening = openings[score % openings.length];
  const topic = matchedQuestion.toLowerCase();
  const followUp = topic.includes("blind") || topic.includes("secret")
    ? lang === "zh"
      ? "你想继续了解盲盒为什么容易让人重复购买吗？"
      : "Want to look at why the blind-box reveal can lead to repeat buying?"
    : topic.includes("celebr") || topic.includes("lisa")
      ? lang === "zh"
        ? "你想再看看 Lisa 和其他明星是怎样放大这股热潮的吗？"
        : "Want to explore how Lisa and other celebrities amplified the trend?"
      : topic.includes("scar") || topic.includes("resale") || topic.includes("fake")
        ? lang === "zh"
          ? "要不要接着聊稀缺、转售和假货之间的关系？"
          : "Would you like to connect this to scarcity, resale prices, and counterfeits?"
        : topic.includes("consum") || topic.includes("waste") || topic.includes("fomo")
          ? lang === "zh"
            ? "你想进一步分析错失恐惧是怎样影响购买决定的吗？"
            : "Want to unpack how FOMO changes a buying decision?"
          : lang === "zh"
            ? "你想从历史、设计，还是收藏心理继续了解？"
            : "Would you like to go deeper into its history, design, or collector psychology?";

  return `${opening}${displayAnswer}\n\n${followUp}`;
}

function localizeKnowledgeAnswer(answer: string, matchedQuestion: string): string {
  const source = `${matchedQuestion} ${answer}`.toLowerCase();

  if (source.includes("creator") || source.includes("kasing") || source.includes("leung")) {
    return "Labubu 由艺术家龙家升创作。他出生于香港、成长于荷兰，插画背景和欧洲民间故事经验共同塑造了 Labubu 带有童话感、森林感和一点怪诞气质的视觉风格。";
  }
  if (source.includes("the monsters") || source.includes("fictional world") || source.includes("nordic")) {
    return "Labubu 属于龙家升创作的《The Monsters》世界。这个世界受北欧民间传说影响，常出现森林、精灵和带一点暗黑童话感的角色，所以 Labubu 看起来既可爱又有一点调皮怪异。";
  }
  if (source.includes("pop mart") || source.includes("licensing") || source.includes("retail") || source.includes("vending")) {
    return "Pop Mart 的作用是把原本偏小众的艺术角色商业化、规模化，并通过门店、机器、线上内容和盲盒系列把 Labubu 推向更大的收藏市场。";
  }
  if (source.includes("blind") || source.includes("secret") || source.includes("duplicate") || source.includes("dopamine") || source.includes("gambling")) {
    return "盲盒机制会把购买从单纯选择商品变成等待揭晓的过程。隐藏款、重复款和不确定结果会放大期待感，也容易让人为了补齐系列或抽到稀有款而反复购买。";
  }
  if (source.includes("scarcity") || source.includes("limited") || source.includes("queue") || source.includes("lottery") || source.includes("fomo")) {
    return "稀缺信息会让人更担心错过机会。排队、抽签、限量发售和低库存提示都会提高感知价值，但也可能让购买决定从真实喜欢变成被紧迫感推动。";
  }
  if (source.includes("resale") || source.includes("secondary market") || source.includes("counterfeit") || source.includes("fake")) {
    return "当热门款难买时，二级市场价格会上升，仿品也更容易出现。资料提醒用户不要只靠单一外观线索判断真假，也要注意转售炒价会反过来强化稀缺感。";
  }
  if (source.includes("lisa") || source.includes("celebrity") || source.includes("blackpink") || source.includes("influencer")) {
    return "明星和创作者让 Labubu 从玩具变成可见的风格符号。Lisa 等公众人物的展示会让粉丝觉得它更真实、更时髦，也更像一种可以参与的社群趋势。";
  }
  if (source.includes("social media") || source.includes("tiktok") || source.includes("unboxing") || source.includes("algorithm")) {
    return "社交媒体会把开箱、穿搭、反应和讨论变成连续内容。算法反复推送相似内容时，用户容易产生“大家都在拥有它”的印象，从而放大兴趣和跟风压力。";
  }
  if (source.includes("identity") || source.includes("fashion") || source.includes("handbag") || source.includes("gen z") || source.includes("community")) {
    return "Labubu 的吸引力不只来自玩具本身，也来自身份表达。把它挂在包上、搭配衣服或加入社群讨论，会让它成为审美、圈层和个人风格的一部分。";
  }
  if (source.includes("custom") || source.includes("accessories") || source.includes("bag charm")) {
    return "换装、配件和包挂使用方式会让 Labubu 更个人化。用户不只是展示一个成品，而是在通过搭配、携带和改造表达自己的风格。";
  }
  if (source.includes("overconsumption") || source.includes("waste") || source.includes("budget") || source.includes("sustainability") || source.includes("anti-haul")) {
    return "资料提醒要警惕过度消费：低单价可能掩盖累计花费，重复款也会带来浪费。等待一段时间、设定预算、参加低消费的社群活动，都能减少冲动购买。";
  }
  if (source.includes("ugly-cute") || source.includes("visual") || source.includes("teeth") || source.includes("mischievous")) {
    return "Labubu 的标志性特征包括尖耳朵、大眼睛、毛绒身体和露齿笑。它同时有可爱和怪诞两种信号，因此更容易引发好奇、讨论和记忆点。";
  }

  return "资料主要说明：Labubu 的热度来自角色设计、社交媒体传播、盲盒机制、社群认同和稀缺感共同作用。理解这些因素，可以帮助用户区分真实喜欢和被趋势推动的购买欲。";
}

const copy = {
  zh: {
    stripB: "从内容吸引到身份认同，再到理性选择",
    brand: "LABUBU 体验 Chatbox",
    brandSub: "媒体欲望实验",
    language: "语言",
    reset: "重置",
    chatTitle: "你是哪一种收藏者？",
    chatSub: "通过 30 秒体验，观察媒体内容如何从性格、身份和社群归属感影响欲望。",
    leftTitle: "体验路径",
    dashboard: "心理影响仪表盘",
    blueprint: "研究关键词",
    input: "选择一个回复，让模拟继续推进...",
    askPlaceholder: "输入关于 Labubu 的问题…",
    askButton: "提问",
    send: "继续",
    reportTitle: "当前研究解释",
    ethical: "说明：这是行为模拟/媒体素养实验，不伪造实时购买、不伪造倒计时，也不把价格作为主要诱因。",
    knowledgeTitle: "Labubu 知识库",
    tokensLabel: (n: number) => `剩余提问次数：${n}`,
    cooldownMessage: (time: string) => `提问次数已用完，请等待 ${time} 后重试。`,
    sources: {
      quiz: "体验问题",
      media: "媒体内容",
      social: "社交提示",
      mind: "用户内心",
      system: "研究分析",
      reflection: "反思提醒",
    },
    metrics: {
      emotional: "情感价值",
      identity: "身份认同",
      belonging: "归属感",
      fomo: "错失恐惧",
    },
    actions: [
      { label: "选择 A", delta: 8 },
      { label: "选择 B", delta: 10 },
      { label: "收藏线索", delta: 12 },
      { label: "保持观望", delta: -4 },
    ],
    keywords: ["情感价值", "身份建构", "归属感", "社会认同", "从众效应", "稀缺感", "错失恐惧"],
  },
  en: {
    stripB: "From content attraction to identity fit, then reflective choice",
    brand: "LABUBU Experience Chatbox",
    brandSub: "media desire lab",
    language: "Language",
    reset: "Reset",
    chatTitle: "What Kind of Collector Are You?",
    chatSub: "A 30-second experience showing how media content shapes desire through personality, identity, and belonging.",
    leftTitle: "Experience path",
    dashboard: "Influence dashboard",
    blueprint: "Research keywords",
    input: "Choose a response to continue the simulation...",
    askPlaceholder: "Ask a question about Labubu…",
    askButton: "Ask",
    send: "Next",
    reportTitle: "Current research explanation",
    ethical: "Note: this is a behavior simulation and media literacy experiment. It does not fake live purchases, fake countdowns, or use price as the main trigger.",
    knowledgeTitle: "Labubu Knowledge Base",
    tokensLabel: (n: number) => `Tokens left: ${n}`,
    cooldownMessage: (time: string) => `Token limit reached. Please wait ${time}.`,
    sources: {
      quiz: "Experience prompt",
      media: "Media content",
      social: "Social cue",
      mind: "Viewer mind",
      system: "Research analysis",
      reflection: "Reflection note",
    },
    metrics: {
      emotional: "Emotional value",
      identity: "Identity fit",
      belonging: "Belonging",
      fomo: "FOMO",
    },
    actions: [
      { label: "Pick A", delta: 8 },
      { label: "Pick B", delta: 10 },
      { label: "Save clue", delta: 12 },
      { label: "Stay unsure", delta: -4 },
    ],
    keywords: ["Emotional value", "Identity construction", "Belonging", "Social proof", "Bandwagon effect", "Scarcity", "FOMO"],
  },
};

const paths = {
  zh: [
    {
      title: "入口体验",
      note: "不是直接下单，而是发现自己",
      image: "/labubu/product-3.jpg",
      score: 18,
      profile: "未知浏览者",
      messages: {
        quiz: "欢迎进入 30 秒体验：你是哪一种收藏者？",
        media: "推荐流没有商品价格和购买按钮，只出现一个问题：哪一种怪物最像你？",
        social: "页面提示：每个人都有自己的偏爱。本周最多人分享的是“梦境收藏者”。",
        mind: "这不像商店，更像一个测试。我想看看自己是哪种类型。",
        system: "第一步把“购物”改写成“身份探索”，对应研究中的身份建构。",
        reflection: "此阶段不推动购买，只记录用户是否愿意进入体验。",
      },
    },
    {
      title: "压力情境",
      note: "性格测试第 1 题",
      image: "/labubu/product-5.jpg",
      score: 32,
      profile: "情绪型浏览者",
      messages: {
        quiz: "问题 1：当你压力很大时，你更可能怎么做？A. 找点可爱的东西 B. 刷短视频 C. 找朋友聊天 D. 一个人待着",
        media: "短视频内容展示 Labubu 作为情绪安慰物，而不是商品清单。",
        social: "社区动态：Emily 收藏了一个以舒适感为主题的 Labubu 房间布置。",
        mind: "我确实会刷可爱的东西缓解压力。",
        system: "这里触发情感价值：用户不是先看价格，而是把角色和情绪调节联系起来。",
        reflection: "系统提醒：可爱内容可能影响情绪性消费，需要在报告中单独标注。",
      },
    },
    {
      title: "喜欢原因",
      note: "性格测试第 2 题",
      image: "/labubu/product-10.jpg",
      score: 46,
      profile: "身份寻找中",
      messages: {
        quiz: "问题 2：你为什么喜欢 Labubu？A. 它很可爱 B. 身边很多人都有 C. 它感觉很特别 D. 我还说不清",
        media: "页面展示穿搭、桌面和包挂场景，让 Labubu 成为个人风格的一部分。",
        social: "提示：你附近的用户正在收藏柔和粉彩风格。",
        mind: "如果它代表一种风格，而不是单纯玩具，好像更能解释我为什么喜欢。",
        system: "欲望从物品转移到身份表达，用户开始用 Labubu 定义自己的审美。",
        reflection: "此处避免价格刺激，改用收藏者评分、社区喜爱度和风格标签。",
      },
    },
    {
      title: "生成身份",
      note: "梦境收藏者",
      image: "/labubu/product-11.jpg",
      score: 62,
      profile: "梦境收藏者",
      messages: {
        quiz: "结果：你是梦境收藏者。你喜欢柔和色彩、小仪式感，以及带有个人情绪意义的物件。",
        media: "系统推荐：最适合你的 Labubu 是“云朵柔软风”。注意，这是推荐，不是售卖。",
        social: "社区标签：社区喜爱款 / 收藏最多 / 收藏者评分 4.8",
        mind: "这个结果有点像在说我自己，所以推荐看起来更合理。",
        system: "推荐被包装成身份匹配，而不是广告转化。用户更容易接受后续内容。",
        reflection: "研究提示：推荐系统通过个性化解释提升认同感和停留时间。",
      },
    },
    {
      title: "热门社区",
      note: "社会认同上升",
      image: "/labubu/product-4.jpg",
      score: 74,
      profile: "被社群吸引",
      messages: {
        quiz: "本周热门：今日最多分享 / 最多收藏 / 朋友也喜欢",
        media: "社交流出现：Emily 刚抽到隐藏款。Jason 集齐了第三系列。Anna 正在找粉彩风格。",
        social: "这里不是“畅销榜”，而是“今日社区”，模拟 Instagram / 小红书式社群氛围。",
        mind: "好像大家都在参与一个小圈子，我也想知道他们在讨论什么。",
        system: "这里呈现从众心理和乐队花车效应：用户被社群活动吸引，而不是被购买按钮吸引。",
        reflection: "保留不同意见：也有人说先确认自己真的喜欢，不要只跟风。",
      },
    },
    {
      title: "错失恐惧阶梯",
      note: "稀缺感逐步出现",
      image: "/labubu/product-8.jpg",
      score: 86,
      profile: "稀有款猎人倾向",
      messages: {
        quiz: "错失恐惧阶梯：被 428 人看过 -> 今天 89 次加入愿望清单 -> 限量发布 -> 低库存信号",
        media: "稀缺信息不是一开始就出现，而是在用户已有兴趣和社群认同后逐步增强。",
        social: "朋友动态：两位朋友收藏了这个风格，但页面不会显示伪造的实时购买记录。",
        mind: "我不一定要立刻买，但我开始担心之后找不到。",
        system: "这一步模拟稀缺感和错失恐惧。它解释欲望如何被推高，而不是直接制造催单页面。",
        reflection: "理性提示同步显示：是否因为稀缺提示而提高兴趣？是否已经拥有相似款？",
      },
    },
    {
      title: "反思报告",
      note: "为什么我会想要",
      image: "/labubu/product-12.jpg",
      score: 78,
      profile: "已完成体验",
      messages: {
        quiz: "你的路径：情感价值 -> 身份匹配 -> 社群归属 -> 觉察错失恐惧",
        media: "报告显示：最有效内容不是产品列表，而是个性测试、社群动态和逐步稀缺提示。",
        social: "影响来源：开箱内容 31%，社群归属 27%，稀缺提示 22%，角色风格 20%。",
        mind: "我现在更清楚：我不是突然想买，而是被内容一步步带入了兴趣。",
        system: "这就是研究主题：社交媒体 -> 欲望 -> 决策。网站应让用户看到这个过程。",
        reflection: "最终按钮应是“查看我的报告”或“反思我的选择”，而不是直接购买。",
      },
    },
  ],
  en: [
    {
      title: "Entry experience",
      note: "Not checkout, but self-discovery",
      image: "/labubu/product-3.jpg",
      score: 18,
      profile: "Unknown viewer",
      messages: {
        quiz: "Welcome to a 30-second experience: What Kind of Collector Are You?",
        media: "The feed shows no prices or checkout buttons, only one hook: Which Monster Matches You?",
        social: "The page says: Everyone has a favorite. This week's most shared type is Dream Collector.",
        mind: "This does not feel like a shop. It feels like a quiz, so I want to see my type.",
        system: "Step one reframes shopping as self-discovery, matching identity construction in the research.",
        reflection: "No purchase push appears here. The system only records willingness to enter the experience.",
      },
    },
    {
      title: "Stress context",
      note: "Personality Quiz Q1",
      image: "/labubu/product-5.jpg",
      score: 32,
      profile: "Emotion-led viewer",
      messages: {
        quiz: "Question 1: When you're stressed... A. Pick something cute B. Watch TikTok C. Talk to friends D. Stay alone",
        media: "Short-form content frames Labubu as an emotional comfort object, not a product list.",
        social: "Community update: Emily saved a comfort-themed Labubu room setup.",
        mind: "I do scroll cute things when I feel stressed.",
        system: "This activates emotional value. The viewer links the character to mood regulation before considering ownership.",
        reflection: "The report should flag cute content as a possible emotional-consumption trigger.",
      },
    },
    {
      title: "Reason for liking",
      note: "Personality Quiz Q2",
      image: "/labubu/product-10.jpg",
      score: 46,
      profile: "Identity searching",
      messages: {
        quiz: "Question 2: Why do you like Labubu? A. It's adorable B. Everyone has one C. It feels special D. I don't know yet",
        media: "Styling, desk, and bag scenes make Labubu feel like part of a personal aesthetic.",
        social: "Cue: People in your area are collecting soft pastel styles.",
        mind: "If it represents a style rather than just a toy, that explains why I like it.",
        system: "Desire shifts from object to identity expression. The viewer starts using Labubu to describe taste.",
        reflection: "Avoid price cues here. Use Collector Rating, Community Favorite, and style tags instead.",
      },
    },
    {
      title: "Identity result",
      note: "Dream Collector",
      image: "/labubu/product-11.jpg",
      score: 62,
      profile: "Dream Collector",
      messages: {
        quiz: "Result: You are a Dream Collector. You like soft colors, small rituals, and objects that feel emotionally personal.",
        media: "Recommendation: Your perfect Labubu is Cloud Soft Style. This is framed as matching, not selling.",
        social: "Community tags: Community Favorite / Most Saved / Collector Rating 4.8",
        mind: "The result feels like it describes me, so the recommendation feels more reasonable.",
        system: "The recommendation becomes identity fit rather than direct advertising, making later content easier to accept.",
        reflection: "Research note: personalized explanation raises identification and dwell time.",
      },
    },
    {
      title: "Trending community",
      note: "Social proof rises",
      image: "/labubu/product-4.jpg",
      score: 74,
      profile: "Community-curious",
      messages: {
        quiz: "Trending This Week: Today's Most Shared / Most Saved / Friends Also Liked",
        media: "The social feed says: Emily just found her Secret. Jason completed Series 3. Anna is looking for pastel styles.",
        social: "It is not Best Seller. It is Today's Community, closer to Instagram or Xiaohongshu.",
        mind: "It feels like everyone is part of a small community. I want to understand the discussion.",
        system: "This demonstrates conformity and the bandwagon effect through community activity rather than purchase buttons.",
        reflection: "Mixed opinions remain visible: some users say to check whether you truly like it first.",
      },
    },
    {
      title: "FOMO ladder",
      note: "Scarcity appears gradually",
      image: "/labubu/product-8.jpg",
      score: 86,
      profile: "Rare Hunter tendency",
      messages: {
        quiz: "FOMO Ladder: Viewed by 428 people -> Added to wishlist 89 times today -> Limited release -> Low stock signal",
        media: "Scarcity does not appear first. It strengthens after interest and social proof already exist.",
        social: "Friend cue: Two friends saved this style, but no fake live purchase record is shown.",
        mind: "I may not need it now, but I start worrying I will miss it later.",
        system: "This simulates Scarcity + FOMO. It explains rising desire without becoming a hard-sell checkout page.",
        reflection: "Rational prompt: did scarcity cues raise your interest? Do you already own something similar?",
      },
    },
    {
      title: "Reflection report",
      note: "Why do I want it?",
      image: "/labubu/product-12.jpg",
      score: 78,
      profile: "Experience complete",
      messages: {
        quiz: "Your path: Emotional value -> Identity fit -> Community belonging -> FOMO awareness",
        media: "The report shows the strongest content was not a product list, but quiz framing, community activity, and gradual scarcity.",
        social: "Influence sources: unboxing 31%, community belonging 27%, scarcity cues 22%, character style 20%.",
        mind: "Now I see it was not sudden. Content gradually moved me into interest.",
        system: "This matches the IRP theme: Social Media -> Desire -> Decision. The site should reveal that process.",
        reflection: "The final action should be View My Report or Reflect on My Choice, not Buy Now.",
      },
    },
  ],
};

export default function MediaSeedingSimulator() {
  const [lang, setLang] = useState<Lang>("en");
  const [activeStep, setActiveStep] = useState(0);
  const [boost, setBoost] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [tokensLeft, setTokensLeft] = useState(TOKEN_BUDGET);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [question, setQuestion] = useState("");
  const [chatReplies, setChatReplies] = useState<ChatReply[]>([]);
  const t = copy[lang];
  const currentSteps = paths[lang];
  const step = currentSteps[activeStep];

  // Assign the anonymous ID and load the token budget as soon as the
  // chatbox mounts, so returning visitors are recognized even before they
  // interact and any leftover cooldown from a prior visit is respected.
  useEffect(() => {
    getOrCreateUserId();
    const snapshot = getTokenSnapshot();
    setTokensLeft(snapshot.tokensLeft);
    setCooldownEndsAt(snapshot.cooldownEndsAt);
  }, []);

  // Tick every second while a cooldown is active so the countdown updates,
  // and auto-refill tokens once the cooldown has elapsed.
  useEffect(() => {
    if (cooldownEndsAt === null) return;

    const interval = setInterval(() => {
      const nowTick = Date.now();
      setNow(nowTick);
      if (nowTick >= cooldownEndsAt) {
        const snapshot = getTokenSnapshot();
        setTokensLeft(snapshot.tokensLeft);
        setCooldownEndsAt(snapshot.cooldownEndsAt);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownEndsAt]);

  function track(message: string) {
    const result = logInteraction(message);
    if (result.ok) {
      setTokensLeft(result.tokensLeft);
      return;
    }
    if (result.reason === "rate_limited") setLimitReached(true);
    if (result.reason === "cooldown") {
      setTokensLeft(0);
      setCooldownEndsAt(result.cooldownEndsAt);
    }
  }

  const blocked = limitReached || cooldownEndsAt !== null;
  const cooldownRemaining = cooldownEndsAt !== null ? Math.max(0, cooldownEndsAt - now) : 0;

  const metrics = useMemo(() => {
    const base = Math.max(6, Math.min(96, step.score + boost));
    return {
      emotional: Math.min(96, base + (activeStep >= 1 ? 8 : 0)),
      identity: Math.min(94, activeStep >= 2 ? base + 6 : Math.round(base * 0.55)),
      belonging: Math.min(92, activeStep >= 4 ? base + 4 : Math.round(base * 0.48)),
      fomo: Math.min(90, activeStep >= 5 ? base + 2 : Math.round(base * 0.36)),
    };
  }, [activeStep, boost, step.score]);

  function act(label: string, delta: number) {
    track(label);
    setBoost((value) => Math.max(-10, Math.min(18, value + delta)));
  }

  function nextStep() {
    track(t.send);
    setActiveStep((value) => Math.min(currentSteps.length - 1, value + 1));
  }

  function reset() {
    setActiveStep(0);
    setBoost(0);
    setQuestion("");
    setChatReplies([]);
  }

  function switchLanguage(nextLang: Lang) {
    setLang(nextLang);
    setQuestion("");
    setChatReplies([]);
  }

  function askQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = question.trim();
    if (!cleaned || blocked) return;
    track(cleaned);
    setChatReplies((items) => {
      const previousQuestion = items.at(-1)?.question;
      return [
        ...items,
        {
          id: `${Date.now()}`,
          question: cleaned,
          answer: retrieveKnowledgeAnswer(cleaned, lang, previousQuestion),
        },
      ];
    });
    setQuestion("");
  }

  const messages = [
    { source: t.sources.quiz, kind: "quiz", text: step.messages.quiz },
    { source: t.sources.media, kind: "media", text: step.messages.media, image: step.image },
    { source: t.sources.social, kind: "social", text: step.messages.social },
    { source: t.sources.mind, kind: "mind", text: step.messages.mind },
    { source: t.sources.system, kind: "system", text: step.messages.system },
    { source: t.sources.reflection, kind: "reflection", text: step.messages.reflection },
  ];

  return (
    <main className="chatbox-shell">
      <div className="top-strip">
        <span>{t.stripB}</span>
      </div>

      <header className="app-header" aria-label="Labubu experience chatbox">
        <a className="brand" href="#">
          <span className="brand-mark">L</span>
          <span>
            <strong>{t.brand}</strong>
            <small>{t.brandSub}</small>
          </span>
        </a>
        <div className="chat-header-title">
          <strong>{t.chatTitle}</strong>
          <span>{t.chatSub}</span>
        </div>
        <div className="header-actions" aria-label={t.language}>
          <button className={lang === "zh" ? "language active" : "language"} onClick={() => switchLanguage("zh")} type="button">中文</button>
          <button className={lang === "en" ? "language active" : "language"} onClick={() => switchLanguage("en")} type="button">EN</button>
          <button className="reset-button" onClick={reset} type="button">{t.reset}</button>
        </div>
      </header>

      <section className="chatbox-grid">
        <aside className="thread-panel">
          <div className="panel-heading">
            <span>{t.leftTitle}</span>
            <em>{activeStep + 1}/7</em>
          </div>
          <div className="thread-list">
            {currentSteps.map((item, index) => (
              <button
                className={activeStep === index ? "active" : ""}
                key={item.title}
                onClick={() => setActiveStep(index)}
                type="button"
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{item.title}</strong>
                <small>{item.note}</small>
              </button>
            ))}
          </div>
          <div className="blueprint-card">
            <span>{t.blueprint}</span>
            <div>
              {t.keywords.map((keyword) => (
                <button key={keyword} type="button">{keyword}</button>
              ))}
            </div>
          </div>
        </aside>

        <section className="chat-window" aria-label={t.chatTitle}>
          <div className="chat-window-bar">
            <div>
              <span>{step.note}</span>
              <h1>{step.title}</h1>
            </div>
            <div className="profile-pill">{step.profile}</div>
          </div>

          <div className="message-stream">
            {messages.map((message, index) => (
              <article className={`message-row ${message.kind}`} key={message.source}>
                <div className="avatar">{message.source.slice(0, 1)}</div>
                <div className="message-bubble">
                  <div className="message-meta">
                    <strong>{message.source}</strong>
                    <span>{activeStep + 1}.{index + 1}</span>
                  </div>
                  {message.image ? <img src={message.image} alt="" /> : null}
                  <p>{message.text}</p>
                </div>
              </article>
            ))}
            {chatReplies.map((reply) => (
              <div className="knowledge-exchange" key={reply.id}>
                <article className="message-row mind">
                  <div className="avatar">U</div>
                  <div className="message-bubble">
                    <div className="message-meta">
                      <strong>{lang === "zh" ? "你的问题" : "Your question"}</strong>
                    </div>
                    <p>{reply.question}</p>
                  </div>
                </article>
                <article className="message-row system">
                  <div className="avatar">L</div>
                  <div className="message-bubble">
                    <div className="message-meta">
                      <strong>{t.knowledgeTitle}</strong>
                    </div>
                    <p>{reply.answer}</p>
                  </div>
                </article>
              </div>
            ))}
          </div>

          <div className="quick-actions">
            {t.actions.map((action) => (
              <button
                disabled={blocked}
                key={action.label}
                onClick={() => act(action.label, action.delta)}
                type="button"
              >
                {action.label}
              </button>
            ))}
          </div>

          <p className="tokens-meta">{t.tokensLabel(tokensLeft)}</p>

          {cooldownEndsAt !== null ? (
            <p className="limit-notice">{t.cooldownMessage(formatCountdown(cooldownRemaining))}</p>
          ) : limitReached ? (
            <p className="limit-notice">
              {lang === "zh"
                ? "今日消息已达上限（20 条），明天再来吧。"
                : "You've reached today's limit (20 messages). Come back tomorrow."}
            </p>
          ) : null}

          <form className="composer" onSubmit={askQuestion}>
            <button type="button" onClick={() => setActiveStep((value) => Math.max(0, value - 1))}>←</button>
            <label htmlFor="seed-input">{lang === "zh" ? "消息" : "message"}</label>
            <input
              id="seed-input"
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={t.askPlaceholder}
              value={question}
            />
            <button className="send-button" disabled={blocked || !question.trim()} type="submit">{t.askButton}</button>
          </form>
          <button className="next-experience" disabled={blocked} onClick={nextStep} type="button">
            {lang === "zh" ? "继续体验 →" : "Continue experience →"}
          </button>
        </section>

        <aside className="dashboard-panel">
          <div className="panel-heading">
            <span>{t.dashboard}</span>
            <em>{Math.max(...Object.values(metrics))}%</em>
          </div>
          <Metric label={t.metrics.emotional} value={metrics.emotional} />
          <Metric label={t.metrics.identity} value={metrics.identity} />
          <Metric label={t.metrics.belonging} value={metrics.belonging} />
          <Metric label={t.metrics.fomo} value={metrics.fomo} />
          <div className="report-card">
            <span>{t.reportTitle}</span>
            <p>{step.messages.system}</p>
          </div>
          <div className="ethics-card">
            <p>{t.ethical}</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <div>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <i aria-hidden="true"><b style={{ width: `${value}%` }} /></i>
    </div>
  );
}

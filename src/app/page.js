"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ─── Configuration ───

const LANGUAGES = [
  { code: "es", name: "Español", flag: "🇪🇸", native: "Spanish" },
];

const API_KEY = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;

const LEVELS = [
  { code: "A1", label: "Beginner", desc: "Eerste woorden & zinnen", color: "#4ade80" },
  { code: "A2", label: "Elementary", desc: "Simpele gesprekken", color: "#22d3ee" },
  { code: "B1", label: "Intermediate", desc: "Dagelijkse situaties", color: "#818cf8" },
  { code: "B2", label: "Upper Inter.", desc: "Vloeiend converseren", color: "#c084fc" },
  { code: "C1", label: "Advanced", desc: "Complexe onderwerpen", color: "#f472b6" },
  { code: "C2", label: "Mastery", desc: "Bijna moedertaal", color: "#fb923c" },
];

const MODES = [
  { id: "free", icon: "💬", label: "Vrij gesprek", desc: "Praat over alles" },
  { id: "scenario", icon: "🎭", label: "Scenario", desc: "Situaties oefenen" },
  { id: "grammar", icon: "📐", label: "Grammatica", desc: "Regels oefenen" },
  { id: "vocab", icon: "📚", label: "Woordenschat", desc: "Nieuwe woorden" },
];

const SCENARIOS = [
  "Bij de bakker brood bestellen",
  "De weg vragen aan een voorbijganger",
  "Een hotelkamer reserveren",
  "In een restaurant bestellen",
  "Een doktersafspraak maken",
  "Op het vliegveld inchecken",
  "Boodschappen doen op de markt",
  "Jezelf voorstellen op een feest",
  "Een treinkaartje kopen",
  "Klagen over een defect product",
];

// ─── System Prompt Builder ───

function buildSystemPrompt(lang, level, mode, errorPatterns) {
  const langObj = LANGUAGES.find((l) => l.code === lang);
  const levelObj = LEVELS.find((l) => l.code === level);

  let modeInstruction = "";
  if (mode === "free") {
    modeInstruction = `Have a natural, free-flowing conversation. Pick interesting topics and ask follow-up questions. Keep it engaging and fun.`;
  } else if (mode === "scenario") {
    const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    modeInstruction = `Role-play this scenario: "${scenario}". You play the other person in the scenario (shopkeeper, receptionist, etc). Stay in character. Guide the user through the interaction naturally.`;
  } else if (mode === "grammar") {
    modeInstruction = `Focus on teaching grammar through conversation. Pick a grammar topic appropriate for ${level} level, explain it briefly, then practice it through dialogue. Gently correct grammar mistakes with clear explanations.`;
  } else if (mode === "vocab") {
    modeInstruction = `Focus on vocabulary building. Introduce 3-5 new words/phrases per exchange, using them in context. Ask the user to use them in sentences. Pick a thematic vocabulary set appropriate for ${level}.`;
  }

  let errorFeedback = "";
  if (errorPatterns && errorPatterns.length > 0) {
    const topErrors = errorPatterns.slice(0, 5).map((e) => `- ${e.pattern} (${e.count}x)`).join("\n");
    errorFeedback = `\n\nThe user frequently makes these mistakes. Pay special attention and gently help them improve:\n${topErrors}`;
  }

  return `You are a friendly, patient language tutor for ${langObj.name} (${langObj.native}). 

The student's level is ${level} (${levelObj.label} - ${levelObj.desc}).

CRITICAL RULES:
1. Speak primarily in ${langObj.name}. Adjust vocabulary and sentence complexity to ${level} level.
2. For A1-A2: Use very simple sentences, basic vocabulary. Add translations in parentheses for new words.
3. For B1-B2: Use natural speech but avoid rare idioms. Only translate truly difficult words.
4. For C1-C2: Speak naturally as a native would. Use idioms, colloquialisms, complex structures.
5. When the user makes a mistake, correct it INLINE like this: "✏️ *correction* → explanation". Be encouraging, not harsh.
6. Keep your responses conversational and not too long (2-4 sentences typically).
7. Always end with a question or prompt to keep the conversation going.
8. The student speaks Dutch as their native language. Use Dutch for explanations when needed at lower levels.

${modeInstruction}
${errorFeedback}

Start the conversation with a warm greeting in ${langObj.name} appropriate for the ${level} level, and set the tone for the conversation mode.`;
}

// ─── Storage Helpers (localStorage for standalone app) ───

function loadProfile() {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem("linguaflow_profile");
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function saveProfile(profile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("linguaflow_profile", JSON.stringify(profile));
  } catch (e) {
    console.error("Storage error:", e);
  }
}

function loadConversations() {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem("linguaflow_conversations");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveConversation(conv) {
  if (typeof window === "undefined") return;
  try {
    const convs = loadConversations();
    const idx = convs.findIndex((c) => c.id === conv.id);
    if (idx >= 0) convs[idx] = conv;
    else convs.push(conv);
    // Keep last 50 conversations
    const trimmed = convs.slice(-50);
    localStorage.setItem("linguaflow_conversations", JSON.stringify(trimmed));
  } catch (e) {
    console.error("Storage error:", e);
  }
}

// ─── Components ───

function SetupScreen({ onStart, savedProfile }) {
  const [lang] = useState("es");
  const [level, setLevel] = useState(savedProfile?.level || "A1");
  const [mode, setMode] = useState("free");

  return (
    <div className="setup-container">
      <div className="setup-card">
        <div className="logo-area">
          <span className="logo-icon">🗣️</span>
          <h1 className="logo-title">LinguaFlow</h1>
          <p className="logo-sub">Leer een taal door te praten</p>
        </div>

        {/* Level */}
        <div className="section">
          <label className="section-label">📊 Wat is je niveau?</label>
          <div className="level-grid">
            {LEVELS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLevel(l.code)}
                className={`level-btn ${level === l.code ? "active" : ""}`}
                style={level === l.code ? { borderColor: l.color, boxShadow: `0 0 0 1px ${l.color}` } : {}}
              >
                <span className="level-code" style={{ color: l.color }}>{l.code}</span>
                <span className="level-label">{l.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mode */}
        <div className="section">
          <label className="section-label">🎯 Hoe wil je oefenen?</label>
          <div className="mode-grid">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`mode-btn ${mode === m.id ? "active" : ""}`}
              >
                <span className="mode-icon">{m.icon}</span>
                <span className="mode-label">{m.label}</span>
                <span className="mode-desc">{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            onStart({ lang, level, mode, apiKey: API_KEY });
          }}
          className="start-btn"
        >
          Start gesprek →
        </button>
      </div>
    </div>
  );
}

function ChatMessage({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`msg-row ${isUser ? "user" : "assistant"}`}>
      {!isUser && <div className="avatar">🤖</div>}
      <div className={`msg-bubble ${isUser ? "msg-user" : "msg-assistant"}`}>
        <div className="msg-text">{msg.content}</div>
      </div>
      {isUser && <div className="avatar">🧑</div>}
    </div>
  );
}

function ChatScreen({ config, onBack, errorPatterns, onNewErrors }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => Date.now().toString());
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const hasStarted = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const callAPI = useCallback(async (msgs) => {
    const systemPrompt = buildSystemPrompt(config.lang, config.level, config.mode, errorPatterns);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: msgs.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API Error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.content.map((c) => c.text || "").join("\n");
  }, [config, errorPatterns]);

  // Start conversation
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    (async () => {
      setLoading(true);
      try {
        const initMsgs = [{ role: "user", content: "Hallo! Ik wil graag oefenen." }];
        const reply = await callAPI(initMsgs);
        setMessages([{ role: "assistant", content: reply, ts: Date.now() }]);
      } catch (e) {
        setMessages([{ role: "assistant", content: `❌ Fout: ${e.message}`, ts: Date.now() }]);
      }
      setLoading(false);
    })();
  }, [callAPI]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input.trim(), ts: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = [
        { role: "user", content: "Hallo! Ik wil graag oefenen." },
        ...newMessages.map((m) => ({ role: m.role, content: m.content })),
      ];
      const reply = await callAPI(apiMessages);
      const assistantMsg = { role: "assistant", content: reply, ts: Date.now() };
      const updated = [...newMessages, assistantMsg];
      setMessages(updated);

      // Save conversation
      saveConversation({
        id: sessionId,
        lang: config.lang,
        level: config.level,
        mode: config.mode,
        messages: updated,
        updatedAt: Date.now(),
      });

      // Detect corrections
      if (reply.includes("✏️") && onNewErrors) {
        onNewErrors(reply);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${e.message}`, ts: Date.now() }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const langObj = LANGUAGES.find((l) => l.code === config.lang);
  const levelObj = LEVELS.find((l) => l.code === config.level);
  const modeObj = MODES.find((m) => m.id === config.mode);

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <button onClick={onBack} className="back-btn">←</button>
        <div className="header-info">
          <span className="header-title">{langObj.flag} {langObj.name}</span>
          <span className="header-sub">{levelObj.code} · {modeObj.icon} {modeObj.label}</span>
        </div>
        <div className="level-dot" style={{ background: levelObj.color }}>{levelObj.code}</div>
      </div>

      {/* Messages */}
      <div className="messages-area">
        {messages.map((msg, i) => (
          <ChatMessage key={i} msg={msg} />
        ))}
        {loading && (
          <div className="msg-row assistant">
            <div className="avatar">🤖</div>
            <div className="msg-bubble msg-assistant">
              <div className="typing">
                <span className="typing-dot">●</span>
                <span className="typing-dot" style={{ animationDelay: "0.2s" }}>●</span>
                <span className="typing-dot" style={{ animationDelay: "0.4s" }}>●</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="input-area">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={`Typ in het ${langObj.native}...`}
          className="chat-input"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="send-btn"
        >
          ↑
        </button>
      </div>
    </div>
  );
}

function StatsScreen({ profile, onBack }) {
  const totalConvos = profile.totalConversations || 0;
  const totalMessages = profile.totalMessages || 0;
  const streak = profile.streak || 0;
  const errors = profile.errorPatterns || [];

  return (
    <div className="setup-container">
      <div className="setup-card" style={{ maxWidth: 500 }}>
        <button onClick={onBack} className="back-btn" style={{ position: "static", marginBottom: 16 }}>← Terug</button>
        <h2 className="stats-title">📊 Je Voortgang</h2>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-num">{totalConvos}</span>
            <span className="stat-label">Gesprekken</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{totalMessages}</span>
            <span className="stat-label">Berichten</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{streak}</span>
            <span className="stat-label">Dag streak 🔥</span>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="section">
            <h3 className="section-label">⚠️ Veelgemaakte fouten</h3>
            {errors.slice(0, 8).map((e, i) => (
              <div key={i} className="error-row">
                <span className="error-text">{e.pattern}</span>
                <span className="error-count">{e.count}x</span>
              </div>
            ))}
          </div>
        )}

        {errors.length === 0 && (
          <p className="empty-text">Nog geen fouten bijgehouden. Begin een gesprek om je voortgang te zien!</p>
        )}
      </div>
    </div>
  );
}

// ─── Main App ───

export default function Home() {
  const [screen, setScreen] = useState("setup");
  const [config, setConfig] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const p = loadProfile() || {
      lang: "es",
      level: "A1",
      apiKey: "",
      totalConversations: 0,
      totalMessages: 0,
      streak: 0,
      lastActive: null,
      errorPatterns: [],
    };
    setProfile(p);
    setLoaded(true);
  }, []);

  const handleStart = (cfg) => {
    const updatedProfile = {
      ...profile,
      lang: cfg.lang,
      level: cfg.level,
      apiKey: cfg.apiKey,
      totalConversations: (profile?.totalConversations || 0) + 1,
      lastActive: Date.now(),
    };

    // Streak logic
    const lastActive = profile?.lastActive;
    if (lastActive) {
      const daysSince = Math.floor((Date.now() - lastActive) / 86400000);
      if (daysSince <= 1) {
        updatedProfile.streak = (profile.streak || 0) + (daysSince === 1 ? 1 : 0);
      } else {
        updatedProfile.streak = 1;
      }
    } else {
      updatedProfile.streak = 1;
    }

    setProfile(updatedProfile);
    saveProfile(updatedProfile);
    setConfig(cfg);
    setScreen("chat");
  };

  const handleNewErrors = (aiReply) => {
    const corrections = aiReply.split("✏️").slice(1);
    if (corrections.length === 0) return;

    const patterns = [...(profile?.errorPatterns || [])];
    corrections.forEach((c) => {
      const snippet = c.split("\n")[0].trim().substring(0, 60);
      const existing = patterns.find((p) => p.pattern === snippet);
      if (existing) existing.count += 1;
      else patterns.push({ pattern: snippet, count: 1 });
    });

    patterns.sort((a, b) => b.count - a.count);
    const updated = { ...profile, errorPatterns: patterns.slice(0, 20) };
    setProfile(updated);
    saveProfile(updated);
  };

  const handleBackFromChat = () => {
    const updated = {
      ...profile,
      totalMessages: (profile?.totalMessages || 0) + 1,
    };
    setProfile(updated);
    saveProfile(updated);
    setScreen("setup");
  };

  if (!loaded) {
    return (
      <div className="loading-screen">
        <span className="logo-icon">🗣️</span>
        <p style={{ color: "#94a3b8", marginTop: 16 }}>Laden...</p>
      </div>
    );
  }

  return (
    <>
      {screen === "setup" && (
        <div style={{ position: "relative", minHeight: "100vh" }}>
          <SetupScreen onStart={handleStart} savedProfile={profile} />
          {(profile?.totalConversations || 0) > 0 && (
            <button onClick={() => setScreen("stats")} className="stats-float-btn">
              📊
            </button>
          )}
        </div>
      )}
      {screen === "chat" && (
        <ChatScreen
          config={config}
          onBack={handleBackFromChat}
          errorPatterns={profile?.errorPatterns}
          onNewErrors={handleNewErrors}
        />
      )}
      {screen === "stats" && <StatsScreen profile={profile} onBack={() => setScreen("setup")} />}
    </>
  );
}

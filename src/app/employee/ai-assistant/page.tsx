// cspell:ignore mujhe Nexora
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Trash2,
  Copy,
  Check,
  Loader2,
  MessageSquare,
  ExternalLink,
  Database,
  LayoutDashboard,
  ClipboardList,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckSquare,
  FileText,
  Smile,
  Settings,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface NavSuggestion {
  path: string;
  label: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;       // display text (nav tokens stripped)
  rawContent: string;    // original AI text with tokens
  timestamp: Date;
  navLinks?: NavSuggestion[];
  hadLiveData?: boolean;
}

// ─── Nav icon map ─────────────────────────────────────────────────────────────
const NAV_ICONS: Record<string, React.ReactNode> = {
  "/employee/dashboard":   <LayoutDashboard className="w-3.5 h-3.5" />,
  "/employee/attendance":  <ClipboardList   className="w-3.5 h-3.5" />,
  "/employee/leave":       <Calendar        className="w-3.5 h-3.5" />,
  "/employee/payroll":     <DollarSign      className="w-3.5 h-3.5" />,
  "/employee/performance": <TrendingUp      className="w-3.5 h-3.5" />,
  "/employee/task":        <CheckSquare     className="w-3.5 h-3.5" />,
  "/employee/reports":     <FileText        className="w-3.5 h-3.5" />,
  "/employee/sentiment":   <Smile           className="w-3.5 h-3.5" />,
  "/employee/settings":    <Settings        className="w-3.5 h-3.5" />,
};

// ─── Parse [NAV:/path|Label] tokens ──────────────────────────────────────────
const NAV_REGEX = /\[NAV:([^\|]+)\|([^\]]+)\]/g;

function parseNavTokens(text: string): { clean: string; links: NavSuggestion[] } {
  const links: NavSuggestion[] = [];
  const seen = new Set<string>();
  const clean = text.replace(NAV_REGEX, (_, path, label) => {
    if (!seen.has(path)) {
      seen.add(path);
      links.push({ path: path.trim(), label: label.trim() });
    }
    return "";
  }).trim();
  return { clean, links };
}

// ─── Instant navigation ───────────────────────────────────────────────────────
const NAV_INTENTS: { path: string; label: string; triggers: RegExp }[] = [
  { path: "/employee/dashboard",   label: "Dashboard",   triggers: /\b(dashboard|home|overview|main)\b/ },
  { path: "/employee/attendance",  label: "Attendance",  triggers: /\b(attendance|check.?in|check.?out|present|absent|late|clock)\b/ },
  { path: "/employee/leave",       label: "Leaves",      triggers: /\b(leave|leaves|vacation|time.?off|sick|absence|annual)\b/ },
  { path: "/employee/payroll",     label: "Payroll",     triggers: /\b(payroll|salary|pay|payslip|wage|net.?pay|compensation)\b/ },
  { path: "/employee/performance", label: "Performance", triggers: /\b(performance|review|rating|goal|okr|kpi|appraisal|score)\b/ },
  { path: "/employee/task",        label: "Tasks",       triggers: /\b(task|tasks|todo|assignment|due|overdue)\b/ },
  { path: "/employee/reports",     label: "Reports",     triggers: /\b(report|reports|history|record|export)\b/ },
  { path: "/employee/sentiment",   label: "Sentiment",   triggers: /\b(sentiment|mood|wellbeing|feedback|satisfaction)\b/ },
  { path: "/employee/settings",    label: "Settings",    triggers: /\b(setting|settings|profile|password|account|config)\b/ },
];

const NAV_COMMAND_WORDS = new Set([
  "go", "goto", "open", "show", "visit", "view", "load",
  "navigate", "take", "jump", "switch", "launch", "mujhe", "le", "jao",
]);

function detectInstantNav(text: string): { path: string; label: string } | null {
  const lower = text.toLowerCase().trim();
  const words = lower.split(/\s+/);
  if (words.length > 4) return null;
  const hasCmd = words.some((w) => NAV_COMMAND_WORDS.has(w));
  if (!hasCmd) return null;
  for (const intent of NAV_INTENTS) {
    if (intent.triggers.test(lower)) return { path: intent.path, label: intent.label };
  }
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function inlineFormat(line: string): React.ReactNode {
  const INLINE_RE = /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*)/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_RE.exec(line)) !== null) {
    if (m.index > last) parts.push(line.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**"))
      parts.push(<strong key={m.index} className="font-semibold text-gray-900">{token.slice(2, -2)}</strong>);
    else
      parts.push(<em key={m.index} className="italic">{token.slice(1, -1)}</em>);
    last = m.index + token.length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts.length ? parts : line;
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let isOrdered = false;
  let key = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    if (isOrdered) {
      elements.push(
        <ol key={key++} className="list-decimal list-outside pl-5 space-y-1 my-1.5">
          {listItems.map((item, i) => <li key={i}>{inlineFormat(item)}</li>)}
        </ol>
      );
    } else {
      elements.push(
        <ul key={key++} className="list-disc list-outside pl-5 space-y-1 my-1.5">
          {listItems.map((item, i) => <li key={i}>{inlineFormat(item)}</li>)}
        </ul>
      );
    }
    listItems = [];
    isOrdered = false;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^###\s+/.test(line)) {
      flushList();
      elements.push(<p key={key++} className="font-bold text-gray-900 text-sm mt-3 mb-0.5">{inlineFormat(line.replace(/^###\s+/, ""))}</p>);
      continue;
    }
    if (/^##\s+/.test(line)) {
      flushList();
      elements.push(<p key={key++} className="font-bold text-gray-900 text-base mt-3 mb-0.5">{inlineFormat(line.replace(/^##\s+/, ""))}</p>);
      continue;
    }
    if (/^#\s+/.test(line)) {
      flushList();
      elements.push(<p key={key++} className="font-bold text-gray-900 text-base mt-3 mb-0.5">{inlineFormat(line.replace(/^#\s+/, ""))}</p>);
      continue;
    }
    if (/^-\s+/.test(line)) {
      isOrdered = false;
      listItems.push(line.replace(/^-\s+/, ""));
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      isOrdered = true;
      listItems.push(line.replace(/^\d+\.\s+/, ""));
      continue;
    }
    if (line.trim() === "") {
      flushList();
      elements.push(<div key={key++} className="h-2" />);
      continue;
    }
    flushList();
    elements.push(<p key={key++} className="leading-relaxed">{inlineFormat(line)}</p>);
  }
  flushList();
  return <div className="space-y-0.5 text-sm">{elements}</div>;
}

// ─── Suggested prompts ────────────────────────────────────────────────────────
const SUGGESTED_PROMPTS = [
  "How many leaves do I have remaining?",
  "What tasks are assigned to me?",
  "What is my performance score?",
  "How many pending leave requests do I have?",
];

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({
  message,
  onCopy,
  copied,
  onNavigate,
}: {
  message: Message;
  onCopy: (text: string) => void;
  copied: boolean;
  onNavigate: (path: string) => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 items-start ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
          isUser
            ? "bg-gradient-to-br from-orange-500 to-orange-600"
            : "bg-gradient-to-br from-orange-400 to-amber-500"
        }`}
      >
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      {/* Content column */}
      <div className={`group flex flex-col gap-1.5 max-w-[80%] sm:max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Live data badge */}
        {!isUser && message.hadLiveData && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-[10px] font-medium">
            <Database className="w-2.5 h-2.5" />
            Live data from Nexora
          </div>
        )}

        {/* Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
            isUser
              ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-sm whitespace-pre-wrap"
              : "bg-white/80 backdrop-blur border border-white/60 text-gray-800 rounded-tl-sm"
          }`}
        >
          {isUser ? message.content : renderMarkdown(message.content)}
        </div>

        {/* Navigation buttons */}
        {!isUser && message.navLinks && message.navLinks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {message.navLinks.map((nav) => (
              <button
                key={nav.path}
                onClick={() => onNavigate(nav.path)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 hover:border-orange-400 text-orange-700 text-xs font-medium transition-all shadow-sm active:scale-95"
              >
                {NAV_ICONS[nav.path] ?? <ExternalLink className="w-3.5 h-3.5" />}
                {nav.label}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp + copy */}
        <div className={`flex items-center gap-2 text-xs text-gray-400 px-1 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <span>{formatTime(message.timestamp)}</span>
          {!isUser && (
            <button
              onClick={() => onCopy(message.content)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-orange-600"
              title="Copy response"
            >
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EmployeeAIAssistantPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idx);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    // ── Instant navigation ──────────────────────────────────────────────────
    const navIntent = detectInstantNav(trimmed);
    if (navIntent) {
      const userMsg: Message = { role: "user", content: trimmed, rawContent: trimmed, timestamp: new Date() };
      const botMsg: Message = {
        role: "assistant",
        content: `Taking you to **${navIntent.label}**…`,
        rawContent: "",
        timestamp: new Date(),
        navLinks: [{ path: navIntent.path, label: `Open ${navIntent.label}` }],
      };
      setMessages((prev) => [...prev, userMsg, botMsg]);
      setInput("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setTimeout(() => router.push(navIntent.path), 600);
      return;
    }

    const userMessage: Message = {
      role: "user",
      content: trimmed,
      rawContent: trimmed,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    try {
      const res = await fetch("/api/employee/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map(({ role, rawContent }) => ({
            role,
            content: rawContent,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");

      const { clean, links: tokenLinks } = parseNavTokens(data.message ?? "");

      const allLinks: NavSuggestion[] = [...tokenLinks];
      const seenPaths = new Set(tokenLinks.map((l) => l.path));
      for (const nav of (data.suggestedNav ?? [])) {
        if (!seenPaths.has(nav.path)) {
          seenPaths.add(nav.path);
          allLinks.push(nav);
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: clean,
          rawContent: data.message ?? "",
          timestamp: new Date(),
          navLinks: allLinks,
          hadLiveData: data.hadLiveData ?? false,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again in a moment.",
          rawContent: "",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setInput("");
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
              AI Assistant
            </h1>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
              Powered by Llama 3.1 · Your personal HR helper
            </p>
          </div>
        </div>
        {!isEmpty && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-gradient-to-b from-orange-50/40 to-white/40 border border-white/50 shadow-inner px-4 py-4 space-y-5">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6 py-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Hi, I&apos;m your Nexora AI</h2>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                Ask me about your leaves, attendance, payslips, performance scores, tasks, and more. I can pull your live data straight from the system.
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-orange-600">
                <Database className="w-3 h-3" />
                <span>Connected to your live Nexora data</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left text-sm px-4 py-3 rounded-xl border border-orange-100 bg-white/70 hover:bg-orange-50 hover:border-orange-300 text-gray-700 hover:text-orange-700 transition-all shadow-sm flex items-start gap-2"
                >
                  <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-400" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                message={msg}
                onCopy={(text) => handleCopy(text, idx)}
                copied={copiedId === idx}
                onNavigate={(path) => router.push(path)}
              />
            ))}
            {loading && (
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-md">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/80 backdrop-blur border border-white/60 shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                    <span>Nexora AI is thinking…</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 mt-3">
        <div className="flex items-end gap-2 bg-white/80 backdrop-blur border border-white/60 rounded-2xl shadow-md px-4 py-3 focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
          <textarea
            ref={(el) => {
              (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
              (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
            }}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your leaves, attendance, payslip, tasks…"
            className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none leading-relaxed max-h-[120px] overflow-y-auto"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center shadow-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
          Press{" "}
          <kbd className="px-1 py-0.5 rounded bg-gray-100 text-gray-500 font-mono text-[10px]">Enter</kbd>{" "}
          to send,{" "}
          <kbd className="px-1 py-0.5 rounded bg-gray-100 text-gray-500 font-mono text-[10px]">Shift+Enter</kbd>{" "}
          for new line
        </p>
      </div>
    </div>
  );
}

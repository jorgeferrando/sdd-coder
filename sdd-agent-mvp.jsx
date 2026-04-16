import { useState, useRef, useEffect } from "react";

const PHASES = ["intake", "proposal", "design", "tasks", "implement", "done"];

const PHASE_LABELS = {
  intake: "Intake",
  proposal: "Proposal",
  design: "Design",
  tasks: "Tasks",
  implement: "Implement",
  done: "Done",
};

const SYSTEM_PROMPT = `You are SDD Agent, an autonomous engineering agent that follows the Spec-Driven Development (SDD) pipeline.

You help teams go from a natural language request to committed code following these phases:
1. INTAKE — Understand the request, ask max 3 clarifying questions if needed
2. PROPOSAL — Generate a proposal.md with problem, solution, risks, open questions
3. DESIGN — Generate design.md with architecture, data model, interfaces
4. TASKS — Generate tasks.md breaking work into atomic tasks by domain (infra/code)
5. IMPLEMENT — Execute tasks one by one, generating code and git commits

IMPORTANT RULES:
- Always respond in JSON with this exact structure:
{
  "phase": "intake|proposal|design|tasks|implement|done",
  "message": "Your message to the user (markdown supported)",
  "file": { "name": "filename.md", "content": "file content" } or null,
  "gitCommit": "commit message" or null,
  "awaitingApproval": true or false
}

- In INTAKE: analyze the request, ask max 3 focused questions if ambiguous. If clear enough, go straight to proposal.
- In PROPOSAL: generate a concise proposal.md. Set awaitingApproval: true and ask user to approve.
- In DESIGN: generate design.md. Set awaitingApproval: true and ask user to approve.
- In TASKS: generate tasks.md with tasks split by domain (INFRA/CODE) with dependencies. Set awaitingApproval: true.
- In IMPLEMENT: execute tasks one by one. Generate realistic code snippets. Each task = one git commit.
- When user says "approve", "ok", "yes", "looks good" or similar, advance to next phase.
- Keep messages concise and technical. You are talking to developers.
- Generate realistic, specific file contents based on the request context.
- The repo is a fintech dashboard (React + Node.js + PostgreSQL stack).`;

const COLORS = {
  bg: "#0c0c0f",
  bgPanel: "#111116",
  bgInput: "#16161d",
  border: "#1e1e2a",
  borderAccent: "#2a2a3a",
  text: "#e2e2e8",
  textMuted: "#6b6b7a",
  textDim: "#3a3a4a",
  accent: "#7c6af7",
  accentDim: "#3d3568",
  green: "#4ade80",
  greenDim: "#1a3d2a",
  amber: "#fbbf24",
  red: "#f87171",
  agent: "#a78bfa",
  user: "#e2e2e8",
};

const phaseIndex = (phase) => PHASES.indexOf(phase);

function PhaseBar({ currentPhase }) {
  const current = phaseIndex(currentPhase);
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0",
      padding: "12px 20px",
      borderBottom: `1px solid ${COLORS.border}`,
      background: COLORS.bgPanel,
      overflowX: "auto",
    }}>
      {PHASES.filter(p => p !== "done").map((phase, i) => {
        const idx = phaseIndex(phase);
        const isDone = current > idx;
        const isActive = current === idx;
        return (
          <div key={phase} style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "4px",
              background: isActive ? COLORS.accentDim : "transparent",
              transition: "all 0.3s",
            }}>
              <div style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: isDone ? COLORS.green : isActive ? COLORS.accent : COLORS.textDim,
                boxShadow: isActive ? `0 0 8px ${COLORS.accent}` : isDone ? `0 0 6px ${COLORS.green}` : "none",
                transition: "all 0.3s",
              }} />
              <span style={{
                fontSize: "11px",
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                color: isDone ? COLORS.green : isActive ? COLORS.accent : COLORS.textDim,
                fontWeight: isActive ? "600" : "400",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
              }}>
                {PHASE_LABELS[phase]}
              </span>
            </div>
            {i < PHASES.filter(p => p !== "done").length - 1 && (
              <div style={{
                width: "20px",
                height: "1px",
                background: isDone ? COLORS.green : COLORS.textDim,
                opacity: 0.4,
                transition: "all 0.3s",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function GitLog({ commits }) {
  if (!commits.length) return null;
  return (
    <div style={{
      borderTop: `1px solid ${COLORS.border}`,
      padding: "8px 16px",
      background: COLORS.bgPanel,
      maxHeight: "80px",
      overflowY: "auto",
    }}>
      {commits.map((c, i) => (
        <div key={i} style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "2px 0",
        }}>
          <span style={{ color: COLORS.green, fontFamily: "monospace", fontSize: "10px" }}>
            ✓ git commit
          </span>
          <span style={{ color: COLORS.textMuted, fontFamily: "monospace", fontSize: "10px" }}>
            "{c}"
          </span>
        </div>
      ))}
    </div>
  );
}

function FilePanel({ file, onClose }) {
  if (!file) return null;
  return (
    <div style={{
      width: "420px",
      minWidth: "420px",
      borderLeft: `1px solid ${COLORS.border}`,
      display: "flex",
      flexDirection: "column",
      background: COLORS.bgPanel,
      animation: "slideIn 0.2s ease",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "10px", color: COLORS.green }}>📄</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "12px",
            color: COLORS.text,
            fontWeight: "500",
          }}>
            .sdd/{file.name}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: COLORS.textMuted,
            cursor: "pointer",
            fontSize: "16px",
            lineHeight: 1,
            padding: "0 4px",
          }}>×</button>
      </div>
      <div style={{
        flex: 1,
        overflow: "auto",
        padding: "16px",
      }}>
        <pre style={{
          margin: 0,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: "11px",
          lineHeight: "1.7",
          color: COLORS.text,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {file.content}
        </pre>
      </div>
    </div>
  );
}

function Message({ msg }) {
  const isAgent = msg.role === "agent";
  const isSystem = msg.role === "system";

  if (isSystem) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        padding: "6px 0",
      }}>
        <span style={{
          fontSize: "10px",
          color: COLORS.textDim,
          fontFamily: "monospace",
          letterSpacing: "0.05em",
        }}>
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      gap: "12px",
      padding: "12px 20px",
      alignItems: "flex-start",
      borderBottom: `1px solid ${COLORS.border}`,
      animation: "fadeIn 0.2s ease",
    }}>
      <div style={{
        width: "28px",
        height: "28px",
        minWidth: "28px",
        borderRadius: "6px",
        background: isAgent ? COLORS.accentDim : "#1e1e2a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "11px",
        fontFamily: "monospace",
        color: isAgent ? COLORS.accent : COLORS.textMuted,
        fontWeight: "600",
        border: `1px solid ${isAgent ? COLORS.accentDim : COLORS.border}`,
      }}>
        {isAgent ? "⬡" : "↗"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "10px",
          color: isAgent ? COLORS.agent : COLORS.textMuted,
          fontFamily: "monospace",
          marginBottom: "4px",
          fontWeight: "600",
          letterSpacing: "0.08em",
        }}>
          {isAgent ? "SDD AGENT" : "YOU"}
        </div>
        <div style={{
          fontSize: "13px",
          color: COLORS.text,
          lineHeight: "1.65",
          fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
          whiteSpace: "pre-wrap",
        }}>
          {msg.content}
        </div>
        {msg.file && (
          <button
            onClick={msg.onFileClick}
            style={{
              marginTop: "8px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              background: COLORS.greenDim,
              border: `1px solid ${COLORS.green}33`,
              borderRadius: "4px",
              color: COLORS.green,
              fontSize: "11px",
              fontFamily: "monospace",
              cursor: "pointer",
            }}>
            📄 {msg.file.name}
          </button>
        )}
        {msg.awaitingApproval && (
          <div style={{
            marginTop: "8px",
            fontSize: "11px",
            color: COLORS.amber,
            fontFamily: "monospace",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}>
            <span style={{ animation: "pulse 1.5s infinite" }}>◆</span>
            Awaiting approval — type "approve" to continue
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{
      display: "flex",
      gap: "12px",
      padding: "12px 20px",
      alignItems: "center",
    }}>
      <div style={{
        width: "28px",
        height: "28px",
        minWidth: "28px",
        borderRadius: "6px",
        background: COLORS.accentDim,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "11px",
        color: COLORS.accent,
        border: `1px solid ${COLORS.accentDim}`,
      }}>⬡</div>
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: COLORS.accent,
            animation: `bounce 1.2s ${i * 0.2}s infinite`,
            opacity: 0.7,
          }} />
        ))}
      </div>
    </div>
  );
}

export default function SDDAgent() {
  const [messages, setMessages] = useState([
    {
      role: "agent",
      content: "Hola. Soy SDD Agent.\n\nDescríbeme una tarea o feature que quieras implementar en el repo y la ejecutaré siguiendo el pipeline SDD: Proposal → Design → Tasks → Implement.",
      file: null,
      awaitingApproval: false,
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("intake");
  const [openFile, setOpenFile] = useState(null);
  const [commits, setCommits] = useState([]);
  const [history, setHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");

    const newUserMsg = { role: "user", content: userMsg };
    setMessages(prev => [...prev, newUserMsg]);

    const newHistory = [...history, { role: "user", content: userMsg }];
    setHistory(newHistory);
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newHistory,
        }),
      });

      const data = await response.json();
      const rawText = data.content?.[0]?.text || "{}";

      let parsed;
      try {
        const clean = rawText.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = {
          phase: phase,
          message: rawText,
          file: null,
          gitCommit: null,
          awaitingApproval: false,
        };
      }

      if (parsed.phase) setPhase(parsed.phase);

      if (parsed.gitCommit) {
        setCommits(prev => [...prev, parsed.gitCommit]);
        setMessages(prev => [...prev, {
          role: "system",
          content: `→ git commit -m "${parsed.gitCommit}"`,
        }]);
      }

      const agentMsg = {
        role: "agent",
        content: parsed.message || "",
        file: parsed.file || null,
        awaitingApproval: parsed.awaitingApproval || false,
        onFileClick: parsed.file ? () => setOpenFile(parsed.file) : null,
      };

      setMessages(prev => [...prev, agentMsg]);
      setHistory(prev => [...prev, {
        role: "assistant",
        content: rawText,
      }]);

      if (parsed.file) {
        setOpenFile(parsed.file);
      }

    } catch (err) {
      setMessages(prev => [...prev, {
        role: "agent",
        content: "Error connecting to Claude API. Check your API key.",
        file: null,
        awaitingApproval: false,
      }]);
    }

    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.borderAccent}; border-radius: 2px; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        textarea:focus { outline: none; }
        textarea { resize: none; }
        button:hover { opacity: 0.85; }
      `}</style>

      <div style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: `1px solid ${COLORS.border}`,
          background: COLORS.bgPanel,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: COLORS.accentDim,
              border: `1px solid ${COLORS.accent}44`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              color: COLORS.accent,
            }}>⬡</div>
            <div>
              <div style={{
                fontSize: "13px",
                fontWeight: "600",
                color: COLORS.text,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.02em",
              }}>SDD Agent</div>
              <div style={{
                fontSize: "10px",
                color: COLORS.textMuted,
                fontFamily: "monospace",
              }}>mvp · local · docker</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: COLORS.green,
              boxShadow: `0 0 6px ${COLORS.green}`,
            }} />
            <span style={{ fontSize: "10px", color: COLORS.textMuted, fontFamily: "monospace" }}>
              claude-sonnet-4
            </span>
          </div>
        </div>

        {/* Phase bar */}
        <PhaseBar currentPhase={phase} />

        {/* Main content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Chat */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {messages.map((msg, i) => (
                <Message key={i} msg={msg} />
              ))}
              {loading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Git log */}
            <GitLog commits={commits} />

            {/* Input */}
            <div style={{
              padding: "12px 16px",
              borderTop: `1px solid ${COLORS.border}`,
              background: COLORS.bgPanel,
            }}>
              <div style={{
                display: "flex",
                gap: "8px",
                alignItems: "flex-end",
                background: COLORS.bgInput,
                border: `1px solid ${COLORS.borderAccent}`,
                borderRadius: "8px",
                padding: "10px 12px",
                transition: "border-color 0.2s",
              }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Describe la tarea... (Enter para enviar)"
                  rows={1}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    color: COLORS.text,
                    fontSize: "13px",
                    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
                    lineHeight: "1.5",
                    maxHeight: "120px",
                  }}
                  onInput={e => {
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                />
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  style={{
                    background: loading || !input.trim() ? COLORS.borderAccent : COLORS.accent,
                    border: "none",
                    borderRadius: "5px",
                    color: loading || !input.trim() ? COLORS.textDim : "#fff",
                    cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    fontWeight: "600",
                    transition: "all 0.2s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {loading ? (
                    <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>↻</span>
                  ) : "⏎ send"}
                </button>
              </div>
              <div style={{
                marginTop: "6px",
                fontSize: "10px",
                color: COLORS.textDim,
                fontFamily: "monospace",
                textAlign: "center",
              }}>
                shift+enter para nueva línea · el agente commitea al repo montado en /repo
              </div>
            </div>
          </div>

          {/* File panel */}
          {openFile && (
            <FilePanel file={openFile} onClose={() => setOpenFile(null)} />
          )}
        </div>
      </div>
    </>
  );
}

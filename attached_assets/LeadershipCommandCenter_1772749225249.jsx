import { useState, useEffect, useRef } from "react";

const CRISIS_TYPES = [
  { id: "no-show", label: "Staff No-Show", icon: "👤", urgent: true },
  { id: "equipment", label: "Equipment Failure", icon: "🔧", urgent: true },
  { id: "rush", label: "Unexpected Rush", icon: "⚡", urgent: false },
  { id: "complaint", label: "Guest Complaint", icon: "💬", urgent: false },
  { id: "delivery", label: "Delivery Problem", icon: "📦", urgent: false },
  { id: "health", label: "Health/Safety Issue", icon: "🛡️", urgent: true },
];

const MOCK_PRIORITIES = [
  {
    id: 1,
    title: "Confirm Weekend Staffing Coverage",
    why: "A fully staffed weekend prevents burnout and costly last-minute coverage.",
    action: "Check schedule for uncovered shifts. Reach out proactively before Friday hits.",
    tag: "Operations",
    urgency: "high",
  },
  {
    id: 2,
    title: "Audit PAR Levels for Key Items",
    why: "Avoid 86'd situations on peak nights while hitting your food cost target.",
    action: "Walk the kitchen and bar. Compare stock to projected covers. Place emergency orders today.",
    tag: "Inventory",
    urgency: "high",
  },
  {
    id: 3,
    title: "Prep Pre-Shift Briefing for the Weekend",
    why: "Clear communication reduces floor stress and aligns the team when the house gets slammed.",
    action: "Write a one-page brief: reservations, volume projections, 86'd items, service reminders.",
    tag: "Leadership",
    urgency: "medium",
  },
  {
    id: 4,
    title: "Review Weekend Reservations & Walk-In Strategy",
    why: "Maximize revenue without overloading the kitchen or creating long wait lists.",
    action: "Cross-check Friday–Sunday book. Strategize where to block open tables for walk-ins.",
    tag: "Revenue",
    urgency: "medium",
  },
  {
    id: 5,
    title: "Spot-Train on Key Consistency Gaps",
    why: "One targeted fix today beats a dozen complaints this weekend.",
    action: "Pinpoint one service or food issue from recent reviews. Reinforce it in today's shifts.",
    tag: "Training",
    urgency: "low",
  },
];

const TAG_COLORS = {
  Operations: "#f59e0b",
  Inventory: "#3b82f6",
  Leadership: "#8b5cf6",
  Revenue: "#10b981",
  Training: "#f97316",
};

const URGENCY_STYLES = {
  high: { dot: "#ef4444", label: "High Priority" },
  medium: { dot: "#f59e0b", label: "Medium Priority" },
  low: { dot: "#6b7280", label: "Low Priority" },
};

function PrioritiesTab() {
  const [state, setState] = useState("idle"); // idle | loading | done
  const [completed, setCompleted] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  const handleGenerate = () => {
    setState("loading");
    setTimeout(() => setState("done"), 2200);
  };

  const toggleComplete = (id, e) => {
    e.stopPropagation();
    setCompleted((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (state === "idle") {
    return (
      <div style={{ padding: "8px 0 4px" }}>
        <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
          Get personalized task recommendations for your restaurant today.
        </p>
        <button
          onClick={handleGenerate}
          style={{
            width: "100%",
            padding: "14px 20px",
            background: "linear-gradient(135deg, #d97706, #b45309)",
            border: "none",
            borderRadius: 10,
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            letterSpacing: "0.01em",
          }}
        >
          <span>✦</span> Get Today's Priorities
        </button>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div style={{ padding: "24px 0", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#d97706", marginBottom: 12 }}>
          <span style={{ display: "inline-block", animation: "spin 1s linear infinite", fontSize: 18 }}>◌</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Generating your Thursday priorities…</span>
        </div>
        <div style={{ height: 3, background: "#1f2937", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: "60%", background: "linear-gradient(90deg, #d97706, #f59e0b)", borderRadius: 99, animation: "progress 2s ease-in-out" }} />
        </div>
      </div>
    );
  }

  const completedCount = Object.values(completed).filter(Boolean).length;

  return (
    <div style={{ paddingTop: 4 }}>
      {/* Summary bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          Thursday · Prep for the Weekend Rush
        </div>
        <div style={{ fontSize: 12, color: "#d97706", fontWeight: 600 }}>
          {completedCount}/{MOCK_PRIORITIES.length} done
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "#1f2937", borderRadius: 99, marginBottom: 16, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${(completedCount / MOCK_PRIORITIES.length) * 100}%`,
          background: "linear-gradient(90deg, #d97706, #f59e0b)",
          borderRadius: 99,
          transition: "width 0.4s ease",
        }} />
      </div>

      {/* Task cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {MOCK_PRIORITIES.map((task, i) => {
          const isExpanded = expandedId === task.id;
          const isDone = completed[task.id];
          return (
            <div
              key={task.id}
              onClick={() => setExpandedId(isExpanded ? null : task.id)}
              style={{
                background: isDone ? "rgba(16,185,129,0.06)" : "#111827",
                border: `1px solid ${isDone ? "rgba(16,185,129,0.2)" : isExpanded ? "rgba(217,119,6,0.4)" : "#1f2937"}`,
                borderRadius: 10,
                padding: "12px 14px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                opacity: isDone ? 0.65 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                {/* Checkbox */}
                <button
                  onClick={(e) => toggleComplete(task.id, e)}
                  style={{
                    width: 20, height: 20, borderRadius: 6,
                    border: `2px solid ${isDone ? "#10b981" : "#374151"}`,
                    background: isDone ? "#10b981" : "transparent",
                    color: "#fff", fontSize: 11, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    cursor: "pointer", flexShrink: 0, marginTop: 1,
                    transition: "all 0.15s",
                  }}
                >
                  {isDone && "✓"}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: URGENCY_STYLES[task.urgency].dot, flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: 13, fontWeight: 600, color: isDone ? "#6b7280" : "#f3f4f6",
                      textDecoration: isDone ? "line-through" : "none",
                      lineHeight: 1.3,
                    }}>
                      {i + 1}. {task.title}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: TAG_COLORS[task.tag] || "#9ca3af",
                      background: `${TAG_COLORS[task.tag]}18`,
                      padding: "2px 7px", borderRadius: 99, letterSpacing: "0.04em",
                    }}>
                      {task.tag.toUpperCase()}
                    </span>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #1f2937" }}>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.08em", marginBottom: 4 }}>ACTION</div>
                        <p style={{ fontSize: 13, color: "#d1d5db", lineHeight: 1.6, margin: 0 }}>{task.action}</p>
                      </div>
                      <div style={{ borderLeft: "3px solid #d97706", paddingLeft: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.08em", marginBottom: 4 }}>WHY IT MATTERS</div>
                        <p style={{ fontSize: 12, color: "#9ca3af", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>{task.why}</p>
                      </div>
                    </div>
                  )}
                </div>

                <span style={{ color: "#374151", fontSize: 12, flexShrink: 0, marginTop: 2 }}>
                  {isExpanded ? "▲" : "▼"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CrisisTab() {
  const [selected, setSelected] = useState(null);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCrisis = (crisis) => {
    setSelected(crisis);
    setLoading(true);
    setResponse("");
    setTimeout(() => {
      setResponse(
        crisis.id === "no-show"
          ? "**Immediate Steps:**\n1. Check if anyone on the schedule can come in early — text or call directly.\n2. Ask floor managers to cover a section temporarily.\n3. Offer a shift bonus for last-minute pickup.\n4. If still short, consolidate sections and tell the host to slow the door.\n\n**Do not:** Wait more than 15 minutes to escalate — act fast."
          : `**Quick Fix: ${crisis.label}**\n\n1. Assess the immediate impact on service or guest safety.\n2. Communicate calmly to your team — panic spreads.\n3. Implement your backup protocol or reach out to your vendor/contact.\n4. Document what happened for your post-shift debrief.\n\n**Follow up:** Set a reminder to review your SOP for this scenario tonight.`
      );
      setLoading(false);
    }, 1500);
  };

  const formatResponse = (text) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return <div key={i} style={{ fontWeight: 700, color: "#f3f4f6", marginTop: i > 0 ? 12 : 0, marginBottom: 6, fontSize: 13 }}>{line.replace(/\*\*/g, "")}</div>;
      }
      if (line.match(/^\d+\./)) {
        return <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <span style={{ color: "#d97706", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{line.match(/^\d+/)[0]}.</span>
          <span style={{ color: "#d1d5db", fontSize: 13, lineHeight: 1.5 }}>{line.replace(/^\d+\.\s/, "")}</span>
        </div>;
      }
      if (line.trim() === "") return <div key={i} style={{ height: 4 }} />;
      return <div key={i} style={{ color: "#9ca3af", fontSize: 12, lineHeight: 1.5, fontStyle: "italic" }}>{line.replace(/\*\*/g, "")}</div>;
    });
  };

  if (selected) {
    return (
      <div>
        <button
          onClick={() => { setSelected(null); setResponse(""); }}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#6b7280", fontSize: 13, cursor: "pointer", marginBottom: 14, padding: 0 }}
        >
          ← Back to Crisis Menu
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>{selected.icon}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f3f4f6" }}>{selected.label}</div>
            {selected.urgent && <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, letterSpacing: "0.05em" }}>HIGH URGENCY</div>}
          </div>
        </div>
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 10, padding: "14px 16px", minHeight: 120 }}>
          {loading ? (
            <div style={{ color: "#d97706", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>◌</span> Getting guidance…
            </div>
          ) : (
            <div>{formatResponse(response)}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#ef4444", fontSize: 16 }}>⚠</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fca5a5" }}>Quick Fix Mode</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Immediate step-by-step guidance for common emergencies.</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {CRISIS_TYPES.map((c) => (
          <button
            key={c.id}
            onClick={() => handleCrisis(c)}
            style={{
              background: "#111827",
              border: `1px solid ${c.urgent ? "rgba(239,68,68,0.2)" : "#1f2937"}`,
              borderRadius: 10,
              padding: "14px 12px",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s",
              position: "relative",
            }}
          >
            {c.urgent && (
              <div style={{ position: "absolute", top: 8, right: 8, width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />
            )}
            <div style={{ fontSize: 20, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f3f4f6" }}>{c.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FollowUpTab() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const handleAsk = () => {
    if (!question.trim()) return;
    const q = question;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: "Great question. For a 20-person team, start with your labor cost percentage — your target should be 28–32% of revenue. Break your team into FOH and BOH separately, then look at scheduled hours vs. actual hours over the last 4 weeks. Gaps there tell you where overtime is leaking. For each section, ask: who are my top performers, and am I scheduling them on my highest-volume nights? That's your first cut."
      }]);
      setLoading(false);
    }, 1600);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
        Ask follow-up questions about your priorities or get deeper guidance on any topic.
      </p>

      {messages.length > 0 && (
        <div style={{ maxHeight: 280, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: m.role === "user" ? "rgba(217,119,6,0.1)" : "#111827",
              border: `1px solid ${m.role === "user" ? "rgba(217,119,6,0.2)" : "#1f2937"}`,
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "92%",
            }}>
              <div style={{ fontSize: 13, color: m.role === "user" ? "#fcd34d" : "#d1d5db", lineHeight: 1.5 }}>{m.text}</div>
            </div>
          ))}
          {loading && (
            <div style={{ padding: "10px 14px", background: "#111827", border: "1px solid #1f2937", borderRadius: 10, alignSelf: "flex-start" }}>
              <span style={{ color: "#d97706", fontSize: 13, animation: "spin 1s linear infinite", display: "inline-block" }}>◌</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); }}}
          placeholder="e.g., 'How should I handle labor assessment for my 20-person team?'"
          rows={3}
          style={{
            width: "100%", padding: "12px 14px",
            background: "#111827", border: "1px solid #1f2937",
            borderRadius: 10, color: "#f3f4f6", fontSize: 13,
            resize: "none", fontFamily: "inherit", outline: "none",
            lineHeight: 1.5, boxSizing: "border-box",
          }}
        />
        <button
          onClick={handleAsk}
          disabled={!question.trim()}
          style={{
            padding: "12px 20px",
            background: question.trim() ? "linear-gradient(135deg, #d97706, #b45309)" : "#1f2937",
            border: "none", borderRadius: 10,
            color: question.trim() ? "#fff" : "#4b5563",
            fontSize: 14, fontWeight: 600, cursor: question.trim() ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          ✦ Ask Question
        </button>
      </div>
    </div>
  );
}

function ProgressTab() {
  const completedThisWeek = 3;
  const totalThisWeek = 5;
  const [view, setView] = useState("week");

  const heatmapData = [
    [0,0,0,1,0,2,3],
    [0,1,0,0,2,1,0],
    [1,0,2,0,0,0,1],
    [0,0,1,2,3,1,0],
  ];
  const days = ["S","M","T","W","T","F","S"];
  const weekLabels = ["W4","W3","W2","W1"];
  const colors = ["#1f2937","rgba(217,119,6,0.25)","rgba(217,119,6,0.55)","rgba(217,119,6,0.9)"];

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {["week","month"].map((v) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: view === v ? "#d97706" : "#111827",
            border: `1px solid ${view === v ? "#d97706" : "#1f2937"}`,
            color: view === v ? "#fff" : "#9ca3af", cursor: "pointer",
          }}>
            {v === "week" ? "This Week" : "This Month"}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
        {[
          { label: "Completed", value: completedThisWeek, color: "#10b981" },
          { label: "Total Tasks", value: totalThisWeek, color: "#f3f4f6" },
          { label: "Rate", value: `${Math.round((completedThisWeek/totalThisWeek)*100)}%`, color: "#d97706" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 10, padding: "14px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#6b7280", letterSpacing: "0.04em" }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", marginBottom: 10, letterSpacing: "0.05em" }}>ACTIVITY HEATMAP</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 20 }}>
            {days.map((d) => (
              <div key={d} style={{ fontSize: 10, color: "#4b5563", width: 12, textAlign: "right", height: 14, lineHeight: "14px" }}>{d}</div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              {weekLabels.map((w) => (
                <div key={w} style={{ flex: 1, fontSize: 10, color: "#4b5563", textAlign: "center" }}>{w}</div>
              ))}
            </div>
            {days.map((_, di) => (
              <div key={di} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                {weekLabels.map((_, wi) => (
                  <div key={wi} style={{
                    flex: 1, height: 14, borderRadius: 3,
                    background: colors[heatmapData[wi]?.[di] ?? 0],
                  }} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, justifyContent: "flex-end" }}>
          <span style={{ fontSize: 10, color: "#4b5563" }}>Less</span>
          {colors.map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
          ))}
          <span style={{ fontSize: 10, color: "#4b5563" }}>More</span>
        </div>
      </div>

      {/* Streak */}
      <div style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.2)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
        <span style={{ fontSize: 24 }}>🔥</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fcd34d" }}>3-Day Streak</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>You've hit your priorities 3 days in a row. Keep it going.</div>
        </div>
      </div>
    </div>
  );
}

function RemindersTab() {
  const [reminderTime, setReminderTime] = useState("08:00");
  const [enabled, setEnabled] = useState(false);
  const [days, setDays] = useState(["Mon","Tue","Wed","Thu","Fri"]);
  const allDays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const toggleDay = (d) => setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
        Set daily reminders to stay on top of your restaurant priorities.
      </p>

      {/* Push notification toggle */}
      <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 10, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: enabled ? 16 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🔔</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#f3f4f6" }}>Daily Priority Reminders</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Push notification to your device</div>
            </div>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            style={{
              width: 44, height: 24, borderRadius: 99,
              background: enabled ? "#d97706" : "#374151",
              border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s",
            }}
          >
            <div style={{
              position: "absolute", top: 3, left: enabled ? 23 : 3,
              width: 18, height: 18, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s",
            }} />
          </button>
        </div>

        {enabled && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Time picker */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.08em", marginBottom: 8 }}>REMINDER TIME</div>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                style={{
                  background: "#0f172a", border: "1px solid #374151",
                  borderRadius: 8, padding: "8px 12px",
                  color: "#f3f4f6", fontSize: 16, fontWeight: 600,
                  outline: "none", width: "100%", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Day selector */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.08em", marginBottom: 8 }}>DAYS</div>
              <div style={{ display: "flex", gap: 6 }}>
                {allDays.map((d) => (
                  <button
                    key={d}
                    onClick={() => toggleDay(d)}
                    style={{
                      flex: 1, padding: "7px 2px",
                      background: days.includes(d) ? "rgba(217,119,6,0.15)" : "#0f172a",
                      border: `1px solid ${days.includes(d) ? "#d97706" : "#374151"}`,
                      borderRadius: 8, fontSize: 10, fontWeight: 700,
                      color: days.includes(d) ? "#fcd34d" : "#6b7280",
                      cursor: "pointer", letterSpacing: "0.02em",
                    }}
                  >
                    {d[0]}
                  </button>
                ))}
              </div>
            </div>

            <button style={{
              padding: "12px", background: "linear-gradient(135deg, #d97706, #b45309)",
              border: "none", borderRadius: 10, color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              Save Reminder
            </button>
          </div>
        )}
      </div>

      {/* Morning briefing option */}
      <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>☀️</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#f3f4f6" }}>Pre-Shift Digest</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Daily summary before your shift starts</div>
          </div>
        </div>
        <span style={{ fontSize: 11, color: "#4b5563", background: "#1f2937", padding: "3px 8px", borderRadius: 99 }}>Coming Soon</span>
      </div>
    </div>
  );
}

const TABS = [
  { id: "priorities", label: "Priorities", icon: "✦" },
  { id: "crisis", label: "Crisis", icon: "⚠" },
  { id: "followup", label: "Follow-up", icon: "💬" },
  { id: "progress", label: "Progress", icon: "✓" },
  { id: "reminders", label: "Reminders", icon: "🔔" },
];

export default function LeadershipCommandCenter() {
  const [activeTab, setActiveTab] = useState("priorities");

  const tabContent = {
    priorities: <PrioritiesTab />,
    crisis: <CrisisTab />,
    followup: <FollowUpTab />,
    progress: <ProgressTab />,
    reminders: <RemindersTab />,
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#030712",
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: "0 0 40px",
    }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes progress { from { width: 0%; } to { width: 80%; } }
        * { box-sizing: border-box; }
        textarea::placeholder { color: #374151; }
        button:hover { opacity: 0.9; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, background: "rgba(217,119,6,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
            🍽️
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#f3f4f6" }}>The Restaurant Consultant</div>
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#f9fafb", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
          Ownership & Leadership
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 24px", lineHeight: 1.5 }}>
          Transition from operator-fixer to architect-leader.
        </p>
      </div>

      {/* Command Center Card */}
      <div style={{ margin: "0 16px", background: "#0f172a", border: "1px solid #1f2937", borderRadius: 16, overflow: "hidden" }}>
        
        {/* Card Header */}
        <div style={{ padding: "16px 20px 0", borderBottom: "1px solid #1f2937" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ color: "#d97706", fontSize: 16 }}>📅</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: "#f3f4f6" }}>Leadership Command Center</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 24 }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>🕐 Thursday, March 5, 2026</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#d97706", background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.2)", padding: "2px 8px", borderRadius: 99 }}>
                  Mouton's Bistro & Bar
                </span>
              </div>
            </div>
            <button style={{ background: "none", border: "none", color: "#4b5563", cursor: "pointer", fontSize: 18, padding: 4 }}>⚙</button>
          </div>

          {/* Tab Bar */}
          <div style={{ display: "flex", gap: 0, marginBottom: "-1px" }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: "10px 4px",
                  background: "none",
                  border: "none",
                  borderBottom: `2px solid ${activeTab === tab.id ? "#d97706" : "transparent"}`,
                  color: activeTab === tab.id ? "#d97706" : "#4b5563",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: "0.03em",
                  transition: "all 0.15s",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <span style={{ fontSize: tab.id === "reminders" ? 13 : 14 }}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ padding: "18px 20px" }}>
          {tabContent[activeTab]}
        </div>
      </div>

      {/* Domain content below */}
      <div style={{ margin: "16px 16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { tag: "Principle", color: "#d97706", bg: "rgba(217,119,6,0.1)", count: 1, preview: "The owner's job is to build systems that run without them…" },
          { tag: "Framework", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", count: 2, preview: "OWNER: Vision, culture, capital decisions, vendor relationships…" },
          { tag: "Checklist", color: "#10b981", bg: "rgba(16,185,129,0.1)", count: 1, preview: "WHO DECIDES WHAT: Comp under $25 → Server…" },
        ].map((item) => (
          <div key={item.tag} style={{ background: "#0f172a", border: "1px solid #1f2937", borderRadius: 12, padding: "14px 16px", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: item.color, background: item.bg, padding: "3px 8px", borderRadius: 99 }}>
                  {item.tag} ({item.count})
                </span>
              </div>
              <span style={{ color: "#374151", fontSize: 12 }}>▼</span>
            </div>
            <p style={{ fontSize: 12, color: "#4b5563", margin: "8px 0 0", lineHeight: 1.5 }}>{item.preview}</p>
          </div>
        ))}
      </div>

      {/* Back button */}
      <div style={{ margin: "20px 16px 0" }}>
        <button style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#0f172a", border: "1px solid #1f2937",
          borderRadius: 10, padding: "10px 16px",
          color: "#9ca3af", fontSize: 13, fontWeight: 500, cursor: "pointer",
        }}>
          ← Back to All Domains
        </button>
      </div>
    </div>
  );
}

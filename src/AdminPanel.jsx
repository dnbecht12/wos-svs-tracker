import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "./supabase.js";

// ─── COLORS ───────────────────────────────────────────────────────────────────
const COLORS = {
  bg:"var(--c-bg)", surface:"var(--c-surface)", card:"var(--c-card)",
  border:"var(--c-border)", borderHi:"var(--c-borderHi)",
  textPri:"var(--c-textPri)", textSec:"var(--c-textSec)", textDim:"var(--c-textDim)",
  accent:"var(--c-accent)", accentBg:"var(--c-accentBg)", accentDim:"var(--c-accentDim)",
  green:"var(--c-green)", greenBg:"var(--c-greenBg)", greenDim:"var(--c-greenDim)",
  blue:"var(--c-blue)", blueBg:"var(--c-blueBg)", blueDim:"var(--c-blueDim)",
  amber:"var(--c-amber)", amberBg:"var(--c-amberBg)", amberDim:"var(--c-amberDim)",
  red:"var(--c-red)", redBg:"var(--c-redBg)", redDim:"var(--c-redDim)",
};

const fmt = n => {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(1)+"M";
  if (Math.abs(n) >= 1000) return (n/1000).toFixed(1)+"K";
  return Math.round(n).toLocaleString();
};

async function submitHeroStats(payload) {
  const { error } = await supabase.from("stat_submissions").insert({
    ...payload,
    status: "pending",
    submitted_at: new Date().toISOString(),
  });
  return !error;
}
async function fetchSubmissions() {
  const { data, error } = await supabase
    .from("stat_submissions")
    .select("*")
    .order("submitted_at", { ascending: false });
  return error ? [] : data;
}
async function updateSubmission(id, updates) {
  // Try with reviewed_at first; if that column doesn't exist, retry without it
  let { error } = await supabase
    .from("stat_submissions")
    .update({ ...updates, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error && error.message?.includes("reviewed_at")) {
    const result = await supabase
      .from("stat_submissions")
      .update(updates)
      .eq("id", id);
    error = result.error;
  }
  if (error) console.error("updateSubmission error:", JSON.stringify(error));
  return !error;
}

// ── Issue reporting helpers ───────────────────────────────────────────────────
async function submitIssue(payload) {
  const { error } = await supabase.from("issue_reports").insert({
    ...payload,
    status: "submitted",
    submitted_at: new Date().toISOString(),
  });
  if (error) console.error("[submitIssue]", error.message, error.details, error.hint);
  return !error;
}
async function fetchIssues() {
  const { data, error } = await supabase
    .from("issue_reports")
    .select("*")
    .order("submitted_at", { ascending: false });
  return error ? [] : data;
}
async function updateIssue(id, updates) {
  const { error } = await supabase
    .from("issue_reports")
    .update(updates)
    .eq("id", id);
  return !error;
}
async function closeIssue(id, adminNote) {
  const { error } = await supabase
    .from("issue_reports")
    .update({ status: "closed", admin_note: adminNote, closed_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}
// ─── User Messages helpers ────────────────────────────────────────────────────
async function fetchUserThreads(userId) {
  // Fetch all messages in threads this user started
  const { data, error } = await supabase
    .from("user_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return data || [];
}

async function fetchAllThreadsAdmin() {
  const { data, error } = await supabase
    .from("user_messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

async function sendMessage(payload) {
  const { error } = await supabase.from("user_messages").insert(payload);
  if (error) console.error("[sendMessage]", error.message, error.details, error.hint);
  return !error;
}

async function markMessagesReadByUser(threadId) {
  await supabase.from("user_messages")
    .update({ read_by_user: true })
    .eq("thread_id", threadId)
    .eq("sender", "admin");
}

async function markMessagesReadByAdmin(threadId) {
  await supabase.from("user_messages")
    .update({ read_by_admin: true })
    .eq("thread_id", threadId)
    .eq("sender", "user");
}

async function closeThread(threadId) {
  await supabase.from("user_messages")
    .update({ thread_closed: true })
    .eq("thread_id", threadId);
}

// ─── ThreadView — shared between ProfileModal (user) and AdminPage (admin) ────
function ThreadView({ thread, user, hasUnread, onReply, onClose, C, isAdmin=false }) {
  const [replyText, setReplyText] = React.useState("");
  const [replying,  setReplying]  = React.useState(false);
  const [open,      setOpen]      = React.useState(hasUnread); // expand if unread

  const fmtDate = ts => ts ? new Date(ts).toLocaleDateString("en-US",
    { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) : "";

  const handleReply = async () => {
    if (!replyText.trim() || replying) return;
    setReplying(true);
    await onReply(replyText.trim());
    setReplyText("");
    setReplying(false);
  };

  const firstMsg = thread.messages[0];

  return (
    <div style={{ marginBottom: 12, border: `1px solid ${hasUnread ? C.accentDim : C.border}`,
      borderRadius: 10, overflow: "hidden",
      background: hasUnread ? C.accentBg + "40" : "transparent" }}>

      {/* Thread header */}
      <div onClick={() => setOpen(o => !o)}
        style={{ padding: "10px 14px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: C.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {hasUnread && (
            <div style={{ width: 8, height: 8, borderRadius: "50%",
              background: C.red, flexShrink: 0 }} />
          )}
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.textPri }}>
              {firstMsg?.category}
            </span>
            <span style={{ fontSize: 10, color: C.textDim,
              fontFamily: "'Space Mono',monospace", marginLeft: 8 }}>
              {fmtDate(firstMsg?.created_at)}
            </span>
          </div>
          {thread.thread_closed && (
            <span style={{ fontSize: 9, fontWeight: 700, color: C.textDim,
              fontFamily: "'Space Mono',monospace", background: C.surface,
              border: `1px solid ${C.border}`, padding: "1px 5px", borderRadius: 3 }}>
              CLOSED
            </span>
          )}
          {isAdmin && (
            <span style={{ fontSize: 10, color: C.textDim,
              fontFamily: "'Space Mono',monospace" }}>
              — {firstMsg?.user_name}
              {firstMsg?.contact_info && ` · ${firstMsg.contact_type === "discord" ? "Discord" : "Email"}: ${firstMsg.contact_info}`}
            </span>
          )}
        </div>
        <span style={{ fontSize: 12, color: C.textDim }}>{open ? "▲" : "▼"}</span>
      </div>

      {/* Messages */}
      {open && (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {thread.messages.map((m, i) => {
            const isMe = (isAdmin && m.sender === "admin") || (!isAdmin && m.sender === "user");
            return (
              <div key={i} style={{ display: "flex",
                justifyContent: isMe ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "80%", padding: "8px 12px", borderRadius: 10,
                  background: isMe ? C.accentBg : C.surface,
                  border: `1px solid ${isMe ? C.accentDim : C.border}` }}>
                  <div style={{ fontSize: 12, color: isMe ? C.accent : C.textPri,
                    lineHeight: 1.6 }}>
                    {m.message}
                  </div>
                  <div style={{ fontSize: 10, color: C.textDim, marginTop: 4,
                    fontFamily: "'Space Mono',monospace", textAlign: isMe ? "right" : "left" }}>
                    {fmtDate(m.created_at)}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Reply area */}
          {!thread.thread_closed && (thread.messages[0]?.wants_response || isAdmin) && (
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <input
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); }}}
                placeholder="Reply…"
                style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 7, color: C.textPri, padding: "7px 10px", fontSize: 12,
                  fontFamily: "'Space Mono',monospace", outline: "none" }}
              />
              <button onClick={handleReply} disabled={!replyText.trim() || replying}
                style={{ padding: "7px 14px", borderRadius: 7, fontSize: 11,
                  fontWeight: 700, cursor: replyText.trim() ? "pointer" : "not-allowed",
                  border: "none", background: C.accent, color: C.bg,
                  opacity: replyText.trim() ? 1 : 0.5 }}>
                {replying ? "…" : "Send"}
              </button>
            </div>
          )}

          {/* End conversation */}
          {!thread.thread_closed && (
            <div style={{ textAlign: "right", marginTop: 4 }}>
              <button onClick={onClose}
                style={{ fontSize: 10, color: C.textDim, background: "none",
                  border: "none", cursor: "pointer", fontFamily: "'Space Mono',monospace",
                  textDecoration: "underline" }}>
                End conversation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const ISSUE_TYPES = [
  "Incorrect Data",
  "Calculation Incorrect",
  "Formatting Issue",
  "Feature Request",
  "Other",
];
const ISSUE_MODULES = [
  "Chief Profile", "Inventory", "Construction", "Chief Gear",
  "Chief Charms", "Experts", "War Academy", "Research",
  "Heroes", "Hero Gear", "Troops", "RFC Planner", "SvS Calendar", "General / Other",
];

function ReportIssueModal({ user, currentPage, onClose, submitIssue }) {
  const C = COLORS;
  const [type,    setType]    = useState("");
  const [module,  setModule]  = useState(() => {
    const pageToModule = {
      "char-profile":"Chief Profile","inventory":"Inventory","construction":"Construction",
      "chief-gear":"Chief Gear","chief-charms":"Chief Charms","experts":"Experts",
      "war-academy":"War Academy","research-center":"Research","heroes":"Heroes",
      "hero-gear":"Hero Gear","troops":"Troops","rfc-planner":"RFC Planner",
      "svs-calendar":"SvS Calendar",
    };
    return pageToModule[currentPage] || "";
  });
  const [desc,    setDesc]    = useState("");
  const [busy,    setBusy]    = useState(false);
  const [done,    setDone]    = useState(false);

  const selS = { width:"100%", background:C.card, border:`1px solid ${C.border}`,
    borderRadius:7, color:C.textPri, padding:"8px 10px", fontSize:13,
    fontFamily:"'Space Mono',monospace", outline:"none", cursor:"pointer" };
  const labS = { fontSize:11, fontWeight:700, color:C.textDim,
    letterSpacing:"1px", textTransform:"uppercase",
    fontFamily:"'Space Mono',monospace", marginBottom:5, display:"block" };

  const canSubmit = type && module && desc.trim().length >= 5;

  const handleSubmit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    const ok = await submitIssue({
      user_id:      user?.id || null,
      user_name:    user?.user_metadata?.full_name || user?.email || "Anonymous",
      issue_type:   type,
      module,
      description:  desc.trim(),
    });
    setBusy(false);
    if (ok) setDone(true);
  };

  return createPortal(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:9999,
      display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:14,
        width:"100%",maxWidth:480,boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}>

        {/* Header */}
        <div style={{padding:"18px 22px 14px",borderBottom:`1px solid ${C.border}`,
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:C.textPri}}>🚩 Report an Issue</div>
            <div style={{fontSize:11,color:C.textDim,fontFamily:"'Space Mono',monospace",marginTop:2}}>
              Help us improve — describe what you found
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",
            color:C.textDim,cursor:"pointer",fontSize:18,lineHeight:1}}>✕</button>
        </div>

        {done ? (
          <div style={{padding:"32px 24px",textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:12}}>✅</div>
            <div style={{fontSize:15,fontWeight:700,color:C.textPri,marginBottom:6}}>Issue Submitted</div>
            <div style={{fontSize:12,color:C.textSec,marginBottom:20}}>
              Thanks for the report! We'll review it shortly.
            </div>
            <button onClick={onClose} style={{padding:"8px 24px",borderRadius:7,
              background:C.accentBg,color:C.accent,border:`1px solid ${C.accentDim}`,
              fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Space Mono',monospace"}}>
              Close
            </button>
          </div>
        ) : (
          <div style={{padding:"20px 22px",display:"flex",flexDirection:"column",gap:16}}>
            {/* Type */}
            <div>
              <label style={labS}>Type</label>
              <select value={type} onChange={e=>setType(e.target.value)} style={selS}>
                <option value="">— Select type —</option>
                {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {/* Module */}
            <div>
              <label style={labS}>Module</label>
              <select value={module} onChange={e=>setModule(e.target.value)} style={selS}>
                <option value="">— Select module —</option>
                {ISSUE_MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {/* Description */}
            <div>
              <label style={labS}>Brief Description</label>
              <textarea value={desc} onChange={e=>setDesc(e.target.value.slice(0,240))}
                rows={4} maxLength={240} placeholder="Describe the issue (max 240 chars)..."
                style={{width:"100%",boxSizing:"border-box",background:C.card,
                  border:`1px solid ${C.border}`,borderRadius:7,color:C.textPri,
                  padding:"8px 10px",fontSize:12,fontFamily:"inherit",
                  resize:"vertical",outline:"none"}} />
              <div style={{fontSize:10,color:C.textDim,fontFamily:"'Space Mono',monospace",
                textAlign:"right",marginTop:3}}>{desc.length}/240</div>
            </div>
            {/* Submit */}
            <button onClick={handleSubmit} disabled={!canSubmit||busy}
              style={{padding:"10px",borderRadius:7,fontWeight:700,fontSize:13,
                cursor:canSubmit&&!busy?"pointer":"not-allowed",
                fontFamily:"'Space Mono',monospace",transition:"all 0.15s",
                background:canSubmit?C.accentBg:"transparent",
                color:canSubmit?C.accent:C.textDim,
                border:`1px solid ${canSubmit?C.accentDim:C.border}`}}>
              {busy ? "Submitting…" : "Submit Report"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Admin Page ───────────────────────────────────────────────────────────────

function AdminPage({ onStatsUpdated }) {
  const C = COLORS;
  const [adminTab,      setAdminTab]      = useState("submissions");
  const [adminMessages, setAdminMessages] = useState([]);
  const [msgLoading,    setMsgLoading]    = useState(false);
  const [msgReplyText,  setMsgReplyText]  = useState({});
  const [submissions,   setSubmissions]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [note,          setNote]          = useState({});
  const [busy,          setBusy]          = useState({});
  const [validating,    setValidating]    = useState(null);
  const [reviewedOpen,  setReviewedOpen]  = useState(true);

  // Issues state
  const [issues,        setIssues]        = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issueStatus,   setIssueStatus]   = useState({}); // {id: status}
  const [closedOpen,    setClosedOpen]    = useState(false);
  // Close ticket flow
  const [closeTarget,   setCloseTarget]   = useState(null); // issue being closed
  const [closeNote,     setCloseNote]     = useState("");
  const [confirmClose,  setConfirmClose]  = useState(false); // show "are you sure" overlay
  const [exportUsers,   setExportUsers]   = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportBusy,    setExportBusy]    = useState({});
  const [importBusy,    setImportBusy]    = useState({});
  const [importMsg,     setImportMsg]     = useState({});

  const loadExportUsers = async () => {
    setExportLoading(true);
    try {
      const { data: chars } = await supabase.from("characters")
        .select("id, name, alliance, state_number, is_default, user_id")
        .order("user_id").order("created_at");
      const { data: profiles } = await supabase.from("profiles").select("id, display_name");
      const profileMap = Object.fromEntries((profiles||[]).map(p=>[p.id,p.display_name]));
      const byUser = {};
      (chars||[]).forEach(c=>{
        if(!byUser[c.user_id]) byUser[c.user_id]={user_id:c.user_id,characters:[]};
        byUser[c.user_id].characters.push(c);
      });
      setExportUsers(Object.values(byUser).map(u=>({
        ...u, display_name:profileMap[u.user_id]||u.user_id.slice(0,8)+"…",
      })));
    } catch(e){console.error(e);}
    setExportLoading(false);
  };

  const exportCharacter = async (char, userLabel) => {
    setExportBusy(prev=>({...prev,[char.id]:true}));
    try {
      const [udRes,charRes,plansRes] = await Promise.all([
        supabase.from("user_data").select("key,value,updated_at").eq("char_id",char.id),
        supabase.from("characters").select("inventory,plan_snapshot").eq("id",char.id).single(),
        supabase.from("saved_plans").select("plan_key,data").eq("character_id",char.id),
      ]);
      const bundle={exported_at:new Date().toISOString(),user_id:char.user_id,char_id:char.id,
        char_name:char.name,user_label:userLabel,user_data:udRes.data||[],
        inventory:charRes.data?.inventory||null,plan_snapshot:charRes.data?.plan_snapshot||null,
        saved_plans:plansRes.data||[]};
      const blob=new Blob([JSON.stringify(bundle,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;
      a.download=`tundra-${char.name.replace(/\s+/g,"-").toLowerCase()}-${new Date().toISOString().slice(0,10)}.json`;
      a.click(); URL.revokeObjectURL(url);
    } catch(e){console.error(e);}
    setExportBusy(prev=>({...prev,[char.id]:false}));
  };

  const importCharacter = async (char, file) => {
    setImportBusy(prev=>({...prev,[char.id]:true}));
    setImportMsg(prev=>({...prev,[char.id]:""}));
    try {
      const bundle=JSON.parse(await file.text());
      if(bundle.char_id!==char.id){
        setImportMsg(prev=>({...prev,[char.id]:"❌ File is for a different character."}));
        setImportBusy(prev=>({...prev,[char.id]:false})); return;
      }
      if(bundle.user_data?.length) await supabase.from("user_data").upsert(
        bundle.user_data.map(r=>({user_id:char.user_id,char_id:char.id,key:r.key,
          value:r.value,updated_at:new Date().toISOString()})),
        {onConflict:"user_id,char_id,key"});
      const upd={};
      if(bundle.inventory!==null) upd.inventory=bundle.inventory;
      if(bundle.plan_snapshot!==null) upd.plan_snapshot=bundle.plan_snapshot;
      if(Object.keys(upd).length) await supabase.from("characters").update(upd).eq("id",char.id);
      if(bundle.saved_plans?.length) await supabase.from("saved_plans").upsert(
        bundle.saved_plans.map(r=>({character_id:char.id,plan_key:r.plan_key,
          data:r.data,updated_at:new Date().toISOString()})),
        {onConflict:"character_id,plan_key"});
      setImportMsg(prev=>({...prev,[char.id]:"✅ Restored successfully!"}));
    } catch(e){ setImportMsg(prev=>({...prev,[char.id]:`❌ Error: ${e.message}`})); }
    setImportBusy(prev=>({...prev,[char.id]:false}));
  };

  const loadIssues = async () => {
    setIssuesLoading(true);
    const data = await fetchIssues();
    setIssues(data);
    const statusMap = {};
    data.forEach(i => { statusMap[i.id] = i.status || "submitted"; });
    setIssueStatus(statusMap);
    setIssuesLoading(false);
  };

  const handleIssueStatusChange = async (issue, newStatus) => {
    setIssueStatus(p => ({...p, [issue.id]: newStatus}));
    await updateIssue(issue.id, { status: newStatus });
  };

  const handleCloseClick = (issue) => {
    setCloseTarget(issue);
    setCloseNote("");
    setConfirmClose(false);
  };

  const handleCloseConfirm = async () => {
    if (!closeTarget) return;
    const ok = await closeIssue(closeTarget.id, closeNote);
    if (ok) {
      // Send notification to the user who submitted
      if (closeTarget.user_id) {
        await supabase.from("issue_notifications").insert({
          user_id:    closeTarget.user_id,
          issue_id:   closeTarget.id,
          issue_type: closeTarget.issue_type,
          module:     closeTarget.module,
          admin_note: closeNote || "Your issue has been resolved.",
          read:       false,
          created_at: new Date().toISOString(),
        });
      }
      setCloseTarget(null);
      setCloseNote("");
      setConfirmClose(false);
      loadIssues();
    }
  };

  const load = async () => {
    setLoading(true);
    const data = await fetchSubmissions();
    setSubmissions(data);
    setLoading(false);
  };

  const downloadVarianceCSV = (sub) => {
    const variances = sub.stats?.variances || [];
    if (!variances.length) return;
    const header = "Date,Day,Weekday,Tier,Refines,Est RFC,Actual RFC,Variance\n";
    const rows = variances.map(v =>
      `${v.date},${v.day},${v.weekday},${v.tier},${v.refines},${v.estRfc},${v.actualRfc},${v.variance}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rfc-variance-${sub.hero_name.replace(/\s+/g,"-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadAdminMessages = async () => {
    setMsgLoading(true);
    const { data } = await supabase.from("user_messages").select("*")
      .order("created_at", { ascending: true });
    setAdminMessages(data || []);
    setMsgLoading(false);
  };

  useEffect(() => { load(); loadIssues(); }, []);
  useEffect(() => { if (adminTab === "messages")   loadAdminMessages(); }, [adminTab]);
  useEffect(() => { if (adminTab === "dataexport") loadExportUsers();    }, [adminTab]);

  const [handleError, setHandleError] = useState("");

  const handle = async (sub, action) => {
    setHandleError("");
    setBusy(p => ({...p,[sub.id]:true}));
    if (action === "accept") {
      const result = await acceptSubmission(sub, false);
      if (result.needsValidation) {
        setValidating({ sub, existing: result.existing, diffs: result.diffs });
        setBusy(p => ({...p,[sub.id]:false}));
        return;
      }
    } else {
      const { error } = await supabase
        .from("stat_submissions")
        .update({ status: "rejected", admin_note: note[sub.id]||"" })
        .eq("id", sub.id);
      if (error) {
        setHandleError(`Reject failed: ${error.message} (code: ${error.code})`);
        setBusy(p => ({...p,[sub.id]:false}));
        return;
      }
    }
    setBusy(p => ({...p,[sub.id]:false}));
    load();
  };

  const handleForceAccept = async () => {
    if (!validating) return;
    setBusy(p => ({...p,[validating.sub.id]:true}));
    await acceptSubmission(validating.sub, true);
    setBusy(p => ({...p,[validating.sub.id]:false}));
    setValidating(null);
    load();
  };

  const statKeys = ["levelPower","starPower","skillPower","gearStrength","escorts","troopCap",
    "heroAtk","heroDef","heroHp","escortHp","escortDef","escortAtk",
    "infAtk","infDef","infLeth","infHp",
    "wgtHeroAtk","wgtHeroDef","wgtHeroHp","wgtEscortAtk","wgtEscortDef","wgtEscortHp",
    "wgtTroopLeth","wgtTroopHp"];

  const statLabel = k => ({
    levelPower:"Level Power", starPower:"Star Power", skillPower:"Skill Power",
    gearStrength:"Gear Strength", escorts:"Escorts", troopCap:"Troop Cap",
    heroAtk:"Hero Atk", heroDef:"Hero Def", heroHp:"Hero HP",
    escortHp:"Escort HP", escortDef:"Escort Def", escortAtk:"Escort Atk",
    infAtk:"Troop Atk%", infDef:"Troop Def%", infLeth:"Troop Leth%", infHp:"Troop HP%",
    wgtHeroAtk:"Wgt Hero Atk", wgtHeroDef:"Wgt Hero Def", wgtHeroHp:"Wgt Hero HP",
    wgtEscortAtk:"Wgt Escort Atk", wgtEscortDef:"Wgt Escort Def", wgtEscortHp:"Wgt Escort HP",
    wgtTroopLeth:"Wgt Troop Leth%", wgtTroopHp:"Wgt Troop HP%",
  }[k] || k);

  const statusColor = s => s==="accepted" ? C.green : s==="rejected" ? C.red : C.amber;

  // ── Edit Stats modal ────────────────────────────────────────────────────────
  const [editingSub, setEditingSub] = useState(null);   // the stat_submission being corrected
  const [editRow,    setEditRow]    = useState(null);   // the hero_stats_data row
  const [editVals,   setEditVals]   = useState({});     // working copy of stats
  const [editBusy,   setEditBusy]   = useState(false);
  const [editMsg,    setEditMsg]    = useState("");

  const openEdit = async (sub) => {
    setEditMsg("");
    const row = await getHeroStatsFromDB(sub.hero_name, sub.level, sub.stars, sub.widget);
    if (!row) { setEditMsg("No hero_stats_data row found — try Re-process first."); return; }
    setEditRow(row);
    // Show raw stored values exactly as they are in the DB — no conversion
    const vals = {};
    statKeys.forEach(k => {
      const v = row.stats?.[k];
      vals[k] = v != null ? String(v) : "";
    });
    setEditVals(vals);
    setEditingSub(sub);
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setEditBusy(true);
    const newStats = { ...(editRow.stats || {}) };
    statKeys.forEach(k => {
      const v = editVals[k];
      if (v === "" || v == null) return;
      newStats[k] = parseFloat(v);
    });

    // 1. Update hero_stats_data
    const { data, error } = await supabase.from("hero_stats_data")
      .update({ stats: newStats })
      .eq("id", editRow.id)
      .select();

    if (error) {
      setEditBusy(false);
      setEditMsg("Error: " + error.message + " (code: " + error.code + ")");
      return;
    }
    if (!data || data.length === 0) {
      setEditBusy(false);
      setEditMsg("⚠ No rows updated — check row ID or RLS policy.");
      return;
    }

    // 2. Update stat_submissions with corrected stats + admin_edited flag
    await supabase.from("stat_submissions")
      .update({
        stats: { ...newStats, _admin_edited: true, _edited_at: new Date().toISOString() },
      })
      .eq("id", editingSub.id);

    setEditBusy(false);
    setEditingSub(null);
    setEditRow(null);
    setEditMsg("");
    onStatsUpdated?.();
    await load();
  };

  return (
    <div className="fade-in" style={{maxWidth:900}}>
      <div className="page-title">Admin <span style={{color:C.accent}}>Panel</span></div>

      {/* Tab toggle */}
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {[
          {id:"submissions", label:"📋 Stat Submissions"},
          {id:"issues",      label:"🚩 Issue Tracking", count: issues.filter(i=>i.status!=="closed").length},
          {id:"messages",    label:"✉️ User Messages"},
          {id:"dataexport",  label:"💾 Data Export"},
        ].map(tab => (
          <button key={tab.id} type="button"
            onClick={() => setAdminTab(tab.id)}
            style={{padding:"7px 16px",borderRadius:7,fontSize:12,fontWeight:700,
              cursor:"pointer",fontFamily:"Syne,sans-serif",display:"flex",alignItems:"center",gap:6,
              background: adminTab===tab.id ? C.accentBg : "transparent",
              color:      adminTab===tab.id ? C.accent    : C.textSec,
              border:     `1px solid ${adminTab===tab.id ? C.accentDim : C.border}`}}>
            {tab.label}
            {tab.count > 0 && (
              <span style={{background:C.red,color:"#fff",borderRadius:10,
                padding:"1px 6px",fontSize:10,fontWeight:800}}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Stat Submissions ─────────────────────────────────────────── */}
      {adminTab === "submissions" && (<>

      {/* Validation overlay */}
      {validating && createPortal(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:9999,
          display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:14,
            width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",
            boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}>
            <div style={{padding:"20px 24px 14px",borderBottom:`1px solid ${C.border}`,
              display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:C.textPri}}>⚠️ Validate Acceptance</div>
                <div style={{fontSize:11,color:C.textDim,fontFamily:"Space Mono,monospace",marginTop:3}}>
                  {validating.sub.hero_name} · Stars {validating.sub.stars} · Level {validating.sub.level} · Widget {validating.sub.widget ?? "N/A"}
                </div>
              </div>
              <button onClick={() => setValidating(null)}
                style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:18}}>✕</button>
            </div>
            <div style={{padding:"16px 24px"}}>
              <p style={{fontSize:12,color:C.amber,marginBottom:16,fontWeight:600}}>
                These values differ from what's currently stored. Review before accepting.
              </p>
              {/* Side-by-side diff table */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0,
                border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden",marginBottom:20}}>
                {/* Header */}
                <div style={{background:C.surface,padding:"8px 12px",fontSize:10,fontWeight:700,
                  color:C.textDim,fontFamily:"Space Mono,monospace",letterSpacing:"1px",textTransform:"uppercase"}}>Stat</div>
                <div style={{background:C.surface,padding:"8px 12px",fontSize:10,fontWeight:700,
                  color:C.blue,fontFamily:"Space Mono,monospace",letterSpacing:"1px",textTransform:"uppercase"}}>Current</div>
                <div style={{background:C.surface,padding:"8px 12px",fontSize:10,fontWeight:700,
                  color:C.accent,fontFamily:"Space Mono,monospace",letterSpacing:"1px",textTransform:"uppercase"}}>Submission</div>
                {/* Diff rows */}
                {validating.diffs.map((k,i) => {
                  const curVal = (validating.existing.stats||{})[k];
                  const subVal = (validating.sub.stats||{})[k];
                  const rowBg  = i % 2 === 0 ? C.card : C.surface;
                  return (
                    <React.Fragment key={k}>
                      <div style={{background:rowBg,padding:"7px 12px",fontSize:12,color:C.textSec,
                        borderTop:`1px solid ${C.border}`}}>{statLabel(k)}</div>
                      <div style={{background:rowBg,padding:"7px 12px",fontSize:12,fontWeight:700,
                        color:C.blue,fontFamily:"Space Mono,monospace",borderTop:`1px solid ${C.border}`}}>
                        {curVal ?? "—"}
                      </div>
                      <div style={{background:rowBg,padding:"7px 12px",fontSize:12,fontWeight:700,
                        color:C.accent,fontFamily:"Space Mono,monospace",borderTop:`1px solid ${C.border}`}}>
                        {subVal ?? "—"}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={handleForceAccept}
                  style={{padding:"9px 20px",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer",
                    fontFamily:"Syne,sans-serif",border:"none",background:C.green,color:"#0a0c10"}}>
                  ✓ Validate &amp; Accept
                </button>
                <button onClick={() => setValidating(null)}
                  style={{padding:"9px 16px",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer",
                    fontFamily:"Syne,sans-serif",background:"transparent",color:C.textSec,
                    border:`1px solid ${C.border}`}}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Stats modal */}
      {editingSub && createPortal(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.80)",zIndex:9999,
          display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:14,
            width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",
            boxShadow:"0 24px 80px rgba(0,0,0,0.7)"}}>
            <div style={{padding:"18px 24px 14px",borderBottom:`1px solid ${C.border}`,
              display:"flex",alignItems:"center",justifyContent:"space-between",
              position:"sticky",top:0,background:C.card,zIndex:1}}>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:C.textPri}}>
                  ✏️ Edit Stats — {editingSub.hero_name}
                </div>
                <div style={{fontSize:11,color:C.textDim,fontFamily:"Space Mono,monospace",marginTop:2}}>
                  Stars: {editingSub.stars} · Level: {editingSub.level} · Widget: {editingSub.widget ?? "N/A"}
                </div>
              </div>
              <button onClick={() => setEditingSub(null)}
                style={{background:"none",border:"none",color:C.textDim,fontSize:20,cursor:"pointer",padding:"4px 8px"}}>✕</button>
            </div>
            <div style={{padding:"18px 24px"}}>
              <div style={{fontSize:11,color:C.amber,marginBottom:14,lineHeight:1.5,
                padding:"8px 12px",background:C.amberBg,borderRadius:6,border:`1px solid ${C.amber}40`}}>
                ⚠ Values are stored as-is. % fields (Troop Atk/Def/Leth/HP) must be entered as <strong>decimals</strong> — e.g. enter <strong>0.2670</strong> for 26.70%. Power and stat fields are raw numbers.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {statKeys.map(k => {
                  const isPct = ["infAtk","infDef","infLeth","infHp","wgtTroopLeth","wgtTroopHp"].includes(k);
                  return (
                    <div key={k}>
                      <div style={{fontSize:11,color:C.textSec,marginBottom:3}}>
                        {statLabel(k)}{isPct && <span style={{fontSize:9,color:C.accent,marginLeft:4}}>(%)</span>}
                      </div>
                      <input type="number" step="any"
                        value={editVals[k] ?? ""}
                        onChange={e => setEditVals(p => ({...p,[k]:e.target.value}))}
                        style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,
                          borderRadius:5,color:C.textPri,padding:"5px 8px",fontSize:11,
                          outline:"none",fontFamily:"Space Mono,monospace",textAlign:"right",
                          boxSizing:"border-box"}} />
                    </div>
                  );
                })}
              </div>
              {editMsg && (
                <div style={{marginTop:12,fontSize:12,color: editMsg.startsWith("✓") ? C.green : C.red,
                  fontFamily:"Space Mono,monospace"}}>{editMsg}</div>
              )}
              <div style={{display:"flex",gap:8,marginTop:16}}>
                <button onClick={saveEdit} disabled={editBusy}
                  style={{padding:"8px 20px",borderRadius:7,fontSize:12,fontWeight:700,
                    cursor:editBusy?"not-allowed":"pointer",fontFamily:"Syne,sans-serif",
                    border:"none",background:C.green,color:"#0a0c10",opacity:editBusy?0.6:1}}>
                  {editBusy ? "Saving…" : "💾 Save Changes"}
                </button>
                <button onClick={() => setEditingSub(null)}
                  style={{padding:"8px 16px",borderRadius:7,fontSize:12,fontWeight:700,
                    cursor:"pointer",fontFamily:"Syne,sans-serif",
                    background:"transparent",color:C.textSec,border:`1px solid ${C.border}`}}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {loading && <div style={{color:C.textDim,fontFamily:"Space Mono,monospace",fontSize:12}}>Loading…</div>}
      {handleError && (
        <div style={{padding:"10px 14px",background:C.redBg,border:`1px solid ${C.red}40`,borderRadius:8,
          fontSize:12,color:C.red,marginBottom:16,fontFamily:"Space Mono,monospace"}}>
          ⚠ {handleError}
        </div>
      )}

      {!loading && (() => {
        const pending  = submissions.filter(s => !s.status || s.status === "pending");
        const reviewed = submissions.filter(s => s.status === "accepted" || s.status === "rejected");

        const SubCard = ({ sub, showActions }) => {
          const stats = sub.stats || {};
          const isPending = !sub.status || sub.status === "pending";
          const adminEdited = stats._admin_edited === true;
          // Filter out internal flags from display
          const displayStats = Object.fromEntries(
            Object.entries(stats).filter(([k]) => !k.startsWith("_"))
          );
          return (
            <div style={{background:C.card,
              border:"1px solid " + (isPending ? C.amber+"60" : sub.status==="accepted" ? C.green+"30" : C.red+"30"),
              borderRadius:12,padding:"18px 20px",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:12}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{fontSize:15,fontWeight:800,color:C.textPri}}>{sub.hero_name}</div>
                    {adminEdited && (
                      <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,
                        background:"rgba(56,139,253,0.15)",color:C.blue,
                        border:"1px solid " + C.blue + "40",fontFamily:"Space Mono,monospace"}}>
                        ✏️ Stats edited by admin
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:11,color:C.textDim,fontFamily:"Space Mono,monospace",marginTop:3}}>
                    Stars: {sub.stars} · Level: {sub.level} · Widget: {sub.widget ?? "N/A"}
                    {" · "}By: {sub.character_name || "Unknown"}
                    {" · "}{sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : "—"}
                  </div>
                </div>
                <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:5,
                  background: sub.status==="accepted" ? C.greenBg : sub.status==="rejected" ? C.redBg : C.amberBg,
                  color: statusColor(sub.status||"pending"),
                  border:"1px solid " + statusColor(sub.status||"pending") + "40"}}>
                  {(sub.status || "pending").toUpperCase()}
                </span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:6,marginBottom:showActions?14:0}}>
                {sub.stats?.type === "rfc_variance" ? (
                  <div style={{gridColumn:"1/-1"}}>
                    <div style={{fontSize:11,color:C.textSec,marginBottom:8,fontFamily:"Space Mono,monospace"}}>
                      RFC Variance Report — {sub.stats.variances?.length || 0} days with variance
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                      {(sub.stats.variances||[]).map((v,i) => (
                        <div key={i} style={{background:C.surface,borderRadius:6,padding:"5px 10px",fontSize:11,fontFamily:"Space Mono,monospace"}}>
                          <span style={{color:C.textDim}}>Day {v.day} {v.weekday.slice(0,3)}</span>
                          <span style={{color:C.textDim,margin:"0 4px"}}>·</span>
                          <span style={{color:C.blue}}>Est:{v.estRfc}</span>
                          <span style={{color:C.textDim,margin:"0 4px"}}>→</span>
                          <span style={{color:v.variance>0?C.green:C.red}}>Act:{v.actualRfc}</span>
                          <span style={{color:v.variance>0?C.green:C.red,marginLeft:4}}>{v.variance>0?"+":""}{v.variance}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => downloadVarianceCSV(sub)}
                      style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",
                        fontFamily:"Syne,sans-serif",border:"1px solid " + C.blue,background:C.blueBg,color:C.blue}}>
                      ⬇ Download CSV
                    </button>
                  </div>
                ) : (
                  statKeys.filter(k => displayStats[k] != null).map(k => (
                    <div key={k} style={{background: adminEdited ? "rgba(56,139,253,0.06)" : C.surface,
                      borderRadius:6,padding:"6px 10px",fontSize:11,
                      border: adminEdited ? "1px solid " + C.blue + "20" : "none"}}>
                      <span style={{color:C.textDim,fontFamily:"Space Mono,monospace"}}>{statLabel(k)}</span>
                      <span style={{color: adminEdited ? C.blue : C.textPri,fontWeight:700,
                        fontFamily:"Space Mono,monospace",float:"right"}}>{displayStats[k]}</span>
                    </div>
                  ))
                )}
              </div>
              {showActions && isPending && (
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:4}}>
                  <button onClick={() => handle(sub,"accept")} disabled={busy[sub.id]}
                    style={{padding:"6px 14px",borderRadius:6,fontSize:11,fontWeight:700,
                      cursor:busy[sub.id]?"not-allowed":"pointer",
                      fontFamily:"Syne,sans-serif",border:"none",background:C.green,color:"#0a0c10",
                      opacity:busy[sub.id]?0.6:1}}>
                    {busy[sub.id] ? "…" : "✓ Accept"}
                  </button>
                  <input placeholder="Rejection note (optional)" value={note[sub.id]||""}
                    onChange={e => { const v=e.target.value; setNote(p=>({...p,[sub.id]:v})); }}
                    onBlur={e => setNote(p=>({...p,[sub.id]:e.target.value}))}
                    style={{flex:1,minWidth:160,background:C.surface,border:"1px solid " + C.border,borderRadius:6,
                      padding:"6px 10px",color:C.textPri,fontSize:11,outline:"none",fontFamily:"Space Mono,monospace"}} />
                  <button onClick={() => handle(sub,"reject")} disabled={busy[sub.id]}
                    style={{padding:"6px 14px",borderRadius:6,fontSize:11,fontWeight:700,
                      cursor:busy[sub.id]?"not-allowed":"pointer",
                      fontFamily:"Syne,sans-serif",border:"1px solid " + C.redDim,background:C.redBg,color:C.red,
                      opacity:busy[sub.id]?0.6:1}}>
                    {busy[sub.id] ? "…" : "✕ Reject"}
                  </button>
                </div>
              )}
              {!isPending && sub.admin_note && (
                <div style={{fontSize:11,color:C.textDim,fontFamily:"Space Mono,monospace",marginTop:8,
                  padding:"6px 10px",background:C.surface,borderRadius:6}}>
                  Admin note: {sub.admin_note}
                </div>
              )}
              {showActions && sub.status === "accepted" && sub.stats?.type !== "rfc_variance" && (
                <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button onClick={async () => {
                    setBusy(p=>({...p,[sub.id]:true}));
                    await acceptSubmission(sub, true);
                    setBusy(p=>({...p,[sub.id]:false}));
                    await load();
                  }} disabled={busy[sub.id]}
                    style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:700,
                      cursor:busy[sub.id]?"not-allowed":"pointer",
                      fontFamily:"Syne,sans-serif",border:"1px solid " + C.accent,
                      background:C.accentBg,color:C.accent,
                      opacity:busy[sub.id]?0.6:1}}>
                    {busy[sub.id] ? "…" : "🔄 Re-process → hero_stats_data"}
                  </button>
                  <button onClick={() => { setEditMsg(""); openEdit(sub); }}
                    style={{padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:700,
                      cursor:"pointer",fontFamily:"Syne,sans-serif",
                      border:"1px solid " + C.blue,background:C.blueBg,color:C.blue}}>
                    ✏️ Edit Stats
                  </button>
                  {editMsg && !editingSub && (
                    <span style={{fontSize:11,color:C.red,fontFamily:"Space Mono,monospace",alignSelf:"center"}}>{editMsg}</span>
                  )}
                </div>
              )}
            </div>
          );
        };

        return (
          <>
            {/* Pending Review */}
            <div style={{marginBottom:8}}>
              <div style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",
                color:C.amber,fontFamily:"Space Mono,monospace",marginBottom:12}}>
                ⏳ Pending Review ({pending.length})
              </div>
              {pending.length === 0 ? (
                <div style={{padding:"20px",background:C.card,border:"1px solid " + C.border,borderRadius:10,
                  color:C.textDim,fontFamily:"Space Mono,monospace",fontSize:12,textAlign:"center"}}>
                  No pending submissions.
                </div>
              ) : (
                pending.map(sub => <SubCard key={sub.id} sub={sub} showActions={true} />)
              )}
            </div>

            {/* Reviewed — collapsible */}
            {reviewed.length > 0 && (
              <div style={{marginTop:24}}>
                <button onClick={() => setReviewedOpen(o => !o)}
                  style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",
                    cursor:"pointer",padding:"8px 0",marginBottom:12,width:"100%",textAlign:"left"}}>
                  <span style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",
                    color:C.textSec,fontFamily:"Space Mono,monospace"}}>
                    📁 Reviewed ({reviewed.length})
                  </span>
                  <span style={{fontSize:12,color:C.textDim,marginLeft:"auto"}}>
                    {reviewedOpen ? "▲ collapse" : "▼ expand"}
                  </span>
                </button>
                {reviewedOpen && reviewed.map(sub => <SubCard key={sub.id} sub={sub} showActions={true} />)}
              </div>
            )}
          </>
        );
      })()}

      </>)} {/* end adminTab === "submissions" */}

      {/* ── Issue Tracking ───────────────────────────────────────────── */}
      {adminTab === "issues" && (() => {
        const open   = issues.filter(i => i.status !== "closed");
        const closed = issues.filter(i => i.status === "closed");
        const statusColors = {
          submitted:    { bg: C.redBg,    color: C.red,    border: C.redDim },
          acknowledged: { bg: C.blueBg,   color: C.blue,   border: C.blueDim },
          in_progress:  { bg: C.amberBg,  color: C.amber,  border: "#7d5a0d" },
          resolved:     { bg: C.greenBg,  color: C.green,  border: C.greenDim },
          closed:       { bg: C.surface,  color: C.textDim,border: C.border },
        };
        const fmtDate = (s) => s ? new Date(s).toLocaleString() : "—";

        return (<>
          {issuesLoading ? (
            <div style={{color:C.textDim,fontSize:12,fontFamily:"'Space Mono',monospace",padding:20}}>
              Loading issues…
            </div>
          ) : open.length === 0 && closed.length === 0 ? (
            <div style={{color:C.textDim,fontSize:12,fontFamily:"'Space Mono',monospace",padding:20}}>
              No issues reported yet.
            </div>
          ) : (
            <>
              {/* Open issues */}
              {open.map(issue => {
                const st = issueStatus[issue.id] || issue.status || "submitted";
                const sc = statusColors[st] || statusColors.submitted;
                return (
                  <div key={issue.id} style={{background:C.card,border:`1px solid ${C.border}`,
                    borderRadius:10,marginBottom:12,overflow:"hidden"}}>
                    {/* Issue header */}
                    <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,
                      display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                      <span style={{fontSize:10,fontWeight:700,letterSpacing:"1px",textTransform:"uppercase",
                        color:C.textDim,fontFamily:"'Space Mono',monospace"}}>
                        {issue.issue_type}
                      </span>
                      <span style={{fontSize:11,background:C.accentBg,color:C.accent,
                        border:`1px solid ${C.accentDim}`,borderRadius:4,padding:"1px 7px",fontFamily:"'Space Mono',monospace"}}>
                        {issue.module}
                      </span>
                      <span style={{fontSize:11,color:C.textDim,fontFamily:"'Space Mono',monospace",marginLeft:"auto"}}>
                        {issue.user_name} · {fmtDate(issue.submitted_at)}
                      </span>
                    </div>
                    {/* Description */}
                    <div style={{padding:"10px 16px 8px",fontSize:13,color:C.textPri,lineHeight:1.5}}>
                      {issue.description}
                    </div>
                    {/* Status controls */}
                    <div style={{padding:"8px 16px 12px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                      <span style={{fontSize:10,color:C.textDim,fontFamily:"'Space Mono',monospace"}}>STATUS</span>
                      <select value={st}
                        onChange={e => handleIssueStatusChange(issue, e.target.value)}
                        style={{background:sc.bg,border:`1px solid ${sc.border}`,borderRadius:6,
                          color:sc.color,padding:"4px 8px",fontSize:11,fontWeight:700,
                          fontFamily:"'Space Mono',monospace",outline:"none",cursor:"pointer"}}>
                        <option value="submitted">Submitted</option>
                        <option value="acknowledged">Acknowledged</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      {st === "resolved" && (
                        <button onClick={() => handleCloseClick(issue)}
                          style={{padding:"4px 14px",borderRadius:6,fontSize:11,fontWeight:700,
                            cursor:"pointer",fontFamily:"'Space Mono',monospace",
                            background:C.greenBg,color:C.green,border:`1px solid ${C.greenDim}`}}>
                          ✓ Complete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Closed issues — collapsible */}
              {closed.length > 0 && (
                <div style={{marginTop:16}}>
                  <button onClick={() => setClosedOpen(o => !o)}
                    style={{display:"flex",alignItems:"center",gap:8,background:"none",border:"none",
                      cursor:"pointer",padding:"8px 0",marginBottom:8,width:"100%",textAlign:"left"}}>
                    <span style={{fontSize:10,fontWeight:700,letterSpacing:"1.5px",textTransform:"uppercase",
                      color:C.textSec,fontFamily:"Space Mono,monospace"}}>
                      📁 Closed Tickets ({closed.length})
                    </span>
                    <span style={{fontSize:12,color:C.textDim,marginLeft:"auto"}}>
                      {closedOpen ? "▲ collapse" : "▼ expand"}
                    </span>
                  </button>
                  {closedOpen && closed.map(issue => (
                    <div key={issue.id} style={{background:C.surface,border:`1px solid ${C.border}`,
                      borderRadius:8,marginBottom:8,padding:"10px 14px",opacity:0.75}}>
                      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                        <span style={{fontSize:10,color:C.textDim,fontFamily:"'Space Mono',monospace",fontWeight:700}}>
                          {issue.issue_type}
                        </span>
                        <span style={{fontSize:10,color:C.accent,fontFamily:"'Space Mono',monospace"}}>
                          {issue.module}
                        </span>
                        <span style={{fontSize:10,color:C.textDim,fontFamily:"'Space Mono',monospace",marginLeft:"auto"}}>
                          {issue.user_name} · {fmtDate(issue.submitted_at)}
                        </span>
                      </div>
                      <div style={{fontSize:12,color:C.textSec,marginBottom:4}}>{issue.description}</div>
                      {issue.admin_note && (
                        <div style={{fontSize:11,color:C.green,fontFamily:"'Space Mono',monospace",
                          background:C.greenBg,border:`1px solid ${C.greenDim}`,
                          borderRadius:5,padding:"4px 8px",marginTop:4}}>
                          Admin note: {issue.admin_note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Close ticket — notes overlay */}
          {closeTarget && !confirmClose && createPortal(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:9999,
              display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
              <div style={{background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:12,
                width:"100%",maxWidth:460,boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}}>
                <div style={{padding:"16px 20px 12px",borderBottom:`1px solid ${C.border}`,
                  display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:14,fontWeight:800,color:C.textPri}}>Close Ticket</div>
                  <button onClick={() => setCloseTarget(null)}
                    style={{background:"none",border:"none",color:C.textDim,cursor:"pointer",fontSize:18}}>✕</button>
                </div>
                <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
                  <label style={{fontSize:11,fontWeight:700,color:C.textDim,
                    letterSpacing:"1px",textTransform:"uppercase",fontFamily:"'Space Mono',monospace"}}>
                    Admin Notes
                  </label>
                  <textarea value={closeNote} onChange={e=>setCloseNote(e.target.value)}
                    rows={4} placeholder="Add a comment about the resolution..."
                    style={{width:"100%",boxSizing:"border-box",background:C.surface,
                      border:`1px solid ${C.border}`,borderRadius:7,color:C.textPri,
                      padding:"8px 10px",fontSize:12,fontFamily:"inherit",
                      resize:"vertical",outline:"none"}} />
                  <button onClick={() => setConfirmClose(true)}
                    style={{padding:"9px",borderRadius:7,fontWeight:700,fontSize:13,
                      cursor:"pointer",fontFamily:"'Space Mono',monospace",
                      background:C.greenBg,color:C.green,border:`1px solid ${C.greenDim}`}}>
                    Okay
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Confirm close overlay */}
          {closeTarget && confirmClose && createPortal(
            <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:9999,
              display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
              <div style={{background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:12,
                width:"100%",maxWidth:380,boxShadow:"0 24px 80px rgba(0,0,0,0.6)",padding:"24px 24px"}}>
                <div style={{fontSize:15,fontWeight:800,color:C.textPri,marginBottom:10}}>
                  Close this ticket?
                </div>
                <div style={{fontSize:12,color:C.textSec,marginBottom:20,lineHeight:1.6}}>
                  Are you sure you want to close this ticket? The user will be notified with your note.
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={handleCloseConfirm}
                    style={{flex:1,padding:"9px",borderRadius:7,fontWeight:700,fontSize:13,
                      cursor:"pointer",fontFamily:"'Space Mono',monospace",
                      background:C.greenBg,color:C.green,border:`1px solid ${C.greenDim}`}}>
                    Yes, Close It
                  </button>
                  <button onClick={() => { setConfirmClose(false); }}
                    style={{flex:1,padding:"9px",borderRadius:7,fontWeight:700,fontSize:13,
                      cursor:"pointer",fontFamily:"'Space Mono',monospace",
                      background:"transparent",color:C.textSec,border:`1px solid ${C.border}`}}>
                    No, Go Back
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </>);
      })()}


      {/* ── User Messages Tab ── */}
      {adminTab === "messages" && (
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:C.textPri}}>User Messages</div>
            <button onClick={loadAdminMessages}
              style={{padding:"5px 12px",borderRadius:6,fontSize:11,background:C.surface,
                border:`1px solid ${C.border}`,color:C.textSec,cursor:"pointer"}}>🔄 Refresh</button>
          </div>
          {msgLoading ? (
            <div style={{color:C.textDim,fontSize:12,fontFamily:"'Space Mono',monospace"}}>Loading…</div>
          ) : (() => {
            const threads = {};
            adminMessages.forEach(m => {
              if (!threads[m.thread_id]) threads[m.thread_id] = {
                thread_id:m.thread_id, category:m.category,
                wants_response:m.wants_response, thread_closed:m.thread_closed, messages:[],
              };
              threads[m.thread_id].messages.push(m);
            });
            const threadList = Object.values(threads).sort((a,b) =>
              new Date(b.messages[b.messages.length-1]?.created_at) -
              new Date(a.messages[a.messages.length-1]?.created_at));
            const fmtD = ts => ts ? new Date(ts).toLocaleDateString("en-US",
              {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "";
            if (!threadList.length) return (
              <div style={{color:C.textDim,fontSize:12,fontFamily:"'Space Mono',monospace",
                padding:"20px 0",textAlign:"center"}}>No messages yet.</div>
            );
            return threadList.map(thread => {
              const hasUnread = thread.messages.some(m => !m.read_by_admin && m.sender==="user");
              return (
                <div key={thread.thread_id}
                  style={{marginBottom:12,border:`1px solid ${hasUnread?C.accentDim:C.border}`,
                    borderRadius:10,overflow:"hidden",background:hasUnread?C.accentBg+"30":"transparent"}}>
                  <div style={{padding:"10px 14px",background:C.surface,display:"flex",
                    alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {hasUnread && <div style={{width:8,height:8,borderRadius:"50%",background:C.red}}/>}
                      <div>
                        <span style={{fontSize:12,fontWeight:700,color:C.textPri}}>{thread.messages[0]?.category}</span>
                        <span style={{fontSize:11,color:C.textDim,fontFamily:"'Space Mono',monospace",marginLeft:8}}>
                          — {thread.messages[0]?.user_name||"Guest"}
                          {thread.messages[0]?.contact_info && (
                            <span style={{color:C.amber}}> · {thread.messages[0].contact_type==="discord"?"Discord":"Email"}: {thread.messages[0].contact_info}</span>
                          )}
                        </span>
                      </div>
                      {thread.thread_closed && (
                        <span style={{fontSize:9,fontWeight:700,color:C.textDim,
                          fontFamily:"'Space Mono',monospace",background:C.surface,
                          border:`1px solid ${C.border}`,padding:"1px 5px",borderRadius:3}}>CLOSED</span>
                      )}
                    </div>
                    {hasUnread && (
                      <button onClick={async()=>{
                          await supabase.from("user_messages").update({read_by_admin:true})
                            .eq("thread_id",thread.thread_id).eq("sender","user");
                          loadAdminMessages();
                        }}
                        style={{fontSize:10,color:C.textDim,background:"none",border:"none",
                          cursor:"pointer",fontFamily:"'Space Mono',monospace",textDecoration:"underline"}}>
                        Mark read
                      </button>
                    )}
                  </div>
                  <div style={{padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
                    {thread.messages.map((m,i) => {
                      const isAdm = m.sender==="admin";
                      return (
                        <div key={i} style={{display:"flex",justifyContent:isAdm?"flex-end":"flex-start"}}>
                          <div style={{maxWidth:"80%",padding:"8px 12px",borderRadius:10,
                            background:isAdm?C.accentBg:C.surface,
                            border:`1px solid ${isAdm?C.accentDim:C.border}`}}>
                            <div style={{fontSize:12,color:isAdm?C.accent:C.textPri,lineHeight:1.6}}>{m.message}</div>
                            <div style={{fontSize:10,color:C.textDim,marginTop:4,
                              fontFamily:"'Space Mono',monospace",textAlign:isAdm?"right":"left"}}>
                              {fmtD(m.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {!thread.thread_closed && (
                      <div style={{marginTop:8,display:"flex",gap:8}}>
                        <input value={msgReplyText[thread.thread_id]||""}
                          onChange={e=>setMsgReplyText(p=>({...p,[thread.thread_id]:e.target.value}))}
                          onKeyDown={async e=>{
                            if(e.key==="Enter"&&!e.shiftKey){
                              e.preventDefault();
                              const txt=msgReplyText[thread.thread_id]?.trim();
                              if(!txt)return;
                              await supabase.from("user_messages").insert({
                                thread_id:thread.thread_id,user_id:thread.messages[0]?.user_id||null,
                                user_name:"Tundra Commander",category:thread.category,sender:"admin",
                                message:txt,wants_response:true,read_by_admin:true,read_by_user:false,thread_closed:false,
                              });
                              setMsgReplyText(p=>({...p,[thread.thread_id]:""}));
                              loadAdminMessages();
                            }
                          }}
                          placeholder="Reply… (Enter to send)"
                          style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:7,
                            color:C.textPri,padding:"7px 10px",fontSize:12,
                            fontFamily:"'Space Mono',monospace",outline:"none"}}/>
                        <button onClick={async()=>{
                            const txt=msgReplyText[thread.thread_id]?.trim();
                            if(!txt)return;
                            await supabase.from("user_messages").insert({
                              thread_id:thread.thread_id,user_id:thread.messages[0]?.user_id||null,
                              user_name:"Tundra Commander",category:thread.category,sender:"admin",
                              message:txt,wants_response:true,read_by_admin:true,read_by_user:false,thread_closed:false,
                            });
                            setMsgReplyText(p=>({...p,[thread.thread_id]:""}));
                            loadAdminMessages();
                          }}
                          style={{padding:"7px 14px",borderRadius:7,fontSize:11,fontWeight:700,
                            cursor:"pointer",border:"none",background:C.accent,color:C.bg}}>
                          Send
                        </button>
                      </div>
                    )}
                    {!thread.thread_closed && (
                      <div style={{textAlign:"right",marginTop:4}}>
                        <button onClick={async()=>{
                            await supabase.from("user_messages").update({thread_closed:true})
                              .eq("thread_id",thread.thread_id);
                            loadAdminMessages();
                          }}
                          style={{fontSize:10,color:C.textDim,background:"none",border:"none",
                            cursor:"pointer",fontFamily:"'Space Mono',monospace",textDecoration:"underline"}}>
                          End conversation
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* ── Data Export Tab ── */}
      {adminTab === "dataexport" && (
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:700,color:C.textPri}}>Character Data Export / Restore</div>
            <button onClick={loadExportUsers}
              style={{padding:"5px 12px",borderRadius:6,fontSize:11,background:C.surface,
                border:`1px solid ${C.border}`,color:C.textSec,cursor:"pointer"}}>
              🔄 Refresh
            </button>
          </div>
          {exportLoading ? (
            <div style={{color:C.textDim,fontSize:12,fontFamily:"'Space Mono',monospace"}}>Loading users…</div>
          ) : exportUsers.map(u => (
            <div key={u.user_id} style={{marginBottom:20,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
              <div style={{padding:"10px 16px",background:C.surface,borderBottom:`1px solid ${C.border}`,
                fontSize:12,fontWeight:700,color:C.textDim,fontFamily:"'Space Mono',monospace"}}>
                👤 {u.display_name} <span style={{fontSize:10,color:C.textDim,fontWeight:400}}>({u.user_id.slice(0,8)}…)</span>
              </div>
              {u.characters.map(char => (
                <div key={char.id} style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}40`,
                  display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  <div>
                    <span style={{fontSize:13,fontWeight:700,color:C.textPri}}>
                      {char.alliance?`[${char.alliance}] `:""}{char.name}
                    </span>
                    {char.is_default && (
                      <span style={{marginLeft:8,fontSize:9,fontWeight:700,background:C.accentBg,
                        color:C.accent,border:`1px solid ${C.accentDim}`,padding:"1px 5px",borderRadius:3}}>DEFAULT</span>
                    )}
                    {char.state_number && (
                      <span style={{marginLeft:8,fontSize:11,color:C.textDim}}>State {char.state_number}</span>
                    )}
                    <div style={{fontSize:10,color:C.textDim,fontFamily:"'Space Mono',monospace",marginTop:2}}>
                      {char.id.slice(0,16)}…
                    </div>
                    {importMsg[char.id] && (
                      <div style={{fontSize:11,marginTop:4,
                        color:importMsg[char.id].startsWith("✅")?C.green:C.red,
                        fontFamily:"'Space Mono',monospace"}}>{importMsg[char.id]}</div>
                    )}
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <button disabled={exportBusy[char.id]} onClick={()=>exportCharacter(char,u.display_name)}
                      style={{padding:"6px 14px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",
                        background:C.blueBg,color:C.blue,border:`1px solid ${C.blueDim}`,
                        opacity:exportBusy[char.id]?0.5:1}}>
                      {exportBusy[char.id]?"Exporting…":"⬇ Export"}
                    </button>
                    <label style={{padding:"6px 14px",borderRadius:6,fontSize:11,fontWeight:700,
                      cursor:importBusy[char.id]?"not-allowed":"pointer",
                      background:C.amberBg,color:C.amber,border:`1px solid ${C.amberDim}`,
                      opacity:importBusy[char.id]?0.5:1,userSelect:"none"}}>
                      {importBusy[char.id]?"Restoring…":"⬆ Restore"}
                      <input type="file" accept=".json" style={{display:"none"}}
                        disabled={importBusy[char.id]}
                        onChange={e=>{
                          const file=e.target.files?.[0];
                          if(file) importCharacter(char,file);
                          e.target.value="";
                        }}/>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────────
export { AdminPage, ReportIssueModal, submitIssue, sendMessage,
         fetchUserThreads, markMessagesReadByUser, closeThread };

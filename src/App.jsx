import { useState, useEffect } from "react";
import { Calendar, Home, Bell, User, Plus, Check, X, RefreshCw, Send, LogOut, ChevronLeft, ChevronDown, ChevronUp, Trash2, Copy, Shield, AlertCircle, Edit3, Hand, ArrowLeftRight, Share2, BarChart3, MapPin, Clock, Star } from "lucide-react";
import { supabase } from "./supabaseClient";

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap');
    :root{--brand:#24569F;--brand-dark:#1B4480;--gold:#C99A2E;--paper:#FBFAF8;}
    html,body{margin:0;padding:0;}
    .vh-fix{min-height:100vh;min-height:100dvh;}
    .safe-bottom{padding-bottom:env(safe-area-inset-bottom);}
    .app-font{font-family:'Schibsted Grotesk',-apple-system,'Segoe UI',sans-serif;}
    .font-display{font-family:'Fraunces',Georgia,serif;letter-spacing:-0.01em;}
    .btn-brand{background:var(--brand);color:#fff;transition:background .15s,transform .1s;}
    .btn-brand:hover{background:var(--brand-dark);}
    .btn-brand:active{transform:scale(.98);}
    .text-brand{color:var(--brand);}
    .tint-brand{background:#E8EEF9;color:#1B4480;}
    .bg-paper{background:var(--paper);}
    .serving-card{border-left:3px solid var(--gold) !important;background:linear-gradient(135deg,#FFFDF4,#F6FAFF);}
    .gold{color:var(--gold);}
    .card-press{transition:transform .12s ease, box-shadow .12s ease;}
    .card-press:active{transform:scale(.985);}
    .soft-shadow{box-shadow:0 1px 3px rgba(20,30,60,.07),0 5px 16px rgba(20,30,60,.05);}
    .nav-blur{backdrop-filter:blur(12px);background:rgba(255,255,255,.93);}
    .fade-in{animation:fadeIn .25s ease;}
    @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
    @media (prefers-reduced-motion:reduce){*{animation:none !important;transition:none !important}}
    input,select,textarea,button{font-family:inherit;}
  `}</style>
);
const EMPTY = { users: {}, services: {}, notifs: {} };
const load = async () => {
  const { data, error } = await supabase.from("app_state").select("data").eq("id", 1).maybeSingle();
  if (error) { console.error("load failed", error); return null; }
  return data ? data.data : EMPTY;
};
const save = async (d) => {
  const { error } = await supabase.from("app_state").upsert({ id: 1, data: d, updated_at: new Date().toISOString() });
  if (error) console.error("save failed", error);
};

const nextSundays = (n = 12) => {
  const out = []; const d = new Date(); d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  for (let i = 0; i < n; i++) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 7); }
  return out;
};
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmt = (s) => new Date(s + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtFull = (s) => new Date(s + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
const uid = () => Math.random().toString(36).slice(2, 9);
const code6 = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const initials = (name) => (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
const copyText = (text, flash, okMsg) => {
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    if (ok) { flash(okMsg); return; }
  } catch (e) { /* fall through */ }
  try { navigator.clipboard.writeText(text).then(() => flash(okMsg), () => flash("Couldn't copy automatically", "error")); }
  catch (e) { flash("Couldn't copy automatically", "error"); }
};
const prevWeek = (date) => { const d = new Date(date + "T12:00:00"); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); };

const dateFor = (svc, key) => key.startsWith("evt-") ? (svc.events || []).find(e => "evt-" + e.id === key)?.date : key;
const labelFor = (svc, key) => {
  if (!key.startsWith("evt-")) return fmt(key);
  const e = (svc.events || []).find(e => "evt-" + e.id === key);
  return e ? `${fmt(e.date)} (${e.name})` : key;
};

const Badge = ({ color, children }) => {
  const map = {
    green: "bg-green-100 text-green-800", amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800", blue: "tint-brand",
    gray: "bg-gray-100 text-gray-600", purple: "bg-purple-100 text-purple-800",
  };
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-md font-medium ${map[color] || map.gray}`}>{children}</span>;
};

const Avatar = ({ name, px = 36 }) => (
  <div className="rounded-full tint-brand flex items-center justify-center text-xs font-semibold shrink-0"
    style={{ width: px, height: px }}>{initials(name)}</div>
);

const NavBtn = ({ icon: Icon, label, page, badge, view, setView }) => (
  <button onClick={() => setView({ page, tab: "schedule" })}
    className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs relative ${view.page === page ? "text-brand" : "text-gray-400"}`}>
    <Icon size={20} />
    {label}
    {badge > 0 && <span className="absolute top-1 right-1/4 bg-red-500 text-white text-xs rounded-full min-w-4 h-4 px-1 flex items-center justify-center">{badge}</span>}
  </button>
);

const ConfirmModal = ({ confirm, setConfirm }) => {
  const [val, setVal] = useState("");
  if (!confirm) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl">
        <div className="flex items-start gap-2 mb-3">
          <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-800">{confirm.text}</p>
        </div>
        {confirm.withInput && (
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder={confirm.withInput} value={val} onChange={e => setVal(e.target.value)} autoFocus />
        )}
        <div className="flex gap-2">
          <button onClick={() => { const f = confirm.onYes; setConfirm(null); f(val.trim()); }}
            className={`flex-1 text-white text-sm rounded-lg py-2 font-medium ${confirm.danger ? "bg-red-600 hover:bg-red-700" : "btn-brand"}`}>
            {confirm.yesLabel || "Yes, continue"}
          </button>
          <button onClick={() => setConfirm(null)}
            className="flex-1 border border-gray-300 text-gray-700 text-sm rounded-lg py-2">Cancel</button>
        </div>
      </div>
    </div>
  );
};

const ShareModal = ({ share, setShare, flash }) => {
  if (!share) return null;
  const doCopy = () => {
    const ta = document.getElementById("share-textarea");
    try {
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, 999999);
      if (document.execCommand("copy")) { flash("Copied! Paste it in WhatsApp or anywhere."); return; }
    } catch (e) { /* fall through */ }
    try {
      navigator.clipboard.writeText(share.text).then(
        () => flash("Copied! Paste it in WhatsApp or anywhere."),
        () => flash("Couldn't auto-copy. The text is selected, press and hold it to copy manually.", "error")
      );
    } catch (e) {
      flash("Couldn't auto-copy. The text is selected, press and hold it to copy manually.", "error");
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-xl">
        <p className="text-sm font-medium text-gray-900 mb-2">{share.title}</p>
        <textarea readOnly id="share-textarea" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono mb-3"
          style={{ height: 220 }} value={share.text} onFocus={e => e.target.select()} />
        <div className="flex gap-2">
          <button onClick={doCopy}
            className="flex-1 btn-brand text-white text-sm rounded-lg py-2 font-medium flex items-center justify-center gap-1"><Copy size={14} />Copy</button>
          <button onClick={() => setShare(null)} className="flex-1 border border-gray-300 text-gray-700 text-sm rounded-lg py-2">Close</button>
        </div>
      </div>
    </div>
  );
};

const Shell = ({ title, back, right, children, msg, unread, view, setView, refresh, confirm, setConfirm, share, setShare, flash }) => (
  <div className="vh-fix bg-paper app-font">
    <GlobalStyle />
    <div className="max-w-md mx-auto vh-fix bg-white flex flex-col soft-shadow">
      <div className="sticky top-0 nav-blur border-b border-gray-100 px-4 py-3.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          {back && <button onClick={back} className="text-gray-500 hover:text-gray-800 -ml-1 p-1"><ChevronLeft size={20} /></button>}
          <h1 className="text-lg font-display font-semibold text-gray-900">{title}{title === "ServicePlanner" && <span className="gold">.</span>}</h1>
        </div>
        <div className="flex items-center gap-3">
          {right}
          <button onClick={refresh} className="text-gray-400 hover:text-gray-700 p-1" title="Refresh"><RefreshCw size={16} /></button>
        </div>
      </div>
      {msg && <div className={`mx-4 mt-3 text-sm px-3 py-2 rounded-xl flex items-center gap-2 fade-in ${msg.kind === "error" ? "bg-red-50 text-red-700" : "bg-blue-50 text-brand"}`}><AlertCircle size={15} className="shrink-0" />{msg.text}</div>}
      <div className="flex-1 p-4 pb-24 fade-in">{children}</div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md nav-blur border-t border-gray-100 flex z-20 safe-bottom">
        <NavBtn icon={Home} label="Home" page="home" view={view} setView={setView} />
        <NavBtn icon={Plus} label="New" page="create" view={view} setView={setView} />
        <NavBtn icon={Bell} label="Alerts" page="alerts" badge={unread} view={view} setView={setView} />
        <NavBtn icon={User} label="Profile" page="profile" view={view} setView={setView} />
      </div>
      <ConfirmModal key={confirm?.id || "none"} confirm={confirm} setConfirm={setConfirm} />
      <ShareModal share={share} setShare={setShare} flash={flash} />
    </div>
  </div>
);

export default function App() {
  const [data, setData] = useState(null);
  const [me, setMe] = useState(null);
  const [view, setView] = useState({ page: "home", tab: "schedule" });
  const [authMode, setAuthMode] = useState("signin");
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [share, setShare] = useState(null);
  const [expanded, setExpanded] = useState({});
  const sundays = nextSundays(12);

  const [sessionUser, setSessionUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user || null);
      setMe(session?.user?.email?.toLowerCase() || null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user || null);
      setMe(session?.user?.email?.toLowerCase() || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (me) load().then(d => setData(d || EMPTY)); }, [me]);

  // Realtime: when anyone saves, everyone's app updates
  useEffect(() => {
    if (!me) return;
    const channel = supabase
      .channel("app_state_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_state" },
        (payload) => { if (payload.new && payload.new.data) setData(payload.new.data); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [me]);

  // Make sure the signed-in user exists in the shared document
  useEffect(() => {
    if (me && data && !data.users[me]) {
      const displayName = sessionUser?.user_metadata?.name || me.split("@")[0];
      update(d => { d.users[me] = { name: displayName, email: me }; });
    }
  }, [me, data]);

  const flash = (text, kind = "info") => { setMsg({ text, kind }); setTimeout(() => setMsg(null), 4000); };
  const ask = (c) => setConfirm({ ...c, id: uid() });
  const update = (fn) => setData(prev => { const next = JSON.parse(JSON.stringify(prev)); fn(next); save(next); return next; });
  const refresh = () => load().then(d => { if (d) setData(d); flash("Refreshed"); });
  const pushNotif = (d, email, text) => { (d.notifs[email] = d.notifs[email] || []).unshift({ id: uid(), text, time: Date.now(), read: false }); };
  const nameOf = (email) => data?.users?.[email]?.name || email;
  const notifyAdmins = (d, svc, text, except) => Object.entries(svc.members).forEach(([em, m]) => { if (m.admin && em !== except) pushNotif(d, em, text); });

  const slotsOf = (svc) => {
    const t = todayStr();
    const ss = sundays.map(d => ({ key: d, date: d, name: null }));
    (svc.events || []).forEach(e => { if (e.date >= t) ss.push({ key: "evt-" + e.id, date: e.date, name: e.name }); });
    return ss.sort((a, b) => a.date.localeCompare(b.date));
  };
  const conflictOf = (db, email, date, exceptId) => {
    for (const sv of Object.values(db.services)) {
      if (sv.id === exceptId || !sv.members[email]) continue;
      for (const [k, day] of Object.entries(sv.assignments)) {
        if (dateFor(sv, k) !== date) continue;
        for (const [role, a] of Object.entries(day)) if (a.email === email) return { svc: sv.name, role };
      }
    }
    return null;
  };
  const servesOn = (svc, em, date) => date && Object.entries(svc.assignments).some(([k, day]) =>
    dateFor(svc, k) === date && Object.values(day).some(a => a.email === em));
  const countAll = (svc, em) => {
    const t = todayStr();
    return Object.entries(svc.assignments).reduce((n, [k, day]) => {
      const date = dateFor(svc, k);
      if (!date || date > t) return n;
      return n + Object.values(day).filter(a => a.email === em && a.status === "confirmed").length;
    }, 0);
  };

  /* ---------- AUTH ---------- */
  if (!me) {
    const submit = async () => {
      const email = (form.email || "").trim().toLowerCase();
      const pass = form.pass || "";
      if (!email || !pass) return flash("Enter your email and password", "error");
      if (authMode === "signup") {
        if (!form.name?.trim()) return flash("Enter your name", "error");
        if (pass.length < 6) return flash("Password must be at least 6 characters", "error");
        const { error } = await supabase.auth.signUp({
          email, password: pass,
          options: { data: { name: form.name.trim() } },
        });
        if (error) return flash(error.message, "error");
        flash("Account created! Signing you in…");
        setForm({});
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) return flash("Wrong email or password", "error");
        setForm({});
      }
    };
    return (
      <div className="vh-fix bg-paper app-font flex items-center justify-center p-4">
        <GlobalStyle />
        <div className="w-full max-w-sm bg-white rounded-2xl soft-shadow border border-gray-100 p-8 fade-in">
          <h1 className="text-3xl font-display font-semibold text-gray-900">ServicePlanner<span className="gold">.</span></h1>
          <p className="text-sm text-gray-500 mb-7 mt-1">Who's serving this Sunday, sorted.</p>
          {msg && <div className={`text-sm mb-4 px-3 py-2 rounded-lg ${msg.kind === "error" ? "bg-red-50 text-red-700" : "bg-blue-50 text-brand"}`}>{msg.text}</div>}
          {authMode === "signup" && (
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Full name" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
          )}
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Email address" value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} />
          <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Password" value={form.pass || ""} onChange={e => setForm({ ...form, pass: e.target.value })}
            onKeyDown={e => e.key === "Enter" && submit()} />
          <button onClick={submit} className="w-full btn-brand text-white rounded-xl py-3 text-sm font-semibold mb-3">
            {authMode === "signup" ? "Create account" : "Sign in"}
          </button>
          <button onClick={() => { setAuthMode(authMode === "signup" ? "signin" : "signup"); setMsg(null); }}
            className="w-full text-sm text-gray-500 py-2 hover:text-gray-700">
            {authMode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
          </button>
        </div>
      </div>
    );
  }

  if (!data) return <div className="vh-fix bg-paper app-font flex items-center justify-center text-gray-400"><GlobalStyle />Loading…</div>;

  /* ---------- DERIVED + SHELL PROPS ---------- */
  const myServices = Object.values(data.services).filter(s => s.members[me]);
  const myInvites = Object.values(data.services).filter(s => s.invites?.[me] && !s.members[me]);
  const myNotifs = data.notifs[me] || [];
  const unread = myNotifs.filter(n => !n.read).length;
  const shellProps = { msg, unread, view, setView, refresh, confirm, setConfirm, share, setShare, flash };

  /* ---------- ACTIONS ---------- */
  const createService = () => {
    const name = (form.svcName || "").trim();
    if (!name) return flash("Give your service a name", "error");
    const id = uid();
    update(d => {
      d.services[id] = {
        id, name, createdBy: me, joinCode: code6(),
        roles: [], members: { [me]: { roles: [], admin: true } },
        invites: {}, unavailable: {}, blockouts: {}, assignments: {}, tasks: [], notes: {}, details: {}, events: [], swaps: [], rules: {},
      };
    });
    setForm({ ...form, svcName: "" });
    setView({ page: "service", svcId: id, tab: "admin" });
    flash(`"${name}" created! You're the admin. Add roles to get started.`);
  };

  const joinByCode = () => {
    const code = (form.joinCode || "").trim().toUpperCase();
    if (!code) return;
    const svc = Object.values(data.services).find(s => s.joinCode === code);
    if (!svc) return flash("No service found with that code", "error");
    if (svc.members[me]) return flash("You're already in that service");
    update(d => {
      d.services[svc.id].members[me] = { roles: [], admin: false };
      delete d.services[svc.id].invites[me];
      notifyAdmins(d, d.services[svc.id], `${nameOf(me)} joined ${svc.name} using the join code.`, me);
    });
    setForm({ ...form, joinCode: "" });
    flash(`You joined ${svc.name}!`);
  };

  const respondInvite = (svcId, accept) => {
    const svc = data.services[svcId];
    update(d => {
      delete d.services[svcId].invites[me];
      if (accept) d.services[svcId].members[me] = { roles: [], admin: false };
      notifyAdmins(d, d.services[svcId], `${nameOf(me)} ${accept ? "accepted" : "declined"} the invite to ${svc.name}.`, me);
    });
    flash(accept ? `You joined ${svc.name}!` : "Invite declined");
  };

  const doLeave = (svcId) => {
    const s = data.services[svcId];
    update(d => {
      delete d.services[svcId].members[me];
      Object.keys(d.services[svcId].assignments).forEach(k => {
        Object.entries(d.services[svcId].assignments[k]).forEach(([role, a]) => {
          if (a.email === me) delete d.services[svcId].assignments[k][role];
        });
      });
      d.services[svcId].swaps = (d.services[svcId].swaps || []).filter(sw => sw.from !== me && sw.to !== me);
      if (Object.keys(d.services[svcId].members).length === 0) delete d.services[svcId];
      else notifyAdmins(d, d.services[svcId], `${nameOf(me)} left ${s.name}.`, me);
    });
    setView({ page: "home" });
    flash(`You left ${s.name}`);
  };

  const leaveService = (svcId) => {
    const s = data.services[svcId];
    const admins = Object.entries(s.members).filter(([, m]) => m.admin).map(([e]) => e);
    const others = Object.keys(s.members).filter(e => e !== me);
    if (s.members[me].admin && admins.length === 1 && others.length > 0)
      return flash("You're the only admin. Make someone else admin in the Team tab before leaving.", "error");
    if (others.length === 0)
      return ask({
        text: `You're the last member of "${s.name}". Leaving will permanently delete this service and all its schedule data. Delete it?`,
        danger: true, yesLabel: "Delete service",
        onYes: () => doLeave(svcId),
      });
    doLeave(svcId);
  };

  const confirmAssign = (svcId, key, role, yes) => {
    const s = data.services[svcId];
    update(d => {
      const sv = d.services[svcId];
      if (yes) {
        sv.assignments[key][role].status = "confirmed";
        notifyAdmins(d, sv, `${nameOf(me)} confirmed ${role} on ${labelFor(sv, key)} (${s.name}).`, me);
      } else {
        delete sv.assignments[key][role];
        notifyAdmins(d, sv, `${nameOf(me)} declined ${role} on ${labelFor(sv, key)} (${s.name}). The role is now open.`, me);
      }
    });
    flash(yes ? "Confirmed, see you there!" : "Declined. The admins have been notified. You're still available for other roles that day.");
  };

  const cancelMyRole = (svcId, key, role) => {
    const s = data.services[svcId];
    ask({
      text: `Cancel your confirmed role (${role} on ${labelFor(s, key)})? The admins will be alerted and the role becomes open again.`,
      withInput: "Reason (optional)", yesLabel: "Cancel my role", danger: true,
      onYes: (reason) => {
        update(d => {
          const sv = d.services[svcId];
          delete sv.assignments[key][role];
          sv.swaps = (sv.swaps || []).filter(sw => !(sw.from === me && sw.key === key && sw.role === role));
          notifyAdmins(d, sv, `${nameOf(me)} cancelled their confirmed role: ${role} on ${labelFor(sv, key)}${reason ? ` (${reason})` : ""} (${sv.name}). The role is now open.`, me);
        });
        flash("Role cancelled. The admins have been notified.");
      },
    });
  };

  const toggleUnavailable = (svcId, key) => {
    const s = data.services[svcId];
    const off = (s.unavailable[me] || []).includes(key);
    const mines = Object.entries(s.assignments[key] || {}).filter(([, a]) => a.email === me);
    const doToggle = (cancelRoles, reason) => update(d => {
      const sv = d.services[svcId];
      const u = sv.unavailable[me] = sv.unavailable[me] || [];
      const i = u.indexOf(key);
      if (i >= 0) { u.splice(i, 1); if (sv.blockouts?.[me]) delete sv.blockouts[me][key]; }
      else {
        u.push(key);
        if (reason) { sv.blockouts = sv.blockouts || {}; sv.blockouts[me] = sv.blockouts[me] || {}; sv.blockouts[me][key] = reason; }
      }
      if (cancelRoles && cancelRoles.length) {
        cancelRoles.forEach(role => { delete sv.assignments[key][role]; });
        const roleList = cancelRoles.join(", ");
        notifyAdmins(d, sv, `${nameOf(me)} marked ${labelFor(sv, key)} unavailable${reason ? ` (${reason})` : ""} and can't make it. ${roleList} ${cancelRoles.length > 1 ? "are" : "is"} now open (${s.name}).`, me);
      }
    });
    if (off) return doToggle(null, null);
    if (mines.length) {
      const roleList = mines.map(([r]) => r).join(", ");
      ask({
        text: `You're assigned to ${roleList} on ${labelFor(s, key)}. Marking yourself unavailable will cancel ${mines.length > 1 ? "those assignments" : "that assignment"} and alert the admins that you can't make it. Continue?`,
        withInput: "Reason (optional, e.g. traveling)", yesLabel: "Mark unavailable", danger: true,
        onYes: (reason) => { doToggle(mines.map(([r]) => r), reason); flash("Assignments cancelled and admins notified."); },
      });
    } else {
      ask({
        text: `Mark ${labelFor(s, key)} as unavailable? Auto-assign will skip you that day.`,
        withInput: "Reason (optional, e.g. traveling)", yesLabel: "Mark unavailable",
        onYes: (reason) => doToggle(null, reason),
      });
    }
  };

  const doAssign = (svcId, key, role, email, displaced) => update(d => {
    const sv = d.services[svcId];
    const asg = sv.assignments[key] = sv.assignments[key] || {};
    if (displaced) pushNotif(d, displaced, `Heads up: your confirmed role (${role} on ${labelFor(sv, key)}, ${sv.name}) was changed by an admin. You're no longer scheduled for it.`);
    if (!email) { delete asg[role]; return; }
    asg[role] = { email, status: "pending" };
    pushNotif(d, email, `You've been assigned: ${role} on ${labelFor(sv, key)} for ${sv.name}. Open the app to confirm.`);
  });

  const manualAssign = (svcId, key, role, email) => {
    const s = data.services[svcId];
    const cur = s.assignments[key]?.[role];
    const warnings = [];
    if (cur && cur.status === "confirmed" && cur.email !== email)
      warnings.push(`${nameOf(cur.email)} already confirmed ${role} on ${labelFor(s, key)}. Changing this removes it from their schedule and they'll get an alert.`);
    if (email) {
      const c = conflictOf(data, email, dateFor(s, key), svcId);
      if (c) warnings.push(`${nameOf(email)} is already serving as ${c.role} in "${c.svc}" that same day.`);
    }
    if (warnings.length) {
      ask({ text: warnings.join(" Also: ") + " Continue?", onYes: () => doAssign(svcId, key, role, email, cur?.status === "confirmed" ? cur.email : null) });
    } else doAssign(svcId, key, role, email, null);
  };

  const claimRole = (svcId, key, role) => {
    const s = data.services[svcId];
    update(d => {
      const sv = d.services[svcId];
      const asg = sv.assignments[key] = sv.assignments[key] || {};
      if (asg[role]?.email) return;
      asg[role] = { email: me, status: "requested" };
      notifyAdmins(d, sv, `${nameOf(me)} wants to take ${role} on ${labelFor(sv, key)} (${s.name}). Approve it in the Admin tab.`, me);
    });
    flash("Request sent. An admin will approve it.");
  };

  const resolveRequest = (svcId, key, role, approve) => {
    update(d => {
      const sv = d.services[svcId];
      const a = sv.assignments[key]?.[role];
      if (!a) return;
      if (approve) {
        a.status = "confirmed";
        pushNotif(d, a.email, `Approved! You're serving ${role} on ${labelFor(sv, key)} for ${sv.name}.`);
      } else {
        pushNotif(d, a.email, `Your request for ${role} on ${labelFor(sv, key)} (${sv.name}) wasn't approved this time.`);
        delete sv.assignments[key][role];
      }
    });
  };

  const autoAssign = (svcId, keys) => {
    let made = 0;
    update(d => {
      const s = d.services[svcId];
      const rules = s.rules || {};
      const countFor = (em) => Object.values(s.assignments).reduce((n, day) =>
        n + Object.values(day).filter(a => a.email === em).length, 0);
      const monthCount = (em, month) => Object.entries(s.assignments).reduce((n, [k, day]) =>
        n + ((dateFor(s, k) || "").slice(0, 7) === month ? Object.values(day).filter(a => a.email === em).length : 0), 0);
      keys.forEach(key => {
        const date = dateFor(s, key);
        const asg = s.assignments[key] = s.assignments[key] || {};
        s.roles.forEach(role => {
          if (asg[role]?.email) return;
          const busy = Object.values(asg).map(a => a.email);
          let cands = Object.entries(s.members).filter(([em, m]) =>
            !m.none &&
            !(s.unavailable[em] || []).includes(key) && !busy.includes(em) &&
            (m.roles.length === 0 || m.roles.includes(role)) &&
            !conflictOf(d, em, date, svcId) &&
            (!rules.maxPerMonth || monthCount(em, date.slice(0, 7)) < rules.maxPerMonth) &&
            (!rules.noBackToBack || !servesOn(s, em, prevWeek(date))));
          if (!cands.length) return;
          cands.sort((a, b) => countFor(a[0]) - countFor(b[0]));
          const em = cands[0][0];
          asg[role] = { email: em, status: "pending" };
          pushNotif(d, em, `You've been assigned: ${role} on ${labelFor(s, key)} for ${s.name}. Open the app to confirm.`);
          made++;
        });
      });
    });
    flash(made ? `Auto-assigned ${made} role${made > 1 ? "s" : ""}` : "Nothing to assign. All roles are filled, or no one fits the rules/availability");
  };

  const sendReminders = (svcId, key) => {
    let n = 0;
    update(d => {
      const s = d.services[svcId];
      Object.entries(s.assignments[key] || {}).forEach(([role, a]) => {
        if (a.status === "pending") { pushNotif(d, a.email, `Reminder: please confirm ${role} on ${labelFor(s, key)} for ${s.name}.`); n++; }
      });
    });
    flash(n ? `Reminders sent to ${n} member${n > 1 ? "s" : ""}` : "Everyone is confirmed already!");
  };

  const inviteByEmail = (svcId) => {
    const email = (form.invEmail || "").trim().toLowerCase();
    if (!email) return;
    const svc = data.services[svcId];
    if (svc.members[email]) return flash("They're already a member", "error");
    if (!data.users[email]) return flash("No account with that email yet. Share the join code with them instead.", "error");
    update(d => {
      d.services[svcId].invites[email] = me;
      pushNotif(d, email, `${nameOf(me)} invited you to join ${svc.name}. Open Home to accept or decline.`);
    });
    setForm({ ...form, invEmail: "" });
    flash(`Invite sent to ${nameOf(email)}`);
  };

  const requestSwap = (svcId, key, role, to) => {
    update(d => {
      const sv = d.services[svcId];
      (sv.swaps = sv.swaps || []).push({ id: uid(), key, role, from: me, to });
      pushNotif(d, to, `${nameOf(me)} asked you to cover ${role} on ${labelFor(sv, key)} (${sv.name}). Open the service schedule to respond.`);
    });
    flash(`Swap request sent to ${nameOf(to)}`);
  };

  const respondSwap = (svcId, swapId, accept) => {
    update(d => {
      const sv = d.services[svcId];
      const i = (sv.swaps || []).findIndex(x => x.id === swapId);
      if (i < 0) return;
      const sw = sv.swaps[i];
      sv.swaps.splice(i, 1);
      const a = sv.assignments[sw.key]?.[sw.role];
      if (accept && a && a.email === sw.from) {
        sv.assignments[sw.key][sw.role] = { email: me, status: "confirmed" };
        pushNotif(d, sw.from, `${nameOf(me)} accepted your swap. They'll cover ${sw.role} on ${labelFor(sv, sw.key)} (${sv.name}).`);
        notifyAdmins(d, sv, `Swap: ${nameOf(me)} is covering ${sw.role} on ${labelFor(sv, sw.key)} for ${nameOf(sw.from)} (${sv.name}).`, me);
      } else if (!accept) {
        pushNotif(d, sw.from, `${nameOf(me)} can't cover ${sw.role} on ${labelFor(sv, sw.key)} (${sv.name}).`);
      }
    });
    flash(accept ? "Swap accepted! It's on your schedule now." : "Swap declined.");
  };

  const buildDayText = (svc, key) => {
    const date = dateFor(svc, key);
    const ev = key.startsWith("evt-") ? (svc.events || []).find(e => "evt-" + e.id === key) : null;
    const asg = svc.assignments[key] || {};
    const det = (svc.details || {})[key];
    let t = `📋 ${svc.name} | ${fmtFull(date)}${ev ? ` (${ev.name})` : ""}\n`;
    if (det?.time || det?.location) t += `${det.time ? "⏰ " + det.time : ""}${det.time && det.location ? " · " : ""}${det.location ? "📍 " + det.location : ""}\n`;
    svc.roles.forEach(r => {
      const a = asg[r];
      t += `• ${r}: ${a ? nameOf(a.email) + (a.status === "confirmed" ? " ✅" : " ⏳") : "OPEN ❗"}\n`;
    });
    if (svc.notes[key]) t += `📌 ${svc.notes[key]}\n`;
    return t;
  };

  /* ---------- HOME ---------- */
  if (view.page === "home") {
    const myNext = (s) => {
      for (const sl of slotsOf(s)) {
        const asg = s.assignments[sl.key] || {};
        const mine = Object.entries(asg).find(([, a]) => a.email === me);
        if (mine) return { sl, role: mine[0], status: mine[1].status };
      }
      return null;
    };
    const hour = new Date().getHours();
    const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    let hero = null;
    for (const s of myServices) {
      for (const sl of slotsOf(s)) {
        const asg = s.assignments[sl.key] || {};
        const mineEntries = Object.entries(asg).filter(([, a]) => a.email === me);
        if (mineEntries.length && (!hero || sl.date < hero.sl.date)) {
          const statuses = mineEntries.map(([, a]) => a.status);
          const status = statuses.includes("pending") ? "pending" : statuses.includes("requested") ? "requested" : "confirmed";
          hero = { s, sl, roles: mineEntries.map(([r]) => r), status };
        }
      }
    }
    const heroDet = hero ? (hero.s.details || {})[hero.sl.key] : null;
    return (
      <Shell title="ServicePlanner" {...shellProps}>
        <p className="text-sm text-gray-500 mb-1">{greet},</p>
        <p className="text-2xl font-display font-semibold text-gray-900 mb-5">{nameOf(me).split(" ")[0]}</p>

        {hero ? (
          <button onClick={() => setView({ page: "service", svcId: hero.s.id, tab: "schedule" })}
            className="w-full text-left serving-card border border-gray-100 rounded-2xl p-5 mb-5 soft-shadow card-press">
            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-1">Next up · {fmtFull(hero.sl.date)}{hero.sl.name && ` · ${hero.sl.name}`}</p>
            <p className="text-xl font-display font-semibold text-gray-900">{hero.roles.join(" + ")}</p>
            <p className="text-sm text-gray-500 mt-0.5">{hero.s.name}</p>
            {(heroDet?.time || heroDet?.location) && (
              <p className="text-xs text-gray-500 mt-1.5">
                {heroDet.time && <><Clock size={11} className="inline mr-0.5" />{heroDet.time}</>}
                {heroDet.time && heroDet.location && " · "}
                {heroDet.location && <><MapPin size={11} className="inline mr-0.5" />{heroDet.location}</>}
              </p>
            )}
            <div className="mt-3">
              {hero.status === "confirmed" ? <Badge color="green">Confirmed, see you there</Badge>
                : hero.status === "requested" ? <Badge color="purple">Awaiting admin approval</Badge>
                : <Badge color="amber">Tap to confirm</Badge>}
            </div>
          </button>
        ) : myServices.length > 0 && (
          <div className="border border-gray-100 rounded-2xl p-5 mb-5 bg-paper">
            <p className="text-sm text-gray-500">You're not scheduled for anything yet. Enjoy the rest 😌</p>
          </div>
        )}

        {myInvites.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Invitations</h2>
            {myInvites.map(s => (
              <div key={s.id} className="border border-blue-200 bg-blue-50 rounded-xl p-3.5 mb-2">
                <p className="text-sm text-gray-800 mb-2"><span className="font-medium">{nameOf(s.invites[me])}</span> invited you to join <span className="font-medium">{s.name}</span></p>
                <div className="flex gap-2">
                  <button onClick={() => respondInvite(s.id, true)} className="flex-1 btn-brand text-white text-sm rounded-lg py-1.5 font-medium">Accept</button>
                  <button onClick={() => respondInvite(s.id, false)} className="flex-1 border border-gray-300 text-gray-600 text-sm rounded-lg py-1.5">Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="text-sm font-semibold text-gray-700 mb-2">My services</h2>
        {myServices.length === 0 && <p className="text-sm text-gray-400 mb-3">You're not in any service yet.</p>}
        {myServices.map(s => {
          const nxt = myNext(s);
          const swapsForMe = (s.swaps || []).filter(sw => sw.to === me).length;
          return (
            <button key={s.id} onClick={() => setView({ page: "service", svcId: s.id, tab: "schedule" })}
              className="w-full text-left border border-gray-100 rounded-2xl p-4 mb-2.5 soft-shadow card-press bg-white">
              <div className="flex items-center justify-between mb-1">
                <span className="font-display font-semibold text-gray-900 text-lg">{s.name}</span>
                <div className="flex gap-1.5">
                  {swapsForMe > 0 && <Badge color="blue"><ArrowLeftRight size={10} className="inline mr-0.5" />Swap?</Badge>}
                  {s.members[me].admin && <Badge color="purple">Admin</Badge>}
                  {nxt ? (nxt.status === "confirmed" ? <Badge color="green">Serving</Badge> : nxt.status === "requested" ? <Badge color="purple">Requested</Badge> : <Badge color="amber">Confirm?</Badge>) : <Badge color="gray">Not scheduled</Badge>}
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {Object.keys(s.members).length} member{Object.keys(s.members).length > 1 ? "s" : ""}
                {nxt && <> · Next: <span className="text-brand font-medium">{nxt.role}</span> on {fmt(nxt.sl.date)}{nxt.sl.name && ` (${nxt.sl.name})`}</>}
              </p>
            </button>
          );
        })}

        {myServices.length === 0 && (
          <button onClick={() => setView({ page: "create" })}
            className="w-full border border-dashed border-gray-300 rounded-2xl p-5 text-center text-sm text-gray-500 card-press">
            <Plus size={18} className="inline mb-1 text-brand" /><br />
            Create your first service or join one with a code
          </button>
        )}
      </Shell>
    );
  }

  /* ---------- CREATE / JOIN ---------- */
  if (view.page === "create") {
    return (
      <Shell title="New service" {...shellProps}>
        <div className="border border-gray-100 rounded-2xl bg-white soft-shadow p-5 mb-4">
          <h2 className="text-base font-display font-semibold text-gray-900 mb-1">Create a service</h2>
          <p className="text-xs text-gray-500 mb-3">Start a new team. You'll be its admin and can add roles, members, and schedules.</p>
          <div className="flex gap-2">
            <input className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="e.g. AV & Video Team" value={form.svcName || ""} onChange={e => setForm({ ...form, svcName: e.target.value })}
              onKeyDown={e => e.key === "Enter" && createService()} />
            <button onClick={createService} className="btn-brand text-white rounded-lg px-4 text-sm font-medium flex items-center gap-1"><Plus size={15} />Create</button>
          </div>
        </div>

        <div className="border border-gray-100 rounded-2xl bg-white soft-shadow p-5">
          <h2 className="text-base font-display font-semibold text-gray-900 mb-1">Join with a code</h2>
          <p className="text-xs text-gray-500 mb-3">Got a 6-character code from your team admin? Enter it here to join their service.</p>
          <div className="flex gap-2">
            <input className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="6-character code" value={form.joinCode || ""} onChange={e => setForm({ ...form, joinCode: e.target.value })}
              onKeyDown={e => e.key === "Enter" && joinByCode()} />
            <button onClick={joinByCode} className="border border-gray-300 text-gray-700 rounded-lg px-4 text-sm font-medium">Join</button>
          </div>
        </div>
      </Shell>
    );
  }

  /* ---------- ALERTS ---------- */
  if (view.page === "alerts") {
    return (
      <Shell title="Alerts" {...shellProps} right={unread > 0 && (
        <button onClick={() => update(d => (d.notifs[me] || []).forEach(n => n.read = true))} className="text-xs text-brand">Mark all read</button>
      )}>
        {myNotifs.length === 0 && <p className="text-sm text-gray-400 text-center mt-10">No alerts yet. You'll see assignment, swap, and invite notifications here.</p>}
        {myNotifs.map(n => (
          <div key={n.id} className={`rounded-xl p-3.5 mb-2 border ${n.read ? "border-gray-100 bg-white" : "border-blue-200 bg-blue-50"}`}>
            <p className="text-sm text-gray-800">{n.text}</p>
            <p className="text-xs text-gray-400 mt-1">{new Date(n.time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
          </div>
        ))}
      </Shell>
    );
  }

  /* ---------- PROFILE ---------- */
  if (view.page === "profile") {
    return (
      <Shell title="Profile" {...shellProps}>
        <div className="flex items-center gap-3 mb-6">
          <Avatar name={nameOf(me)} px={48} />
          <div>
            <p className="font-medium text-gray-900">{nameOf(me)}</p>
            <p className="text-sm text-gray-500">{me}</p>
          </div>
        </div>

        <div className="border border-gray-100 rounded-2xl bg-white p-4 mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-700">My info</p>
            {!expanded.editProfile && (
              <button onClick={() => setExpanded({ ...expanded, editProfile: true })}
                className="text-xs text-brand flex items-center gap-1"><Edit3 size={12} />{data.users[me].phone || data.users[me].dob ? "Edit" : "Complete profile"}</button>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-3">Only you and the admins of your services can see this.</p>
          {!expanded.editProfile ? (
            <div>
              <p className="text-sm text-gray-700 mb-1">📱 {data.users[me].phone || <span className="text-gray-400">No phone number yet</span>}</p>
              <p className="text-sm text-gray-700">🎂 {data.users[me].dob ? fmtFull(data.users[me].dob) : <span className="text-gray-400">No date of birth yet</span>}</p>
            </div>
          ) : (
            <div>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Phone number (e.g. 713-555-0123)" value={form.phone ?? (data.users[me].phone || "")}
                onChange={e => setForm({ ...form, phone: e.target.value })} />
              <label className="text-xs text-gray-500 block mb-1">Date of birth</label>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 text-gray-700"
                value={form.dob ?? (data.users[me].dob || "")} onChange={e => setForm({ ...form, dob: e.target.value })} />
              <div className="flex gap-2">
                <button onClick={() => {
                  const phone = (form.phone ?? data.users[me].phone ?? "").trim();
                  const dob = form.dob ?? data.users[me].dob ?? "";
                  update(d => { d.users[me].phone = phone; d.users[me].dob = dob; });
                  setForm({ ...form, phone: undefined, dob: undefined });
                  setExpanded({ ...expanded, editProfile: false });
                  flash("Profile saved");
                }} className="flex-1 btn-brand text-white text-sm rounded-lg py-2 font-medium">Save</button>
                <button onClick={() => { setForm({ ...form, phone: undefined, dob: undefined }); setExpanded({ ...expanded, editProfile: false }); }}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm rounded-lg py-2">Cancel</button>
              </div>
            </div>
          )}
        </div>

        <div className="border border-gray-100 rounded-2xl bg-white divide-y divide-gray-100 mb-6">
          {myServices.map(s => (
            <div key={s.id} className="px-4 py-3">
              <p className="text-sm text-gray-800">{s.name}</p>
              <p className="text-xs text-gray-400">{s.members[me].admin ? "Admin" : "Member"}{s.members[me].roles.length > 0 && ` · ${s.members[me].roles.join(", ")}`} · served {countAll(s, me)} time{countAll(s, me) !== 1 ? "s" : ""}</p>
            </div>
          ))}
          {myServices.length === 0 && <p className="px-4 py-3 text-sm text-gray-400">No services yet</p>}
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); setMe(null); setData(null); setView({ page: "home" }); }}
          className="w-full border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2">
          <LogOut size={15} />Sign out
        </button>
      </Shell>
    );
  }

  /* ---------- SERVICE PAGE ---------- */
  if (view.page === "service") {
    const s = data.services[view.svcId];
    if (!s || !s.members[me]) { setView({ page: "home" }); return null; }
    const isAdmin = s.members[me].admin;
    const tab = view.tab || "schedule";
    const myUnavail = s.unavailable[me] || [];
    const memberEmails = Object.keys(s.members);
    const slots = slotsOf(s);
    const editKey = view.editKey && slots.some(sl => sl.key === view.editKey) ? view.editKey : slots[0]?.key;
    const swapsForMe = (s.swaps || []).filter(sw => sw.to === me);

    const tabBtn = (id, label) => (
      <button key={id} onClick={() => setView({ ...view, tab: id })}
        className={`flex-1 text-sm py-2 rounded-lg font-medium ${tab === id ? "btn-brand text-white" : "text-gray-500 hover:bg-gray-100"}`}>{label}</button>
    );

    const statusBadge = (st) =>
      st === "confirmed" ? <Badge color="green">Confirmed</Badge>
        : st === "requested" ? <Badge color="purple">Awaiting approval</Badge>
        : <Badge color="amber">Pending</Badge>;

    return (
      <Shell title={s.name} back={() => setView({ page: "home" })} {...shellProps}>
        <div className="flex gap-1 bg-gray-50 rounded-xl p-1 mb-4">
          {tabBtn("schedule", "Schedule")}
          {tabBtn("tasks", "Tasks")}
          {tabBtn("team", "Team")}
          {isAdmin && tabBtn("admin", "Admin")}
        </div>

        {tab === "schedule" && (
          <div>
            {swapsForMe.map(sw => (
              <div key={sw.id} className="border border-blue-200 bg-blue-50 rounded-xl p-3.5 mb-3">
                <p className="text-sm text-gray-800 mb-2">
                  <ArrowLeftRight size={13} className="inline mr-1 text-brand" />
                  <span className="font-medium">{nameOf(sw.from)}</span> asks you to cover <span className="font-medium">{sw.role}</span> on {labelFor(s, sw.key)}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => respondSwap(s.id, sw.id, true)} className="flex-1 btn-brand text-white text-sm rounded-lg py-1.5 font-medium">I'll cover it</button>
                  <button onClick={() => respondSwap(s.id, sw.id, false)} className="flex-1 border border-gray-300 text-gray-600 text-sm rounded-lg py-1.5">Can't</button>
                </div>
              </div>
            ))}

            <button onClick={() => setExpanded({ ...expanded, avail: !expanded.avail })}
              className="w-full flex items-center justify-between border border-gray-100 rounded-2xl bg-white px-4 py-3 mb-3 text-sm text-gray-700">
              <span className="flex items-center gap-2"><Calendar size={15} className="text-gray-400" />My availability</span>
              {expanded.avail ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expanded.avail && (
              <div className="border border-gray-100 rounded-2xl bg-white p-4 mb-4">
                <p className="text-xs text-gray-500 mb-3">Tap a day to mark yourself unavailable (with an optional reason). If you're already assigned, the assignment is cancelled and admins are alerted.</p>
                <div className="flex flex-wrap gap-2">
                  {slots.map(sl => {
                    const off = myUnavail.includes(sl.key);
                    const reason = s.blockouts?.[me]?.[sl.key];
                    return (
                      <button key={sl.key} onClick={() => toggleUnavailable(s.id, sl.key)} title={reason || ""}
                        className={`text-xs px-3 py-1.5 rounded-full border ${off ? "bg-red-50 text-red-700 border-red-200" : "border-gray-200 text-gray-600"}`}>
                        {off && <X size={10} className="inline mr-1" />}{fmt(sl.date)}{sl.name && <Star size={9} className="inline ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {slots.map(sl => {
              const key = sl.key;
              const asg = s.assignments[key] || {};
              const mines = Object.entries(asg).filter(([, a]) => a.email === me);
              const off = myUnavail.includes(key);
              const isOpen = expanded[key];
              const note = s.notes[key];
              const det = (s.details || {})[key];
              const eligibleFor = (role) => memberEmails.filter(em =>
                em !== me && !s.members[em].none && !(s.unavailable[em] || []).includes(key) &&
                !Object.values(asg).some(a => a.email === em) &&
                (s.members[em].roles.length === 0 || s.members[em].roles.includes(role)));
              return (
                <div key={key} className={`border rounded-2xl p-4 mb-2.5 ${mines.length ? "serving-card border-gray-100 soft-shadow" : off ? "border-gray-100 bg-gray-50" : "border-gray-200 bg-white"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-medium ${mines.length ? "gold font-semibold" : "text-gray-400"}`}>
                        {fmt(sl.date)}{sl.name && <span className="text-purple-700"> · {sl.name}</span>}{mines.length > 0 && " · You're serving"}{off && mines.length === 0 && " · Unavailable"}
                      </p>
                      {mines.length === 0 && (
                        <p className="text-sm text-gray-400 mt-0.5">{off ? "Marked day off" : "Not serving"}</p>
                      )}
                      {(det?.time || det?.location) && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {det.time && <><Clock size={11} className="inline mr-0.5" />{det.time}</>}
                          {det.time && det.location && " · "}
                          {det.location && <><MapPin size={11} className="inline mr-0.5" />{det.location}</>}
                        </p>
                      )}
                    </div>
                    <button onClick={() => setExpanded({ ...expanded, [key]: !isOpen })} className="text-gray-400 p-1">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                  {note && <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-2">📌 {note}</p>}
                  {!isOpen && !off && s.roles.some(r => !asg[r]) && (
                    <button onClick={() => setExpanded({ ...expanded, [key]: true })}
                      className="mt-2 text-xs text-brand flex items-center gap-1">
                      <Hand size={11} />{s.roles.filter(r => !asg[r]).length} open role{s.roles.filter(r => !asg[r]).length > 1 ? "s" : ""} · tap to view
                    </button>
                  )}
                  {mines.map(([role, a]) => {
                    const swapKey = "swap-" + key + "-" + role;
                    const swapOpen = expanded[swapKey];
                    const myOutgoing = (s.swaps || []).find(sw => sw.from === me && sw.key === key && sw.role === role);
                    const eligible = eligibleFor(role);
                    return (
                      <div key={role} className="mt-2.5 border border-gray-100 rounded-xl px-3 py-2.5 bg-white">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900 text-sm">{role}</p>
                          {statusBadge(a.status)}
                        </div>
                        {a.status === "pending" && (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => confirmAssign(s.id, key, role, true)}
                              className="flex-1 btn-brand text-white text-sm rounded-lg py-1.5 font-medium flex items-center justify-center gap-1"><Check size={14} />Confirm</button>
                            <button onClick={() => confirmAssign(s.id, key, role, false)}
                              className="flex-1 border border-gray-300 text-gray-600 text-sm rounded-lg py-1.5 flex items-center justify-center gap-1"><X size={14} />Decline</button>
                          </div>
                        )}
                        {a.status === "requested" && (
                          <button onClick={() => update(d => { delete d.services[s.id].assignments[key][role]; })}
                            className="mt-1.5 text-xs text-gray-400 underline">Cancel my request</button>
                        )}
                        {a.status !== "requested" && !myOutgoing && (
                          <div className="mt-1.5">
                            <div className="flex items-center gap-4">
                              <button onClick={() => setExpanded({ ...expanded, [swapKey]: !swapOpen })}
                                className="text-xs text-brand flex items-center gap-1"><ArrowLeftRight size={12} />Request a swap</button>
                              {a.status === "confirmed" && (
                                <button onClick={() => cancelMyRole(s.id, key, role)}
                                  className="text-xs text-red-500 flex items-center gap-1"><X size={12} />Cancel my role</button>
                              )}
                            </div>
                            {swapOpen && (
                              <div className="flex gap-2 mt-2">
                                <select className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700"
                                  value={form["swapTo-" + swapKey] || ""} onChange={e => setForm({ ...form, ["swapTo-" + swapKey]: e.target.value })}>
                                  <option value="">Choose who to ask…</option>
                                  {eligible.map(em => <option key={em} value={em}>{nameOf(em)}</option>)}
                                </select>
                                <button onClick={() => { const to = form["swapTo-" + swapKey]; if (to) { requestSwap(s.id, key, role, to); setExpanded({ ...expanded, [swapKey]: false }); } }}
                                  className="btn-brand text-white rounded-lg px-3 text-xs shrink-0">Ask</button>
                              </div>
                            )}
                          </div>
                        )}
                        {myOutgoing && (
                          <p className="text-xs text-gray-500 mt-1.5">
                            <ArrowLeftRight size={11} className="inline mr-1" />Swap requested from {nameOf(myOutgoing.to)} ·
                            <button onClick={() => update(d => { d.services[s.id].swaps = (d.services[s.id].swaps || []).filter(x => x.id !== myOutgoing.id); })}
                              className="text-gray-400 underline ml-1">cancel</button>
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {isOpen && (
                    <div className="mt-3 border-t border-gray-100 pt-2">
                      {s.roles.length === 0 && <p className="text-xs text-gray-400">No roles set up yet</p>}
                      {s.roles.map(role => {
                        const a = asg[role];
                        const canClaim = !a && !off;
                        return (
                          <div key={role} className="flex items-center justify-between py-1.5">
                            <span className="text-xs text-gray-600">{role}</span>
                            {a ? (
                              <span className="text-xs text-gray-800">{nameOf(a.email)} {a.status === "confirmed" ? "✓" : a.status === "requested" ? "(requested)" : "(pending)"}</span>
                            ) : canClaim ? (
                              <button onClick={() => claimRole(s.id, key, role)}
                                className="text-xs text-brand border border-blue-200 rounded-full px-2.5 py-0.5 flex items-center gap-1">
                                <Hand size={11} />Take this role
                              </button>
                            ) : (
                              <span className="text-xs text-red-500">Open</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "tasks" && (
          <div>
            {isAdmin && (
              <div className="border border-gray-100 rounded-2xl bg-white p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Add a task</p>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Task title" value={form.taskTitle || ""} onChange={e => setForm({ ...form, taskTitle: e.target.value })} />
                <div className="flex gap-2">
                  <select className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-2 text-sm text-gray-700"
                    value={form.taskAssignee || ""} onChange={e => setForm({ ...form, taskAssignee: e.target.value })}>
                    <option value="">Anyone</option>
                    {memberEmails.map(em => <option key={em} value={em}>{nameOf(em)}</option>)}
                  </select>
                  <button onClick={() => {
                    if (!form.taskTitle?.trim()) return;
                    update(d => {
                      d.services[s.id].tasks.push({ id: uid(), title: form.taskTitle.trim(), assignee: form.taskAssignee || null, done: false });
                      if (form.taskAssignee) pushNotif(d, form.taskAssignee, `New task in ${s.name}: "${form.taskTitle.trim()}"`);
                    });
                    setForm({ ...form, taskTitle: "", taskAssignee: "" });
                  }} className="btn-brand text-white rounded-lg px-4 text-sm font-medium">Add</button>
                </div>
              </div>
            )}
            {s.tasks.length === 0 && <p className="text-sm text-gray-400 text-center mt-6">No tasks yet</p>}
            {s.tasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 border border-gray-100 rounded-2xl bg-white px-4 py-3 mb-2">
                <button onClick={() => (t.assignee === me || !t.assignee || isAdmin) &&
                  update(d => { const tk = d.services[s.id].tasks.find(x => x.id === t.id); tk.done = !tk.done; })}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${t.done ? "bg-green-600 border-green-600 text-white" : "border-gray-300"}`}>
                  {t.done && <Check size={13} />}
                </button>
                <div className="flex-1">
                  <p className={`text-sm ${t.done ? "text-gray-400 line-through" : "text-gray-800"}`}>{t.title}</p>
                  <p className="text-xs text-gray-400">{t.assignee ? nameOf(t.assignee) : "Anyone"}{t.assignee === me && " (you)"}</p>
                </div>
                {isAdmin && <button onClick={() => update(d => { d.services[s.id].tasks = d.services[s.id].tasks.filter(x => x.id !== t.id); })}
                  className="text-gray-300 hover:text-red-500"><Trash2 size={15} /></button>}
              </div>
            ))}
          </div>
        )}

        {tab === "team" && (
          <div>
            <p className="text-xs text-gray-400 mb-2">{memberEmails.length} member{memberEmails.length > 1 ? "s" : ""}</p>
            {memberEmails.map(em => {
              const m = s.members[em];
              const isEditing = expanded["edit-" + em];
              return (
                <div key={em} className="border border-gray-100 rounded-2xl bg-white px-4 py-3 mb-2">
                  <div className="flex items-center gap-3">
                    <Avatar name={nameOf(em)} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{nameOf(em)}{em === me && " (you)"}</p>
                      <p className="text-xs text-gray-400">{m.none ? "None (not auto-assigned)" : m.roles.length ? m.roles.join(" · ") : "Any role"}</p>
                      {(isAdmin || em === me) && (data.users[em]?.phone || data.users[em]?.dob) && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {data.users[em].phone && <>📱 {data.users[em].phone}</>}
                          {data.users[em].phone && data.users[em].dob && " · "}
                          {data.users[em].dob && <>🎂 {fmt(data.users[em].dob)}</>}
                        </p>
                      )}
                    </div>
                    {m.admin && <Badge color="purple"><Shield size={10} className="inline mr-0.5" />Admin</Badge>}
                    {(isAdmin || em === me) && <button onClick={() => setExpanded({ ...expanded, ["edit-" + em]: !isEditing })}
                      className="text-gray-400 hover:text-gray-700"><Edit3 size={15} /></button>}
                  </div>
                  {(isAdmin || em === me) && isEditing && (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <p className="text-xs text-gray-500 mb-1.5">Role tags (auto-assign only picks tagged roles; no tags = any role)</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <button onClick={() => update(d => {
                          const mm = d.services[s.id].members[em];
                          mm.none = !mm.none;
                          if (em !== me && mm.none) pushNotif(d, em, `You're set to "None" in ${s.name}. The schedule won't auto-assign you, but you can still see everything and volunteer for open roles.`);
                        })} className={`text-xs px-2.5 py-1 rounded-full border ${m.none ? "bg-red-50 text-red-700 border-red-300" : "border-gray-200 text-gray-500"}`}>
                          None (don't auto-assign)
                        </button>
                        {s.roles.map(r => {
                          const on = m.roles.includes(r);
                          return <button key={r} onClick={() => update(d => {
                            const mm = d.services[s.id].members[em];
                            mm.roles = on ? mm.roles.filter(x => x !== r) : [...mm.roles, r];
                          })} className={`text-xs px-2.5 py-1 rounded-full border ${on ? "bg-blue-50 text-brand border-blue-300" : "border-gray-200 text-gray-500"}`}>{r}</button>;
                        })}
                        {s.roles.length === 0 && <span className="text-xs text-gray-400">Add roles in the Admin tab first</span>}
                      </div>
                      {isAdmin && <div className="flex gap-2">
                        <button onClick={() => update(d => {
                          const mm = d.services[s.id].members[em]; mm.admin = !mm.admin;
                          if (em !== me) pushNotif(d, em, mm.admin ? `You're now an admin of ${s.name}.` : `Your admin access for ${s.name} was removed.`);
                        })} className="flex-1 border border-gray-300 text-gray-700 text-xs rounded-lg py-1.5">
                          {m.admin ? "Remove admin" : "Make admin"}
                        </button>
                        {em !== me && (
                          <button onClick={() => ask({
                            text: `Remove ${nameOf(em)} from ${s.name}? Their assignments will be cleared and they'll be alerted.`,
                            danger: true, yesLabel: "Remove",
                            onYes: () => update(d => {
                              delete d.services[s.id].members[em];
                              Object.keys(d.services[s.id].assignments).forEach(k => {
                                Object.entries(d.services[s.id].assignments[k]).forEach(([role, a]) => {
                                  if (a.email === em) delete d.services[s.id].assignments[k][role];
                                });
                              });
                              pushNotif(d, em, `You were removed from ${s.name}.`);
                            }),
                          })} className="flex-1 border border-red-200 text-red-600 text-xs rounded-lg py-1.5">Remove from team</button>
                        )}
                      </div>}
                    </div>
                  )}
                </div>
              );
            })}

            {isAdmin && (
              <div className="border border-gray-100 rounded-2xl bg-white p-4 mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Invite a member</p>
                <div className="flex gap-2 mb-3">
                  <input className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Their account email" value={form.invEmail || ""} onChange={e => setForm({ ...form, invEmail: e.target.value })}
                    onKeyDown={e => e.key === "Enter" && inviteByEmail(s.id)} />
                  <button onClick={() => inviteByEmail(s.id)} className="btn-brand text-white rounded-lg px-3.5 text-sm font-medium"><Send size={14} /></button>
                </div>
                <p className="text-xs text-gray-500 mb-1.5">Or share this join code:</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base tracking-widest bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">{s.joinCode}</span>
                  <button onClick={() => copyText(s.joinCode, flash, "Code copied!")}
                    className="text-gray-400 hover:text-gray-700"><Copy size={15} /></button>
                  <button onClick={() => update(d => { d.services[s.id].joinCode = code6(); })}
                    className="text-xs text-gray-400 hover:text-gray-700 ml-auto">New code</button>
                </div>
              </div>
            )}

            <button onClick={() => leaveService(s.id)}
              className="w-full mt-5 border border-red-200 text-red-600 rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2">
              <LogOut size={15} />Leave this service
            </button>
          </div>
        )}

        {tab === "admin" && isAdmin && (() => {
          const nextKey = slots[0]?.key;
          const nAsg = s.assignments[nextKey] || {};
          const confirmed = Object.values(nAsg).filter(a => a.status === "confirmed").length;
          const pending = Object.values(nAsg).filter(a => a.status !== "confirmed").length;
          const open = s.roles.filter(r => !nAsg[r]).length;
          const eAsg = s.assignments[editKey] || {};
          const requests = [];
          Object.entries(s.assignments).forEach(([k, day]) =>
            Object.entries(day).forEach(([role, a]) => { if (a.status === "requested") requests.push({ key: k, role, email: a.email }); }));
          const maxServed = Math.max(1, ...memberEmails.map(em => countAll(s, em)));
          const det = (s.details || {})[editKey] || {};
          return (
            <div>
              {requests.length > 0 && (
                <div className="border border-purple-200 bg-purple-50 rounded-xl p-4 mb-4">
                  <p className="text-sm font-medium text-purple-900 mb-2">Role requests ({requests.length})</p>
                  {requests.map(r => (
                    <div key={r.key + r.role} className="flex items-center justify-between py-1.5">
                      <p className="text-xs text-gray-700"><span className="font-medium">{nameOf(r.email)}</span> → {r.role} on {labelFor(s, r.key)}</p>
                      <div className="flex gap-1.5">
                        <button onClick={() => resolveRequest(s.id, r.key, r.role, true)}
                          className="btn-brand text-white rounded-lg px-2.5 py-1 text-xs flex items-center gap-1"><Check size={11} />Approve</button>
                        <button onClick={() => resolveRequest(s.id, r.key, r.role, false)}
                          className="border border-gray-300 text-gray-600 rounded-lg px-2.5 py-1 text-xs">Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-400 mb-2">Next service · {labelFor(s, nextKey)}</p>
              <div className="grid grid-cols-4 gap-2 mb-5">
                {[[confirmed, "Confirmed"], [pending, "Pending"], [open, "Open"], [memberEmails.length, "Members"]].map(([n, l]) => (
                  <div key={l} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-semibold text-gray-900">{n}</p>
                    <p className="text-xs text-gray-500">{l}</p>
                  </div>
                ))}
              </div>

              <div className="border border-gray-100 rounded-2xl bg-white p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Roles</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {s.roles.map(r => (
                    <span key={r} className="text-xs bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1 flex items-center gap-1.5">
                      {r}
                      <button onClick={() => update(d => {
                        d.services[s.id].roles = d.services[s.id].roles.filter(x => x !== r);
                        Object.values(d.services[s.id].members).forEach(m => m.roles = m.roles.filter(x => x !== r));
                      })} className="text-gray-300 hover:text-red-500"><X size={11} /></button>
                    </span>
                  ))}
                  {s.roles.length === 0 && <span className="text-xs text-gray-400">No roles yet. Add Camera, Sound, etc.</span>}
                </div>
                <div className="flex gap-2">
                  <input className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="New role name" value={form.newRole || ""} onChange={e => setForm({ ...form, newRole: e.target.value })}
                    onKeyDown={e => { if (e.key === "Enter" && form.newRole?.trim()) { update(d => { if (!d.services[s.id].roles.includes(form.newRole.trim())) d.services[s.id].roles.push(form.newRole.trim()); }); setForm({ ...form, newRole: "" }); } }} />
                  <button onClick={() => { if (form.newRole?.trim()) { update(d => { if (!d.services[s.id].roles.includes(form.newRole.trim())) d.services[s.id].roles.push(form.newRole.trim()); }); setForm({ ...form, newRole: "" }); } }}
                    className="btn-brand text-white rounded-lg px-3.5 text-sm"><Plus size={15} /></button>
                </div>
              </div>

              <div className="border border-gray-100 rounded-2xl bg-white p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Auto-assign rules</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-600 flex-1">Max services per person per month</span>
                  <input type="number" min="0" className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center"
                    placeholder="∞" value={(s.rules || {}).maxPerMonth || ""}
                    onChange={e => update(d => { d.services[s.id].rules = d.services[s.id].rules || {}; d.services[s.id].rules.maxPerMonth = parseInt(e.target.value) || 0; })} />
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" checked={(s.rules || {}).noBackToBack || false}
                    onChange={e => update(d => { d.services[s.id].rules = d.services[s.id].rules || {}; d.services[s.id].rules.noBackToBack = e.target.checked; })} />
                  Avoid assigning the same person two Sundays in a row
                </label>
              </div>

              <div className="border border-gray-100 rounded-2xl bg-white p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Special events</p>
                {(s.events || []).filter(e => e.date >= todayStr()).map(e => (
                  <div key={e.id} className="flex items-center justify-between py-1.5">
                    <p className="text-xs text-gray-700"><Star size={11} className="inline mr-1 text-purple-500" />{e.name} · {fmt(e.date)}</p>
                    <button onClick={() => ask({
                      text: `Delete the event "${e.name}" (${fmt(e.date)})? Its assignments will be removed.`,
                      danger: true, yesLabel: "Delete event",
                      onYes: () => update(d => {
                        d.services[s.id].events = (d.services[s.id].events || []).filter(x => x.id !== e.id);
                        delete d.services[s.id].assignments["evt-" + e.id];
                        delete d.services[s.id].notes["evt-" + e.id];
                        if (d.services[s.id].details) delete d.services[s.id].details["evt-" + e.id];
                      }),
                    })} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
                  </div>
                ))}
                <div className="mt-2">
                  <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 mb-2"
                    value={form.evtDate || ""} onChange={e => setForm({ ...form, evtDate: e.target.value })} />
                  <div className="flex gap-2">
                    <input className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Event name (e.g. Christmas Eve)" value={form.evtName || ""} onChange={e => setForm({ ...form, evtName: e.target.value })} />
                    <button onClick={() => {
                      if (!form.evtDate || !form.evtName?.trim()) return flash("Pick a date and name for the event", "error");
                      update(d => { (d.services[s.id].events = d.services[s.id].events || []).push({ id: uid(), date: form.evtDate, name: form.evtName.trim() }); });
                      setForm({ ...form, evtDate: "", evtName: "" });
                    }} className="btn-brand text-white rounded-lg px-3.5 text-sm shrink-0"><Plus size={15} /></button>
                  </div>
                </div>
              </div>

              <div className="border border-gray-100 rounded-2xl bg-white p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Assign for a day</p>
                <div className="border border-gray-200 rounded-xl p-3 mb-3 bg-paper">
                <select className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm text-gray-700 mb-3 bg-white"
                  value={editKey} onChange={e => setView({ ...view, editKey: e.target.value })}>
                  {slots.map(sl => <option key={sl.key} value={sl.key}>{fmtFull(sl.date)}{sl.name ? ` (${sl.name})` : ""}</option>)}
                </select>
                {s.roles.map(role => {
                  const a = eAsg[role];
                  return (
                    <div key={role} className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-800 w-24 shrink-0 truncate">{role}</span>
                      <select className="flex-1 min-w-0 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700"
                        value={a?.email || ""} onChange={e => manualAssign(s.id, editKey, role, e.target.value)}>
                        <option value="">Unassigned</option>
                        {memberEmails.map(em => {
                          const off = (s.unavailable[em] || []).includes(editKey);
                          const reason = s.blockouts?.[em]?.[editKey];
                          const c = conflictOf(data, em, dateFor(s, editKey), s.id);
                          let tag = "";
                          if (off) tag = reason ? ` (unavailable: ${reason})` : " (unavailable)";
                          else if (s.members[em].none) tag = " (None)";
                          else if (c) tag = ` (busy: ${c.svc})`;
                          return <option key={em} value={em}>{nameOf(em)}{tag}</option>;
                        })}
                      </select>
                      {a && (a.status === "confirmed" ? <Check size={14} className="text-green-600" /> : a.status === "requested" ? <Hand size={13} className="text-purple-500" /> : <span className="text-amber-500 text-xs">…</span>)}
                    </div>
                  );
                })}
                {s.roles.length === 0 && <p className="text-xs text-gray-400">Add roles above first</p>}
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => autoAssign(s.id, [editKey])}
                    className="flex-1 border border-gray-300 text-gray-700 text-xs rounded-lg py-2 flex items-center justify-center gap-1"><RefreshCw size={12} />Auto-assign this day</button>
                  <button onClick={() => sendReminders(s.id, editKey)}
                    className="flex-1 border border-gray-300 text-gray-700 text-xs rounded-lg py-2 flex items-center justify-center gap-1"><Send size={12} />Send reminders</button>
                </div>
                <button onClick={() => autoAssign(s.id, slots.map(sl => sl.key))}
                  className="w-full mt-2 btn-brand text-white text-xs rounded-lg py-2 font-medium flex items-center justify-center gap-1">
                  <RefreshCw size={12} />Auto-assign everything upcoming
                </button>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setShare({ title: `Share: ${labelFor(s, editKey)}`, text: buildDayText(s, editKey) })}
                    className="flex-1 border border-green-300 text-green-700 text-xs rounded-lg py-2 flex items-center justify-center gap-1"><Share2 size={12} />WhatsApp summary</button>
                  <button onClick={() => setShare({ title: "Full upcoming schedule", text: slots.map(sl => buildDayText(s, sl.key)).join("\n") })}
                    className="flex-1 border border-gray-300 text-gray-700 text-xs rounded-lg py-2 flex items-center justify-center gap-1"><Copy size={12} />Export all</button>
                </div>
              </div>

              <div className="border border-gray-100 rounded-2xl bg-white p-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Details for {labelFor(s, editKey)}</p>
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Call time (e.g. 8:30 AM)" value={form["time-" + editKey] ?? (det.time || "")}
                  onChange={e => setForm({ ...form, ["time-" + editKey]: e.target.value })} />
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Location" value={form["loc-" + editKey] ?? (det.location || "")}
                  onChange={e => setForm({ ...form, ["loc-" + editKey]: e.target.value })} />
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder='Note (e.g. "Bring extra cables")' value={form["note-" + editKey] ?? (s.notes[editKey] || "")}
                  onChange={e => setForm({ ...form, ["note-" + editKey]: e.target.value })} />
                <button onClick={() => {
                  const time = (form["time-" + editKey] ?? det.time ?? "").trim();
                  const location = (form["loc-" + editKey] ?? det.location ?? "").trim();
                  const note = (form["note-" + editKey] ?? s.notes[editKey] ?? "").trim();
                  update(d => {
                    const sv = d.services[s.id];
                    sv.details = sv.details || {};
                    if (time || location) sv.details[editKey] = { time, location }; else delete sv.details[editKey];
                    if (note) sv.notes[editKey] = note; else delete sv.notes[editKey];
                  });
                  flash("Details saved");
                }} className="w-full btn-brand text-white rounded-lg py-2 text-sm font-medium">Save details</button>
              </div>

              <div className="border border-gray-100 rounded-2xl bg-white p-4">
                <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1.5"><BarChart3 size={14} className="text-gray-400" />Serving history</p>
                {memberEmails.map(em => {
                  const c = countAll(s, em);
                  return (
                    <div key={em} className="mb-2">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-gray-700">{nameOf(em)}</span>
                        <span className="text-gray-400">{c} time{c !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full btn-brand rounded-full" style={{ width: `${(c / maxServed) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </Shell>
    );
  }

  return null;
}
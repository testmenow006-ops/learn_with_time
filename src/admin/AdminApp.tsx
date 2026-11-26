import {
  ArrowDown, ArrowRight, ArrowUp, ArrowUpRight, BookOpen, Check, ChevronDown, CircleHelp, Eye, FileText,
  Globe2, LayoutDashboard, LogOut, Mail, MessageSquare, Palette, Plus, Save, Search, Settings2, Sparkles,
  Trash2, Upload, UserRound, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { api } from "../api";
import type { ContentItem, Design, SiteData } from "../types";

type View = "overview" | "portfolio" | "content" | "design" | "templates" | "messages";
type DashboardData = { visitors: number; published: number; drafts: number; downloads: number; messages: number; recent: { event: string; path: string; created_at: string }[] };
type Category = { id: number; name: string; slug: string };
const templateList = [
  { id: "modern", name: "Modern Professional", note: "Clean lines, confident type, warm neutrals.", color: "#e9eee8", mark: "Aa" },
  { id: "academic", name: "Academic Classic", note: "A thoughtful, bookish feel with timeless detail.", color: "#e8e1d3", mark: "A" },
  { id: "creative", name: "Creative Educator", note: "Playful color and a little more personality.", color: "#ead6c7", mark: "✳" },
  { id: "minimal", name: "Minimal Portfolio", note: "Quiet space for your work to speak.", color: "#edece7", mark: "—" },
  { id: "premium", name: "Premium Education", note: "Polished details and an editorial edge.", color: "#d8dfe2", mark: "✦" },
];
const navItems: { key: View; label: string; icon: typeof LayoutDashboard; group: string }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, group: "WORKSPACE" },
  { key: "portfolio", label: "My portfolio", icon: UserRound, group: "WORKSPACE" },
  { key: "content", label: "Content library", icon: FileText, group: "WORKSPACE" },
  { key: "design", label: "Website design", icon: Palette, group: "PUBLISH" },
  { key: "templates", label: "Templates", icon: LayoutDashboard, group: "PUBLISH" },
  { key: "messages", label: "Messages", icon: MessageSquare, group: "PUBLISH" },
];
const blankItem: Omit<ContentItem, "id" | "slug"> = {
  title: "", type: "article", excerpt: "", body: "", cover_image: "", file_url: "", video_url: "",
  tags: [], category_id: null, status: "draft", scheduled_at: null, seo_title: "", seo_description: "",
};

function Notice({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null;
  return <div className={`notice ${message.startsWith("Saved") || message.startsWith("Published") || message.startsWith("Deleted") || message.startsWith("Uploaded") || message.startsWith("Template") ? "notice-success" : "notice-error"}`} role="status">{message}<button onClick={onClose} aria-label="Dismiss"><X size={15} /></button></div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="admin-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function UploadField({ label, value, accept, onChange, onNotice }: { label: string; value: string; accept: string; onChange: (value: string) => void; onNotice: (message: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const uploadFile = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const result = await api<{ url: string; name: string }>("/api/admin/upload", { method: "POST", body: form });
      onChange(result.url);
      onNotice(`Uploaded ${result.name}`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };
  return <div className="upload-field"><Field label={label}><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Paste an image URL or upload a file" /></Field>
    <label className="upload-button"><Upload size={15} />{uploading ? "Uploading..." : "Upload"}<input type="file" accept={accept} disabled={uploading} onChange={(event) => { void uploadFile(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
    {value && accept.startsWith("image/") && <img className="upload-preview" src={value} alt={`${label} preview`} />}
  </div>;
}

function Repeater({ title, rows, fields, onChange, onAdd, onRemove }: {
  title: string; rows: Record<string, string>[]; fields: { key: string; label: string; placeholder?: string }[];
  onChange: (index: number, key: string, value: string) => void; onAdd: () => void; onRemove: (index: number) => void;
}) {
  return <div className="repeater-block"><div className="repeater-heading"><h3>{title}</h3><button className="small-button" type="button" onClick={onAdd}><Plus size={14} /> Add</button></div>
    {rows.length === 0 && <p className="muted-copy">Nothing added yet. Add your first one.</p>}
    {rows.map((row, index) => <div className="repeater-row" key={`${title}-${index}`}>{fields.map((field) => <label key={field.key}><span className="sr-only">{field.label}</span><input value={row[field.key] ?? ""} placeholder={field.placeholder ?? field.label} onChange={(event) => onChange(index, field.key, event.target.value)} /></label>)}<button type="button" className="icon-button danger-quiet" onClick={() => onRemove(index)} aria-label={`Remove ${title.toLowerCase()} ${index + 1}`}><Trash2 size={15} /></button></div>)}
  </div>;
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/login", { method: "POST", body: JSON.stringify({ email, password }) });
      onLogin();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  };
  return <main className="login-page"><div className="login-art"><span className="login-stamp"><Sparkles size={24} /></span><span className="login-art-text">A quiet place<br />to do your best work.</span></div>
    <form className="login-card" onSubmit={submit}><span className="eyebrow"><span className="eyebrow-dot" /> TEACHER WORKSPACE</span><h1>Welcome<br />back.</h1><p>Sign in to your portfolio studio.</p>
      {error && <div className="inline-error">{error}</div>}
      <Field label="Email address"><input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@school.edu" /></Field>
      <Field label="Password"><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" /></Field>
      <button className="button button-primary login-submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"} <ArrowUpRight size={17} /></button>
      <span className="login-foot"><Globe2 size={14} /> Your little corner of the internet is waiting.</span>
    </form>
  </main>;
}

export default function AdminApp({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [view, setView] = useState<View>("overview");
  const [notice, setNotice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [site, setSite] = useState<SiteData | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [messages, setMessages] = useState<{ id: number; name: string; email: string; subject: string; message: string; is_read: boolean; created_at: string }[]>([]);
  const [search, setSearch] = useState("");

  const loadWorkspace = useCallback(async () => {
    try {
      const [stats, portfolio, library, inbox] = await Promise.all([
        api<DashboardData>("/api/admin/dashboard"),
        api<SiteData>("/api/admin/portfolio"),
        api<{ items: ContentItem[]; categories: Category[] }>("/api/admin/content"),
        api<typeof messages>("/api/admin/messages"),
      ]);
      setDashboard(stats);
      setSite(portfolio);
      setItems(library.items);
      setCategories(library.categories);
      setMessages(inbox);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load your workspace.");
    }
  }, []);

  useEffect(() => {
    api<{ authenticated: boolean }>("/api/admin/session").then((result) => setAuthenticated(result.authenticated)).catch(() => setAuthenticated(false));
  }, []);
  useEffect(() => {
    if (authenticated) void loadWorkspace();
  }, [authenticated, loadWorkspace]);

  const updateSite = (next: SiteData) => setSite(next);
  const saveContent = async (item: ContentItem, id?: number) => {
    const body = { ...item, category_id: item.category_id || null, scheduled_at: item.status === "scheduled" ? item.scheduled_at : null };
    const result = await api<ContentItem>(id ? `/api/admin/content/${id}` : "/api/admin/content", {
      method: id ? "PUT" : "POST", body: JSON.stringify(body),
    });
    setItems((current) => id ? current.map((entry) => entry.id === id ? result : entry) : [result, ...current]);
    setDashboard((current) => current ? { ...current, published: current.published + (result.status === "published" && !id ? 1 : 0), drafts: current.drafts + (result.status === "draft" && !id ? 1 : 0) } : current);
    setNotice(id ? "Saved changes." : "Saved new content.");
  };
  const deleteContent = async (id: number) => {
    try {
      await api(`/api/admin/content/${id}`, { method: "DELETE" });
      setItems((current) => current.filter((entry) => entry.id !== id));
      setNotice("Deleted content.");
      void loadWorkspace();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not delete content.");
    }
  };
  const createCategory = async (name: string) => {
    const category = await api<Category>("/api/admin/categories", { method: "POST", body: JSON.stringify({ name }) });
    setCategories((current) => current.some((item) => item.id === category.id) ? current : [...current, category]);
    return category;
  };
  const saveProfile = async (next: SiteData) => {
    await api("/api/admin/portfolio", {
      method: "PUT",
      body: JSON.stringify({
        ...next.profile,
        qualifications: next.qualifications,
        experiences: next.experiences,
        subjects: next.subjects.map((item) => item.name),
        skills: next.skills.map((item) => item.name),
        achievements: next.achievements,
        testimonials: next.testimonials,
      }),
    });
    setSite(next);
    setNotice("Saved portfolio changes.");
  };
  const saveDesign = async (next: SiteData) => {
    await api("/api/admin/design", {
      method: "PUT",
      body: JSON.stringify({ design: next.design, template: next.template, sections: next.sections }),
    });
    setSite(next);
    setNotice("Saved design draft.");
  };
  const publish = async () => {
    try {
      if (site) await saveDesign(site);
      await api("/api/admin/publish", { method: "POST" });
      setNotice("Published your website changes.");
      void loadWorkspace();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not publish your website.");
    }
  };
  const preview = async () => {
    try {
      if (site) await saveDesign(site);
      window.open("/preview", "_blank", "noopener,noreferrer");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not open the preview.");
    }
  };
  const logout = async () => {
    try {
      await api("/api/admin/logout", { method: "POST" });
      setAuthenticated(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not sign out.");
    }
  };
  const toggleMessage = async (id: number) => {
    try {
      const changed = await api<{ id: number; is_read: boolean }>(`/api/admin/messages/${id}/read`, { method: "PATCH" });
      setMessages((current) => current.map((message) => message.id === id ? { ...message, is_read: changed.is_read } : message));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update this message.");
    }
  };

  if (authenticated === null) return <div className="loading-screen"><span className="spinner" /> Opening your workspace</div>;
  if (!authenticated) return <Login onLogin={() => setAuthenticated(true)} />;

  const viewTitles: Record<View, { title: string; subtitle: string }> = {
    overview: { title: "Good morning, Alex.", subtitle: "Here's a little look at how your corner of the internet is doing." },
    portfolio: { title: "Your portfolio", subtitle: "The story, experience and details behind your teaching." },
    content: { title: "The content library", subtitle: "Share something useful, or keep a thought for later." },
    design: { title: "Make it feel like you.", subtitle: "A few thoughtful choices can make this space your own." },
    templates: { title: "Find your look.", subtitle: "Five ways to tell the same story. Your content stays right where it is." },
    messages: { title: "A note from someone.", subtitle: "Conversations and questions from your website visitors." },
  };
  const activeTitle = viewTitles[view];

  return <div className="admin-shell">
    <aside className={`admin-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
      <button className="admin-brand" onClick={() => setView("overview")}><span className="brand-mark"><span /></span><span>little corner<small>TEACHER STUDIO</small></span></button>
      <div className="workspace-switch"><span className="workspace-avatar">AM</span><span><strong>Alex Morgan</strong><small>Teacher workspace</small></span><ChevronDown size={15} /></div>
      {(["WORKSPACE", "PUBLISH"] as const).map((group) => <div className="nav-group" key={group}><span className="nav-group-label">{group}</span>
        {navItems.filter((item) => item.group === group).map(({ key, label, icon: Icon }) => <button key={key} className={`admin-nav-link ${view === key ? "admin-nav-active" : ""}`} onClick={() => { setView(key); setSidebarOpen(false); }}><Icon size={17} /><span>{label}</span>{key === "messages" && messages.some((message) => !message.is_read) && <i className="unread-dot" />}</button>)}
      </div>)}
      <div className="sidebar-bottom"><button className="view-website" onClick={() => onNavigate("/")}><Globe2 size={16} /> View website <ArrowUpRight size={14} /></button><div className="sidebar-user"><span className="workspace-avatar">AM</span><span><strong>Alex Morgan</strong><small>Administrator</small></span><button className="icon-button" onClick={() => void logout()} aria-label="Sign out"><LogOut size={16} /></button></div></div>
    </aside>
    <div className="admin-main">
      <header className="admin-topbar"><button className="mobile-toggle icon-button" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar"><LayoutDashboard size={19} /></button>
        <div className="breadcrumbs">Teacher Studio <span>/</span> <strong>{activeTitle.title.replace(".", "")}</strong></div>
        <div className="topbar-actions"><span className="saved-indicator"><span /> All changes saved</span><button className="topbar-help" title="Need a hand?"><CircleHelp size={17} /></button><button className="button button-outline button-small" onClick={() => onNavigate("/")}>View site <ArrowUpRight size={14} /></button></div>
      </header>
      <main className="admin-content">
        <Notice message={notice} onClose={() => setNotice("")} />
        <div className="admin-page-heading"><div><span className="eyebrow"><span className="eyebrow-dot" /> YOUR TEACHER STUDIO</span><h1>{activeTitle.title}</h1><p>{activeTitle.subtitle}</p></div>
          {view === "design" && <div className="heading-actions"><button className="button button-outline button-small" onClick={() => void preview()}><Eye size={15} /> Preview website</button><button className="button button-primary button-small" onClick={() => void publish()}><Globe2 size={15} /> Publish changes</button></div>}
        </div>
        {!site && <div className="loading-inline"><span className="spinner" /> Loading workspace data…</div>}
        {site && view === "overview" && <Overview dashboard={dashboard} items={items} messages={messages} onView={setView} />}
        {site && view === "portfolio" && <PortfolioEditor site={site} onSave={saveProfile} onUpdate={updateSite} onNotice={setNotice} />}
        {site && view === "content" && <ContentManager items={items} categories={categories} onSave={saveContent} onDelete={deleteContent} onCreateCategory={createCategory} onNotice={setNotice} search={search} setSearch={setSearch} />}
        {site && (view === "design" || view === "templates") && <DesignEditor site={site} view={view} onSave={saveDesign} onUpdate={updateSite} onPublish={publish} onNotice={setNotice} onPreview={preview} />}
        {view === "messages" && <Messages messages={messages} onToggle={toggleMessage} />}
      </main>
      <footer className="admin-footer"><span>Made for people who make a difference.</span><span>Need help? <a href="mailto:support@example.com">Get in touch</a></span></footer>
    </div>
  </div>;
}

function Overview({ dashboard, items, messages, onView }: { dashboard: DashboardData | null; items: ContentItem[]; messages: { id: number; name: string; subject: string; message: string; is_read: boolean; created_at: string }[]; onView: (view: View) => void }) {
  const stats = [
    { label: "Website visitors", value: dashboard?.visitors ?? 0, icon: Globe2, note: "All-time visits" },
    { label: "Published pieces", value: dashboard?.published ?? 0, icon: FileText, note: "Out in the world" },
    { label: "Saved drafts", value: dashboard?.drafts ?? 0, icon: Save, note: "Ready when you are" },
    { label: "Resource downloads", value: dashboard?.downloads ?? 0, icon: ArrowDown, note: "Shared with learners" },
  ];
  return <div className="overview-content"><div className="welcome-strip"><div className="welcome-mark"><Sparkles size={25} /></div><div><span>YOUR WORK IS MAKING AN IMPACT</span><p>Every resource you share makes someone's learning journey a little brighter.</p></div><button className="button button-outline button-small" onClick={() => onView("content")}>Create something <Plus size={14} /></button></div>
    <div className="stats-grid">{stats.map(({ label, value, icon: Icon, note }) => <div className="stat-card" key={label}><div className="stat-top"><span>{label}</span><Icon size={17} /></div><strong>{value.toLocaleString()}</strong><small>{note}</small></div>)}</div>
    <div className="overview-grid"><section className="admin-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR RECENT WORK</span><h2>Latest content</h2></div><button className="text-link" onClick={() => onView("content")}>View everything <ArrowUpRight size={14} /></button></div>
      {items.slice(0, 4).map((item) => <div className="recent-item" key={item.id}><span className={`type-icon type-${item.type}`}>{item.type === "video" ? "▶" : item.type === "material" ? "▤" : "✳"}</span><div><strong>{item.title}</strong><small>{item.type} · {new Date(item.updated_at ?? Date.now()).toLocaleDateString()}</small></div><span className={`status-pill status-${item.status}`}>{item.status}</span></div>)}
      {!items.length && <div className="empty-admin"><BookOpen size={22} /><p>Your first story is waiting to be written.</p></div>}
    </section>
      <div className="overview-side"><section className="admin-panel inbox-preview"><div className="panel-heading"><div><span className="eyebrow">THE INBOX</span><h2>Messages <span className="count-badge">{messages.length}</span></h2></div><button className="icon-button" aria-label="View all messages" onClick={() => onView("messages")}><ArrowUpRight size={16} /></button></div>
        {messages.slice(0, 3).map((message) => <button className={`inbox-row ${message.is_read ? "" : "inbox-unread"}`} key={message.id} onClick={() => onView("messages")}><span className="inbox-avatar">{message.name.slice(0, 1)}</span><span><strong>{message.name}</strong><small>{message.subject || message.message}</small></span><span className="inbox-time">{new Date(message.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></button>)}
        {!messages.length && <div className="empty-admin"><Mail size={20} /><p>No messages just yet.</p></div>}
      </section><section className="quick-tip"><span className="tip-icon"><Sparkles size={17} /></span><span className="eyebrow">A GENTLE REMINDER</span><p>Your portfolio grows with you. Update it whenever there's something new to celebrate.</p><button className="text-link" onClick={() => onView("portfolio")}>Update your story <ArrowRight size={14} /></button></section></div></div>
  </div>;
}

function MediaGallery({ site, onUpdate, onNotice }: { site: SiteData; onUpdate: (site: SiteData) => void; onNotice: (message: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const addPhoto = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const photo = await api<{ id: number; url: string; name: string }>("/api/admin/upload", { method: "POST", body: form });
      onUpdate({ ...site, gallery: [{ id: photo.id, url: photo.url, original_name: photo.name }, ...site.gallery] });
      onNotice(`Uploaded ${photo.name}`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Could not upload this photo.");
    } finally {
      setUploading(false);
    }
  };
  const removePhoto = async (id: number) => {
    try {
      await api(`/api/admin/media/${id}`, { method: "DELETE" });
      onUpdate({ ...site, gallery: site.gallery.filter((photo) => photo.id !== id) });
      onNotice("Deleted gallery photo.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Could not remove this photo.");
    }
  };
  return <section className="admin-panel aside-card gallery-manager"><div className="gallery-manager-heading"><div><span className="eyebrow">YOUR LITTLE MOMENTS</span><h3>Photo gallery</h3></div><label className="small-button"><Upload size={13} />{uploading ? "Uploading..." : "Add photo"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} onChange={(event) => { void addPhoto(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label></div>
    <p>Photos you upload here can appear in the gallery section on your website.</p>
    {site.gallery.length ? <div className="media-grid">{site.gallery.map((photo) => <div className="media-thumb" key={photo.id}><img src={photo.url} alt={photo.original_name} /><button type="button" className="icon-button danger-quiet" onClick={() => void removePhoto(photo.id)} aria-label={`Remove ${photo.original_name}`}><Trash2 size={13} /></button></div>)}</div> : <p className="media-empty">Your photo gallery is ready for its first moment.</p>}
  </section>;
}

function PortfolioEditor({ site, onSave, onUpdate, onNotice }: { site: SiteData; onSave: (site: SiteData) => Promise<void>; onUpdate: (site: SiteData) => void; onNotice: (message: string) => void }) {
  const [draft, setDraft] = useState(site);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(site), [site]);
  const updateProfile = (key: keyof SiteData["profile"], value: string) => {
    const next = { ...draft, profile: { ...draft.profile, [key]: value } };
    setDraft(next);
    onUpdate(next);
  };
  const updateRows = (key: "qualifications" | "experiences" | "achievements" | "testimonials", rows: Record<string, string>[]) => {
    const next = { ...draft, [key]: rows } as SiteData;
    setDraft(next);
    onUpdate(next);
  };
  const updateNames = (key: "subjects" | "skills", text: string) => {
    const next = { ...draft, [key]: text.split(",").map((name) => name.trim()).filter(Boolean).map((name) => ({ name })) };
    setDraft(next);
    onUpdate(next);
  };
  const setRows = (key: "qualifications" | "experiences" | "achievements" | "testimonials", rows: Record<string, string>[]) => {
    const current = draft[key] as unknown as Record<string, string>[];
    updateRows(key, rows);
    return current;
  };
  const persist = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try { await onSave(draft); } catch (error) { onNotice(error instanceof Error ? error.message : "Could not save your portfolio."); }
    finally { setSaving(false); }
  };
  return <form className="editor-layout portfolio-editor" onSubmit={persist}><div className="editor-main">
    <section className="admin-panel form-panel"><div className="panel-heading"><div><span className="eyebrow">THE INTRODUCTION</span><h2>Tell your story</h2></div><UserRound size={20} /></div>
      <div className="form-grid"><Field label="Your name"><input required value={draft.profile.name ?? ""} onChange={(event) => updateProfile("name", event.target.value)} /></Field><Field label="What do you do?"><input value={draft.profile.designation ?? ""} onChange={(event) => updateProfile("designation", event.target.value)} /></Field></div>
      <Field label="A one-line introduction" hint="A warm hello for the top of your website."><textarea rows={3} value={draft.profile.introduction ?? ""} onChange={(event) => updateProfile("introduction", event.target.value)} /></Field>
      <Field label="Your biography" hint="What do you believe about teaching and learning?"><textarea rows={6} value={draft.profile.biography ?? ""} onChange={(event) => updateProfile("biography", event.target.value)} /></Field>
    </section>
    <section className="admin-panel form-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR EXPERIENCE</span><h2>Where you've been</h2></div><BookOpen size={20} /></div>
      <Repeater title="Qualifications" rows={draft.qualifications as unknown as Record<string, string>[]} fields={[{ key: "degree", label: "Degree", placeholder: "Degree or qualification" }, { key: "institution", label: "Institution", placeholder: "School or institution" }, { key: "year", label: "Year", placeholder: "Year" }]} onChange={(index, key, value) => { const rows = [...setRows("qualifications", draft.qualifications as unknown as Record<string, string>[])]; rows[index] = { ...rows[index], [key]: value }; updateRows("qualifications", rows); }} onAdd={() => updateRows("qualifications", [...draft.qualifications as unknown as Record<string, string>[], { degree: "", institution: "", year: "" }])} onRemove={(index) => updateRows("qualifications", draft.qualifications.filter((_, i) => i !== index) as unknown as Record<string, string>[])} />
      <Repeater title="Teaching experience" rows={draft.experiences as unknown as Record<string, string>[]} fields={[{ key: "role", label: "Role", placeholder: "Your role" }, { key: "organization", label: "Organization", placeholder: "School or organization" }, { key: "period", label: "Period", placeholder: "2020 — Present" }, { key: "description", label: "Description", placeholder: "What did you do?" }]} onChange={(index, key, value) => { const rows = [...draft.experiences as unknown as Record<string, string>[]]; rows[index] = { ...rows[index], [key]: value }; updateRows("experiences", rows); }} onAdd={() => updateRows("experiences", [...draft.experiences as unknown as Record<string, string>[], { role: "", organization: "", period: "", description: "" }])} onRemove={(index) => updateRows("experiences", draft.experiences.filter((_, i) => i !== index) as unknown as Record<string, string>[])} />
    </section>
    <section className="admin-panel form-panel"><div className="panel-heading"><div><span className="eyebrow">THE DETAILS</span><h2>What you teach & celebrate</h2></div><Sparkles size={20} /></div>
      <Field label="Subjects" hint="Separate subjects with commas."><input value={draft.subjects.map((item) => item.name).join(", ")} onChange={(event) => updateNames("subjects", event.target.value)} placeholder="English, science, creative writing..." /></Field>
      <Field label="Skills & expertise" hint="Separate skills with commas."><input value={draft.skills.map((item) => item.name).join(", ")} onChange={(event) => updateNames("skills", event.target.value)} placeholder="Mentorship, project-based learning..." /></Field>
      <Repeater title="Achievements" rows={draft.achievements as unknown as Record<string, string>[]} fields={[{ key: "title", label: "Award", placeholder: "Award or achievement" }, { key: "organization", label: "Organization", placeholder: "Organization" }, { key: "year", label: "Year", placeholder: "Year" }]} onChange={(index, key, value) => { const rows = [...draft.achievements as unknown as Record<string, string>[]]; rows[index] = { ...rows[index], [key]: value }; updateRows("achievements", rows); }} onAdd={() => updateRows("achievements", [...draft.achievements as unknown as Record<string, string>[], { title: "", organization: "", year: "" }])} onRemove={(index) => updateRows("achievements", draft.achievements.filter((_, i) => i !== index) as unknown as Record<string, string>[])} />
      <Repeater title="Student testimonials" rows={draft.testimonials as unknown as Record<string, string>[]} fields={[{ key: "quote", label: "Quote", placeholder: "What did they say?" }, { key: "author", label: "Name", placeholder: "Student name" }, { key: "detail", label: "Detail", placeholder: "Former student" }]} onChange={(index, key, value) => { const rows = [...draft.testimonials as unknown as Record<string, string>[]]; rows[index] = { ...rows[index], [key]: value }; updateRows("testimonials", rows); }} onAdd={() => updateRows("testimonials", [...draft.testimonials as unknown as Record<string, string>[], { quote: "", author: "", detail: "" }])} onRemove={(index) => updateRows("testimonials", draft.testimonials.filter((_, i) => i !== index) as unknown as Record<string, string>[])} />
    </section>
    <section className="admin-panel form-panel"><div className="panel-heading"><div><span className="eyebrow">SAY HELLO</span><h2>Contact & social links</h2></div><Mail size={20} /></div>
      <div className="form-grid"><Field label="Public email"><input type="email" value={draft.profile.email ?? ""} onChange={(event) => updateProfile("email", event.target.value)} /></Field><Field label="Phone"><input value={draft.profile.phone ?? ""} onChange={(event) => updateProfile("phone", event.target.value)} /></Field><Field label="Location"><input value={draft.profile.location ?? ""} onChange={(event) => updateProfile("location", event.target.value)} /></Field></div>
      {Object.entries(draft.profile.social_links ?? {}).map(([key, url]) => <Field label={`${key} URL`} key={key}><input value={url} onChange={(event) => {
        const next = { ...draft, profile: { ...draft.profile, social_links: { ...draft.profile.social_links, [key]: event.target.value } } };
        setDraft(next);
        onUpdate(next);
      }} /></Field>)}
      <div className="social-add"><Field label="Add a social profile"><input id="new-social-name" placeholder="Network name" /></Field><Field label="Profile URL"><input id="new-social-url" placeholder="https://..." /></Field><button className="small-button" type="button" onClick={() => {
        const name = (document.getElementById("new-social-name") as HTMLInputElement).value.trim();
        const url = (document.getElementById("new-social-url") as HTMLInputElement).value.trim();
        if (!name || !url) { onNotice("Enter a network name and profile URL."); return; }
        const next = { ...draft, profile: { ...draft.profile, social_links: { ...draft.profile.social_links, [name]: url } } };
        setDraft(next); onUpdate(next); onNotice("Saved social profile.");
      }}><Plus size={14} /> Add link</button></div>
    </section>
  </div>
    <aside className="editor-aside"><div className="admin-panel aside-card"><span className="eyebrow">YOUR PROFILE PHOTO</span><div className="profile-preview">{draft.profile.profile_image ? <img src={draft.profile.profile_image} alt="Profile preview" /> : <span>{draft.profile.name.slice(0, 1)}</span>}</div><UploadField label="Profile image" value={draft.profile.profile_image ?? ""} accept="image/*" onChange={(value) => updateProfile("profile_image", value)} onNotice={onNotice} /><UploadField label="Cover image" value={draft.profile.cover_image ?? ""} accept="image/*" onChange={(value) => updateProfile("cover_image", value)} onNotice={onNotice} /></div>
      <MediaGallery site={draft} onUpdate={(next) => { setDraft(next); onUpdate(next); }} onNotice={onNotice} />
      <div className="admin-panel aside-card aside-tip"><Sparkles size={18} /><h3>A note on your story</h3><p>Keep it personal. The details that feel small to you can mean a lot to the person reading them.</p></div>
      <button type="submit" className="button button-primary full-button" disabled={saving}><Save size={16} />{saving ? "Saving..." : "Save portfolio"}</button>
    </aside>
  </form>;
}

function ContentManager({ items, categories, onSave, onDelete, onCreateCategory, onNotice, search, setSearch }: {
  items: ContentItem[]; categories: Category[]; onSave: (item: ContentItem, id?: number) => Promise<void>; onDelete: (id: number) => Promise<void>;
  onCreateCategory: (name: string) => Promise<Category>; onNotice: (message: string) => void; search: string; setSearch: (value: string) => void;
}) {
  const [editing, setEditing] = useState<ContentItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const filtered = useMemo(() => items.filter((item) => (filter === "all" || item.status === filter) && (!search || `${item.title} ${item.excerpt} ${item.tags.join(" ")}`.toLowerCase().includes(search.toLowerCase()))), [filter, items, search]);
  const openNew = () => setEditing({ ...blankItem, id: 0, slug: "" });
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await onSave(editing, editing.id || undefined);
      setEditing(null);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Could not save content.");
    } finally { setSaving(false); }
  };
  const upload = async (file?: File) => {
    if (!file || !editing) return;
    const form = new FormData();
    form.append("file", file);
    try {
      const result = await api<{ url: string }>("/api/admin/upload", { method: "POST", body: form });
      setEditing({ ...editing, file_url: result.url });
      onNotice("Uploaded your resource file.");
    } catch (error) { onNotice(error instanceof Error ? error.message : "Upload failed."); }
  };
  return <div className="content-manager">
    <div className="library-admin-toolbar"><div className="admin-tabs">{["all", "published", "draft", "scheduled"].map((item) => <button key={item} className={filter === item ? "admin-tab-active" : ""} onClick={() => setFilter(item)}>{item === "all" ? "Everything" : `${item[0].toUpperCase()}${item.slice(1)}`} <span>{item === "all" ? items.length : items.filter((entry) => entry.status === item).length}</span></button>)}</div>
      <button className="button button-primary" onClick={openNew}><Plus size={16} /> Create something</button></div>
    <div className="admin-panel content-table-panel"><div className="table-toolbar"><label className="search-field admin-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a story or resource..." /></label><span>{filtered.length} {filtered.length === 1 ? "piece" : "pieces"}</span></div>
      <div className="content-table"><div className="table-head"><span>CONTENT</span><span>TYPE</span><span>LAST UPDATED</span><span>STATUS</span><span /></div>
        {filtered.map((item) => <div className="table-row" key={item.id}><div className="table-title"><span className={`type-icon type-${item.type}`}>{item.type === "video" ? "▶" : item.type === "material" ? "▤" : "✳"}</span><span><strong>{item.title}</strong><small>{item.category_name || "Uncategorized"}</small></span></div><span className="table-type">{item.type}</span><span className="table-date">{new Date(item.updated_at ?? Date.now()).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span><span className={`status-pill status-${item.status}`}>{item.status}</span><div className="table-actions"><button className="small-button" onClick={() => setEditing(item)}>Edit</button><button className="icon-button danger-quiet" aria-label={`Delete ${item.title}`} onClick={() => { if (window.confirm(`Delete “${item.title}”? This cannot be undone.`)) void onDelete(item.id); }}><Trash2 size={15} /></button></div></div>)}
        {!filtered.length && <div className="empty-admin"><FileText size={22} /><p>Nothing to show. Start with a story, lesson or resource.</p></div>}
      </div>
    </div>
    <div className="category-panel"><div><span className="eyebrow">KEEP THINGS ORGANIZED</span><h3>Resource categories</h3></div><div className="category-chips">{categories.map((category) => <span key={category.id}>{category.name}</span>)}</div><form onSubmit={async (event) => {
      event.preventDefault();
      if (!newCategory.trim()) return;
      setCategoryBusy(true);
      try { await onCreateCategory(newCategory.trim()); setNewCategory(""); onNotice("Saved new category."); }
      catch (error) { onNotice(error instanceof Error ? error.message : "Could not create category."); }
      finally { setCategoryBusy(false); }
    }}><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Add a category..." maxLength={80} /><button className="small-button" disabled={categoryBusy}><Plus size={14} /> Add</button></form></div>

    {editing && <div className="dialog-scrim admin-dialog-scrim" role="presentation" onClick={() => setEditing(null)}><form className="admin-content-dialog" onSubmit={save} onClick={(event) => event.stopPropagation()}>
      <div className="content-dialog-heading"><div><span className="eyebrow">{editing.id ? "MAKE IT JUST RIGHT" : "ADD TO YOUR LIBRARY"}</span><h2>{editing.id ? "Edit your content" : "Create something new"}</h2></div><button type="button" className="icon-button" onClick={() => setEditing(null)} aria-label="Close"><X size={19} /></button></div>
      <Field label="Title"><input required maxLength={180} value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} placeholder="A title that says a little something" /></Field>
      <div className="form-grid"><Field label="Kind of content"><select value={editing.type} onChange={(event) => setEditing({ ...editing, type: event.target.value as ContentItem["type"] })}><option value="article">Article / blog</option><option value="material">Study material</option><option value="video">Video lesson</option><option value="announcement">Announcement</option><option value="achievement">Achievement</option><option value="resource">Educational resource</option></select></Field>
        <Field label="Where it belongs"><select value={editing.category_id ?? ""} onChange={(event) => setEditing({ ...editing, category_id: event.target.value ? Number(event.target.value) : null })}><option value="">No category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></Field></div>
      <Field label="A short introduction" hint="Appears on resource cards."><textarea rows={3} maxLength={600} value={editing.excerpt} onChange={(event) => setEditing({ ...editing, excerpt: event.target.value })} placeholder="Give readers a reason to take a closer look." /></Field>
      <Field label="The full story" hint="Plain text is lovely. Keep paragraphs separated by a blank line."><textarea rows={7} maxLength={50000} value={editing.body} onChange={(event) => setEditing({ ...editing, body: event.target.value })} placeholder="Write your article, lesson notes or resource description..." /></Field>
      <div className="form-grid"><Field label="Cover image URL"><input value={editing.cover_image} onChange={(event) => setEditing({ ...editing, cover_image: event.target.value })} placeholder="https://..." /></Field>
        <div className="admin-field"><span>PDF or document</span><label className="upload-inline"><Upload size={15} /> Upload file<input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>{editing.file_url && <a className="file-attached" href={editing.file_url} target="_blank" rel="noreferrer">File attached <ArrowUpRight size={13} /></a>}</div></div>
      {editing.type === "video" && <Field label="Video link"><input value={editing.video_url} onChange={(event) => setEditing({ ...editing, video_url: event.target.value })} placeholder="https://youtube.com/..." /></Field>}
      <Field label="Tags" hint="A comma-separated list helps readers find your work."><input value={editing.tags.join(", ")} onChange={(event) => setEditing({ ...editing, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 12) })} placeholder="reading, study skills, classroom" /></Field>
      <div className="form-grid"><Field label="Search result title"><input maxLength={180} value={editing.seo_title ?? ""} onChange={(event) => setEditing({ ...editing, seo_title: event.target.value })} placeholder="Optional" /></Field><Field label="Search result description"><input maxLength={320} value={editing.seo_description ?? ""} onChange={(event) => setEditing({ ...editing, seo_description: event.target.value })} placeholder="A short description for search engines" /></Field></div>
      <div className="form-grid"><Field label="Visibility"><select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as ContentItem["status"] })}><option value="draft">Save as draft</option><option value="published">Publish now</option><option value="scheduled">Schedule for later</option></select></Field>{editing.status === "scheduled" && <Field label="Publication date & time"><input required type="datetime-local" value={editing.scheduled_at?.slice(0, 16) ?? ""} onChange={(event) => setEditing({ ...editing, scheduled_at: event.target.value ? new Date(event.target.value).toISOString() : null })} /></Field>}</div>
      <div className="dialog-actions"><button type="button" className="button button-outline" onClick={() => setEditing(null)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? "Saving..." : editing.status === "published" ? <><Globe2 size={15} /> Publish</> : <><Save size={15} /> Save {editing.status === "draft" ? "draft" : "changes"}</>}</button></div>
    </form></div>}
  </div>;
}

function DesignEditor({ site, view, onSave, onUpdate, onPublish, onNotice, onPreview }: {
  site: SiteData; view: "design" | "templates"; onSave: (site: SiteData) => Promise<void>; onUpdate: (site: SiteData) => void; onPublish: () => Promise<void>; onNotice: (message: string) => void; onPreview: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [dragged, setDragged] = useState<number | null>(null);
  const update = (patch: Partial<SiteData>) => onUpdate({ ...site, ...patch });
  const save = async () => {
    setSaving(true);
    try { await onSave(site); } catch (error) { onNotice(error instanceof Error ? error.message : "Could not save design."); }
    finally { setSaving(false); }
  };
  const reset = async () => {
    try {
      await api("/api/admin/design/reset", { method: "POST" });
      const fresh = await api<SiteData>("/api/admin/portfolio");
      onUpdate(fresh);
      onNotice("Saved design draft.");
    } catch (error) { onNotice(error instanceof Error ? error.message : "Could not reset design."); }
  };
  const setDesign = (key: keyof Design, value: string) => update({ design: { ...site.design, [key]: value } as Design });
  const setTemplate = (template: string) => update({ template });
  const reorder = (source: number, target: number) => {
    if (source === target) return;
    const sections = [...site.sections];
    const [item] = sections.splice(source, 1);
    sections.splice(target, 0, item);
    update({ sections });
  };
  return <div className={`design-layout ${view === "templates" ? "templates-view" : ""}`}>
    {view === "templates" ? <section className="template-gallery"><div className="template-gallery-heading"><div><span className="eyebrow">FIVE WAYS TO TELL YOUR STORY</span><h2>Same heart. Different look.</h2><p>Pick a starting point. Your writing and resources stay right where they are.</p></div><button className="button button-primary" onClick={() => void onPublish()}><Globe2 size={15} /> Publish template</button></div>
      <div className="template-grid">{templateList.map((template, index) => <article className={`template-card ${site.template === template.id ? "template-selected" : ""}`} key={template.id}>
        <div className={`template-mockup mockup-${template.id}`} style={{ backgroundColor: template.color }}><div className="mockup-bar"><span /><span /><span /></div><div className="mockup-content"><div className="mockup-serif" style={{ color: site.design.primary }}>{template.mark}</div><span className="mockup-line mockup-line-long" /><span className="mockup-line" /><div className="mockup-image" /></div><span className="template-number">0{index + 1}</span></div>
        <div className="template-card-body"><div><h3>{template.name}</h3><p>{template.note}</p></div>{site.template === template.id ? <span className="selected-label"><Check size={14} /> Selected</span> : <button className="small-button" onClick={() => setTemplate(template.id)}>Choose template</button>}</div>
      </article>)}</div>
      <div className="template-note"><Sparkles size={17} /><p>Want to see your content in a different light? Choose a template and preview it before you publish.</p><button className="text-link" onClick={() => void onPreview()}>Preview website <ArrowUpRight size={14} /></button></div>
    </section> : <>
      <div className="design-controls">
        <section className="admin-panel form-panel"><div className="panel-heading"><div><span className="eyebrow">START WITH A FEELING</span><h2>Your visual palette</h2></div><Palette size={20} /></div>
          <div className="color-controls">{([{ key: "primary", label: "A little color" }, { key: "accent", label: "A warm accent" }, { key: "background", label: "Page background" }] as const).map(({ key, label }) => <label className="color-setting" key={key}><span className="color-swatch" style={{ background: site.design[key] }}><input type="color" value={site.design[key]} onChange={(event) => setDesign(key, event.target.value)} /></span><span><strong>{label}</strong><small>{site.design[key].toUpperCase()}</small></span><input className="color-code" value={site.design[key]} onChange={(event) => /^#[0-9a-f]{6}$/i.test(event.target.value) && setDesign(key, event.target.value)} /></label>)}</div>
          <div className="form-grid design-selects"><Field label="Typography"><select value={site.design.font} onChange={(event) => setDesign("font", event.target.value)}><option>DM Sans</option><option>Georgia</option><option>Inter</option><option>Lora</option></select></Field>
            <Field label="Corner style"><select value={site.design.radius} onChange={(event) => setDesign("radius", event.target.value)}><option value="8px">Neat & tidy</option><option value="18px">Soft & welcoming</option><option value="28px">Extra rounded</option></select></Field>
            <Field label="Page spacing"><select value={site.design.layout} onChange={(event) => setDesign("layout", event.target.value)}><option value="comfortable">Comfortable</option><option value="compact">Compact</option><option value="spacious">Spacious</option></select></Field>
          </div>
        </section>
        <section className="admin-panel form-panel sections-panel"><div className="panel-heading"><div><span className="eyebrow">MAKE IT YOURS</span><h2>What shows up, and where</h2></div><Settings2 size={20} /></div><p className="panel-description">Drag or use arrows to arrange your sections. Switch off anything you don't need yet.</p>
          <div className="section-arranger">{site.sections.map((section, index) => <div className={`arrange-row ${dragged === index ? "is-dragging" : ""}`} key={section.key} draggable onDragStart={() => setDragged(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragged !== null) reorder(dragged, index); setDragged(null); }} onDragEnd={() => setDragged(null)}>
            <span className="drag-handle" title="Drag to reorder">⠿</span><input aria-label={`Section ${index + 1} label`} value={section.label} onChange={(event) => update({ sections: site.sections.map((item) => item.key === section.key ? { ...item, label: event.target.value } : item) })} />
            <div className="arrange-buttons"><button type="button" disabled={index === 0} onClick={() => reorder(index, index - 1)} aria-label={`Move ${section.label} up`}><ArrowUp size={13} /></button><button type="button" disabled={index === site.sections.length - 1} onClick={() => reorder(index, index + 1)} aria-label={`Move ${section.label} down`}><ArrowDown size={13} /></button></div>
            <label className="toggle-switch"><input type="checkbox" checked={section.enabled} onChange={(event) => update({ sections: site.sections.map((item) => item.key === section.key ? { ...item, enabled: event.target.checked } : item) })} /><span /></label>
          </div>)}</div>
        </section>
        <div className="design-actions"><button className="button button-outline" onClick={() => void reset()}>Reset design</button><button className="button button-primary" onClick={() => void save()} disabled={saving}><Save size={15} />{saving ? "Saving..." : "Save draft"}</button></div>
      </div>
      <aside className="design-preview"><div className="preview-heading"><div><span className="eyebrow">A LITTLE SNEAK PEEK</span><h3>Your website</h3></div><button className="icon-button" onClick={() => void onPreview()} aria-label="Open preview"><ArrowUpRight size={17} /></button></div>
        <div className={`mini-preview mini-${site.template}`} style={{ "--primary": site.design.primary, "--accent": site.design.accent, "--page-bg": site.design.background, "--round": site.design.radius, "--font": site.design.font } as CSSProperties}>
          <div className="mini-nav"><span>{site.profile.name}</span><span>Portfolio　Resources　 About</span></div><div className="mini-hero"><span className="eyebrow">A TEACHER'S LITTLE CORNER</span><h3>Making room<br />for <em>curiosity.</em></h3><p>{site.profile.introduction.slice(0, 92)}{site.profile.introduction.length > 92 ? "…" : ""}</p><button>Learn more <ArrowUpRight size={10} /></button></div><div className="mini-image"><span /></div><div className="mini-footer">LEARN A LITTLE EVERY DAY　 ✳</div>
        </div><button className="button button-outline preview-open" onClick={() => void onPreview()}><Eye size={15} /> Preview full website</button>
        <div className="publish-card"><div className="publish-status"><span className="draft-dot" /> Changes are a draft</div><p>Your visitors only see published changes. Preview first, then share it when you're ready.</p><button className="button button-primary full-button" onClick={() => void onPublish()}><Globe2 size={15} /> Publish changes</button></div>
      </aside>
    </>}
  </div>;
}

function Messages({ messages, onToggle }: { messages: { id: number; name: string; email: string; subject: string; message: string; is_read: boolean; created_at: string }[]; onToggle: (id: number) => Promise<void> }) {
  const [selected, setSelected] = useState<number | null>(null);
  return <div className="messages-layout"><div className="admin-panel messages-list">
    <div className="panel-heading"><div><span className="eyebrow">YOUR INBOX</span><h2>{messages.length} {messages.length === 1 ? "message" : "messages"}</h2></div><Mail size={20} /></div>
    {!messages.length && <div className="empty-admin"><Mail size={22} /><p>When someone gets in touch, you'll find their note here.</p></div>}
    {messages.map((message) => <button key={message.id} className={`message-list-item ${selected === message.id ? "message-selected" : ""} ${message.is_read ? "" : "message-unread"}`} onClick={() => { setSelected(message.id); if (!message.is_read) void onToggle(message.id); }}><span className="inbox-avatar">{message.name.slice(0, 1)}</span><span><strong>{message.name}</strong><small>{message.subject || message.message}</small></span><span className="inbox-time">{new Date(message.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></button>)}
  </div>
    <section className="admin-panel message-detail">{selected ? (() => {
      const message = messages.find((item) => item.id === selected);
      if (!message) return <div className="empty-admin"><Mail size={24} /><p>Choose a message to read.</p></div>;
      return <><div className="message-detail-top"><span className="inbox-avatar">{message.name.slice(0, 1)}</span><div><h2>{message.name}</h2><a href={`mailto:${message.email}`}>{message.email}</a></div><span>{new Date(message.created_at).toLocaleString()}</span></div><div className="message-subject">{message.subject || "A note from your website"}</div><p className="message-body">{message.message}</p><a className="button button-primary" href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject || "Your message"}`)}`}><Mail size={15} /> Reply by email</a></>;
    })() : <div className="empty-admin"><MessageSquare size={25} /><p>Choose a note from your inbox.</p></div>}</section>
  </div>;
}

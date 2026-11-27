import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Download, Eye, FileText, GraduationCap, Instagram, Linkedin, Mail, MapPin, Menu, Play, Quote, Send, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { api, apiUrl, fileUrl } from "../api";
import type { ContentItem, SiteData } from "../types";

const sectionLabels: Record<string, string> = {
  about: "A little about me",
  qualifications: "The learning behind the teaching",
  experience: "Where I've made a difference",
  subjects: "What we can explore together",
  skills: "How I help students grow",
  achievements: "A few proud moments",
  testimonials: "Kind words from learners",
  gallery: "Little moments",
  announcements: "From my classroom",
  contact: "Let's start a conversation",
};
const kindLabels: Record<string, string> = {
  article: "Journal", material: "Study material", video: "Video lesson",
  announcement: "Announcement", achievement: "Achievement", resource: "Resource",
};

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function ContentCard({ item, onOpen }: { item: ContentItem; onOpen: (item: ContentItem) => void }) {
  return (
    <button className="content-card" onClick={() => onOpen(item)}>
      <div className={`content-card-image ${!item.cover_image ? `content-image-${item.type}` : ""}`}>
        {item.cover_image ? <img src={fileUrl(item.cover_image)} alt="" /> : <span>{item.type === "video" ? <Play /> : item.type === "material" ? <FileText /> : <BookOpen />}</span>}
        <span className="card-kind">{kindLabels[item.type] ?? "Resource"}</span>
      </div>
      <div className="content-card-copy">
        <div className="content-meta">{item.category_name || "Learning resources"} <span>·</span> {new Date(item.published_at ?? item.scheduled_at ?? Date.now()).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
        <h3>{item.title}</h3>
        <p>{item.excerpt}</p>
        <span className="text-link">Explore <ArrowRight size={15} /></span>
      </div>
    </button>
  );
}

function ContentDialog({ item, onClose }: { item: ContentItem | null; onClose: () => void }) {
  if (!item) return null;
  return (
    <div className="dialog-scrim" role="presentation" onClick={onClose}>
      <article className="content-dialog" role="dialog" aria-modal="true" aria-label={item.title} onClick={(event) => event.stopPropagation()}>
        <button className="icon-button dialog-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
        {item.cover_image && <img className="dialog-cover" src={fileUrl(item.cover_image)} alt="" />}
        <span className="eyebrow">{kindLabels[item.type]}</span>
        <h2>{item.title}</h2>
        <p className="dialog-excerpt">{item.excerpt}</p>
        <div className="dialog-body">{item.body}</div>
        {item.video_url && <a className="button button-dark" href={item.video_url} target="_blank" rel="noreferrer"><Play size={16} /> Watch lesson</a>}
        {item.file_url && <a className="button button-dark" href={apiUrl(`/public/download/${item.id}`)}><Download size={16} /> Download resource</a>}
        {!!item.tags.length && <div className="tag-row">{item.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>}
      </article>
    </div>
  );
}

export default function PublicSite({ site, onNavigate, path = "/", isPreview = false }: { site: SiteData; onNavigate: (path: string) => void; path?: string; isPreview?: boolean }) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [items, setItems] = useState(site.contents);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [contactStatus, setContactStatus] = useState("");
  const [libraryError, setLibraryError] = useState("");
  const [sending, setSending] = useState(false);
  const isContentPage = path === "/content" || path.startsWith("/content/");
  const { profile, design } = site;
  const template = site.template || "modern";
  const sections = site.sections ?? [];
  const enabled = (key: string) => sections.find((section) => section.key === key)?.enabled ?? true;
  const label = (key: string) => sections.find((section) => section.key === key)?.label ?? sectionLabels[key];
  const sectionOrder = (key: string) => {
    const index = sections.findIndex((section) => section.key === key);
    return index < 0 ? 99 : index + 1;
  };
  const announcements = site.contents.filter((item) => item.type === "announcement").slice(0, 2);

  useEffect(() => {
    if (!isContentPage) {
      setItems(site.contents);
      return;
    }
    const query = new URLSearchParams();
    if (search.trim()) query.set("search", search.trim());
    if (filter !== "all") query.set("type", filter);
    if (category !== "all") query.set("category", category);
    setLibraryError("");
    api<ContentItem[]>(`/api/public/content?${query}`)
      .then(setItems)
      .catch((reason: Error) => setLibraryError(reason.message));
  }, [category, filter, isContentPage, search, site.contents]);

  useEffect(() => {
    if (isPreview || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void api("/api/public/visitor-location", {
          method: "POST",
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }),
        }).catch(() => undefined);
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30 * 60 * 1000 },
    );
  }, [isPreview]);

  const style = {
    "--primary": design?.primary ?? "#426b59",
    "--accent": design?.accent ?? "#d9a77d",
    "--page-bg": design?.background ?? "#f6f7f4",
    "--round": design?.radius ?? "18px",
    "--font": design?.font ?? "DM Sans",
  } as CSSProperties;
  const handleContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setContactStatus("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const result = await api<{ message: string }>("/api/public/contact", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      setContactStatus(result.message);
      formElement.reset();
    } catch (reason) {
      setContactStatus(reason instanceof Error ? reason.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  };
  const scrollTo = (id: string) => {
    setMobileMenu(false);
    if (isContentPage) onNavigate("/");
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), isContentPage ? 100 : 0);
  };

  const renderedItems = useMemo(() => items, [items]);
  return (
    <div className={`public-site template-${template} layout-${design?.layout ?? "comfortable"}`} style={style}>
      {isPreview && <div className="preview-banner"><Eye size={14} /> Previewing unpublished changes <button onClick={() => onNavigate("/admin")}>Back to studio <ArrowUpRight size={13} /></button></div>}
      <header className="site-header">
        <button className="brand" onClick={() => onNavigate("/")}>
          <span className="brand-mark"><span /></span>
          <span>{profile?.name || "Alex Morgan"}<small>TEACHER · MENTOR · LEARNER</small></span>
        </button>
        <button className="mobile-toggle icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation">{mobileMenu ? <X /> : <Menu />}</button>
        <nav className={`main-nav ${mobileMenu ? "nav-open" : ""}`}>
          <button className={!isContentPage ? "nav-active" : ""} onClick={() => onNavigate("/")}>My portfolio</button>
          <button className={isContentPage ? "nav-active" : ""} onClick={() => onNavigate("/content")}>Learning library</button>
          <button onClick={() => scrollTo("about")}>My story</button>
          <button className="nav-contact" onClick={() => scrollTo("contact")}>Start a conversation <ArrowUpRight size={14} /></button>
        </nav>
      </header>

      {isContentPage ? (
        <main className="resources-page">
          <section className="resources-intro">
            <span className="eyebrow"><span className="eyebrow-dot" /> THE RESOURCE LIBRARY</span>
            <h1>A little something<br /><em>to keep you curious.</em></h1>
            <p>Thoughts, tools and teaching resources for the journey ahead.</p>
          </section>
          <section className="library-section">
            <div className="library-toolbar">
              <div><h2>Explore the library</h2><span className="result-count">{renderedItems.length} resources</span></div>
              <label className="search-field"><span className="sr-only">Search resources</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search resources..." /><span>⌕</span></label>
            </div>
            <div className="filter-row">
              {["all", "article", "material", "video", "announcement", "resource", "achievement"].map((kind) =>
                <button className={filter === kind ? "filter-active" : ""} key={kind} onClick={() => setFilter(kind)}>{kind === "all" ? "Everything" : kindLabels[kind]}</button>)}
            </div>
            {!!site.categories.length && <label className="category-filter">Browse a category <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{site.categories.map((item) => <option value={item.slug} key={item.id}>{item.name}</option>)}</select></label>}
            {libraryError ? <div className="empty-state"><BookOpen size={24} /><h3>We couldn't search the library.</h3><p>{libraryError}</p></div> : renderedItems.length ? <div className="content-grid">{renderedItems.map((item) => <ContentCard key={item.id} item={item} onOpen={setSelectedItem} />)}</div> : <div className="empty-state"><BookOpen size={24} /><h3>Nothing here just yet</h3><p>Try another search or category.</p></div>}
          </section>
        </main>
      ) : (
        <main>
          <section className="hero-section">
            <div className="hero-copy">
              <span className="eyebrow"><span className="eyebrow-dot" /> A WARM PLACE TO GROW AND DISCOVER</span>
              <h1>Learning feels<br />better when <em>we grow together.</em></h1>
              <p>{profile?.introduction || "Thoughtful lessons, meaningful connections and the confidence to ask questions."}</p>
              <div className="hero-actions">
                <button className="button button-primary" onClick={() => scrollTo("about")}>Meet your teacher <ArrowDown size={16} /></button>
                <button className="button button-quiet" onClick={() => onNavigate("/content")}>Explore learning resources <ArrowRight size={16} /></button>
              </div>
              <div className="hero-proof">
                <div><strong>{site.qualifications.length}</strong><span>Qualifications</span></div>
                <div><strong>{site.experiences.length}</strong><span>Teaching roles</span></div>
                <div><strong>{site.subjects.length}</strong><span>Subjects</span></div>
              </div>
              <div className="hero-note"><span className="note-line" /> {profile?.designation || "Educator & lifelong learner"} <span className="note-sparkle"><Sparkles size={14} /></span></div>
            </div>
            <div className="hero-art">
              <div className="hero-image-frame">
                <img src={fileUrl(profile?.cover_image) || "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1400&q=85"} alt="A sunlit classroom ready for students" />
                <div className="image-caption"><span className="caption-dot" /> A place to learn and grow</div>
              </div>
              <div className="portrait-card">
                {profile?.profile_image ? <img src={fileUrl(profile.profile_image)} alt={profile.name} /> : <span>{initials(profile?.name || "AM")}</span>}
                <div><strong>{profile?.name}</strong><small>{profile?.designation}</small></div>
                <div className="portrait-stamp"><Sparkles size={18} /></div>
              </div>
              <div className="art-scribble">learn a little<br />every day <span>↗</span></div>
              <span className="art-dot art-dot-one" /><span className="art-dot art-dot-two" />
            </div>
            <div className="hero-bottom"><span>01 / 04</span><span className="hero-bottom-line" /><span>GOOD THINGS START WITH A QUESTION</span><span className="hero-bottom-scroll">SCROLL TO EXPLORE ↓</span></div>
          </section>

          {enabled("about") && <section className="section about-section" id="about" style={{ order: sectionOrder("about") }}>
            <div className="section-index">01 <span>—</span> A BIT ABOUT ME</div>
            <div className="about-grid"><div><span className="eyebrow">MY TEACHING PHILOSOPHY</span><h2>{label("about")}</h2></div>
              <div className="about-copy"><p className="lead-copy">{profile?.biography}</p><p>I want every student to leave my classroom feeling a little more capable, a little more curious, and completely themselves.</p><div className="about-signoff">With care, <span>{profile?.name}</span> <span className="signoff-leaf">✳</span></div></div></div>
          </section>}

          {(enabled("qualifications") || enabled("experience")) && <section className="section journey-section" style={{ order: sectionOrder(enabled("qualifications") ? "qualifications" : "experience") }}>
            <div className="section-index">02 <span>—</span> THE JOURNEY SO FAR</div>
            <div className="journey-heading"><h2>Always learning.<br /><em>Always teaching.</em></h2><p>A little of what shaped the educator I am today.</p></div>
            <div className="journey-grid">
              {enabled("qualifications") && <div className="journey-column"><div className="column-heading"><span className="round-icon"><GraduationCap size={19} /></span><div><span className="eyebrow">THE CLASSROOM STARTS HERE</span><h3>Education</h3></div></div>
                {site.qualifications.map((item, index) => <div className="timeline-item" key={`${item.degree}-${index}`}><span className="timeline-dot" /><div><h4>{item.degree}</h4><p>{item.institution}</p><small>{item.year}</small></div></div>)}</div>}
              {enabled("experience") && <div className="journey-column"><div className="column-heading"><span className="round-icon"><BookOpen size={18} /></span><div><span className="eyebrow">A FEW PLACES I'VE BEEN</span><h3>Experience</h3></div></div>
                {site.experiences.map((item, index) => <div className="timeline-item" key={`${item.role}-${index}`}><span className="timeline-dot" /><div><h4>{item.role}</h4><p>{item.organization}</p><small>{item.period}</small>{item.description && <p className="timeline-description">{item.description}</p>}</div></div>)}</div>}
            </div>
          </section>}

          {(enabled("subjects") || enabled("skills")) && <section className="section subjects-section" style={{ order: sectionOrder(enabled("subjects") ? "subjects" : "skills") }}>
            <div className="subjects-intro"><div className="section-index">03 <span>—</span> THE GOOD STUFF</div><h2>Learning looks<br />different for <em>everyone.</em></h2><p>I meet students where they are and help them find their own way forward.</p></div>
            <div className="subjects-content">
              {enabled("subjects") && <div><span className="eyebrow">{label("subjects")}</span><div className="subject-tags">{site.subjects.map((subject) => <span className="subject-tag" key={subject.id ?? subject.name}>{subject.name}<ArrowUpRight size={13} /></span>)}</div></div>}
              {enabled("skills") && <div className="expertise-list"><span className="eyebrow">{label("skills")}</span>{site.skills.map((skill, index) => <div className="expertise-item" key={skill.id ?? skill.name}><span>0{index + 1}</span><strong>{skill.name}</strong><ArrowUpRight size={15} /></div>)}</div>}
            </div>
          </section>}

          {enabled("achievements") && site.achievements.length > 0 && <section className="section achievement-section" style={{ order: sectionOrder("achievements") }}>
            <div className="section-index">04 <span>—</span> MILESTONES</div><div className="achievement-row"><span className="award-icon"><Sparkles size={24} /></span>
              <div><span className="eyebrow">{label("achievements")}</span><h2>{site.achievements[0].title}</h2><p>{site.achievements[0].organization} <span>·</span> {site.achievements[0].year}</p></div>
              {site.achievements.length > 1 && <div className="more-awards">{site.achievements.slice(1).map((item) => <span key={item.id ?? item.title}>{item.title} · {item.year}</span>)}</div>}</div>
          </section>}

          {enabled("testimonials") && site.testimonials.length > 0 && <section className="section testimonial-section" style={{ order: sectionOrder("testimonials") }}>
            <div className="testimonial-ornament"><Quote size={37} /></div><div className="section-index">05 <span>—</span> NOTES I'LL KEEP</div>
            <div className="testimonial-content"><span className="eyebrow">{label("testimonials")}</span><blockquote>“{site.testimonials[0].quote}”</blockquote><div className="testimonial-author"><span className="author-avatar">{initials(site.testimonials[0].author)}</span><div><strong>{site.testimonials[0].author}</strong><small>{site.testimonials[0].detail}</small></div></div></div>
          </section>}

          {enabled("gallery") && site.gallery?.length > 0 && <section className="section gallery-section" style={{ order: sectionOrder("gallery") }}>
            <div className="section-index">06 <span>—</span> LITTLE MOMENTS</div><div className="gallery-heading"><div><span className="eyebrow">{label("gallery")}</span><h2>Some days worth remembering.</h2></div><Sparkles size={20} /></div>
            <div className="gallery-grid">{site.gallery.map((image) => <figure key={image.id}><img src={fileUrl(image.url)} alt={image.original_name} /><figcaption>{image.original_name}</figcaption></figure>)}</div>
          </section>}

          {enabled("announcements") && announcements.length > 0 && <section className="section latest-section" style={{ order: sectionOrder("announcements") }}>
            <div className="latest-heading"><div><div className="section-index">06 <span>—</span> FRESH FROM THE CLASSROOM</div><h2>{label("announcements")}</h2></div><button className="text-link" onClick={() => onNavigate("/content")}>Everything I've shared <ArrowRight size={15} /></button></div>
            <div className="latest-grid">{announcements.map((item) => <ContentCard key={item.id} item={item} onOpen={setSelectedItem} />)}</div>
          </section>}

          {enabled("contact") && <section className="contact-section" id="contact" style={{ order: sectionOrder("contact") }}>
            <div className="contact-heading"><div className="section-index">07 <span>—</span> YOUR TURN</div><h2>Have a question?<br /><em>I'd love to hear it.</em></h2><p>Whether it's about a lesson, a resource, or just an idea you've been thinking about — my inbox is open.</p>
              <div className="contact-details">{profile?.email && <a href={`mailto:${profile.email}`}><Mail size={16} />{profile.email}</a>}{profile?.location && <span><MapPin size={16} />{profile.location}</span>}</div>
              <div className="social-links">{Object.entries(profile?.social_links ?? {}).map(([name, url]) => <a href={url} key={name} target="_blank" rel="noreferrer">{name === "LinkedIn" ? <Linkedin size={16} /> : name === "Instagram" ? <Instagram size={16} /> : <ArrowUpRight size={16} />}{name}</a>)}</div>
            </div>
            <form className="contact-form" onSubmit={handleContact}><div className="form-topline"><span>DROP ME A NOTE</span><span>✳</span></div>
              <label>Your name<input name="name" required maxLength={120} placeholder="What should I call you?" /></label>
              <label>Email address<input name="email" type="email" required maxLength={254} placeholder="you@example.com" /></label>
              <label>What is this about?<input name="subject" maxLength={180} placeholder="A question, an idea, anything..." /></label>
              <label>Your message<textarea name="message" rows={4} minLength={10} maxLength={5000} required placeholder="Take your time. I'm listening." /></label>
              {contactStatus && <p className={`form-message ${contactStatus.startsWith("Thanks") ? "success" : "failure"}`}>{contactStatus}</p>}
              <button className="button button-primary send-button" type="submit" disabled={sending}>{sending ? "Sending..." : "Send your note"} <Send size={16} /></button>
            </form>
          </section>}
        </main>
      )}

      <footer className="site-footer">
        <button className="brand" onClick={() => onNavigate("/")}><span className="brand-mark"><span /></span><span>{profile?.name || "Alex Morgan"}<small>TEACHER · MENTOR · LEARNER</small></span></button>
        <p>Made with care, for the love of learning <span>✳</span></p>
        <div className="footer-nav"><button onClick={() => onNavigate("/")}>Portfolio</button><button onClick={() => onNavigate("/content")}>Resources</button><button onClick={() => onNavigate("/admin")}>Teacher login</button><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to top ↑</button></div>
        <small className="copyright">© {new Date().getFullYear()} {profile?.name || "Alex Morgan"}</small>
      </footer>
      <ContentDialog item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}

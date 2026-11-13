import { createContext, useContext, useEffect, useState } from "react";
import { Modal } from "@mantine/core";
import {
  IconBrandGithub,
  IconBrandLinkedin,
  IconArrowsMaximize,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconArrowUpRight,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconCopy,
} from "@tabler/icons-react";
import { LANGUAGES, translations } from "./translations";

const EMAIL = "contact@kevivois.ch";

const LangContext = createContext(null);
const useLang = () => useContext(LangContext);

const sectionIds = ["accueil", "projets", "parcours", "competences", "contact", "passions"];

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const update = () => {
      const marker = window.innerHeight * 0.42;
      const current = ids.reduce((found, id) => {
        const section = document.getElementById(id);
        return section && section.getBoundingClientRect().top <= marker ? id : found;
      }, ids[0]);
      setActive(current);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ids]);
  return active;
}

function LanguageSwitcher({ current, onChange }) {
  return (
    <div className="lang-switcher" role="group" aria-label="Langues / Languages">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          className={`lang-btn${current === l.code ? " is-active" : ""}`}
          onClick={() => onChange(l.code)}
          aria-pressed={current === l.code}
          aria-label={l.name}
          title={l.name}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function ScrollJourney({ active }) {
  const { t } = useLang();
  const [progress, setProgress] = useState(0);

  const scrollStops = [
    { id: "accueil", label: t.nav.depart },
    { id: "projets", label: t.nav.projets },
    { id: "parcours", label: t.nav.parcours },
    { id: "competences", label: t.nav.competences },
    { id: "contact", label: t.nav.contact },
    { id: "passions", label: t.nav.passions },
  ];

  const activeIndex = Math.max(0, scrollStops.findIndex((stop) => stop.id === active));
  const previous = scrollStops[activeIndex - 1];
  const next = scrollStops[activeIndex + 1];

  useEffect(() => {
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const value = scrollable > 0 ? Math.round((window.scrollY / scrollable) * 100) : 0;
      setProgress((current) => current === value ? current : value);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <aside className={`scroll-journey${active === "accueil" ? " is-intro" : ""}`} aria-label={t.journey.label}>
      <p className="journey-current" aria-live="polite">
        <span>{String(activeIndex + 1).padStart(2, "0")} / {String(scrollStops.length).padStart(2, "0")}</span>
        <b>{scrollStops[activeIndex].label}</b>
      </p>
      <nav className="journey-nav" aria-label={t.journey.stepsLabel}>
        <ol>
          {scrollStops.map((stop, index) => (
            <li key={stop.id}>
              <a
                href={`#${stop.id}`}
                className={active === stop.id ? "is-active" : undefined}
                aria-label={`${String(index + 1).padStart(2, "0")} : ${stop.label}`}
                aria-current={active === stop.id ? "location" : undefined}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span>{stop.label}</span>
              </a>
            </li>
          ))}
        </ol>
        <span className="journey-progress" style={{ "--scroll-progress": `${progress}%` }} aria-hidden="true" />
      </nav>
      <div className="journey-mobile">
        {previous ? (
          <a href={`#${previous.id}`} aria-label={`${t.journey.prev} ${previous.label}`}><IconArrowLeft className="inline-arrow" stroke={1.7} aria-hidden="true" /></a>
        ) : <span aria-hidden="true" />}
        <a className="journey-mobile-current" href={`#${scrollStops[activeIndex].id}`}>
          {String(activeIndex + 1).padStart(2, "0")} / {String(scrollStops.length).padStart(2, "0")}
          <span>{scrollStops[activeIndex].label}</span>
        </a>
        {next ? (
          <a href={`#${next.id}`} aria-label={`${t.journey.next} ${next.label}`}><IconArrowRight className="inline-arrow" stroke={1.7} aria-hidden="true" /></a>
        ) : <span aria-hidden="true" />}
        <span className="journey-mobile-progress" style={{ "--scroll-progress": `${progress}%` }} aria-hidden="true" />
      </div>
    </aside>
  );
}

function Reveal({ as: Tag = "div", className = "", children, ...props }) {
  const observe = (node) => {
    if (!node) return undefined;
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      node.classList.add("is-visible");
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -48px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  };
  return (
    <Tag ref={observe} className={`reveal ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}

function SlideLink({ children, icon, className = "", ...props }) {
  return (
    <a className={`slide-link ${className}`.trim()} {...props}>
      {children}
      {icon}
    </a>
  );
}

function CopyEmail() {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${EMAIL}`;
    }
  };
  return (
    <button type="button" className="copy-email" onClick={copy} aria-live="polite">
      <span>{EMAIL}</span>
      {copied ? <IconCheck size={13} stroke={2} /> : <IconCopy size={13} stroke={1.8} />}
      <span className="visually-hidden">
        {copied ? t.contact.emailCopied : t.contact.copyEmail}
      </span>
    </button>
  );
}

function SectionHeading({ id, children, aside }) {
  return (
    <div className="section-heading">
      <h2 id={id}>{children}</h2>
      {aside && <span className="section-aside">{aside}</span>}
    </div>
  );
}

function PassionsSection() {
  const { t } = useLang();
  const passions = t.passions.items;
  const [previewIndex, setPreviewIndex] = useState(null);
  const preview = previewIndex === null ? null : passions[previewIndex];
  const showPrevious = () => setPreviewIndex((previewIndex + passions.length - 1) % passions.length);
  const showNext = () => setPreviewIndex((previewIndex + 1) % passions.length);

  useEffect(() => {
    if (previewIndex === null) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setPreviewIndex(null);
      if (event.key === "ArrowLeft") {
        setPreviewIndex((current) => (current + passions.length - 1) % passions.length);
      }
      if (event.key === "ArrowRight") {
        setPreviewIndex((current) => (current + 1) % passions.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewIndex, passions.length]);

  return (
    <Reveal as="section" id="passions" className="passions-section" aria-labelledby="passions-heading">
      <div className="passions-inner">
        <div className="passions-intro">
          <div className="passions-copy">
            <p className="passions-kicker">{t.passions.kicker}</p>
            <h2 id="passions-heading">{t.passions.heading}</h2>
          </div>
        </div>
        <div className="passions-gallery" aria-label={t.passions.ariaLabel}>
          {["views", "movement", "elsewhere"].map((column) => (
            <div className={`passions-column passions-column-${column}`} key={column}>
              {passions.filter((photo) => photo.column === column).map((photo, index) => (
                <figure
                  className={`passion-photo passion-photo-${photo.id}`}
                  key={photo.id || photo.src}
                  style={{ "--photo-delay": `${index * 100}ms`, "--mobile-order": photo.mobileOrder }}
                >
                  <button
                    className="passion-image-button"
                    type="button"
                    onClick={() => setPreviewIndex(passions.findIndex((item) => item.id === photo.id))}
                    aria-label={`${t.passions.viewLargeAria} ${photo.caption}`}
                    aria-haspopup="dialog"
                  >
                    <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
                    <span className="passion-zoom" aria-hidden="true">
                      {t.passions.zoom} <IconArrowUpRight className="inline-arrow" stroke={1.7} />
                    </span>
                  </button>
                  <figcaption>{photo.caption}</figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>
      </div>
      <Modal
        opened={preview !== null}
        onClose={() => setPreviewIndex(null)}
        title={preview?.caption}
        size="min(1100px, calc(100vw - 32px))"
        centered
        className="image-modal passion-modal"
        aria-label={t.passions.modalAria}
        overlayProps={{ backgroundOpacity: 0.88, blur: 10 }}
        transitionProps={{ transition: "fade", duration: 280, timingFunction: "cubic-bezier(.2, .75, .2, 1)" }}
      >
        {preview && (
          <div className="passion-lightbox">
            <button type="button" className="passion-lightbox-arrow" onClick={showPrevious} aria-label={t.passions.prevPhoto}>
              <IconChevronLeft size={22} stroke={1.7} aria-hidden="true" />
            </button>
            <img key={preview.src} src={preview.src} alt={preview.alt} />
            <button type="button" className="passion-lightbox-arrow" onClick={showNext} aria-label={t.passions.nextPhoto}>
              <IconChevronRight size={22} stroke={1.7} aria-hidden="true" />
            </button>
            <p>{String(previewIndex + 1).padStart(2, "0")} / {String(passions.length).padStart(2, "0")}</p>
          </div>
        )}
      </Modal>
    </Reveal>
  );
}

function Portrait() {
  const { t } = useLang();
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <figure className="portrait">
        <button
          type="button"
          className="portrait-image-button"
          onClick={() => setPreviewOpen(true)}
          aria-label={t.cover.portraitAria}
          aria-haspopup="dialog"
        >
          <picture>
            <source
              type="image/webp"
              srcSet="/portrait-2026-480.webp 480w, /portrait-2026-720.webp 720w, /portrait-2026-960.webp 960w"
              sizes="(max-width: 640px) calc(100vw - 72px), (max-width: 1023px) 36vw, 390px"
            />
            <img
              src="/portrait-2026-720.jpg"
              alt={t.cover.portraitAlt}
              width="720"
              height="900"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <span className="portrait-zoom" aria-hidden="true">
            <IconArrowsMaximize size={13} stroke={1.7} />
            <span>{t.cover.portraitZoom}</span>
          </span>
        </button>
        <figcaption>
          <span className="portrait-name">Kevin Voisin</span>
          <span>{t.cover.portraitDiploma}</span>
        </figcaption>
      </figure>
      <Modal
        opened={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={t.cover.portraitModalTitle}
        size="min(1100px, calc(100vw - 32px))"
        centered
        className="image-modal portrait-modal"
        aria-label={t.cover.portraitAlt}
        overlayProps={{ backgroundOpacity: 0.88, blur: 10 }}
        transitionProps={{ transition: "fade", duration: 280, timingFunction: "cubic-bezier(.2, .75, .2, 1)" }}
      >
        <img
          className="portrait-full"
          src="/diplome-2026-complet.webp"
          alt={t.cover.portraitAlt}
          width="1600"
          height="1067"
        />
      </Modal>
    </>
  );
}

function ProjectDiagram({ diagram, diagramLabel }) {
  return (
    <figure className={`project-visual project-diagram diagram-${diagram.theme}`}>
      <span className="visual-label">{diagramLabel}</span>
      <p className="diagram-title">{diagram.title}</p>
      <ol className="diagram-flow" aria-label={diagram.caption}>
        {diagram.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <figcaption className="visually-hidden">{diagram.caption}</figcaption>
    </figure>
  );
}

function ProjectModule({ project, onPreview, index }) {
  const { t } = useLang();
  const actionLabel = t.projects.enlarge;

  return (
    <Reveal
      as="li"
      className="project-module"
      style={{ "--reveal-delay": `${Math.min(index * 70, 350)}ms` }}
    >
      <div className="project-body">
        <p className="project-type">
          <span className="project-number">{String(index + 1).padStart(2, "0")}</span>
          {project.type}
        </p>
        <h3>{project.title}</h3>
        <p className="project-description">{project.description}</p>
        <ul className="project-stack" aria-label={t.projects.stackLabel}>
          {project.stack.map((item) => <li key={item}>{item}</li>)}
        </ul>
        {project.evidence && (
          <dl className="project-evidence">
            <dt>{project.evidence.label}</dt>
            <dd>{project.evidence.value}</dd>
          </dl>
        )}
        {project.links && (
          <ul className="project-links" aria-label={`${t.projects.linksLabel} ${project.title}`}>
            {project.links.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}<span aria-hidden="true"> <IconArrowUpRight className="inline-arrow" stroke={1.7} /></span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      {project.image ? (
        <button
          type="button"
          className="project-visual project-image-button"
          onClick={() => onPreview(project)}
          aria-label={`${actionLabel} : ${project.title}`}
          aria-haspopup="dialog"
        >
          <img
            src={project.image.src}
            srcSet={project.image.srcSet}
            sizes="(max-width: 700px) calc(100vw - 40px), (max-width: 1400px) 42vw, 590px"
            alt={project.image.alt}
            width={project.image.width}
            height={project.image.height}
            loading="lazy"
            decoding="async"
          />
          <span className="visual-label">{actionLabel} <IconArrowUpRight className="inline-arrow" stroke={1.7} aria-hidden="true" /></span>
        </button>
      ) : <ProjectDiagram diagram={project.diagram} diagramLabel={t.projects.diagramLabel} />}
    </Reveal>
  );
}

function ProjectList() {
  const { t } = useLang();
  const [preview, setPreview] = useState(null);

  return (
    <>
      <ul className="project-list">
        {t.projects.items.map((project, index) => (
          <ProjectModule project={project} onPreview={setPreview} index={index} key={project.title} />
        ))}
      </ul>
      <Modal
        opened={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.title}
        size="xl"
        centered
        className="image-modal project-modal"
        overlayProps={{ backgroundOpacity: 0.78, blur: 6 }}
        transitionProps={{ transition: "fade", duration: 260, timingFunction: "cubic-bezier(.2, .75, .2, 1)" }}
      >
        {preview && (
          <div className="project-modal-content">
            <img
              className="project-full"
              src={preview.image.src}
              alt={preview.image.alt}
              width={preview.image.width}
              height={preview.image.height}
            />
            <p>{preview.image.alt}</p>
          </div>
        )}
      </Modal>
    </>
  );
}

function Entries({ items }) {
  return (
    <ol className="entries">
      {items.map((item) => (
        <li className="entry" key={item.title}>
          <span className="entry-date">{item.date}</span>
          <div>
            <h3>{item.title}</h3>
            <p className="entry-company">
              {item.companyUrl ? (
                <a href={item.companyUrl} target="_blank" rel="noopener noreferrer">
                  {item.company}<span aria-hidden="true"> <IconArrowUpRight className="inline-arrow" stroke={1.7} /></span>
                </a>
              ) : item.company}
            </p>
            <p className="entry-detail">{item.detail}</p>
            {item.stack && <p className="entry-stack">{item.stack}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function App() {
  const [lang, setLang] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("portfolio_lang");
      if (saved && ["fr", "en", "de"].includes(saved)) return saved;
      const browser = navigator.language?.slice(0, 2)?.toLowerCase();
      if (browser === "de") return "de";
      if (browser === "en") return "en";
    }
    return "fr";
  });

  const t = translations[lang] || translations.fr;

  useEffect(() => {
    localStorage.setItem("portfolio_lang", lang);
    document.documentElement.lang = lang === "fr" ? "fr-CH" : lang;
    if (t?.meta?.title) {
      document.title = t.meta.title;
    }
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && t?.meta?.description) {
      metaDesc.setAttribute("content", t.meta.description);
    }
  }, [lang, t]);

  const activeSection = useActiveSection(sectionIds);

  const navItems = [
    { id: "projets", label: t.nav.projets },
    { id: "parcours", label: t.nav.parcours },
    { id: "competences", label: t.nav.competences },
    { id: "contact", label: t.nav.contact },
  ];

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      <div className={`site-shell${activeSection === "passions" ? " is-passion" : ""}`}>
        <header className="site-header" id="accueil">
          <a className="brand" href="#accueil" aria-label={t.brand.backToTop}>
            <span className="brand-name">{t.brand.name}</span>
            <span className="brand-role">{t.brand.role}</span>
          </a>
          <nav className="site-nav" aria-label="Navigation principale">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={activeSection === item.id ? "is-active" : undefined}
                aria-current={activeSection === item.id ? "location" : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <LanguageSwitcher current={lang} onChange={setLang} />
            <a className="header-contact" href={`mailto:${EMAIL}`}>
              {t.header.contact} <span aria-hidden="true"><IconArrowUpRight className="inline-arrow" stroke={1.7} /></span>
            </a>
          </div>
        </header>
        <ScrollJourney active={activeSection} />

        <main>
          <section className="cover" aria-labelledby="cover-title">
            <div className="cover-inner">
              <div className="cover-copy">
                <p className="cover-kicker">{t.cover.kicker}</p>
                <h1 id="cover-title">
                  <span className="hero-line">{t.cover.heroLines[0]}</span>
                  <span className="hero-line">{t.cover.heroLines[1]}</span>
                </h1>
                <p className="summary">{t.cover.summary}</p>
                <a className="cover-project-link" href="#projets">
                  {t.cover.projectLink} <IconArrowDown className="inline-arrow" stroke={1.7} aria-hidden="true" />
                </a>
              </div>
              <Portrait />
            </div>
          </section>

          <div className="content">
            <Reveal as="section" id="projets" aria-labelledby="projects-heading">
              <SectionHeading id="projects-heading" aside={`${String(t.projects.items.length).padStart(2, "0")} ${t.projects.aside}`}>
                {t.projects.heading}
              </SectionHeading>
              <ProjectList />
            </Reveal>

            <Reveal as="section" id="parcours" aria-labelledby="experience-heading">
              <div className="two-col">
                <div>
                  <SectionHeading id="experience-heading">{t.career.experienceHeading}</SectionHeading>
                  <Entries items={t.career.experience} />
                </div>
                <div>
                  <SectionHeading id="education-heading">{t.career.educationHeading}</SectionHeading>
                  <Entries items={t.career.education} />
                  <aside className="master-note" aria-labelledby="master-heading">
                    <p className="master-kicker">{t.career.master.kicker}</p>
                    <h3 id="master-heading">{t.career.master.heading}</h3>
                    <p>{t.career.master.text}</p>
                  </aside>
                </div>
              </div>
            </Reveal>

            <Reveal as="section" id="competences" aria-labelledby="skills-heading">
              <SectionHeading id="skills-heading" aside={t.skills.aside}>
                {t.skills.heading}
              </SectionHeading>
              <dl className="skill-table">
                {t.skills.groups.map((group) => (
                  <div className="skill-row" key={group.label}>
                    <dt>{group.label}</dt>
                    <dd>{group.items.join(" · ")}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            <Reveal as="section" id="contact" className="contact" aria-labelledby="contact-heading">
              <SectionHeading id="contact-heading">{t.contact.heading}</SectionHeading>
              <p className="contact-lead">{t.contact.lead}</p>
              <div className="contact-details">
                <CopyEmail />
                <div className="contact-links">
                  <SlideLink
                    href="https://github.com/kevivois"
                    target="_blank"
                    rel="noreferrer"
                    icon={<IconBrandGithub size={18} stroke={1.7} aria-hidden="true" />}
                  >
                    GitHub
                  </SlideLink>
                  <SlideLink
                    href="https://linkedin.com/in/kevin-voisin"
                    target="_blank"
                    rel="noreferrer"
                    icon={<IconBrandLinkedin size={18} stroke={1.7} aria-hidden="true" />}
                  >
                    LinkedIn
                  </SlideLink>
                </div>
                <a className="contact-cv" href="/Voisin_Kevin_CV.pdf" download="Kevin-Voisin-CV.pdf">
                  {t.contact.cvDownload} <IconArrowDown className="inline-arrow" stroke={1.7} aria-hidden="true" />
                </a>
              </div>
            </Reveal>

          </div>
          <PassionsSection />
          <footer className="page-footer content">
            <span>{t.footer.copyright}</span>
            <span>{t.footer.location}</span>
            <a href="#accueil">{t.footer.top} <IconArrowUp className="inline-arrow" stroke={1.7} aria-hidden="true" /></a>
          </footer>
        </main>
      </div>
    </LangContext.Provider>
  );
}

export default App;

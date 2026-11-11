import { useEffect, useState } from "react";
import { Modal } from "@mantine/core";
import {
  IconBrandGithub,
  IconBrandLinkedin,
  IconArrowsMaximize,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconCopy,
} from "@tabler/icons-react";

const EMAIL = "kevin.voisin187@gmail.com";

const projects = [
  {
    type: "Application web",
    title: "StudEase",
    description:
      "Plateforme suisse de mise en relation étudiants et entreprises. Les candidats peuvent chercher des offres, les enregistrer et suivre leurs candidatures.",
    stack: ["React", "Next.js", "Supabase", "PostgreSQL"],
    evidence: { label: "Implémentation", value: "Authentification JWT et base de données PostgreSQL." },
    image: {
      src: "/studease-project.webp",
      srcSet: "/studease-project-960.webp 960w, /studease-project.webp 2880w",
      alt: "Page de présentation StudEase : opportunités pour étudiants et entreprises suisses",
      width: 2880,
      height: 1800,
    },
    links: [
      { label: "Démo", href: "https://stud-easy.vercel.app/info", kind: "website" },
    ],
  },
  {
    type: "Plateforme data · Suisse",
    title: "EstimEat",
    description:
      "Compare les communes suisses pour l’implantation d’un restaurant à partir de données géographiques, démographiques et économiques.",
    stack: ["Données géospatiales", "OpenStreetMap", "Statistiques suisses"],
    image: {
      src: "/estimeat-project.webp",
      srcSet: "/estimeat-project-720.webp 720w, /estimeat-project.webp 2880w",
      alt: "Page d’accueil d’EstimEat, plateforme d’analyse d’implantations de restaurants",
      width: 2880,
      height: 1800,
    },
    links: [
      { label: "Démo", href: "https://estimeat.amacker.dev/", kind: "website" },
      { label: "Code source", href: "https://github.com/MadeInShineA/EstimEat" },
    ],
  },
  {
    type: "Rendu graphique · GPU",
    title: "Ray tracer CUDA",
    description:
      "Moteur de rendu en C++ et CUDA. Les calculs de rayons, d’intersections et d’éclairage sont exécutés en parallèle sur GPU.",
    stack: ["C++", "CUDA", "Ray tracing"],
    image: {
      src: "/cuda-ray-tracer.webp",
      srcSet: "/cuda-ray-tracer-960.webp 960w, /cuda-ray-tracer.webp 1920w",
      alt: "Rendu du ray tracer CUDA : sphères aux matériaux et éclairages différents",
      width: 1920,
      height: 1080,
    },
  },
  {
    type: "Travail de bachelor · Constellium",
    title: "Maintenance prédictive",
    description:
      "Projet de bachelor réalisé avec Constellium. Des mesures de couple alimentent des modèles temporels qui estiment l’usure d’un outil industriel.",
    stack: ["Python", "LSTM", "Temporal Fusion Transformer"],
    diagram: {
      theme: "data",
      title: "Lire l’usure.",
      steps: ["Mesures de couple", "LSTM / TFT", "Estimation de l’usure"],
      caption: "Du signal industriel à la prédiction",
    },
    links: [
      { label: "Rapport complet (PDF)", href: "https://tbs.isc-vs.ch/pdfs/2025-2026/kevin-voisin.full.pdf" },
      { label: "Résumé (PDF)", href: "https://tbs.isc-vs.ch/pdfs/2025-2026/kevin-voisin.pdf" },
    ],
  },
  {
    type: "Outil de test logiciel",
    title: "Stochastic AST & Source Code Fuzzer",
    description:
      "Génère des programmes en Swift, Scala, Forth et C depuis une grammaire EBNF, puis les utilise pour comparer le comportement de compilateurs.",
    stack: ["Swift", "Scala", "Forth", "C"],
    evidence: { label: "Validation", value: "49 tests unitaires pour une architecture modulaire." },
    diagram: {
      theme: "code",
      title: "Une grammaire,\nplusieurs langages.",
      steps: ["Grammaire EBNF", "Générateur Swift", "C · Scala · Forth"],
      caption: "Génération de programmes pour le test de compilateurs",
    },
    links: [
      { label: "Code source", href: "https://github.com/kevivois/semester-project" },
    ],
  },
  {
    type: "Application · Gestion d’inventaire",
    title: "Soventory",
    description:
      "Application web de gestion d’inventaire connectée à une API, avec écran de connexion dédié.",
    stack: ["API", "Vercel"],
    image: {
      src: "/soventory-project.webp",
      srcSet: "/soventory-project-720.webp 720w, /soventory-project.webp 2880w",
      alt: "Page de présentation de Soventory avec un aperçu de l’inventaire des équipements",
      width: 2880,
      height: 1500,
    },
    links: [
      { label: "Démo", href: "https://soventory.vercel.app/", kind: "website" },
    ],
  },
  {
    type: "Documentation & CI/CD",
    title: "Systems Engineering Entry Page",
    description:
      "Documentation de cours générée avec MkDocs. Les cartes se filtrent par semestre et orientation, et GitLab CI automatise le déploiement.",
    stack: ["HTML/CSS", "MkDocs", "GitLab CI"],
    evidence: { label: "Livraison", value: "Déploiement de la documentation automatisé avec GitLab CI." },
    image: {
      src: "/systems-courses-project.webp",
      srcSet: "/systems-courses-project-720.webp 720w, /systems-courses-project.webp 2880w",
      alt: "Catalogue Systems Engineering : filtres par semestre et orientation, et cartes de cours",
      width: 2880,
      height: 2280,
    },
    links: [
      { label: "Voir les cartes de cours", href: "https://synd.hevs.io/courses/index.html", kind: "website" },
    ],
  },
];

const experience = [
  {
    date: "En cours",
    title: "Stage de cinq mois",
    company: "Pick & Place",
    companyUrl: "https://pickplace.com/",
    detail: "Avant mon entrée à l’armée, prévue en février.",
  },
  {
    date: "2024 à 2026",
    title: "Responsable informatique",
    company: "Junior Entreprise Valais",
    detail: "Gestion des mandats informatiques, réalisation de sites web et mise en production.",
    stack: "React · WordPress · Infomaniak",
  },
  {
    date: "2022 à 2023",
    title: "Stagiaire en informatique",
    company: "CEIDOS · Monthey",
    detail:
      "Développement de fonctionnalités et optimisation d’un logiciel d’analyse biomédicale.",
    stack: "Python · PyQt · C++",
  },
];

const education = [
  {
    date: "2023 à 2026",
    title: "Bachelor of Science HES-SO",
    company: "Haute École d’Ingénierie · Sion",
    detail: "Ingénierie informatique, orientation ingénierie des données.",
  },
  {
    date: "2019 à 2023",
    title: "CFC en informatique",
    company: "EPTM · Sion",
    detail: "Développement d’applications.",
  },
];

const skills = [
  { label: "Web & applications", items: ["React", "Next.js", "TypeScript", "Java", "C#", "Swift"] },
  { label: "Data & IA", items: ["Python", "Pandas", "Polars", "PyTorch", "LSTM", "TFT"] },
  { label: "Outils & données", items: ["SQL", "PostgreSQL", "Supabase", "Git", "Docker", "CI/CD"] },
];

const passions = [
  {
    id: "view",
    src: "/point-de-vue-alpin.webp",
    alt: "Kevin montre un point au loin depuis un belvédère en montagne",
    caption: "Belvédère en Valais",
    column: "views",
    mobileOrder: 1,
  },
  {
    id: "basket",
    src: "/basket-temps-mort.webp",
    alt: "Kevin assis sur le banc pendant une pause de basket",
    caption: "Basket · pause de match",
    column: "movement",
    mobileOrder: 2,
  },
  {
    id: "course",
    src: "/course-route.webp",
    alt: "Kevin court au milieu d’une course en extérieur",
    caption: "Course · course populaire",
    column: "movement",
    mobileOrder: 5,
  },
  {
    id: "hike",
    src: "/randonnee-alpes.webp",
    alt: "Trois amis marchent sur un sentier de montagne",
    caption: "Randonnée dans les Alpes",
    column: "elsewhere",
    mobileOrder: 3,
  },
  {
    id: "coucher",
    src: "/coucher-soleil.webp",
    alt: "Coucher de soleil sur la mer",
    caption: "Coucher de soleil en bord de mer",
    column: "elsewhere",
    mobileOrder: 4,
  },
];

const navItems = [
  { id: "projets", label: "Projets" },
  { id: "parcours", label: "Parcours" },
  { id: "competences", label: "Compétences" },
  { id: "contact", label: "Contact" },
];
const scrollStops = [{ id: "accueil", label: "Départ" }, ...navItems, { id: "passions", label: "À côté" }];
const sectionIds = scrollStops.map((item) => item.id);

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

function ScrollJourney({ active }) {
  const [progress, setProgress] = useState(0);
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
    <aside className={`scroll-journey${active === "accueil" ? " is-intro" : ""}`} aria-label="Progression dans le portfolio">
      <p className="journey-current" aria-live="polite">
        <span>{String(activeIndex + 1).padStart(2, "0")} / {String(scrollStops.length).padStart(2, "0")}</span>
        <b>{scrollStops[activeIndex].label}</b>
      </p>
      <nav className="journey-nav" aria-label="Étapes du portfolio">
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
          <a href={`#${previous.id}`} aria-label={`Étape précédente : ${previous.label}`}>←</a>
        ) : <span aria-hidden="true" />}
        <a className="journey-mobile-current" href={`#${scrollStops[activeIndex].id}`}>
          {String(activeIndex + 1).padStart(2, "0")} / {String(scrollStops.length).padStart(2, "0")}
          <span>{scrollStops[activeIndex].label}</span>
        </a>
        {next ? (
          <a href={`#${next.id}`} aria-label={`Étape suivante : ${next.label}`}>→</a>
        ) : <span aria-hidden="true" />}
        <span className="journey-mobile-progress" style={{ "--scroll-progress": `${progress}%` }} aria-hidden="true" />
      </div>
    </aside>
  );
}

// Révèle l’élément au défilement. React 19 : le callback de ref peut
// retourner une fonction de nettoyage, inutile d’utiliser useEffect ici.
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

// Lien à texte doublé : le libellé glisse vers le haut au survol.
// L’icône éventuelle reste fixe, hors de la partie animée.
function SlideLink({ children, icon, className = "", ...props }) {
  return (
    <a className={`slide-link ${className}`.trim()} {...props}>
      {children}
      {icon}
    </a>
  );
}

function CopyEmail() {
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
      <span className="visually-hidden">{copied ? "Adresse copiée" : "Copier l’adresse e-mail"}</span>
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
  }, [previewIndex]);

  return (
    <Reveal as="section" id="passions" className="passions-section" aria-labelledby="passions-heading">
      <div className="passions-inner">
        <div className="passions-intro">
          <div className="passions-copy">
            <p className="passions-kicker">06 / 06 · Sports et sorties</p>
            <h2 id="passions-heading">Basket.<br />Course.<br />Randonnée.</h2>
          </div>
          <p className="passions-description">
            Basket, course à pied et randonnée dans les Alpes. Les photos montrent des matchs, des courses et des sorties récentes.
          </p>
        </div>
        <div className="passions-gallery" aria-label="Quelques moments de sport, de randonnée et d’exploration">
          {["views", "movement", "elsewhere"].map((column) => (
            <div className={`passions-column passions-column-${column}`} key={column}>
              {passions.filter((photo) => photo.column === column).map((photo, index) => (
                <figure
                  className={`passion-photo passion-photo-${photo.id}`}
                  key={photo.src}
                  style={{ "--photo-delay": `${index * 100}ms`, "--mobile-order": photo.mobileOrder }}
                >
                  <button
                    className="passion-image-button"
                    type="button"
                    onClick={() => setPreviewIndex(passions.findIndex((item) => item.id === photo.id))}
                    aria-label={`Voir en grand : ${photo.caption}`}
                    aria-haspopup="dialog"
                  >
                    <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
                    <span className="passion-zoom" aria-hidden="true">Agrandir <span>↗</span></span>
                  </button>
                  <figcaption>{photo.caption}</figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>
        <p className="passions-trail" aria-label="Quelques centres d’intérêt">
          <span>Basket</span><span>Course à pied</span><span>Randonnée</span><span>Escapades</span>
        </p>
      </div>
      <Modal
        opened={preview !== null}
        onClose={() => setPreviewIndex(null)}
        title={preview?.caption}
        size="min(1100px, calc(100vw - 32px))"
        centered
        className="image-modal passion-modal"
        aria-label="Aperçu de la photo"
        overlayProps={{ backgroundOpacity: 0.88, blur: 10 }}
        transitionProps={{ transition: "fade", duration: 280, timingFunction: "cubic-bezier(.2, .75, .2, 1)" }}
      >
        {preview && (
          <div className="passion-lightbox">
            <button type="button" className="passion-lightbox-arrow" onClick={showPrevious} aria-label="Photo précédente">
              <IconChevronLeft size={22} stroke={1.7} aria-hidden="true" />
            </button>
            <img key={preview.src} src={preview.src} alt={preview.alt} />
            <button type="button" className="passion-lightbox-arrow" onClick={showNext} aria-label="Photo suivante">
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
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <figure className="portrait">
        <button
          type="button"
          className="portrait-image-button"
          onClick={() => setPreviewOpen(true)}
          aria-label="Voir en grand : Kevin Voisin recevant son diplôme"
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
              alt="Kevin Voisin recevant son diplôme d’ingénieur HES-SO sur scène, 2026"
              width="720"
              height="900"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
          <span className="portrait-zoom" aria-hidden="true">
            <IconArrowsMaximize size={13} stroke={1.7} />
            <span>Voir la photo</span>
          </span>
        </button>
        <figcaption>
          <span className="portrait-name">Kevin Voisin</span>
          <span>Diplômé HES-SO · 2026</span>
        </figcaption>
      </figure>
      <Modal
        opened={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Kevin Voisin · Diplômé HES-SO, 2026"
        size="min(1100px, calc(100vw - 32px))"
        centered
        className="image-modal portrait-modal"
        aria-label="Photo de Kevin Voisin recevant son diplôme"
        overlayProps={{ backgroundOpacity: 0.88, blur: 10 }}
        transitionProps={{ transition: "fade", duration: 280, timingFunction: "cubic-bezier(.2, .75, .2, 1)" }}
      >
        <img
          className="portrait-full"
          src="/portrait-2026-960.webp"
          alt="Kevin Voisin recevant son diplôme d’ingénieur HES-SO sur scène, 2026"
          width="960"
          height="1200"
        />
      </Modal>
    </>
  );
}

function ProjectDiagram({ diagram }) {
  return (
    <figure className={`project-visual project-diagram diagram-${diagram.theme}`}>
      <span className="visual-label">Schéma de principe</span>
      <p className="diagram-title">{diagram.title}</p>
      <ol className="diagram-flow" aria-label={diagram.caption}>
        {diagram.steps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <figcaption className="visually-hidden">{diagram.caption}</figcaption>
    </figure>
  );
}

function ProjectModule({ project, onPreview, index }) {
  const actionLabel = "Agrandir l’image";

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
        <ul className="project-stack" aria-label="Technologies">
          {project.stack.map((item) => <li key={item}>{item}</li>)}
        </ul>
        {project.evidence && (
          <dl className="project-evidence">
            <dt>{project.evidence.label}</dt>
            <dd>{project.evidence.value}</dd>
          </dl>
        )}
        {project.links && (
          <ul className="project-links" aria-label={`Liens pour ${project.title}`}>
            {project.links.map((link) => (
              <li key={link.href}>
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}<span aria-hidden="true"> ↗</span>
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
          <span className="visual-label">{actionLabel} <span aria-hidden="true">↗</span></span>
        </button>
      ) : <ProjectDiagram diagram={project.diagram} />}
    </Reveal>
  );
}

function ProjectList() {
  const [preview, setPreview] = useState(null);

  return (
    <>
      <ul className="project-list">
        {projects.map((project, index) => (
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
                  {item.company}<span aria-hidden="true"> ↗</span>
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
  const activeSection = useActiveSection(sectionIds);

  return (
    <div className={`site-shell${activeSection === "passions" ? " is-passion" : ""}`}>
      <header className="site-header" id="accueil">
        <a className="brand" href="#accueil" aria-label="Kevin Voisin, retour en haut">
          <span className="brand-name">Kevin Voisin</span>
          <span className="brand-role">Ingénieur informatique · Valais</span>
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
        <a className="header-contact" href={`mailto:${EMAIL}`}>Me contacter <span aria-hidden="true">↗</span></a>
      </header>
      <ScrollJourney active={activeSection} />

      <main>
      <section className="cover" aria-labelledby="cover-title">
        <div className="cover-inner">
          <div className="cover-copy">
            <p className="cover-kicker">Kevin Voisin · Monthey, Suisse</p>
            <h1 id="cover-title">
              <span className="hero-line">Ingénieur</span>
              <span className="hero-line">informatique</span>
            </h1>
            <p className="summary">
              Diplômé en ingénierie informatique HES-SO. Stage de cinq mois chez{" "}
              <a href="https://pickplace.com/" target="_blank" rel="noopener noreferrer">Pick &amp; Place</a>,
              jusqu’à mon entrée à l’armée en février.
            </p>
            <a className="cover-project-link" href="#projets">Projets <span aria-hidden="true">↓</span></a>
          </div>
          <Portrait />
        </div>
      </section>

      <div className="content">
        <Reveal as="section" id="projets" aria-labelledby="projects-heading">
          <SectionHeading id="projects-heading" aside={`${String(projects.length).padStart(2, "0")} projets`}>
            Projets
          </SectionHeading>
          <ProjectList />
        </Reveal>

        <Reveal as="section" id="parcours" aria-labelledby="experience-heading">
          <div className="two-col">
            <div>
              <SectionHeading id="experience-heading">Expérience</SectionHeading>
              <Entries items={experience} />
            </div>
            <div>
              <SectionHeading id="education-heading">Formation</SectionHeading>
              <Entries items={education} />
              <aside className="master-note" aria-labelledby="master-heading">
                <p className="master-kicker">Après l’armée</p>
                <h3 id="master-heading">Master en Software Engineering</h3>
                <p>
                  HES-SO ou UNIL à Lausanne. Je privilégie une formation à 100 %, tout en restant ouvert à un cursus à 50 % en entreprise.
                </p>
              </aside>
            </div>
          </div>
        </Reveal>

        <Reveal as="section" id="competences" aria-labelledby="skills-heading">
          <SectionHeading id="skills-heading" aside="Français · Anglais B2/C1">
            Compétences
          </SectionHeading>
          <dl className="skill-table">
            {skills.map((group) => (
              <div className="skill-row" key={group.label}>
                <dt>{group.label}</dt>
                <dd>{group.items.join(" · ")}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal as="section" id="contact" className="contact" aria-labelledby="contact-heading">
          <SectionHeading id="contact-heading">Contact</SectionHeading>
          <p className="contact-lead">
            Développement logiciel et ingénierie des données. Contact direct par e-mail ou via GitHub et LinkedIn.
          </p>
          <CopyEmail />
          <div className="contact-links">
            <SlideLink
              href="https://github.com/kevivois"
              target="_blank"
              rel="noreferrer"
              icon={<IconBrandGithub size={13} stroke={1.7} aria-hidden="true" />}
            >
              GitHub
            </SlideLink>
            <SlideLink
              href="https://linkedin.com/in/kevin-voisin"
              target="_blank"
              rel="noreferrer"
              icon={<IconBrandLinkedin size={13} stroke={1.7} aria-hidden="true" />}
            >
              LinkedIn
            </SlideLink>
          </div>
        </Reveal>

      </div>
      <PassionsSection />
      <footer className="page-footer content">
        <span>© 2026 Kevin Voisin</span>
        <span>Conçu &amp; développé en Valais</span>
        <a href="#accueil">Haut de page ↑</a>
      </footer>
      </main>
    </div>
  );
}

export default App;
export const LANGUAGES = [
  { code: "fr", label: "FR", name: "Français" },
  { code: "en", label: "EN", name: "English" },
  { code: "de", label: "DE", name: "Deutsch" },
];

export const translations = {
  fr: {
    meta: {
      title: "Kevin Voisin | Ingénieur informatique",
      description: "Portfolio de Kevin Voisin, ingénieur informatique HES-SO en Valais. Projets, expérience et parcours vers un Master en Software Engineering à Lausanne.",
    },
    brand: {
      name: "Kevin Voisin",
      role: "Ingénieur informatique · Valais",
      backToTop: "Kevin Voisin, retour en haut",
    },
    header: {
      contact: "Me contacter",
      languageSelect: "Sélectionner la langue",
    },
    nav: {
      projets: "Projets",
      parcours: "Parcours",
      competences: "Compétences",
      contact: "Contact",
      depart: "Départ",
      passions: "À côté",
    },
    journey: {
      label: "Progression dans le portfolio",
      stepsLabel: "Étapes du portfolio",
      prev: "Étape précédente :",
      next: "Étape suivante :",
    },
    cover: {
      kicker: "Kevin Voisin · Monthey, Suisse",
      heroLines: ["Ingénieur", "informatique"],
      summary: (
        <>
          Diplômé en ingénierie informatique{" "}
          <a href="https://www.hes-so.ch/" target="_blank" rel="noopener noreferrer">
            HES-SO
          </a>
          . Stage de cinq mois chez{" "}
          <a href="https://pickplace.com/" target="_blank" rel="noopener noreferrer">
            Pick &amp; Place
          </a>
          , jusqu’à mon entrée à l’armée en février.
        </>
      ),
      projectLink: "Projets",
      portraitAria: "Voir en grand : Kevin Voisin recevant son diplôme",
      portraitZoom: "Voir la photo",
      portraitDiploma: "Diplômé HES-SO · 2026",
      portraitModalTitle: "Kevin Voisin · Diplômé HES-SO, 2026",
      portraitAlt: "Kevin Voisin recevant son diplôme d’ingénieur HES-SO sur scène, 2026",
    },
    projects: {
      heading: "Projets",
      aside: "projets",
      enlarge: "Agrandir l’image",
      diagramLabel: "Schéma de principe",
      stackLabel: "Technologies",
      linksLabel: "Liens pour",
      items: [
        {
          type: "Application web",
          title: "StudEase",
          description:
            "Mandat réalisé au sein de la Junior Entreprise Valais (JEVS) pour des étudiants en gestion de la HES-SO Valais-Wallis à Sierre, dans le cadre du cours Business Experience (BEX). Cette plateforme suisse met en relation étudiants et entreprises : recherche d’offres, favoris et suivi des candidatures.",
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
            { label: "Business Experience", href: "https://www.hevs.ch/fr/hautes-ecoles/haute-ecole-de-gestion/business-experience/", kind: "website" },
            { label: "JEVS", href: "http://jevs.ch/", kind: "website" },
          ],
        },
        {
          type: "Plateforme data · Suisse",
          title: "EstimEat",
          description:
            "Projet réalisé à la HES dans le cadre d’un cours d’une semaine. EstimEat compare les communes suisses pour l’implantation d’un restaurant à partir de données géographiques, démographiques et économiques.",
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
            "Projet réalisé pour un professeur et l’administration de l’EPTM, dans le cadre du cours de projet libre du mercredi après-midi. Cette application web de gestion d’inventaire est connectée à une API et dispose d’un écran de connexion dédié.",
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
            { label: "EPTM", href: "https://eptm.ch/", kind: "website" },
          ],
        },
        {
          type: "Documentation & CI/CD",
          title: "Systems Engineering Entry Page",
          description:
            "Mandat confié par le responsable de la filière Systèmes industriels de la HES-SO Valais-Wallis, réalisé au sein de la Junior Entreprise Valais (JEVS). Cette documentation de cours est générée avec MkDocs : les cartes se filtrent par semestre et orientation, et GitLab CI automatise le déploiement.",
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
            { label: "Filière Systèmes industriels", href: "https://www.hevs.ch/fr/hautes-ecoles/haute-ecole-d-ingenierie/systemes-industriels/", kind: "website" },
            { label: "Article LinkedIn", href: "https://lnkd.in/p/ePmArn8z", kind: "website" },
            { label: "JEVS", href: "http://jevs.ch/", kind: "website" },
          ],
        },
      ],
    },
    career: {
      experienceHeading: "Expérience",
      educationHeading: "Formation",
      experience: [
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
          companyUrl: "http://jevs.ch/",
          detail: "Gestion des mandats informatiques, réalisation de sites web et mise en production.",
          stack: "React · WordPress · Infomaniak",
        },
        {
          date: "2022 à 2023",
          title: "Stagiaire en informatique",
          company: "CEIDOS · Monthey",
          companyUrl: "https://ceidos.com/",
          detail: "Développement de fonctionnalités et optimisation d’un logiciel d’analyse biomédicale.",
          stack: "Python · PyQt · C++",
        },
      ],
      education: [
        {
          date: "2023 à 2026",
          title: "Bachelor of Science HES-SO",
          company: "Haute École d’Ingénierie · Sion",
          detail: (
            <>
              <a href="https://isc.hevs.ch/" target="_blank" rel="noopener noreferrer">
                Informatique et systèmes de communication
              </a>
              , orientation ingénierie des données.
            </>
          ),
        },
        {
          date: "2019 à 2023",
          title: "CFC en informatique",
          company: "EPTM · Sion",
          companyUrl: "https://eptm.ch/",
          detail: "Développement d’applications.",
        },
      ],
      master: {
        kicker: "Après l’armée",
        heading: "Master en Software Engineering",
        text: "HES-SO ou UNIL à Lausanne. Je privilégie une formation à 100 %, tout en restant ouvert à un cursus à 50 % en entreprise.",
      },
    },
    skills: {
      heading: "Compétences",
      aside: "Français · Anglais B2/C1",
      groups: [
        { label: "Web & applications", items: ["React", "Next.js", "TypeScript", "Java", "C#", "Swift"] },
        { label: "Data & IA", items: ["Python", "Pandas", "Polars", "PyTorch", "LSTM", "TFT"] },
        { label: "Outils & données", items: ["SQL", "PostgreSQL", "Supabase", "Git", "Docker", "CI/CD"] },
      ],
    },
    contact: {
      heading: "Contact",
      lead: "Un projet informatique en tête ? Web, data, ingénierie logicielle ou autre : parlons-en par e-mail ou sur GitHub et LinkedIn.",
      copyEmail: "Copier l’adresse e-mail",
      emailCopied: "Adresse copiée",
      cvDownload: "Télécharger mon CV",
    },
    passions: {
      kicker: "06 / 06 · Sports et sorties",
      heading: "À côté.",
      ariaLabel: "Quelques moments de sport, de randonnée et d’exploration",
      zoom: "Agrandir",
      viewLargeAria: "Voir en grand :",
      prevPhoto: "Photo précédente",
      nextPhoto: "Photo suivante",
      modalAria: "Aperçu de la photo",
      items: [
        {
          id: "view",
          src: "/point-de-vue-alpin.webp",
          alt: "Kevin montre un point au loin depuis un belvédère en montagne",
          caption: "Belvédère en Valais · Août 2026",
          column: "views",
          mobileOrder: 1,
        },
        {
          id: "basket",
          src: "/basket-temps-mort.webp",
          alt: "Kevin assis sur le banc pendant une pause au My3x3 à Martigny",
          caption: "My3x3 · Martigny · Août 2026",
          column: "movement",
          mobileOrder: 2,
        },
        {
          id: "course",
          src: "/course-route.webp",
          alt: "Kevin court au Marathon des Terroirs à Martigny",
          caption: "Marathon des Terroirs · Martigny · Mai 2023",
          column: "movement",
          mobileOrder: 5,
        },
        {
          id: "hike",
          src: "/randonnee-alpes.webp",
          alt: "Trois amis marchent sur un sentier en direction du barrage d’Émosson, au-dessus de Martigny",
          caption: "En route vers Émosson · Au-dessus de Martigny · Septembre 2026",
          column: "elsewhere",
          mobileOrder: 3,
        },
        {
          id: "coucher",
          src: "/coucher-soleil.webp",
          alt: "Coucher de soleil sur le Léman au Bouveret",
          caption: "Coucher de soleil · Le Bouveret · Septembre 2026",
          column: "elsewhere",
          mobileOrder: 4,
        },
      ],
    },
    footer: {
      copyright: "© 2026 Kevin Voisin",
      location: "Conçu & développé en Valais",
      top: "Haut de page",
    },
  },

  en: {
    meta: {
      title: "Kevin Voisin | Software Engineer",
      description: "Portfolio of Kevin Voisin, HES-SO software engineer in Valais, Switzerland. Projects, experience, and journey towards a Master's in Software Engineering in Lausanne.",
    },
    brand: {
      name: "Kevin Voisin",
      role: "Software Engineer · Valais",
      backToTop: "Kevin Voisin, back to top",
    },
    header: {
      contact: "Get in touch",
      languageSelect: "Select language",
    },
    nav: {
      projets: "Projects",
      parcours: "Experience",
      competences: "Skills",
      contact: "Contact",
      depart: "Start",
      passions: "Beyond",
    },
    journey: {
      label: "Portfolio progression",
      stepsLabel: "Portfolio sections",
      prev: "Previous section:",
      next: "Next section:",
    },
    cover: {
      kicker: "Kevin Voisin · Monthey, Switzerland",
      heroLines: ["Software", "Engineer"],
      summary: (
        <>
          Graduate in computer engineering from{" "}
          <a href="https://www.hes-so.ch/" target="_blank" rel="noopener noreferrer">
            HES-SO
          </a>
          . Five-month internship at{" "}
          <a href="https://pickplace.com/" target="_blank" rel="noopener noreferrer">
            Pick &amp; Place
          </a>
          , prior to starting military service in February.
        </>
      ),
      projectLink: "Projects",
      portraitAria: "View full size: Kevin Voisin receiving his diploma",
      portraitZoom: "View photo",
      portraitDiploma: "HES-SO Graduate · 2026",
      portraitModalTitle: "Kevin Voisin · HES-SO Graduate, 2026",
      portraitAlt: "Kevin Voisin receiving his HES-SO engineering degree on stage, 2026",
    },
    projects: {
      heading: "Projects",
      aside: "projects",
      enlarge: "Enlarge image",
      diagramLabel: "System schematic",
      stackLabel: "Technologies",
      linksLabel: "Links for",
      items: [
        {
          type: "Web application",
          title: "StudEase",
          description:
            "Client project completed within Junior Entreprise Valais (JEVS) for business management students at HES-SO Valais-Wallis in Sierre as part of the Business Experience (BEX) course. This Swiss platform connects students and companies: opportunity search, bookmarks, and application tracking.",
          stack: ["React", "Next.js", "Supabase", "PostgreSQL"],
          evidence: { label: "Implementation", value: "JWT authentication and PostgreSQL database." },
          image: {
            src: "/studease-project.webp",
            srcSet: "/studease-project-960.webp 960w, /studease-project.webp 2880w",
            alt: "StudEase overview page: opportunities for Swiss students and companies",
            width: 2880,
            height: 1800,
          },
          links: [
            { label: "Live Demo", href: "https://stud-easy.vercel.app/info", kind: "website" },
            { label: "Business Experience", href: "https://www.hevs.ch/fr/hautes-ecoles/haute-ecole-de-gestion/business-experience/", kind: "website" },
            { label: "JEVS", href: "http://jevs.ch/", kind: "website" },
          ],
        },
        {
          type: "Data platform · Switzerland",
          title: "EstimEat",
          description:
            "Project built at HES during a one-week intensive course. EstimEat compares Swiss municipalities for restaurant locations using geographical, demographic, and economic data.",
          stack: ["Geospatial data", "OpenStreetMap", "Swiss statistics"],
          image: {
            src: "/estimeat-project.webp",
            srcSet: "/estimeat-project-720.webp 720w, /estimeat-project.webp 2880w",
            alt: "EstimEat home page, restaurant location analysis platform",
            width: 2880,
            height: 1800,
          },
          links: [
            { label: "Live Demo", href: "https://estimeat.amacker.dev/", kind: "website" },
            { label: "Source code", href: "https://github.com/MadeInShineA/EstimEat" },
          ],
        },
        {
          type: "Graphics rendering · GPU",
          title: "CUDA Ray Tracer",
          description:
            "Rendering engine developed in C++ and CUDA. Ray calculations, intersections, and lighting computations are executed in parallel on the GPU.",
          stack: ["C++", "CUDA", "Ray tracing"],
          image: {
            src: "/cuda-ray-tracer.webp",
            srcSet: "/cuda-ray-tracer-960.webp 960w, /cuda-ray-tracer.webp 1920w",
            alt: "CUDA ray tracer render: spheres with various materials and lighting",
            width: 1920,
            height: 1080,
          },
        },
        {
          type: "Bachelor's thesis · Constellium",
          title: "Predictive Maintenance",
          description:
            "Bachelor's thesis conducted in partnership with Constellium. Torque measurements feed temporal models that estimate industrial tool wear.",
          stack: ["Python", "LSTM", "Temporal Fusion Transformer"],
          diagram: {
            theme: "data",
            title: "Reading tool wear.",
            steps: ["Torque measurements", "LSTM / TFT", "Wear estimation"],
            caption: "From industrial signal to prediction",
          },
          links: [
            { label: "Full report (PDF)", href: "https://tbs.isc-vs.ch/pdfs/2025-2026/kevin-voisin.full.pdf" },
            { label: "Executive summary (PDF)", href: "https://tbs.isc-vs.ch/pdfs/2025-2026/kevin-voisin.pdf" },
          ],
        },
        {
          type: "Software testing tool",
          title: "Stochastic AST & Source Code Fuzzer",
          description:
            "Generates programs in Swift, Scala, Forth, and C from an EBNF grammar to compare compiler behaviors under stress.",
          stack: ["Swift", "Scala", "Forth", "C"],
          evidence: { label: "Validation", value: "49 unit tests validating modular architecture." },
          diagram: {
            theme: "code",
            title: "One grammar,\nmultiple languages.",
            steps: ["EBNF Grammar", "Swift Generator", "C · Scala · Forth"],
            caption: "Program generation for compiler fuzzing",
          },
          links: [
            { label: "Source code", href: "https://github.com/kevivois/semester-project" },
          ],
        },
        {
          type: "Application · Inventory Management",
          title: "Soventory",
          description:
            "Project developed for a teacher and the administration of EPTM during Wednesday afternoon open project sessions. This web inventory management app connects to an API with a dedicated authentication screen.",
          stack: ["API", "Vercel"],
          image: {
            src: "/soventory-project.webp",
            srcSet: "/soventory-project-720.webp 720w, /soventory-project.webp 2880w",
            alt: "Soventory presentation page with equipment inventory overview",
            width: 2880,
            height: 1500,
          },
          links: [
            { label: "Live Demo", href: "https://soventory.vercel.app/", kind: "website" },
            { label: "EPTM", href: "https://eptm.ch/", kind: "website" },
          ],
        },
        {
          type: "Documentation & CI/CD",
          title: "Systems Engineering Entry Page",
          description:
            "Mandate entrusted by the Head of the Industrial Systems department at HES-SO Valais-Wallis, executed within Junior Entreprise Valais (JEVS). This course documentation is generated with MkDocs: cards filter by semester and track, with GitLab CI automating deployment.",
          stack: ["HTML/CSS", "MkDocs", "GitLab CI"],
          evidence: { label: "Delivery", value: "Documentation deployment automated via GitLab CI." },
          image: {
            src: "/systems-courses-project.webp",
            srcSet: "/systems-courses-project-720.webp 720w, /systems-courses-project.webp 2880w",
            alt: "Systems Engineering catalog: semester and track filters, course cards",
            width: 2880,
            height: 2280,
          },
          links: [
            { label: "View course cards", href: "https://synd.hevs.io/courses/index.html", kind: "website" },
            { label: "Industrial Systems Department", href: "https://www.hevs.ch/fr/hautes-ecoles/haute-ecole-d-ingenierie/systemes-industriels/", kind: "website" },
            { label: "LinkedIn Post", href: "https://lnkd.in/p/ePmArn8z", kind: "website" },
            { label: "JEVS", href: "http://jevs.ch/", kind: "website" },
          ],
        },
      ],
    },
    career: {
      experienceHeading: "Experience",
      educationHeading: "Education",
      experience: [
        {
          date: "Ongoing",
          title: "Five-month internship",
          company: "Pick & Place",
          companyUrl: "https://pickplace.com/",
          detail: "Prior to entering military service, scheduled for February.",
        },
        {
          date: "2024 to 2026",
          title: "Head of IT",
          company: "Junior Entreprise Valais",
          companyUrl: "http://jevs.ch/",
          detail: "Managed IT client projects, developed custom websites, and handled production rollouts.",
          stack: "React · WordPress · Infomaniak",
        },
        {
          date: "2022 to 2023",
          title: "IT Intern",
          company: "CEIDOS · Monthey",
          companyUrl: "https://ceidos.com/",
          detail: "Feature development and performance optimization for biomedical analysis software.",
          stack: "Python · PyQt · C++",
        },
      ],
      education: [
        {
          date: "2023 to 2026",
          title: "Bachelor of Science HES-SO",
          company: "School of Engineering · Sion",
          detail: (
            <>
              <a href="https://isc.hevs.ch/" target="_blank" rel="noopener noreferrer">
                Computer Science and Communication Systems
              </a>
              , Data Engineering specialization.
            </>
          ),
        },
        {
          date: "2019 to 2023",
          title: "Federal VET Diploma in IT (CFC)",
          company: "EPTM · Sion",
          companyUrl: "https://eptm.ch/",
          detail: "Software & application development.",
        },
      ],
      master: {
        kicker: "After the military",
        heading: "Master in Software Engineering",
        text: "HES-SO or UNIL in Lausanne. Prioritizing a full-time curriculum (100%), while remaining open to a 50% work-study program.",
      },
    },
    skills: {
      heading: "Skills",
      aside: "French (Native) · English B2/C1 · German",
      groups: [
        { label: "Web & Applications", items: ["React", "Next.js", "TypeScript", "Java", "C#", "Swift"] },
        { label: "Data & AI", items: ["Python", "Pandas", "Polars", "PyTorch", "LSTM", "TFT"] },
        { label: "Tools & Infrastructure", items: ["SQL", "PostgreSQL", "Supabase", "Git", "Docker", "CI/CD"] },
      ],
    },
    contact: {
      heading: "Contact",
      lead: "Have a software project in mind? Web, data, software engineering or anything else: let's connect by email or on GitHub and LinkedIn.",
      copyEmail: "Copy email address",
      emailCopied: "Email copied",
      cvDownload: "Download my CV",
    },
    passions: {
      kicker: "06 / 06 · Sports & Outdoors",
      heading: "Beyond.",
      ariaLabel: "Moments of sports, hiking, and exploring",
      zoom: "Enlarge",
      viewLargeAria: "View full size:",
      prevPhoto: "Previous photo",
      nextPhoto: "Next photo",
      modalAria: "Photo preview",
      items: [
        {
          id: "view",
          src: "/point-de-vue-alpin.webp",
          alt: "Kevin pointing toward a distant alpine peak from a viewpoint",
          caption: "Valais Viewpoint · August 2026",
          column: "views",
          mobileOrder: 1,
        },
        {
          id: "basket",
          src: "/basket-temps-mort.webp",
          alt: "Kevin sitting on the bench during a timeout at My3x3 in Martigny",
          caption: "My3x3 · Martigny · August 2026",
          column: "movement",
          mobileOrder: 2,
        },
        {
          id: "course",
          src: "/course-route.webp",
          alt: "Kevin running at the Marathon des Terroirs in Martigny",
          caption: "Marathon des Terroirs · Martigny · May 2023",
          column: "movement",
          mobileOrder: 5,
        },
        {
          id: "hike",
          src: "/randonnee-alpes.webp",
          alt: "Three friends walking on a trail toward Émosson dam, above Martigny",
          caption: "Hiking to Émosson · Above Martigny · September 2026",
          column: "elsewhere",
          mobileOrder: 3,
        },
        {
          id: "coucher",
          src: "/coucher-soleil.webp",
          alt: "Sunset over Lake Geneva in Le Bouveret",
          caption: "Sunset · Le Bouveret · September 2026",
          column: "elsewhere",
          mobileOrder: 4,
        },
      ],
    },
    footer: {
      copyright: "© 2026 Kevin Voisin",
      location: "Designed & developed in Valais",
      top: "Back to top",
    },
  },

  de: {
    meta: {
      title: "Kevin Voisin | Software-Ingenieur",
      description: "Portfolio von Kevin Voisin, HES-SO Software-Ingenieur im Wallis. Projekte, Erfahrung und Werdegang zu einem Master in Software Engineering in Lausanne.",
    },
    brand: {
      name: "Kevin Voisin",
      role: "Software-Ingenieur · Wallis",
      backToTop: "Kevin Voisin, nach oben",
    },
    header: {
      contact: "Kontakt aufnehmen",
      languageSelect: "Sprache auswählen",
    },
    nav: {
      projets: "Projekte",
      parcours: "Werdegang",
      competences: "Kompetenzen",
      contact: "Kontakt",
      depart: "Start",
      passions: "Nebenbei",
    },
    journey: {
      label: "Fortschritt im Portfolio",
      stepsLabel: "Portfolio-Abschnitte",
      prev: "Vorheriger Schritt:",
      next: "Nächster Schritt:",
    },
    cover: {
      kicker: "Kevin Voisin · Monthey, Schweiz",
      heroLines: ["Software-", "Ingenieur"],
      summary: (
        <>
          Diplomierter Informatikingenieur der{" "}
          <a href="https://www.hes-so.ch/" target="_blank" rel="noopener noreferrer">
            HES-SO
          </a>
          . Fünfmonatiges Praktikum bei{" "}
          <a href="https://pickplace.com/" target="_blank" rel="noopener noreferrer">
            Pick &amp; Place
          </a>
          , bis zu meinem Beginn des Militärdienstes im Februar.
        </>
      ),
      projectLink: "Projekte",
      portraitAria: "Vollbild ansehen: Kevin Voisin nimmt sein Diplom entgegen",
      portraitZoom: "Foto ansehen",
      portraitDiploma: "HES-SO Absolvent · 2026",
      portraitModalTitle: "Kevin Voisin · HES-SO Absolvent, 2026",
      portraitAlt: "Kevin Voisin nimmt sein HES-SO Ingenieurdiplom auf der Bühne entgegen, 2026",
    },
    projects: {
      heading: "Projekte",
      aside: "Projekte",
      enlarge: "Bild vergrößern",
      diagramLabel: "Prinzipskizze",
      stackLabel: "Technologien",
      linksLabel: "Links für",
      items: [
        {
          type: "Webanwendung",
          title: "StudEase",
          description:
            "Auftrag bei der Junior Entreprise Valais (JEVS) für Studierende der Betriebsökonomie an der HES-SO Valais-Wallis in Siders im Rahmen des Kurses Business Experience (BEX). Diese Schweizer Plattform verbindet Studierende und Unternehmen: Stellensuche, Favoriten und Bewerbungsverfolgung.",
          stack: ["React", "Next.js", "Supabase", "PostgreSQL"],
          evidence: { label: "Implementierung", value: "JWT-Authentifizierung und PostgreSQL-Datenbank." },
          image: {
            src: "/studease-project.webp",
            srcSet: "/studease-project-960.webp 960w, /studease-project.webp 2880w",
            alt: "StudEase Übersichtsseite: Chancen für Schweizer Studierende und Unternehmen",
            width: 2880,
            height: 1800,
          },
          links: [
            { label: "Live-Demo", href: "https://stud-easy.vercel.app/info", kind: "website" },
            { label: "Business Experience", href: "https://www.hevs.ch/fr/hautes-ecoles/haute-ecole-de-gestion/business-experience/", kind: "website" },
            { label: "JEVS", href: "http://jevs.ch/", kind: "website" },
          ],
        },
        {
          type: "Datenplattform · Schweiz",
          title: "EstimEat",
          description:
            "Projekt an der Fachhochschule im Rahmen einer einwöchigen Blockwoche. EstimEat vergleicht Schweizer Gemeinden für Restaurantstandorte anhand geografischer, demografischer und wirtschaftlicher Daten.",
          stack: ["Geodaten", "OpenStreetMap", "Schweizer Statistiken"],
          image: {
            src: "/estimeat-project.webp",
            srcSet: "/estimeat-project-720.webp 720w, /estimeat-project.webp 2880w",
            alt: "Startseite von EstimEat, Analyseplattform für Restaurantstandorte",
            width: 2880,
            height: 1800,
          },
          links: [
            { label: "Live-Demo", href: "https://estimeat.amacker.dev/", kind: "website" },
            { label: "Quellcode", href: "https://github.com/MadeInShineA/EstimEat" },
          ],
        },
        {
          type: "Grafik-Rendering · GPU",
          title: "CUDA Raytracer",
          description:
            "Rendering-Engine in C++ und CUDA. Strahlenberechnungen, Schnittpunkttests und Beleuchtung werden hochgradig parallel auf der GPU ausgeführt.",
          stack: ["C++", "CUDA", "Ray tracing"],
          image: {
            src: "/cuda-ray-tracer.webp",
            srcSet: "/cuda-ray-tracer-960.webp 960w, /cuda-ray-tracer.webp 1920w",
            alt: "Rendering des CUDA-Raytracers: Kugeln mit verschiedenen Materialien und Beleuchtungen",
            width: 1920,
            height: 1080,
          },
        },
        {
          type: "Bachelorarbeit · Constellium",
          title: "Vorausschauende Wartung",
          description:
            "Bachelorarbeit in Kooperation mit Constellium. Drehmomentmessungen speisen Zeitreihenmodelle zur Schätzung des Verschleißes industrieller Werkzeuge.",
          stack: ["Python", "LSTM", "Temporal Fusion Transformer"],
          diagram: {
            theme: "data",
            title: "Verschleiß ermitteln.",
            steps: ["Drehmomentmessungen", "LSTM / TFT", "Verschleißschätzung"],
            caption: "Vom Industriesignal zur Prognose",
          },
          links: [
            { label: "Vollständiger Bericht (PDF)", href: "https://tbs.isc-vs.ch/pdfs/2025-2026/kevin-voisin.full.pdf" },
            { label: "Zusammenfassung (PDF)", href: "https://tbs.isc-vs.ch/pdfs/2025-2026/kevin-voisin.pdf" },
          ],
        },
        {
          type: "Software-Testwerkzeug",
          title: "Stochastic AST & Source Code Fuzzer",
          description:
            "Erzeugt Programme in Swift, Scala, Forth und C aus einer EBNF-Grammatik, um das Verhalten verschiedener Compiler unter Last zu vergleichen.",
          stack: ["Swift", "Scala", "Forth", "C"],
          evidence: { label: "Validierung", value: "49 Unit-Tests für eine modulare Architektur." },
          diagram: {
            theme: "code",
            title: "Eine Grammatik,\nmehrere Sprachen.",
            steps: ["EBNF-Grammatik", "Swift-Generator", "C · Scala · Forth"],
            caption: "Programmerzeugung für Compiler-Tests",
          },
          links: [
            { label: "Quellcode", href: "https://github.com/kevivois/semester-project" },
          ],
        },
        {
          type: "Anwendung · Bestandsverwaltung",
          title: "Soventory",
          description:
            "Projekt für eine Lehrperson und die Verwaltung der EPTM im Rahmen des freien Projektunterrichts am Mittwochnachmittag. Diese Webanwendung zur Inventarverwaltung ist an eine API angebunden und bietet eine eigene Anmeldemaske.",
          stack: ["API", "Vercel"],
          image: {
            src: "/soventory-project.webp",
            srcSet: "/soventory-project-720.webp 720w, /soventory-project.webp 2880w",
            alt: "Soventory-Präsentationsseite mit Übersicht über den Gerätebestand",
            width: 2880,
            height: 1500,
          },
          links: [
            { label: "Live-Demo", href: "https://soventory.vercel.app/", kind: "website" },
            { label: "EPTM", href: "https://eptm.ch/", kind: "website" },
          ],
        },
        {
          type: "Dokumentation & CI/CD",
          title: "Systems Engineering Entry Page",
          description:
            "Auftrag des Studiengangsleiters Systemtechnik der HES-SO Valais-Wallis, ausgeführt bei der Junior Entreprise Valais (JEVS). Diese Kursdokumentation wird mit MkDocs generiert: Karten lassen sich nach Semester und Vertiefung filtern, mit automatischer Bereitstellung via GitLab CI.",
          stack: ["HTML/CSS", "MkDocs", "GitLab CI"],
          evidence: { label: "Bereitstellung", value: "Automatisierte Bereitstellung der Dokumentation mit GitLab CI." },
          image: {
            src: "/systems-courses-project.webp",
            srcSet: "/systems-courses-project-720.webp 720w, /systems-courses-project.webp 2880w",
            alt: "Systems Engineering Katalog: Filter nach Semester und Ausrichtung sowie Kurskarten",
            width: 2880,
            height: 2280,
          },
          links: [
            { label: "Kurskarten anzeigen", href: "https://synd.hevs.io/courses/index.html", kind: "website" },
            { label: "Studiengang Systemtechnik", href: "https://www.hevs.ch/fr/hautes-ecoles/haute-ecole-d-ingenierie/systemes-industriels/", kind: "website" },
            { label: "LinkedIn-Beitrag", href: "https://lnkd.in/p/ePmArn8z", kind: "website" },
            { label: "JEVS", href: "http://jevs.ch/", kind: "website" },
          ],
        },
      ],
    },
    career: {
      experienceHeading: "Berufserfahrung",
      educationHeading: "Ausbildung",
      experience: [
        {
          date: "Aktuell",
          title: "Fünfmonatiges Praktikum",
          company: "Pick & Place",
          companyUrl: "https://pickplace.com/",
          detail: "Vor Beginn meines Militärdienstes im Februar.",
        },
        {
          date: "2024 bis 2026",
          title: "IT-Leiter",
          company: "Junior Entreprise Valais",
          companyUrl: "http://jevs.ch/",
          detail: "Leitung von IT-Kundenprojekten, Konzeption und Umsetzung von Webseiten sowie Produktivsetzung.",
          stack: "React · WordPress · Infomaniak",
        },
        {
          date: "2022 bis 2023",
          title: "IT-Praktikant",
          company: "CEIDOS · Monthey",
          companyUrl: "https://ceidos.com/",
          detail: "Entwicklung neuer Funktionen und Optimierung einer biomedizinischen Analysesoftware.",
          stack: "Python · PyQt · C++",
        },
      ],
      education: [
        {
          date: "2023 bis 2026",
          title: "Bachelor of Science HES-SO",
          company: "Hochschule für Ingenieurwissenschaften · Sitten",
          detail: (
            <>
              <a href="https://isc.hevs.ch/" target="_blank" rel="noopener noreferrer">
                Informatik und Kommunikationssysteme
              </a>
              , Vertiefung Data Engineering.
            </>
          ),
        },
        {
          date: "2019 bis 2023",
          title: "Eidg. Fähigkeitszeugnis Informatik (EFZ)",
          company: "EPTM · Sitten",
          companyUrl: "https://eptm.ch/",
          detail: "Applikationsentwicklung.",
        },
      ],
      master: {
        kicker: "Nach dem Militärdienst",
        heading: "Master in Software Engineering",
        text: "HES-SO oder UNIL in Lausanne. Bevorzugt Vollzeitstudium (100 %), offen für ein 50%-Modell im Unternehmen.",
      },
    },
    skills: {
      heading: "Kompetenzen",
      aside: "Französisch (Muttersprache) · Englisch B2/C1 · Deutsch",
      groups: [
        { label: "Web & Applikationen", items: ["React", "Next.js", "TypeScript", "Java", "C#", "Swift"] },
        { label: "Daten & KI", items: ["Python", "Pandas", "Polars", "PyTorch", "LSTM", "TFT"] },
        { label: "Tools & Infrastruktur", items: ["SQL", "PostgreSQL", "Supabase", "Git", "Docker", "CI/CD"] },
      ],
    },
    contact: {
      heading: "Kontakt",
      lead: "Haben Sie ein IT-Projekt im Sinn? Web, Data, Software-Engineering oder mehr: Lassen Sie uns per E-Mail oder auf GitHub und LinkedIn austauschen.",
      copyEmail: "E-Mail-Adresse kopieren",
      emailCopied: "Adresse kopiert",
      cvDownload: "Lebenslauf herunterladen",
    },
    passions: {
      kicker: "06 / 06 · Sport & Freizeit",
      heading: "Nebenbei.",
      ariaLabel: "Einige Momente bei Sport, Wanderungen und Ausflügen",
      zoom: "Vergrößern",
      viewLargeAria: "Vollbild ansehen:",
      prevPhoto: "Vorheriges Foto",
      nextPhoto: "Nächstes Foto",
      modalAria: "Fotovorschau",
      items: [
        {
          id: "view",
          src: "/point-de-vue-alpin.webp",
          alt: "Kevin blickt von einem Aussichtspunkt in den Walliser Bergen in die Ferne",
          caption: "Aussichtspunkt im Wallis · August 2026",
          column: "views",
          mobileOrder: 1,
        },
        {
          id: "basket",
          src: "/basket-temps-mort.webp",
          alt: "Kevin sitzt während einer Pause beim My3x3-Turnier in Martigny auf der Bank",
          caption: "My3x3 · Martigny · August 2026",
          column: "movement",
          mobileOrder: 2,
        },
        {
          id: "course",
          src: "/course-route.webp",
          alt: "Kevin läuft beim Marathon des Terroirs in Martigny",
          caption: "Marathon des Terroirs · Martigny · Mai 2023",
          column: "movement",
          mobileOrder: 5,
        },
        {
          id: "hike",
          src: "/randonnee-alpes.webp",
          alt: "Drei Freunde wandern auf einem Bergpfad in Richtung Émosson-Staudamm oberhalb von Martigny",
          caption: "Auf dem Weg nach Émosson · Oberhalb von Martigny · September 2026",
          column: "elsewhere",
          mobileOrder: 3,
        },
        {
          id: "coucher",
          src: "/coucher-soleil.webp",
          alt: "Sonnenuntergang über dem Genfersee in Le Bouveret",
          caption: "Sonnenuntergang · Le Bouveret · September 2026",
          column: "elsewhere",
          mobileOrder: 4,
        },
      ],
    },
    footer: {
      copyright: "© 2026 Kevin Voisin",
      location: "Konzipiert & entwickelt im Wallis",
      top: "Nach oben",
    },
  },
};

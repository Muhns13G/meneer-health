// Framework-neutral public copy. Keep React, routing, provider, and workflow state out of this file.
export const publicContent = Object.freeze({
  schemaVersion: 1,
  sourceVersion: "2026.08.13.1",
  brand: Object.freeze({
    name: "Meneer",
    tagline: "Back to your best.",
    copyrightYear: "2026",
  }),
  metadata: Object.freeze({
    root: Object.freeze({
      title: "Meneer — Back to your best.",
      description:
        "Back to your best. South African men's telehealth with real HPCSA-registered doctors. Hair loss, ED, weight, TRT — discreetly delivered to your door.",
      socialTitle: "Meneer — Back to your best.",
      socialDescription:
        "Real doctors, real prescriptions, dropped at your door. Back to your best.",
    }),
    homepage: Object.freeze({
      title: "Meneer — Back to your best. Men's health, delivered in ZA",
      description:
        "Back to your best. South African men's telehealth with real HPCSA-registered doctors. Hair loss, ED, weight, TRT — discreetly delivered to your door.",
      socialTitle: "Meneer — Back to your best.",
      socialDescription:
        "Real doctors, real prescriptions, dropped at your door. Back to your best.",
    }),
    start: Object.freeze({
      title: "Start your private consult — Meneer",
      description: "A few private questions. A real doctor. Treatment at your door.",
    }),
    peptides: Object.freeze({
      title: "Peptides — Meneer",
      description:
        "Peptide treatment, medically guided. Doctor-led peptide therapy for recovery, performance, and longevity — delivered across South Africa.",
      socialTitle: "Peptides — Meneer",
      socialDescription: "Peptide treatment, medically guided. Doctor-led. Delivered.",
    }),
    contact: Object.freeze({
      title: "Contact — Meneer",
      description: "Get in touch with the Meneer team.",
    }),
    privacy: Object.freeze({
      title: "Website Privacy Notice — Meneer",
      description: "How the current Meneer website handles personal information.",
    }),
    terms: Object.freeze({
      title: "Website Terms — Meneer",
      description: "Terms governing use of the current Meneer website.",
    }),
    poster: Object.freeze({
      title: "Meneer — Dads, this one is for you.",
      description: "Meneer poster — Back to your best.",
    }),
    posterThanks: Object.freeze({
      title: "Meneer — Thanks for being a great dad.",
      description: "Meneer poster — Sorted, sir.",
    }),
  }),
  navigation: Object.freeze({
    primary: Object.freeze([
      { label: "Hair Loss", to: "/", hash: "treatments" },
      { label: "ED", to: "/", hash: "treatments" },
      { label: "Weight", to: "/", hash: "treatments" },
      { label: "Testosterone", to: "/", hash: "treatments" },
      { label: "Peptides", to: "/peptides" },
      { label: "How It Works", to: "/", hash: "how" },
    ] as const),
    startLabel: "Start privately",
    footer: Object.freeze([
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms", to: "/terms" },
      { label: "Contact", to: "/contact" },
    ] as const),
  }),
  support: Object.freeze({
    general: Object.freeze({
      email: "support@meneerhealth.co.za",
      href: "mailto:support@meneerhealth.co.za",
      owner: "OCTOTHORP ZA",
      monitoring: "Monitored daily",
    }),
    emergency: Object.freeze({
      mobile: Object.freeze({ label: "Mobile emergency: 112", href: "tel:112" }),
      ambulance: Object.freeze({ label: "Ambulance: 10177", href: "tel:10177" }),
    }),
    dedicated: Object.freeze({
      clinical: "unavailable",
      complaint: "unavailable",
      privacy: "unavailable",
    }),
  }),
  campaigns: Object.freeze({
    shared: Object.freeze({
      brand: "MENEER",
      scanAction: "Scan to start",
      trustLine: "HPCSA-registered doctors · Discreet delivery · POPIA-compliant",
      operatorLine: "© 2026 Meneer · Operated by OCTOTHORP ZA · K2024185008",
      signoff: "Sorted, sir.",
    }),
    dads: Object.freeze({
      id: "dads",
      qrPath: "/campaigns/qr/dads.svg",
      shortPath: "/go/dads",
      canonicalLabel: "meneerhealth.co.za/go/dads",
      destination: "/start?utm_source=offline&utm_medium=poster&utm_campaign=dads",
      headlineLead: "Dads,",
      headlineEnd: "this one is for you.",
      body: Object.freeze([
        "Low energy. No drive. Not recovering like you used to.",
        "It doesn’t have to stay that way.",
      ]),
    }),
    thanksDad: Object.freeze({
      id: "thanks_dad",
      qrPath: "/campaigns/qr/thanks-dad.svg",
      shortPath: "/go/thanks-dad",
      canonicalLabel: "meneerhealth.co.za/go/thanks-dad",
      destination: "/start?utm_source=offline&utm_medium=poster&utm_campaign=thanks_dad",
      headlineLead: "Thanks for being",
      headlineEnd: "a great dad.",
      subheading: "Now, this one is for you.",
      body: Object.freeze([
        "Energy. Performance. Hair. Weight. Hormones.",
        "Doctor-led men’s health, delivered to your door.",
      ]),
    }),
  }),
  homepage: Object.freeze({
    hero: Object.freeze({
      eyebrow: "Men's health · Delivered, ZA",
      title: "The care you've quietly been wanting.",
      body: "Hair you can run your hands through. Bedrooms that work like they used to. Real doctors, real prescriptions, dropped at your door — wrapped in absolutely nothing interesting.",
      primaryAction: "See if you qualify",
      secondaryAction: "How it works",
      imageAlt: "Confident man in a gym, athletic and powerful",
    }),
    trust: Object.freeze([
      "HPCSA-registered. Real doctors. No bots.",
      "Plain box. Neutral sender. Nobody's the wiser.",
      "POPIA-tight. Your business stays your business.",
      "Initial clinical review targeted within 48 hours of a complete intake.",
    ]),
    benefits: Object.freeze([
      "Zero waiting rooms",
      "Doctor-prescribed, evidence-led",
      "Boxed in beige, dropped at your door",
      "Cancel whenever — no awkward call",
    ]),
    treatments: Object.freeze({
      title: "The care you've always deserved.",
      action: "Find your match →",
      items: Object.freeze([
        {
          tag: "Hair loss",
          title: "Hair today. Still here tomorrow.",
          to: "/start",
          intent: "hair",
        },
        { tag: "Erectile dysfunction", title: "Hard, made easy.", to: "/start", intent: "ed" },
        {
          tag: "Weight management",
          title: "Less of you, more of you.",
          to: "/start",
          intent: "weight",
        },
        {
          tag: "Testosterone / TRT",
          title: "Energy you forgot you had.",
          to: "/start",
          intent: "trt",
        },
        { tag: "Peptides", title: "Precision, at a cellular level.", to: "/peptides", isNew: true },
      ] as const),
    }),
    howItWorks: Object.freeze({
      title: "Three steps. Zero awkwardness.",
      steps: Object.freeze([
        {
          n: "01",
          title: "Tell us what's up",
          body: "A few private questions, one at a time. No clipboards, no small talk, no waiting room magazines from 2014.",
        },
        {
          n: "02",
          title: "Meet a real, registered doctor",
          body: "HPCSA-registered SA doctors. Evenings, weekends, in your kitchen. Pick a slot like you'd pick a flat white.",
        },
        {
          n: "03",
          title: "We courier the goods",
          body: "Licensed local pharmacy. Boxed in nondescript beige. Even your nosy neighbour won't crack the case.",
        },
      ]),
    }),
    timeline: Object.freeze({
      eyebrow: "The timeline",
      title: "From tap to treatment.",
      events: Object.freeze([
        { title: "Complete intake" },
        { title: "Consult with your doctor" },
        { title: "Prescription sent to pharmacy" },
        { title: "Treatment at your door" },
      ]),
    }),
    doctor: Object.freeze({
      eyebrow: "The doctors",
      title: "A real doctor. Not a chatbot in scrubs.",
      quote:
        "Most men don't avoid the doctor because they don't care. They avoid it because the whole experience makes them feel ten years old again.",
      assurance:
        "Every Meneer prescription is reviewed and signed by a qualified HPCSA-registered doctor practising in South Africa. No call centres. No sales targets. Nobody upselling you a multivitamin.",
      unsuitable:
        "Our team of doctors call it like they see it. If a treatment isn't right for you, they'll say so — and you won't pay a cent for the consult.",
    }),
    discretion: Object.freeze({
      title: "Built so quietly, even your group chat won't know.",
      cards: Object.freeze([
        {
          title: "Browse like a ghost",
          body: "No login to look around. Your search history doesn't follow you home until you decide it should.",
        },
        {
          title: "Boxed in beige",
          body: "Unmarked box. Neutral sender. No 'CONFIDENTIAL' stickers screaming the opposite.",
        },
        {
          title: "Locked-down records",
          body: "POPIA-compliant. Encrypted. Shared with absolutely nobody — not even your medical aid, unless you say so.",
        },
      ]),
    }),
    cta: Object.freeze({
      title: "Most men wait too long. You really don't have to.",
      body: "Five minutes of honesty. A real doctor on the other side. If treatment is approved, pharmacy and delivery follow.",
      primaryAction: "See if you qualify",
      secondaryAction: "Read how it works",
      assurance: "No commitment. No phone calls. No one's the wiser.",
    }),
  }),
  journey: Object.freeze({
    intakeProgress: Object.freeze([
      "Choose condition",
      "Consent",
      "Create account",
      "Questionnaire",
    ]),
    confirmation: Object.freeze([
      { title: "Blood work, if required", when: "Before review" },
      { title: "Your doctor reviews your questionnaire and results", when: "Within 48h" },
      { title: "Video consultation with your doctor", when: "Required, 15–20 minutes" },
      { title: "Prescription and treatment plan", when: "Same day as consult" },
      {
        title: "Medication delivered to your door",
        when: "Target 3–5 business days after fulfilment approval",
      },
    ]),
    confirmationContact:
      "One of our doctors will be in touch within 48 hours to schedule your virtual consultation.",
  }),
  peptides: Object.freeze({
    eyebrow: "Peptide therapy",
    headline: "Peptide treatment, medically guided.",
    introduction:
      "Two short films before you begin — a little context on where peptides come from, and how they actually work in the body.",
    firstFilm: "The history of peptides",
    secondFilm: "How peptides work in the body",
  }),
  routeGates: Object.freeze({
    campaign: Object.freeze({
      eyebrow: "Campaign inactive",
      title: "This campaign is not currently active.",
      description:
        "The campaign will be made available only after its destination, QR asset, claims, and print behaviour are approved and tested.",
      assurance: "No scan, attribution, registration, or submission occurs from this page.",
    }),
    peptides: Object.freeze({
      eyebrow: "Peptide pathway",
      title: "Peptide access is currently gated.",
      description:
        "This pathway will open only after its partner questionnaire, dispensing basis, data hand-off, and escalation controls are approved.",
      assurance:
        "No profile, password, acknowledgement, health information, or questionnaire response is collected from this page.",
    }),
  }),
});

export type PublicContent = typeof publicContent;

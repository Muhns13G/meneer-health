export const supportChannels = Object.freeze({
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
} as const);

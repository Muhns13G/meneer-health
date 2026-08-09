export type EvidenceState = "owner-confirmed" | "placeholder";

type RegulatedParty = {
  name: string;
  registration: string;
  evidenceState: EvidenceState;
};

export const pilotComplianceProfile = {
  operator: {
    legalName: "OCTOTHORP ZA",
    enterpriseNumber: "K2024185008",
    vatNumber: "9279262266",
    evidenceState: "owner-confirmed",
  },
  clinician: {
    name: "Dr John Doe",
    registration: "HPCSA-PLACEHOLDER",
    evidenceState: "placeholder",
  } satisfies RegulatedParty,
  peptidePharmacy: {
    name: "Precise Wellness",
    registration: "Y-NUMBER-PLACEHOLDER",
    responsiblePharmacist: "Jane Doe",
    evidenceState: "placeholder",
  },
  urgentClinicalChannel: {
    value: "WHATSAPP-OR-PHONE-PLACEHOLDER",
    hours: "HOURS-PLACEHOLDER",
    evidenceState: "placeholder",
  },
} as const;

export const pilotActivationBlockers = [
  pilotComplianceProfile.clinician.evidenceState === "placeholder"
    ? "Verified clinician identity and HPCSA registration"
    : null,
  pilotComplianceProfile.peptidePharmacy.evidenceState === "placeholder"
    ? "Verified pharmacy legal identity, Y-number, and responsible pharmacist"
    : null,
  pilotComplianceProfile.urgentClinicalChannel.evidenceState === "placeholder"
    ? "Monitored urgent clinical telephone or WhatsApp channel and hours"
    : null,
].filter((value): value is string => value !== null);

export const isPilotActivationReady = pilotActivationBlockers.length === 0;

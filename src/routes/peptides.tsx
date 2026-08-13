import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { publicContent } from "@content/public-content";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PilotRouteGate } from "@/components/PilotRouteGate";
import { ProfileErrorSummary, ProfileFields } from "@/components/ProfileFields";
import { StepProgress } from "@/components/SteppedFlow";
import {
  validateProfileDraft,
  type ProfileDraft,
  type ProfileErrors,
  type ProfileField,
} from "@/domain/journey/profile-form";
import { publicEnvironment } from "@/config/public-environment";
import { useSteppedFlowFocus } from "@/hooks/use-stepped-flow-focus";

// TODO: Replace with real Precise Wellness questionnaire URL once confirmed.
const PW_QUESTIONNAIRE_URL = "https://precisewellness.example.com/questionnaire";

// Preview-branch fallback: keep this draft-media default out of the permanent branch.
const PREVIEW_VIDEO_URL = "/media/peptides/peptide-explainer-draft.mp4";
const PEPTIDE_VIDEO_URL = publicEnvironment.peptideVideoUrl ?? PREVIEW_VIDEO_URL;
const PEPTIDE_VIDEO_POSTER_URL = publicEnvironment.peptideVideoPosterUrl;

export const Route = createFileRoute("/peptides")({
  head: () => ({
    meta: [
      { title: publicContent.metadata.peptides.title },
      {
        name: "description",
        content: publicContent.metadata.peptides.description,
      },
      { property: "og:title", content: publicContent.metadata.peptides.socialTitle },
      {
        property: "og:description",
        content: publicContent.metadata.peptides.socialDescription,
      },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PeptidesRoute,
});

function PeptidesRoute() {
  if (PEPTIDE_VIDEO_URL) {
    return (
      <PeptideVideoPreview videoUrl={PEPTIDE_VIDEO_URL} posterUrl={PEPTIDE_VIDEO_POSTER_URL} />
    );
  }

  return (
    <PilotRouteGate
      eyebrow={publicContent.routeGates.peptides.eyebrow}
      title={publicContent.routeGates.peptides.title}
      description={publicContent.routeGates.peptides.description}
      assurance={publicContent.routeGates.peptides.assurance}
    />
  );
}

type PeptideVideoPreviewProps = {
  videoUrl: string;
  posterUrl?: string;
};

function PeptideVideoPreview({ videoUrl, posterUrl }: PeptideVideoPreviewProps) {
  return (
    <div className="relative">
      <Nav />
      <main className="container-x py-16 lg:py-24 max-w-4xl">
        <section>
          <p className="label-caps text-gold">{publicContent.peptides.eyebrow}</p>
          <h1 className="mt-6 font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-foreground">
            {publicContent.peptides.headline}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl">
            {publicContent.peptides.introduction}
          </p>

          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl overflow-hidden bg-surface border border-border/60">
              <div className="aspect-video bg-black/60">
                <video
                  aria-label="Draft peptide explainer: The history of peptides"
                  controls
                  playsInline
                  preload="metadata"
                  poster={posterUrl}
                  className="h-full w-full object-cover"
                >
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="label-caps text-muted-foreground">Film 01</p>
                  <p className="label-caps text-gold">Draft preview</p>
                </div>
                <h2 className="mt-2 font-serif text-xl text-foreground">
                  {publicContent.peptides.firstFilm}
                </h2>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden bg-surface border border-border/60">
              <div className="aspect-video bg-black/60 flex items-center justify-center">
                <p className="label-caps text-muted-foreground">Film in production</p>
              </div>
              <div className="p-5">
                <p className="label-caps text-muted-foreground">Film 02</p>
                <h2 className="mt-2 font-serif text-xl text-foreground">
                  {publicContent.peptides.secondFilm}
                </h2>
              </div>
            </div>
          </div>

          <div
            role="status"
            className="mt-8 rounded-2xl border border-border bg-surface p-5 text-sm leading-relaxed text-muted-foreground"
          >
            This draft is displayed for review. Final approval, captions, and a transcript are still
            required. No profile, password, acknowledgement, health information, or questionnaire
            response is collected from this page.
          </div>

          <Link
            to="/"
            className="mt-10 inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground hover:border-gold/50 transition-colors"
          >
            Back to home
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}

type Step = "intro" | "profile" | "acknowledge";

// Preserved prototype: exported for controlled tests but not routed until activation is approved.
export function PreservedPeptidesPage() {
  const [step, setStep] = useState<Step>("intro");
  const [profile, setProfile] = useState<ProfileDraft>({
    firstName: "",
    email: "",
    whatsapp: "",
    password: "",
  });
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [acknowledged, setAcknowledged] = useState(false);
  const { headingRef, errorSummaryRef } = useSteppedFlowFocus(
    step,
    Object.keys(profileErrors).length,
  );

  const goToQuestionnaire = () => {
    window.location.href = PW_QUESTIONNAIRE_URL;
  };

  const updateProfile = (field: ProfileField, value: string) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setProfileErrors((current) => ({ ...current, [field]: undefined }));
  };

  return (
    <div className="relative">
      <Nav />
      {step !== "intro" && (
        <StepProgress
          current={step === "profile" ? 1 : 2}
          total={2}
          label={step === "profile" ? "Create your profile" : "Acknowledgement"}
        />
      )}
      <main className="container-x py-16 lg:py-24 max-w-4xl">
        {step === "intro" && (
          <section>
            <p className="label-caps text-gold">{publicContent.peptides.eyebrow}</p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="mt-6 font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-foreground"
            >
              {publicContent.peptides.headline}
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl">
              {publicContent.peptides.introduction}
            </p>

            <div className="mt-12 grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl overflow-hidden bg-surface border border-border/60">
                <div className="aspect-video bg-black/60 flex items-center justify-center">
                  <p className="label-caps text-muted-foreground">Film source not configured</p>
                </div>
                <div className="p-5">
                  <p className="label-caps text-muted-foreground">Film 01</p>
                  <h3 className="mt-2 font-serif text-xl text-foreground">
                    {publicContent.peptides.firstFilm}
                  </h3>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden bg-surface border border-border/60">
                <div className="aspect-video bg-black/60 flex items-center justify-center">
                  <div className="text-center px-6">
                    <p className="label-caps text-gold">Coming soon</p>
                    <p className="mt-3 text-sm text-muted-foreground">Film in production</p>
                  </div>
                </div>
                <div className="p-5">
                  <p className="label-caps text-muted-foreground">Film 02</p>
                  <h3 className="mt-2 font-serif text-xl text-foreground">
                    {publicContent.peptides.secondFilm} — coming soon
                  </h3>
                </div>
              </div>
            </div>

            <div className="mt-12 flex flex-wrap gap-4">
              <button
                onClick={() => setStep("profile")}
                className="inline-flex items-center justify-center rounded-full bg-gold text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-gold-soft transition-colors"
              >
                Create your profile
              </button>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground hover:border-gold/50 transition-colors"
              >
                Back to home
              </Link>
            </div>
          </section>
        )}

        {step === "profile" && (
          <section className="max-w-xl">
            <p className="label-caps text-gold">Step 1 of 2</p>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="mt-4 font-serif text-3xl sm:text-4xl text-foreground"
            >
              Create your profile
            </h2>
            <p className="mt-3 text-muted-foreground">
              Your details stay private. We'll use WhatsApp to reach you.
            </p>

            <form
              noValidate
              className="mt-8 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                const errors = validateProfileDraft(profile);
                setProfileErrors(errors);
                if (Object.keys(errors).length > 0) return;
                setStep("acknowledge");
              }}
            >
              <ProfileErrorSummary ref={errorSummaryRef} errors={profileErrors} />
              <ProfileFields
                profile={profile}
                errors={profileErrors}
                onChange={updateProfile}
                nameLabel="Full name"
                nameAutocomplete="name"
              />

              <div className="flex flex-wrap gap-4 pt-4">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-gold text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-gold-soft transition-colors"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => setStep("intro")}
                  className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground hover:border-gold/50 transition-colors"
                >
                  Back
                </button>
              </div>
            </form>
          </section>
        )}

        {step === "acknowledge" && (
          <section className="max-w-2xl">
            <p className="label-caps text-gold">Step 2 of 2</p>
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="mt-4 font-serif text-3xl sm:text-4xl text-foreground"
            >
              Before you continue.
            </h2>

            <div className="mt-6 p-5 rounded-xl border border-gold/40 bg-gold/5">
              <p className="label-caps text-gold">[pending final compliance sign-off]</p>
              <p className="mt-3 text-sm text-muted-foreground">
                Placeholder copy — not final wording.
              </p>
            </div>

            <div className="mt-6 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                This peptide treatment is offered strictly for research and analytical purposes. By
                continuing, you acknowledge that you understand the nature of this programme and
                that final compliance and regulatory wording is still under review.
              </p>
              <p className="text-xs">
                [Full legal and compliance language pending final sign-off.]
              </p>
            </div>

            <label className="mt-8 flex items-start gap-3 cursor-pointer">
              <input
                id="peptide-acknowledgement"
                name="acknowledgement"
                type="checkbox"
                required
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1 h-5 w-5 accent-[color:var(--gold)]"
              />
              <span className="text-sm text-foreground">
                I understand this treatment is offered for research and analytical purposes, and I
                acknowledge the placeholder terms above pending final compliance sign-off.
              </span>
            </label>

            <div className="mt-10 flex flex-wrap gap-4">
              <button
                disabled={!acknowledged}
                onClick={goToQuestionnaire}
                className="inline-flex items-center justify-center rounded-full bg-gold text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-gold-soft transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue to questionnaire
              </button>
              <button
                type="button"
                onClick={() => setStep("profile")}
                className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground hover:border-gold/50 transition-colors"
              >
                Back
              </button>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

import "@tanstack/react-start/server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  IdentitySessionRejectedError,
  IdentitySessionUnavailableError,
  requiredAssurance,
  sessionDeadlines,
  type IdentitySessionRepository,
  type StartIdentitySession,
} from "@/application/identity/identity-session-repository";
import type {
  AuthenticationAssurance,
  IdentitySession,
  SessionClass,
  SessionStatus,
} from "@/domain/access/identity";

type IdentitySessionRow = {
  id: string;
  subject_id: string;
  provider_session_id: string;
  session_class: SessionClass;
  assurance: AuthenticationAssurance;
  status: SessionStatus;
  issued_at: string;
  last_seen_at: string;
  idle_expires_at: string;
  absolute_expires_at: string;
  revoked_at: string | null;
};

function mapRow(row: IdentitySessionRow): IdentitySession {
  return {
    id: row.id,
    subjectId: row.subject_id,
    providerSessionId: row.provider_session_id,
    sessionClass: row.session_class,
    assurance: row.assurance,
    status: row.status,
    issuedAt: new Date(row.issued_at),
    lastSeenAt: new Date(row.last_seen_at),
    idleExpiresAt: new Date(row.idle_expires_at),
    absoluteExpiresAt: new Date(row.absolute_expires_at),
    ...(row.revoked_at ? { revokedAt: new Date(row.revoked_at) } : {}),
  };
}

export class SupabaseIdentitySessionRepository implements IdentitySessionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async start(input: StartIdentitySession): Promise<IdentitySession> {
    if (input.observedAt >= input.providerIdentity.expiresAt) {
      throw new IdentitySessionRejectedError();
    }

    try {
      const existingResult = await this.client
        .from("identity_sessions")
        .select(
          "id, subject_id, provider_session_id, session_class, assurance, status, issued_at, last_seen_at, idle_expires_at, absolute_expires_at, revoked_at",
        )
        .eq("provider_session_id", input.providerIdentity.providerSessionId)
        .maybeSingle<IdentitySessionRow>();
      if (existingResult.error) throw new IdentitySessionUnavailableError();

      if (existingResult.data) {
        const existing = mapRow(existingResult.data);
        if (
          existing.subjectId !== input.subjectId ||
          existing.status !== "active" ||
          input.observedAt >= existing.idleExpiresAt ||
          input.observedAt >= existing.absoluteExpiresAt
        ) {
          throw new IdentitySessionRejectedError();
        }

        const sessionClass = stricterSessionClass(existing.sessionClass, input.sessionClass);
        const assurance =
          existing.assurance === "aal2" || input.providerIdentity.assurance === "aal2"
            ? "aal2"
            : "aal1";
        if (requiredAssurance(sessionClass) === "aal2" && assurance !== "aal2") {
          throw new IdentitySessionRejectedError();
        }

        const lastSeenAt = laterDate(existing.lastSeenAt, input.observedAt);
        const candidateDeadlines = sessionDeadlines(sessionClass, existing.issuedAt, lastSeenAt);
        const absoluteExpiresAt = earlierDate(
          existing.absoluteExpiresAt,
          candidateDeadlines.absoluteExpiresAt,
        );
        const idleExpiresAt = earlierDate(candidateDeadlines.idleExpiresAt, absoluteExpiresAt);
        const updated = await this.client
          .from("identity_sessions")
          .update({
            session_class: sessionClass,
            assurance,
            last_seen_at: lastSeenAt.toISOString(),
            idle_expires_at: idleExpiresAt.toISOString(),
            absolute_expires_at: absoluteExpiresAt.toISOString(),
            updated_at: input.observedAt.toISOString(),
          })
          .eq("id", existing.id)
          .eq("subject_id", input.subjectId)
          .eq("status", "active")
          .gt("idle_expires_at", input.observedAt.toISOString())
          .gt("absolute_expires_at", input.observedAt.toISOString())
          .select(
            "id, subject_id, provider_session_id, session_class, assurance, status, issued_at, last_seen_at, idle_expires_at, absolute_expires_at, revoked_at",
          )
          .maybeSingle<IdentitySessionRow>();
        if (updated.error) throw new IdentitySessionUnavailableError();
        if (!updated.data) throw new IdentitySessionRejectedError();
        return mapRow(updated.data);
      }

      if (
        requiredAssurance(input.sessionClass) === "aal2" &&
        input.providerIdentity.assurance !== "aal2"
      ) {
        throw new IdentitySessionRejectedError();
      }

      const issuedAt = input.providerIdentity.authenticatedAt;
      const lastSeenAt = laterDate(issuedAt, input.observedAt);
      const deadlines = sessionDeadlines(input.sessionClass, issuedAt, lastSeenAt);
      if (lastSeenAt >= deadlines.absoluteExpiresAt) {
        throw new IdentitySessionRejectedError();
      }
      const { data, error } = await this.client
        .from("identity_sessions")
        .insert({
          subject_id: input.subjectId,
          provider_session_id: input.providerIdentity.providerSessionId,
          session_class: input.sessionClass,
          assurance: input.providerIdentity.assurance,
          issued_at: issuedAt.toISOString(),
          last_seen_at: lastSeenAt.toISOString(),
          idle_expires_at: deadlines.idleExpiresAt.toISOString(),
          absolute_expires_at: deadlines.absoluteExpiresAt.toISOString(),
        })
        .select(
          "id, subject_id, provider_session_id, session_class, assurance, status, issued_at, last_seen_at, idle_expires_at, absolute_expires_at, revoked_at",
        )
        .single<IdentitySessionRow>();
      if (error || !data) throw new IdentitySessionUnavailableError();
      return mapRow(data);
    } catch (error) {
      if (error instanceof IdentitySessionRejectedError) throw error;
      if (error instanceof IdentitySessionUnavailableError) throw error;
      throw new IdentitySessionUnavailableError();
    }
  }

  async findActive(providerSessionId: string, now: Date): Promise<IdentitySession | null> {
    try {
      const { data, error } = await this.client
        .from("identity_sessions")
        .select(
          "id, subject_id, provider_session_id, session_class, assurance, status, issued_at, last_seen_at, idle_expires_at, absolute_expires_at, revoked_at",
        )
        .eq("provider_session_id", providerSessionId)
        .eq("status", "active")
        .gt("idle_expires_at", now.toISOString())
        .gt("absolute_expires_at", now.toISOString())
        .maybeSingle<IdentitySessionRow>();
      if (error) throw new IdentitySessionUnavailableError();
      return data ? mapRow(data) : null;
    } catch (error) {
      if (error instanceof IdentitySessionUnavailableError) throw error;
      throw new IdentitySessionUnavailableError();
    }
  }

  async touch(session: IdentitySession, now: Date): Promise<IdentitySession> {
    if (
      session.status !== "active" ||
      now >= session.idleExpiresAt ||
      now >= session.absoluteExpiresAt
    ) {
      throw new IdentitySessionRejectedError();
    }

    const deadlines = sessionDeadlines(session.sessionClass, session.issuedAt, now);
    try {
      const { data, error } = await this.client
        .from("identity_sessions")
        .update({
          last_seen_at: now.toISOString(),
          idle_expires_at: deadlines.idleExpiresAt.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", session.id)
        .eq("status", "active")
        .gt("idle_expires_at", now.toISOString())
        .gt("absolute_expires_at", now.toISOString())
        .select(
          "id, subject_id, provider_session_id, session_class, assurance, status, issued_at, last_seen_at, idle_expires_at, absolute_expires_at, revoked_at",
        )
        .maybeSingle<IdentitySessionRow>();
      if (error) throw new IdentitySessionUnavailableError();
      if (!data) throw new IdentitySessionRejectedError();
      return mapRow(data);
    } catch (error) {
      if (error instanceof IdentitySessionRejectedError) throw error;
      if (error instanceof IdentitySessionUnavailableError) throw error;
      throw new IdentitySessionUnavailableError();
    }
  }

  async revoke(sessionId: string, revokedAt: Date, reason: string): Promise<void> {
    if (!reason.trim()) throw new IdentitySessionRejectedError();

    try {
      const { data, error } = await this.client
        .from("identity_sessions")
        .update({
          status: "revoked",
          revoked_at: revokedAt.toISOString(),
          revocation_reason: reason,
          updated_at: revokedAt.toISOString(),
        })
        .eq("id", sessionId)
        .eq("status", "active")
        .select("id")
        .maybeSingle<{ id: string }>();
      if (error) throw new IdentitySessionUnavailableError();
      if (!data) throw new IdentitySessionRejectedError();
    } catch (error) {
      if (error instanceof IdentitySessionRejectedError) throw error;
      if (error instanceof IdentitySessionUnavailableError) throw error;
      throw new IdentitySessionUnavailableError();
    }
  }
}

const sessionClassRank: Record<SessionClass, number> = {
  patient: 1,
  workforce: 2,
  privileged: 3,
};

function stricterSessionClass(left: SessionClass, right: SessionClass): SessionClass {
  return sessionClassRank[left] >= sessionClassRank[right] ? left : right;
}

function earlierDate(left: Date, right: Date): Date {
  return left <= right ? left : right;
}

function laterDate(left: Date, right: Date): Date {
  return left >= right ? left : right;
}

import "@tanstack/react-start/server-only";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  medicalFieldIds,
  intakeEnvelopeSchema,
  intakeScopeSchema,
} from "../../../contracts/medical-intake";
import { intakePayloadSchema } from "@/application/intake/medical-intake-service";
import { initialiseServerEnvironment } from "@/server/config/environment.server";
import { inspectProtectedJsonRequest } from "@/server/security/request-security";
import { openWorkforceProof } from "@/server/identity/workforce-session-cookie";
import { workforceServiceFor } from "@/server/identity/workforce-http";
import { decryptIntake, readIntakeKeyRing } from "./intake-envelope";
import type { IntakeBindings } from "./patient-intake-http";
import { IdentityRejectedError } from "@/application/identity/managed-identity-provider";
import { IdentitySessionRejectedError } from "@/application/identity/identity-session-repository";
const purpose = z.enum(["medical_review", "medical_safety", "medical_transfer", "medical_rights"]);
export const staffIntakeCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list"), purpose }).strict(),
  z.object({ action: z.literal("read"), intakeId: z.uuid(), purpose }).strict(),
  z
    .object({
      action: z.literal("record_transfer"),
      intakeId: z.uuid(),
      snapshotId: z.uuid(),
      caseVersion: z.number().int().positive(),
      externalReference: z.uuid(),
      requestKey: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal("reconcile_transfer"),
      transferId: z.uuid(),
      evidenceReference: z.uuid(),
      requestKey: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal("approve_disposition"),
      intakeId: z.uuid(),
      snapshotId: z.uuid(),
      eligibleAt: z.iso.datetime({ offset: true }),
      evidenceReference: z.uuid(),
      requestKey: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal("reconcile_provider_disposition"),
      transferId: z.uuid(),
      approvalId: z.uuid(),
      evidenceReference: z.uuid(),
      requestKey: z.uuid(),
    })
    .strict(),
  z.object({ action: z.literal("dispose"), approvalId: z.uuid(), requestKey: z.uuid() }).strict(),
  z
    .object({
      action: z.enum(["hold_placed", "hold_released"]),
      intakeId: z.uuid(),
      evidenceReference: z.uuid(),
      requestKey: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal("approve_grant"),
      intakeId: z.uuid(),
      snapshotId: z.uuid(),
      targetSubjectId: z.uuid(),
      purpose,
      fields: z
        .array(z.enum(medicalFieldIds))
        .min(1)
        .max(26)
        .refine((v) => new Set(v).size === v.length),
      rosterReference: z.uuid(),
      expiresAt: z.iso.datetime({ offset: true }),
      requestKey: z.uuid(),
    })
    .strict(),
  z
    .object({ action: z.literal("activate_grant"), approvalId: z.uuid(), requestKey: z.uuid() })
    .strict(),
  z
    .object({
      action: z.enum(["acknowledged", "reviewed"]),
      intakeId: z.uuid(),
      snapshotId: z.uuid(),
      evidenceReference: z.uuid(),
      requestKey: z.uuid(),
    })
    .strict(),
]);
const medicalReadSchema = z
  .object({
    scope: intakeScopeSchema,
    envelope: intakeEnvelopeSchema,
    fields: z.array(z.enum(medicalFieldIds)).min(1).max(26),
    version: z.number().int().positive(),
    state: z.enum(["draft", "submitted", "restricted"]),
    safetyHold: z.boolean(),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export const medicalWorkListSchema = z
  .array(
    z
      .object({
        intakeId: z.uuid(),
        snapshotId: z.uuid(),
        version: z.number().int().positive(),
        state: z.enum(["draft", "submitted", "restricted"]),
        safetyHold: z.boolean(),
      })
      .strict(),
  )
  .max(20);
const response = (status: number, value?: unknown) =>
  new Response(value === undefined ? null : JSON.stringify(value), {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Type": "application/json",
      Vary: "Cookie",
    },
  });
export function createStaffIntakeHttpHandler(bindings: IntakeBindings) {
  return async (request: Request) => {
    const u = new URL(request.url);
    if (
      u.pathname !== "/staff/intake/command" ||
      u.search ||
      request.method !== "POST" ||
      !["meneerhealth.co.za", "localhost", "127.0.0.1"].includes(u.hostname)
    )
      return response(404);
    if (bindings.MEDICAL_INTAKE_MODE !== "enabled") return response(412);
    try {
      const proof = await openWorkforceProof(request, bindings.IDENTITY_SESSION_KEY_BASE64);
      if (!proof?.sessionId) return response(401);
      const inspected = await inspectProtectedJsonRequest(
        request,
        {
          action: "medical-workforce",
          routeClass: "protected-command",
          maxBodyBytes: 4096,
          requireAntiAutomation: false,
          requireIdempotency: true,
        },
        { rateLimiter: bindings.REQUEST_RATE_LIMITER, principalRateKey: proof.sessionId },
      );
      if (!inspected.allowed) return response(inspected.response.status);
      const parsed = staffIntakeCommandSchema.safeParse(inspected.value.body);
      if (!parsed.success) return response(422);
      const command = parsed.data;
      if ("requestKey" in command && command.requestKey !== inspected.value.idempotencyKey)
        return response(422);
      const workforce = workforceServiceFor(bindings);
      const { context, identity, session } = await workforce.authorise(proof);
      if (context.tenantId !== bindings.MEDICAL_INTAKE_TENANT_ID) return response(403);
      const c = {
        tenantId: context.tenantId,
        subjectId: context.subjectId,
        sessionId: session.id,
        providerSubject: identity.providerSubject,
        providerSessionId: identity.providerSessionId,
        verifiedEmail: identity.verifiedContact.value,
        purpose: context.purpose,
      };
      const config = initialiseServerEnvironment({
        SUPABASE_URL: bindings.SUPABASE_URL,
        SUPABASE_SECRET_KEY: bindings.SUPABASE_SECRET_KEY,
      }).environment.supabase;
      if (!config) return response(503);
      const client = createClient(config.url, config.secretKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      async function call(name: string, args: Record<string, unknown>) {
        const r = await client.rpc(name, args);
        if (r.error) throw new Error(r.error.code);
        return r.data as unknown;
      }
      if (command.action === "read") {
        const args = { p_context: c, p_intake_id: command.intakeId, p_purpose: command.purpose };
        const stored = medicalReadSchema.parse(await call("read_medical_intake", args));
        if (
          stored.scope.tenantId !== context.tenantId ||
          stored.scope.intakeId !== command.intakeId
        )
          return response(403);
        const payload = intakePayloadSchema.parse(
          await decryptIntake(
            stored.envelope,
            stored.scope,
            readIntakeKeyRing(bindings.MEDICAL_INTAKE_KEYRING_JSON),
          ),
        );
        const checked = medicalReadSchema.parse(await call("read_medical_intake", args));
        if (
          JSON.stringify([checked.scope, checked.fields, checked.version]) !==
          JSON.stringify([stored.scope, stored.fields, stored.version])
        )
          return response(409);
        await workforce.authorise(proof);
        const values = Object.fromEntries(
          stored.fields.map((field) => [
            field,
            field === "contact"
              ? payload.contact
              : payload.answers[field as keyof typeof payload.answers],
          ]),
        );
        return response(200, {
          intakeId: command.intakeId,
          snapshotId: stored.scope.snapshotId,
          version: stored.version,
          state: stored.state,
          safetyHold: stored.safetyHold,
          fields: values,
          expiresAt: new Date(
            Math.min(
              Date.parse(stored.expiresAt),
              session.idleExpiresAt.getTime(),
              session.absoluteExpiresAt.getTime(),
              identity.expiresAt.getTime(),
            ),
          ).toISOString(),
        });
      }
      if (command.action === "list") {
        const items = medicalWorkListSchema.parse(
          await call("list_medical_intakes", { p_context: c, p_purpose: command.purpose }),
        );
        await workforce.authorise(proof);
        return response(200, { items, expiresAt: session.idleExpiresAt.toISOString() });
      }
      let reference: unknown;
      if (command.action === "approve_grant")
        reference = await call("approve_medical_grant", { p_context: c, p_command: command });
      else if (command.action === "activate_grant")
        reference = await call("activate_medical_grant", {
          p_context: c,
          p_approval_id: command.approvalId,
        });
      else if (command.action === "record_transfer")
        reference = await call("record_medical_transfer", { p_context: c, p_command: command });
      else if (command.action === "reconcile_transfer")
        reference = await call("reconcile_medical_transfer", { p_context: c, p_command: command });
      else if (command.action === "reconcile_provider_disposition")
        reference = await call("reconcile_medical_provider_disposition", {
          p_context: c,
          p_command: command,
        });
      else if (command.action === "approve_disposition")
        reference = await call("approve_medical_disposition", { p_context: c, p_command: command });
      else if (command.action === "dispose")
        reference = await call("dispose_medical_intake", {
          p_context: c,
          p_approval_id: command.approvalId,
          p_request_key: command.requestKey,
        });
      else if (command.action === "hold_placed" || command.action === "hold_released")
        reference = await call("record_medical_lifecycle_hold", {
          p_context: c,
          p_command: { ...command, event: command.action },
        });
      else reference = await call("respond_medical_safety", { p_context: c, p_command: command });
      if (!z.uuid().safeParse(reference).success) return response(503);
      await workforce.authorise(proof);
      return response(200, { reference, outcome: "recorded" });
    } catch (error) {
      if (error instanceof IdentityRejectedError || error instanceof IdentitySessionRejectedError)
        return response(401);
      const message = error instanceof Error ? error.message : "";
      return response(
        message === "P0001"
          ? 412
          : message === "40001"
            ? 409
            : message === "42501" || message === "IDENTITY_REJECTED"
              ? 403
              : 503,
      );
    }
  };
}

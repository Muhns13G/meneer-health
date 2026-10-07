import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildHostedBridgeSetup,
  submitHostedBridgeIntake,
  type HostedBridgePorts,
} from "./sprint13-hosted-bridge";

const original = readFileSync("scripts/sql/sprint-13-payment-setup.sql", "utf8");
const driver = readFileSync("scripts/test-sprint13-hosted-payment.ts", "utf8");
const helper = readFileSync("scripts/lib/sprint13-hosted-bridge.ts", "utf8");
describe("fresh hosted Sprint 13.5 bridge boundary", () => {
  it("does not seed submission, snapshots, grants, funding or a ready case", () => {
    const setup = buildHostedBridgeSetup(original);
    expect(setup).toContain("e1350000");
    expect(setup).not.toContain("e1340000");
    expect(setup).toContain("SYNTHETIC PAID BRIDGE ONLY");
    expect(setup).toContain("SYNTHETIC TEST ONLY manual transfer notice");
    for (const relation of [
      "intakes",
      "snapshots",
      "transfers",
      "transfer_preparations",
      "access_grants",
      "grant_approvals",
      "deposit_funding",
      "settlements",
    ]) {
      expect(setup).not.toMatch(new RegExp(`insert\\s+into\\s+\\w+\\.${relation}\\b`, "i"));
    }
    expect(setup).not.toContain("ready_for_handoff");
    expect(setup).not.toMatch(/insert\s+into\s+public\.operations_cases/i);
    expect(helper).toContain("BRIDGE_CASE_LINKAGE_INVALID");
    expect(driver).toContain("caseId = await submitHostedBridgeIntake(bridgePorts)");
  });
  it("refuses an unknown fixture layout", () => {
    expect(() => buildHostedBridgeSetup("begin;commit;")).toThrow(
      "BRIDGE_FIXTURE_BOUNDARY_INVALID",
    );
  });
  it("follows the real intake-created case instead of the unrelated fixed payment case", async () => {
    const caseId = "12340000-0000-4000-8000-000000000010";
    const actions: unknown[] = [];
    const ports: HostedBridgePorts = {
      tenant: "e1350000-0000-4000-8000-000000000001",
      caseId: "e1350000-0000-4000-8000-000000000010",
      actors: new Map([
        ["patient", { id: caseId, email: "synthetic@example.invalid", subjectId: caseId }],
      ]),
      async request(_path, command) {
        actions.push(command.action);
        return Response.json(
          command.action === "save"
            ? { version: 1, state: "draft" }
            : {
                caseId,
                snapshotId: "12340000-0000-4000-8000-000000000003",
                version: 2,
                state: "submitted",
              },
        );
      },
      async sql(query) {
        expect(query).toContain(`i.case_id='${caseId}'`);
        return [{ linked: true }];
      },
      async portalRead() {
        throw new Error("UNEXPECTED_PORTAL_READ");
      },
      manifest() {},
    };
    expect(await submitHostedBridgeIntake(ports)).toBe(caseId);
    expect(actions).toEqual(["save", "submit"]);
    await expect(
      submitHostedBridgeIntake({
        ...ports,
        async sql() {
          return [{ linked: false }];
        },
      }),
    ).rejects.toThrow("BRIDGE_CASE_LINKAGE_INVALID");
  });
  it("requires a new explicit scenario/capture guard and new schema baseline", () => {
    expect(driver).toContain("isolated-paid-medical-bridge-only");
    expect(driver).toContain("medicalBridge ? 127 : 125");
    expect(driver).toContain("MEDICAL_DISABLED_RESTORATION_BASELINE_CHANGED");
    expect(driver).toContain("20261007204237");
    expect(driver).toContain("20261007201957");
  });
  it("restores disabled mode and actually removes only the new tenant binding", () => {
    expect(driver).toContain('MEDICAL_INTAKE_MODE: "disabled"');
    expect(driver).toContain('"MEDICAL_INTAKE_TENANT_ID"');
    expect(driver).toContain("MEDICAL_TENANT_REMOVAL_UNCONFIRMED");
    expect(driver).not.toContain('"delete", "MEDICAL_INTAKE_KEYRING_JSON"');
  });
  it("uses routed grants/consent/preparation and genuine funding, never provider success", () => {
    for (const marker of [
      "BRIDGE_DRAFT_VERSION_INVALID",
      "approve_grant",
      "activate_grant",
      "authorise_transfer",
      "prepare_transfer",
      "record_transfer",
      "reconcile_transfer",
      "BRIDGE_UNPAID_PREPARATION_ALLOWED",
      "BRIDGE_SELF_RECONCILIATION_ALLOWED",
      "BRIDGE_NONCLINICAL_RECONCILER_READ_ALLOWED",
    ]) {
      expect(helper).toContain(marker);
    }
    expect(helper).toContain('"synthetic-Meneer-only"');
    expect(helper).toContain("providerContacted: false");
    expect(helper).toContain("externalDataTransferred: false");
    expect(helper).not.toContain("https://protocols.");
    expect(helper).not.toMatch(
      /update\s+public\.operations_cases\s+set\s+state='ready_for_handoff'/i,
    );
    expect(helper).toContain("BRIDGE_FAULT_NOT_DENIED");
  });
});

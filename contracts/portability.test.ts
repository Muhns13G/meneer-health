import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  comparePortableObservation,
  portabilityFixtureCatalogueSchema,
  retainedCapabilityCatalogue,
  retainedCapabilitySchema,
} from "./capabilities";
import {
  registeredCatalogueNames,
  registeredSchemaNames,
  validatePortableContractFixture,
} from "./portability";
import { contractSchemaRegistry, contractSchemaRegistryEntrySchema } from "./registry";

const fixtureFile = resolve(process.cwd(), "contracts/fixtures/retained-capabilities.json");
const fixtureCatalogue = portabilityFixtureCatalogueSchema.parse(
  JSON.parse(readFileSync(fixtureFile, "utf8")),
);

describe("retained capability catalogue", () => {
  it("is unique, machine-valid and explicit about the v2 disposition", () => {
    const ids = retainedCapabilityCatalogue.map((capability) => capability.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const capability of retainedCapabilityCatalogue) {
      expect(retainedCapabilitySchema.parse(capability)).toEqual(capability);
    }
  });

  it("binds every capability to existing, uniquely-owned acceptance fixtures", () => {
    const fixtureIds = fixtureCatalogue.fixtures.map((fixture) => fixture.id);
    const fixtureOwners = new Map(
      fixtureCatalogue.fixtures.map((fixture) => [fixture.id, fixture.capabilityId]),
    );

    expect(new Set(fixtureIds).size).toBe(fixtureIds.length);
    for (const capability of retainedCapabilityCatalogue) {
      for (const fixtureId of capability.acceptanceFixtureIds) {
        expect(fixtureOwners.get(fixtureId)).toBe(capability.id);
      }
    }
  });
});

describe("schema and version registry", () => {
  it("registers one runtime schema for every named major", () => {
    const identities = contractSchemaRegistry.map(
      (entry) => `${entry.definition.name}@${entry.definition.version}`,
    );

    expect(new Set(identities).size).toBe(identities.length);
    for (const entry of contractSchemaRegistry) {
      expect(contractSchemaRegistryEntrySchema.parse(entry)).toEqual(entry);
    }
    expect(registeredSchemaNames()).toEqual(registeredCatalogueNames());
  });

  it("resolves every capability contract reference to an exact registered major", () => {
    const registered = new Set(
      contractSchemaRegistry.map((entry) => `${entry.definition.name}@${entry.definition.version}`),
    );

    for (const capability of retainedCapabilityCatalogue) {
      for (const reference of capability.contractReferences) {
        expect(registered.has(`${reference.name}@${reference.version}`)).toBe(true);
      }
    }
  });
});

describe("portable behavioural fixtures", () => {
  it("produces the recorded acceptance or stable rejection for every contract fixture", () => {
    for (const fixture of fixtureCatalogue.fixtures) {
      if (fixture.kind !== "contract-validation") continue;
      expect(validatePortableContractFixture(fixture)).toEqual(fixture.expected);
    }
  });

  it("accepts equivalent target observations and detects intentional or accidental drift", () => {
    const reference = fixtureCatalogue.fixtures[0]?.expected;

    expect(comparePortableObservation(reference, structuredClone(reference))).toEqual([]);
    expect(comparePortableObservation(reference, { status: 201 })).toEqual([
      "BEHAVIOURAL_MISMATCH",
    ]);

    for (const fixture of fixtureCatalogue.fixtures) {
      if (fixture.kind !== "behavioural-scenario") continue;
      expect(
        comparePortableObservation(fixture.expected, structuredClone(fixture.expected)),
      ).toEqual([]);
    }
  });
});

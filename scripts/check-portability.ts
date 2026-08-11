import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  portabilityFixtureCatalogueSchema,
  retainedCapabilityCatalogue,
  retainedCapabilitySchema,
} from "../contracts/capabilities";
import {
  registeredCatalogueNames,
  registeredSchemaNames,
  validatePortableContractFixture,
} from "../contracts/portability";
import { contractSchemaRegistry, contractSchemaRegistryEntrySchema } from "../contracts/registry";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const fixturePath = resolve(repositoryRoot, "contracts/fixtures/retained-capabilities.json");
const fixtures = portabilityFixtureCatalogueSchema.parse(
  JSON.parse(readFileSync(fixturePath, "utf8")),
);
const failures: string[] = [];

const duplicateValues = (values: readonly string[]) =>
  values.filter((value, index) => values.indexOf(value) !== index);

for (const capability of retainedCapabilityCatalogue) retainedCapabilitySchema.parse(capability);
for (const entry of contractSchemaRegistry) contractSchemaRegistryEntrySchema.parse(entry);

const capabilityIds = retainedCapabilityCatalogue.map((capability) => capability.id);
const capabilityIdSet = new Set<string>(capabilityIds);
const fixtureIds = fixtures.fixtures.map((fixture) => fixture.id);
const contractIdentities = contractSchemaRegistry.map(
  (entry) => `${entry.definition.name}@${entry.definition.version}`,
);

for (const duplicate of duplicateValues(capabilityIds))
  failures.push(`Duplicate capability ${duplicate}`);
for (const duplicate of duplicateValues(fixtureIds))
  failures.push(`Duplicate fixture ${duplicate}`);
for (const duplicate of duplicateValues(contractIdentities))
  failures.push(`Duplicate contract ${duplicate}`);

const fixtureOwners = new Map(
  fixtures.fixtures.map((fixture) => [fixture.id, fixture.capabilityId]),
);
const registeredContracts = new Set(contractIdentities);

for (const capability of retainedCapabilityCatalogue) {
  for (const fixtureId of capability.acceptanceFixtureIds) {
    if (fixtureOwners.get(fixtureId) !== capability.id) {
      failures.push(`${capability.id} does not own declared fixture ${fixtureId}`);
    }
  }
  for (const reference of capability.contractReferences) {
    if (!registeredContracts.has(`${reference.name}@${reference.version}`)) {
      failures.push(`${capability.id} references an unregistered contract major`);
    }
  }
}

for (const fixture of fixtures.fixtures) {
  if (!capabilityIdSet.has(fixture.capabilityId)) {
    failures.push(`${fixture.id} references unknown capability ${fixture.capabilityId}`);
  }
  if (fixture.kind === "contract-validation") {
    const observation = validatePortableContractFixture(fixture);
    if (JSON.stringify(observation) !== JSON.stringify(fixture.expected)) {
      failures.push(`${fixture.id} no longer produces its recorded contract observation`);
    }
  }
  if (fixture.kind === "behavioural-scenario") {
    for (const evidencePath of fixture.currentEvidence) {
      if (!existsSync(resolve(repositoryRoot, evidencePath))) {
        failures.push(`${fixture.id} evidence is missing: ${evidencePath}`);
      }
    }
  }
}

if (JSON.stringify(registeredCatalogueNames()) !== JSON.stringify(registeredSchemaNames())) {
  failures.push("The schema registry and runtime validator map have drifted");
}

for (const entry of contractSchemaRegistry) {
  if (!existsSync(resolve(repositoryRoot, entry.source))) {
    failures.push(`${entry.definition.name} source is missing: ${entry.source}`);
  }
  if (entry.databaseMigration) {
    const migrationPrefix = `${entry.databaseMigration}_`;
    const migrationExists = readdirSync(resolve(repositoryRoot, "supabase/migrations")).some(
      (path) => path.startsWith(migrationPrefix) && path.endsWith(".sql"),
    );
    if (!migrationExists) failures.push(`${entry.definition.name} migration is missing`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`Portability error: ${failure}`);
  process.exit(1);
}

console.log(
  `Portability catalogue passed: ${capabilityIds.length} capabilities, ${contractIdentities.length} contract majors, ${fixtureIds.length} fixtures.`,
);

import { expect, it } from "vitest";
import { readHandoffChannel } from "./handoff-channel";
const input = {
  HANDOFF_INTAKE_URL: "https://protocols.example.invalid/intake/synthetic",
  HANDOFF_DESTINATION_ID: "b6000000-0000-4000-8000-000000000011",
  HANDOFF_DESTINATION_VERSION: "1",
};
it("hashes only exact owner-configured HTTPS destinations", async () => {
  const result = await readHandoffChannel(input);
  expect(result.digest).toMatch(/^[a-f0-9]{64}$/);
  expect(result.destinationVersion).toBe(1);
  expect(
    (
      await readHandoffChannel({
        ...input,
        HANDOFF_INTAKE_URL: `${input.HANDOFF_INTAKE_URL}/changed`,
      })
    ).digest,
  ).not.toBe(result.digest);
});
it.each([
  undefined,
  "http://protocols.example.invalid/intake",
  "javascript:alert(1)",
  "https://user:password@protocols.example.invalid/intake",
  "https://protocols.example.invalid/login",
  "https://127.0.0.1/intake",
  "https://protocols.example.invalid/",
  "https://protocols.example.invalid/intake#secret",
])("fails closed without echoing a rejected destination", async (url) => {
  await expect(readHandoffChannel({ ...input, HANDOFF_INTAKE_URL: url })).rejects.toThrow(
    "HANDOFF_CHANNEL_UNAVAILABLE",
  );
});
it("rejects incomplete configuration", async () => {
  await expect(
    readHandoffChannel({ HANDOFF_INTAKE_URL: input.HANDOFF_INTAKE_URL }),
  ).rejects.toThrow("HANDOFF_CHANNEL_UNAVAILABLE");
});

import { contractMajorSchema, contractNameSchema } from "./shared";

export type SupportedContractMajors = Readonly<Record<string, readonly number[]>>;

export class UnsupportedContractMajorError extends Error {
  readonly code = "UNSUPPORTED_CONTRACT_MAJOR";

  constructor(
    readonly contract: string,
    readonly version: number,
  ) {
    super(`Unsupported major version for ${contract}.`);
    this.name = "UnsupportedContractMajorError";
  }
}

export function supportsContractMajor(
  catalogue: SupportedContractMajors,
  contract: string,
  version: number,
): boolean {
  if (
    !contractNameSchema.safeParse(contract).success ||
    !contractMajorSchema.safeParse(version).success
  ) {
    return false;
  }

  return catalogue[contract]?.includes(version) ?? false;
}

export function assertSupportedContractMajor(
  catalogue: SupportedContractMajors,
  contract: string,
  version: number,
): void {
  if (!supportsContractMajor(catalogue, contract, version)) {
    throw new UnsupportedContractMajorError(contract, version);
  }
}

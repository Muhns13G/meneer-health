import type { ErrorContract, StableErrorCode } from "../../../contracts/errors";
import {
  verifiedFulfilmentPartnerEventSchema,
  type FulfilmentPartnerEventResult,
} from "../../../contracts/fulfilment";
import { FulfilmentRepositoryError, type FulfilmentRepository } from "./fulfilment-repository";

export type FulfilmentPartnerEventOutcome =
  | Readonly<{ ok: true; result: FulfilmentPartnerEventResult }>
  | Readonly<{ ok: false; error: ErrorContract }>;

function safeError(
  correlationId: string,
  code: StableErrorCode,
  message: string,
  retry: ErrorContract["error"]["retry"],
): ErrorContract {
  return {
    contract: "error.response",
    version: 1,
    correlationId,
    error: { code, message, retry },
  };
}

export class FulfilmentPartnerEventService {
  constructor(
    private readonly repository: FulfilmentRepository,
    private readonly serviceIdentityId: string,
  ) {}

  async handle(input: unknown): Promise<FulfilmentPartnerEventOutcome> {
    const parsed = verifiedFulfilmentPartnerEventSchema.safeParse(input);
    const correlationId = parsed.success ? parsed.data.externalEventId : "correlation_unknown";
    if (!parsed.success) {
      return {
        ok: false,
        error: safeError(
          correlationId,
          "VALIDATION_FAILED",
          "The partner event is invalid.",
          "never",
        ),
      };
    }

    try {
      const result = await this.repository.applyPartnerEvent({
        serviceIdentityId: this.serviceIdentityId,
        event: parsed.data,
      });
      return { ok: true, result };
    } catch (error) {
      if (error instanceof FulfilmentRepositoryError) {
        if (error.failure === "NOT_FOUND") {
          return {
            ok: false,
            error: safeError(correlationId, "NOT_FOUND", "The resource was not found.", "never"),
          };
        }
        if (error.failure === "GATE_DISABLED") {
          return {
            ok: false,
            error: safeError(
              correlationId,
              "FORBIDDEN",
              "The partner integration is not enabled.",
              "never",
            ),
          };
        }
        if (error.failure === "CONFLICT") {
          return {
            ok: false,
            error: safeError(
              correlationId,
              "CONFLICT",
              "The event conflicts with durable fulfilment state.",
              "reconcile",
            ),
          };
        }
      }
      return {
        ok: false,
        error: safeError(
          correlationId,
          "INTERNAL_FAILURE",
          "The partner event could not be completed.",
          "reconcile",
        ),
      };
    }
  }
}

import { z } from "zod";
export const operationsAlertSchema = z.strictObject({
  id: z.uuid(),
  code: z.enum([
    "ASSIGNMENT_CHANGED",
    "HANDOFF_UNCERTAIN",
    "OPERATIONS_EXCEPTION",
    "ACKNOWLEDGEMENT_OVERDUE",
    "ACCESS_DENIED",
    "OVERRIDE_DENIED",
  ]),
  owner: z.enum(["security", "technology-operations"]),
  severity: z.enum(["warning", "critical"]),
  recorded_at: z.iso.datetime({ offset: true }),
  delivery: z.enum(["pending", "leased", "accepted", "failed", "uncertain"]),
  acknowledged: z.boolean(),
  resolved: z.boolean(),
});
export const operationsAlertListSchema = z.array(operationsAlertSchema).max(100);
export type OperationsAlert = z.infer<typeof operationsAlertSchema>;

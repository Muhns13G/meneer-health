type Bindings = { GITHUB_RECOVERY_DISPATCH_TOKEN: string };

// Separate scheduling boundary: the existing runner alone performs export/restore/heartbeat.
// Provision a fine-grained token restricted to Muhns13G/meneer-health, Actions read/write.
// GitHub scopes this permission to the repository, not to one workflow; code pins the target.
export async function dispatchRecovery(bindings: Bindings, fetcher: typeof fetch = fetch) {
  if (!bindings.GITHUB_RECOVERY_DISPATCH_TOKEN?.trim()) {
    throw new Error("RECOVERY_DISPATCH_CONFIGURATION_INVALID");
  }
  const response = await fetcher(
    "https://api.github.com/repos/Muhns13G/meneer-health/actions/workflows/recovery-export.yml/dispatches",
    {
      method: "POST",
      redirect: "error",
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "meneer-recovery-dispatcher",
        Authorization: `Bearer ${bindings.GITHUB_RECOVERY_DISPATCH_TOKEN.trim()}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: "main", inputs: { source: "production" } }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  // Dispatch acceptance is NOT completed-backup evidence. Never signal the backup heartbeat here.
  if (response.status !== 204) throw new Error("RECOVERY_DISPATCH_REJECTED");
}

export default {
  async scheduled(_event: unknown, bindings: Bindings) {
    try {
      await dispatchRecovery(bindings);
      console.log(
        JSON.stringify({ job: "recovery-dispatch", accepted: true, backupVerified: false }),
      );
    } catch {
      console.log(
        JSON.stringify({ job: "recovery-dispatch", accepted: false, backupVerified: false }),
      );
      throw new Error("RECOVERY_DISPATCH_FAILED");
    }
  },
  fetch() {
    return new Response(null, { status: 404 });
  },
};

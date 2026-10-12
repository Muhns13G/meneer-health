// Explicit owner-approved release only. Never promotes a Worker, sends mail or takes payment.
import { createHash, randomUUID } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const project = "gibfpolrdjotwvewgfsz";
const tenant = "80000000-0000-4000-8000-000000000001";
const approver = "c72f29d8-a171-43bc-a942-47b07ce03246";
const expectedVersion = "e9bd9a8a-adac-4791-b010-833caf935c73";
const expectedEtag = "0caa5c781c97efac0cf947bd637e71bc1212324023855fa2cbed41e00ddb8e12";
const receiptPath = new URL("../../.public-registration-release.local", import.meta.url);
const mode = process.argv[2];
function check(condition, code) {
  if (!condition) throw new Error(code);
}
const original = readFileSync(
  new URL(
    "../../docs/02-implementation-plans/phase-02/annexures/pilot-client-terms-v1.md",
    import.meta.url,
  ),
  "utf8",
);
const proposal = readFileSync(
  new URL(
    "../../docs/02-implementation-plans/phase-02/annexures/public-onboarding-notice-update-draft.md",
    import.meta.url,
  ),
  "utf8",
);
function section(text, start, end) {
  const from = text.indexOf(start),
    to = text.indexOf(end, from + start.length);
  check(from >= 0 && to > from, "NOTICE_SECTION_INVALID");
  return text.slice(from + start.length, to).trim();
}
function paragraphAfter(text, heading) {
  const from = text.indexOf(heading);
  check(from >= 0, "NOTICE_PARAGRAPH_INVALID");
  return text
    .slice(from + heading.length)
    .trimStart()
    .split("\n\n", 1)[0];
}
function replaceOnce(text, old, replacement) {
  check(old && replacement && text.split(old).length === 2, "NOTICE_SOURCE_DRIFT");
  return text.replace(old, replacement);
}
const oldBodies = [
  section(original, "## A — Account and Pilot Terms", "## B — Privacy Collection Notice"),
  section(original, "## B — Privacy Collection Notice", "## C — Questionnaire Acknowledgement"),
];
const newBodies = [
  replaceOnce(
    replaceOnce(
      oldBodies[0],
      paragraphAfter(original, "### What the pilot provides"),
      paragraphAfter(
        proposal,
        "## Account terms: replace the opening of “What the pilot provides”",
      ),
    ),
    paragraphAfter(original, "### Using your account"),
    paragraphAfter(proposal, "## Account terms: replace the opening of “Using your account”"),
  ),
  replaceOnce(
    oldBodies[1],
    "The pilot organiser supplies an invited participant's name and phone number. You then supply\nand verify your email, confirm your profile and, if you choose the medical pathway, provide\nquestionnaire responses. We also record document acknowledgements, access/security events,\nsupport requests and, when enabled, order/payment/refund references and statuses. Private\nfile uploads are not part of this initial release. Full payment-card details are entered into\nStripe's hosted payment interface, not the questionnaire or support messages.",
    paragraphAfter(
      proposal,
      "## Privacy notice: replace the participant-information source paragraph",
    ),
  ),
];
const hash = (text) => createHash("sha256").update(text).digest("hex");
if (
  ![
    "--inspect",
    "--rehearse",
    "--publish",
    "--prepare-runtime",
    "--verify",
    "--open-test-window",
    "--close-test-window",
  ].includes(mode)
) {
  console.log(
    JSON.stringify({
      mode: "no-network-plan",
      tenant,
      notices: newBodies.map(hash),
      compatibilityDays: 90,
      sends: 0,
      charges: 0,
      promotes: false,
    }),
  );
  process.exit(0);
}
check(
  !process.env.CI &&
    process.env.PUBLIC_REGISTRATION_RELEASE_CONFIRM ===
      "approved-notices-eight-legacy-receipts-90-days-no-send",
  "RELEASE_APPROVAL_REQUIRED",
);
check(
  readFileSync("supabase/.temp/project-ref", "utf8").trim() === project,
  "HOSTED_TARGET_REJECTED",
);
const management = execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-w"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).trim();
check(management.startsWith("sbp_"), "MANAGEMENT_AUTH_REQUIRED");
async function sql(query, readOnly = true) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${management}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, read_only: readOnly }),
    signal: AbortSignal.timeout(35000),
  });
  if (!r.ok) {
    const body = await r.json();
    throw new Error(
      `RELEASE_SQL_${r.status}:${String(body.message ?? body.error ?? "rejected").slice(0, 200)}`,
    );
  }
  return r.json();
}
function command(args, input) {
  const r = spawnSync(
    "bun",
    [
      "--no-env-file",
      "x",
      "wrangler",
      ...args,
      "--name",
      "meneer-health",
      "--config",
      "wrangler.jsonc",
    ],
    {
      input,
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 8 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false" },
    },
  );
  check(r.status === 0, "CLOUDFLARE_COMMAND_FAILED_NO_BLIND_RETRY");
  return r.stdout;
}
const active = () => {
  const versions = JSON.parse(command(["deployments", "list", "--json"])).at(-1)?.versions;
  check(versions?.length === 1 && versions[0].percentage === 100, "SPLIT_DEPLOYMENT_REJECTED");
  return versions[0].version_id;
};
const view = (id) => JSON.parse(command(["versions", "view", id, "--json"]));
let receipt = existsSync(receiptPath) ? JSON.parse(readFileSync(receiptPath, "utf8")) : null;
const save = () =>
  writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + "\n", { mode: 0o600 });
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const ids = ["pilot-account-terms", "pilot-privacy-notice"];
if (mode === "--inspect" || mode === "--rehearse" || mode === "--publish") {
  check(
    active() === expectedVersion && view(expectedVersion).resources?.script?.etag === expectedEtag,
    "ACTIVE_SOURCE_CHANGED_REVIEW_REQUIRED",
  );
  const published = await sql(
    "select id,instrument_id,instrument_version,content_sha256 from public.pilot_instrument_publications where status='published' and locale='en-ZA' and instrument_id in ('pilot-account-terms','pilot-privacy-notice') order by instrument_id",
  );
  check(
    published.length === 2 &&
      published.every(
        (p, i) =>
          p.instrument_id === ids[i] &&
          p.instrument_version === "1.0" &&
          p.content_sha256 === hash(oldBodies[i]),
      ),
    "ORIGINAL_NOTICE_HASH_MISMATCH",
  );
  const owners = await sql(
    `select count(*) as count from public.subjects s join public.subject_contacts c on c.subject_id=s.id where s.id='${approver}' and s.status='active' and c.kind='email' and c.status='verified' and c.normalized_value='mansoer@meneerhealth.co.za'`,
  );
  check(Number(owners[0]?.count) === 1, "OWNER_AUTHORITY_NOT_VERIFIED");
  if (mode === "--inspect") {
    console.log(
      JSON.stringify({
        activeVersion: expectedVersion,
        sourceEtag: expectedEtag,
        originalNoticeHashes: "verified",
        proposedHashes: newBodies.map(hash),
        approver: "verified",
        writes: 0,
      }),
    );
    process.exit(0);
  }
  if (mode === "--publish") check(!receipt, "EXISTING_RELEASE_RECEIPT_REQUIRES_RECONCILIATION");
  const approval = `owner-public-source-2026-10-12:${randomUUID()}`;
  const successors = [randomUUID(), randomUUID()];
  const expiry = new Date(Date.now() + 90 * 86400000).toISOString();
  const publicationInserts = ids
    .map(
      (id, i) =>
        `insert into public.pilot_instrument_publications(id,instrument_id,instrument_version,document_body,content_sha256,rendered_locator,approval_reference,approved_by_subject_id,approved_at,published_at,effective_at) values('${successors[i]}','${id}','1.1',${quote(newBodies[i])},'${hash(newBodies[i])}','/account/activate',${quote(approval)},'${approver}',clock_timestamp(),clock_timestamp(),clock_timestamp());`,
    )
    .join("\n");
  const query = `begin; set local lock_timeout='5s'; set local statement_timeout='25s';
lock table public.pilot_instrument_publications, public.pilot_instrument_receipts, public.client_profiles, identity_private.account_notice_receipt_transitions in share row exclusive mode;
create temporary table preserved_receipts on commit drop as select id,to_jsonb(r) as row from public.pilot_instrument_receipts r;
create temporary table preserved_profiles on commit drop as select id,to_jsonb(p) as row from public.client_profiles p;
do $pre$ begin
if (select count(*) from public.client_profiles where tenant_id='${tenant}')<>4 or (select count(*) from public.pilot_instrument_receipts where tenant_id='${tenant}')<>8
or exists(select 1 from identity_private.account_notice_receipt_transitions) or exists(select 1 from identity_private.public_registration_settings where enabled)
or not exists(select 1 from public.tenants where id='${tenant}' and slug='meneer-pilot' and status='active') then raise exception 'PUBLICATION_BASELINE_CHANGED';end if;
end $pre$;
update public.pilot_instrument_publications set status='superseded',retired_at=clock_timestamp() where id in ('${published[0].id}','${published[1].id}') and status='published';
${publicationInserts}
insert into identity_private.account_notice_receipt_transitions(receipt_id,tenant_id,subject_id,current_publication_id,approval_reference,approved_by_subject_id,approved_at,expires_at)
select r.id,r.tenant_id,r.subject_id,c.id,${quote(approval)},'${approver}',clock_timestamp(),'${expiry}' from public.pilot_instrument_receipts r
join public.pilot_instrument_publications c on c.instrument_id=r.instrument_id and c.id in ('${successors[0]}','${successors[1]}')
where r.tenant_id='${tenant}' and r.publication_id in ('${published[0].id}','${published[1].id}');
do $post$ begin
if (select count(*) from identity_private.account_notice_receipt_transitions)<>8
or exists(select 1 from public.client_profiles where tenant_id='${tenant}' and not public.has_pilot_account_evidence(tenant_id,subject_id))
or exists(select 1 from preserved_receipts b full join public.pilot_instrument_receipts r on r.id=b.id where b.row is distinct from to_jsonb(r))
or exists(select 1 from preserved_profiles b full join public.client_profiles p on p.id=b.id where b.row is distinct from to_jsonb(p)) then raise exception 'EXISTING_CLIENT_EVIDENCE_CHANGED';end if;
end $post$;
${mode === "--rehearse" ? "rollback" : "commit"};`;
  if (mode === "--publish") {
    receipt = {
      task: "public-registration-release",
      stage: "publication-submitting",
      project,
      tenant,
      baselineVersion: expectedVersion,
      sourceEtag: expectedEtag,
      approval,
      successors,
      oldPublications: published.map((p) => p.id),
      hashes: newBodies.map(hash),
      legacyApprovalExpiry: expiry,
      legacyReviewBefore: new Date(new Date(expiry).getTime() - 7 * 86400000).toISOString(),
      sends: 0,
      charges: 0,
      promoted: false,
    };
    save();
  }
  await sql(query, false);
  if (mode === "--publish") {
    receipt.stage = "published-runtime-disabled";
    save();
  }
  console.log(
    JSON.stringify({
      mode,
      publicationTransaction: mode === "--rehearse" ? "rolled-back" : "committed",
      legacyReceipts: 8,
      existingProfiles: 4,
      expiry,
      publicSignup: "disabled",
      emailsSent: 0,
    }),
  );
  process.exit(0);
}
check(
  receipt?.task === "public-registration-release" &&
    receipt.tenant === tenant &&
    receipt.sourceEtag === expectedEtag,
  "RELEASE_RECEIPT_REQUIRED",
);
const published = await sql(
  `select id,content_sha256,status,instrument_version from public.pilot_instrument_publications where id in ('${receipt.successors[0]}','${receipt.successors[1]}')`,
);
check(
  published.length === 2 &&
    receipt.successors.every((id, i) =>
      published.some(
        (p) =>
          p.id === id &&
          p.content_sha256 === receipt.hashes[i] &&
          p.status === "published" &&
          p.instrument_version === "1.1",
      ),
    ),
  "PUBLISHED_NOTICE_READBACK_FAILED",
);
const transitions = await sql(
  `select count(*) as count from identity_private.account_notice_receipt_transitions where approval_reference=${quote(receipt.approval)} and revoked_at is null and expires_at='${receipt.legacyApprovalExpiry}'`,
);
check(Number(transitions[0]?.count) === 8, "TRANSITION_READBACK_FAILED");
if (mode === "--open-test-window" || mode === "--close-test-window") {
  check(active() === receipt.preparedVersion, "OWNER_PROMOTED_VERSION_REQUIRED");
  check(view(receipt.preparedVersion).resources?.script?.etag === expectedEtag, "SOURCE_CHANGED");
  const authUrl = `https://api.supabase.com/v1/projects/${project}/config/auth`;
  const headers = { Authorization: `Bearer ${management}`, "Content-Type": "application/json" };
  const beforeResponse = await fetch(authUrl, { headers });
  check(beforeResponse.ok, "AUTH_READ_FAILED");
  const before = await beforeResponse.json();
  const opening = mode === "--open-test-window";
  check(
    before.mailer_autoconfirm === false &&
      before.external_anonymous_users_enabled === false &&
      before.external_email_enabled === true &&
      before.mailer_otp_length === 6 &&
      before.mailer_otp_exp === 900,
    "AUTH_SECURITY_SETTINGS_CHANGED",
  );
  if (opening) {
    check(
      before.disable_signup === true &&
        (!receipt.testWindowOpenedAt || receipt.stage === "acceptance-closed"),
      "TEST_WINDOW_ALREADY_OPENED",
    );
    check(
      before.mailer_templates_confirmation_content?.includes(".Token") &&
        !before.mailer_templates_confirmation_content?.includes(".ConfirmationURL"),
      "CONFIRMATION_CODE_TEMPLATE_REQUIRED",
    );
    const users = await sql("select id from auth.users order by id");
    const profiles = await sql("select id from public.client_profiles order by id");
    const unused = await sql(
      "select count(*) as count from auth.users where lower(email)='mansoergallie@gmail.com'",
    );
    check(Number(unused[0]?.count) === 0, "TEST_CONTACT_ALREADY_EXISTS");
    receipt.acceptanceBaseline = {
      authIds: users.map((r) => r.id),
      profileIds: profiles.map((r) => r.id),
    };
    save();
  }
  const changed = await fetch(authUrl, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ disable_signup: !opening }),
  });
  check(changed.ok, "AUTH_SIGNUP_PATCH_FAILED");
  try {
    await sql(
      opening
        ? `begin; lock table identity_private.public_registration_settings in exclusive mode; do $$ begin if exists(select 1 from identity_private.public_registration_settings where tenant_id<>'${tenant}' or enabled) then raise exception 'UNEXPECTED_POLICY'; end if; end $$; insert into identity_private.public_registration_settings(tenant_id,enabled) values('${tenant}',true) on conflict(tenant_id) do update set enabled=true; commit;`
        : `update identity_private.public_registration_settings set enabled=false where tenant_id='${tenant}';`,
      false,
    );
    const readback = await fetch(authUrl, { headers });
    check(readback.ok, "AUTH_READBACK_FAILED");
    const after = await readback.json();
    check(after.disable_signup === !opening, "AUTH_SIGNUP_READBACK_FAILED");
    check(
      Object.keys(before)
        .filter((key) => key !== "disable_signup")
        .every((key) => JSON.stringify(before[key]) === JSON.stringify(after[key])),
      "UNRELATED_AUTH_SETTING_CHANGED",
    );
  } catch (error) {
    await fetch(authUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ disable_signup: true }),
    });
    await sql(
      `update identity_private.public_registration_settings set enabled=false where tenant_id='${tenant}';`,
      false,
    );
    throw error;
  }
  receipt.stage = opening ? "owner-promoted-controlled-acceptance-open" : "acceptance-closed";
  receipt.ownerPromoted = true;
  if (opening) receipt.testWindowOpenedAt = new Date().toISOString();
  else receipt.testWindowClosedAt = new Date().toISOString();
  save();
}
if (mode === "--prepare-runtime") {
  check(
    receipt.stage === "published-runtime-disabled" && !receipt.preparedVersion,
    "RUNTIME_ALREADY_PREPARED_RECONCILE_FIRST",
  );
  check(active() === expectedVersion, "CONCURRENT_DEPLOYMENT_CHANGED");
  const baseline = view(expectedVersion);
  const settings = { PUBLIC_REGISTRATION_MODE: "enabled", PUBLIC_REGISTRATION_TENANT_ID: tenant };
  receipt.stage = "runtime-submitting-owner-promotion-required";
  save();
  const output = command(
    [
      "versions",
      "secret",
      "bulk",
      "--message",
      "Approved public onboarding - exact source and existing clients preserved",
    ],
    JSON.stringify(settings),
  );
  receipt.preparedVersion = output.match(/Created version ([a-f0-9-]{36})/)?.[1];
  check(receipt.preparedVersion, "CANDIDATE_VERSION_RECONCILIATION_REQUIRED");
  const candidate = view(receipt.preparedVersion);
  check(candidate.resources?.script?.etag === expectedEtag, "CANDIDATE_SOURCE_CHANGED");
  const bindings = candidate.resources?.bindings ?? [];
  check(
    (baseline.resources?.bindings ?? [])
      .filter((b) => !Object.keys(settings).includes(b.name))
      .every((b) => bindings.some((c) => c.name === b.name && c.type === b.type)),
    "UNRELATED_BINDING_CHANGED",
  );
  check(
    (baseline.resources?.bindings ?? [])
      .filter((b) => !Object.keys(settings).includes(b.name) && b.type !== "secret_text")
      .every((b) => bindings.some((c) => JSON.stringify(c) === JSON.stringify(b))),
    "UNRELATED_NONSECRET_BINDING_VALUE_CHANGED",
  );
  check(
    Object.keys(settings).every((name) =>
      bindings.some((b) => b.name === name && b.type === "secret_text"),
    ),
    "PUBLIC_BINDING_MISSING",
  );
  check(active() === expectedVersion, "PROMOTION_OCCURRED_UNEXPECTEDLY");
  receipt.stage = "runtime-prepared-owner-promotion-required";
  save();
}
if (mode === "--verify" && receipt.testWindowClosedAt) {
  const configResponse = await fetch(
    `https://api.supabase.com/v1/projects/${project}/config/auth`,
    { headers: { Authorization: `Bearer ${management}` } },
  );
  check(configResponse.ok, "AUTH_CLOSED_READBACK_FAILED");
  const configuration = await configResponse.json();
  const policies = await sql(
    `select enabled from identity_private.public_registration_settings where tenant_id='${tenant}'`,
  );
  check(
    configuration.disable_signup === true && policies.length === 1 && policies[0].enabled === false,
    "SIGNUP_NOT_CLOSED",
  );
  const originalAuth = receipt.acceptanceBaseline.authIds.map(quote).join(",");
  const originalProfiles = receipt.acceptanceBaseline.profileIds.map(quote).join(",");
  const baseline = await sql(
    `select (select count(*) from auth.users where id in (${originalAuth})) as preserved_auth, (select count(*) from public.client_profiles where id in (${originalProfiles})) as preserved_profiles, (select count(*) from auth.users where lower(email)='mansoergallie@gmail.com') as test_users`,
  );
  check(
    Number(baseline[0].preserved_auth) === receipt.acceptanceBaseline.authIds.length &&
      Number(baseline[0].preserved_profiles) === receipt.acceptanceBaseline.profileIds.length &&
      Number(baseline[0].test_users) === 0,
    "ACCEPTANCE_BASELINE_CHANGED",
  );
  receipt.stage = "owner-promoted-acceptance-blocked-signup-closed";
  receipt.acceptanceOutcome = {
    signupClosed: configuration.disable_signup === true && policies[0].enabled === false,
    testUsers: Number(baseline[0].test_users),
    originalAuthPreserved: Number(baseline[0].preserved_auth),
    originalProfilesPreserved: Number(baseline[0].preserved_profiles),
    controlledJourneyCompleted: false,
  };
  save();
  console.log(JSON.stringify(receipt.acceptanceOutcome));
}
console.log(
  JSON.stringify({
    stage: receipt.stage,
    preparedVersion: receipt.preparedVersion ?? null,
    activeVersion: active(),
    legacyApprovalExpiry: receipt.legacyApprovalExpiry,
    legacyReviewBefore: receipt.legacyReviewBefore,
    sends: 0,
    charges: 0,
    promotes: false,
  }),
);

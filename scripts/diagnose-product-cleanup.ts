import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { buildProductHostedCleanup } from "./lib/product-rehearsal-cleanup";
const m = JSON.parse(readFileSync(".sprint15-product-journey-replacement.local", "utf8"));
const roots = [
  m.tenant,
  m.service,
  ...Object.values(m.ids),
  ...Object.values(m.actors as Record<string, { id: string; subject: string }>).flatMap((a) => [
    a.id,
    a.subject,
  ]),
];
const source = buildProductHostedCleanup({
  tenant: m.tenant,
  exerciseId: m.exerciseId,
  roots: roots as string[],
  realAuthIds: m.realAuthIds,
  baseline: m.baseline,
});
const marker = " for r in select * from exercise_baseline loop";
if (source.split(marker).length !== 3) throw Error("S15_DIAGNOSTIC_TEMPLATE_CHANGED");
const query =
  source.slice(0, source.indexOf(marker)) +
  `end $$;
create temporary table differences(relation text,before_count bigint,remaining_count bigint) on commit drop;
do $$ declare r record;n bigint;h text;begin
 for r in select * from exercise_baseline loop
 execute format('select count(*),md5(coalesce(string_agg(to_jsonb(t)::text,''|'' order by to_jsonb(t)::text),'''')) from %s t where not exists(select 1 from exercise_rows e where e.rel=%L::regclass and e.tid=t.ctid)',r.relation,r.relation) into n,h;
 if n<>r.n or h<>r.fingerprint then insert into differences values(r.relation,r.n,n);end if;
 end loop;end $$;
select * from differences;rollback;`;
const key = execFileSync("security", ["find-generic-password", "-s", "Supabase CLI", "-w"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).trim();
const r = await fetch("https://api.supabase.com/v1/projects/gibfpolrdjotwvewgfsz/database/query", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, read_only: false }),
});
if (!r.ok) throw Error("S15_CLEANUP_DIAGNOSTIC_FAILED");
console.log(JSON.stringify(await r.json()));

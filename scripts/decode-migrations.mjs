// TEMPORARY helper: decodes the 13 SUFU migrations (pulled as base64 from the
// live Supabase project zrbeofmdyaxkcpsyqiqy) into supabase/migrations/*.sql
// This file and scripts/.b64/ are removed after running + sha256 verification.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";

const DIR = "scripts/.b64";
const NAMES = {
  "20260905041310": "sufu_schema_v1",
  "20260905041442": "sufu_seed_v1",
  "20260905041827": "sufu_client_grants_fix",
  "20260905042039": "sufu_grants_matrix",
  "20260905044152": "sufu_grants_fix_listings",
  "20260905045656": "sufu_handle_new_user",
  "20260905222938": "sufu_increment_views_viewer",
  "20260905222957": "sufu_drop_legacy_increment_views",
  "20260905230825": "create_ui_smoke_users",
  "20260905234452": "application_status_authorization",
  "20260905235623": "profiles_column_grants_and_admin_flag",
  "20260906000737": "attach_touch_conversation_trigger",
  "20260906023000": "sufu_commerce_foundation",
};

const files = readdirSync(DIR).filter((f) => f.endsWith(".b64") || /\.part\d+$/.test(f)).sort();
const versions = new Set(files.map((f) => f.split(".")[0]));
mkdirSync("supabase/migrations", { recursive: true });

for (const version of [...versions].sort()) {
  const parts = files.filter((f) => f.startsWith(version + "."));
  const b64 = parts.map((f) => readFileSync(`${DIR}/${f}`, "utf8").trim()).join("");
  const sql = Buffer.from(b64, "base64").toString("utf8");
  const file = `supabase/migrations/${version}_${NAMES[version] || "unknown"}.sql`;
  writeFileSync(file, sql + "\n");
  console.log(`wrote ${file} (${sql.length} bytes)`);
}

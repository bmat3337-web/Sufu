/* LIVE PUBLISHED-DEPLOYMENT BROWSER ACCEPTANCE — SUFU beta gate.
 * Runs ONLY against the published URL (never localhost).
 *   node live-acceptance.mjs
 * Covers: boot, page loads, navigation, listing/provider pages, refresh,
 * auth entry, UI sign-up, sign-in, session persistence, protected routes,
 * sign-out + post-sign-out protection, two-user privacy (UI level),
 * console errors, failed network requests, mobile viewport boot.
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.LIVE_URL || "https://e2i8tqqixqnyun99qe0kydc4u.nativelyai.app";
const BUYER = { email: "uismoke-buyer@sufu.co.zw", pass: "SufuTest123!" };
const SELLER = { email: "uismoke-seller@sufu.co.zw", pass: "SufuTest123!" };
const PRODUCT_LISTING = "a6b16298-7874-4931-a1c7-fb7fd9fae389"; // Gaming chair (seller-owned)
const JOB_LISTING = "8710837b-e643-400c-9e8d-b8b5d5293eb2"; // Delivery driver (seller-owned)

const results = [];
const check = (name, ok, detail = "") =>
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fresh sign-up identity for the UI sign-up test.
// NOTE: GoTrue rejects sign-ups from non-resolvable email domains (e.g. @sufu.co.zw is NXDOMAIN),
// so the audit identity must use a real, deliverable domain.
const SIGNUP_EMAIL = `beta-gate-${Date.now()}@gmail.com`;
let signupOutcome = "unknown";

// Cross-page capture of console errors + failed requests
const consoleErrors = [];
const failedRequests = [];
function instrument(page, tag) {
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(`[${tag}] ${m.text()}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("requestfailed", (r) =>
    failedRequests.push(`[${tag}] ${r.method()} ${r.url()} — ${r.failure()?.errorText}`)
  );
}

async function signIn(page, { email, pass }) {
  await page.goto(`${BASE}/#/profile`, { waitUntil: "networkidle" });
  await page.click('button:has-text("Sign in / create account")');
  await page.waitForSelector('input[type="email"]', { timeout: 8000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('form button[type="submit"]');
  await page.waitForSelector('input[type="email"]', { state: "detached", timeout: 10000 }).catch(() => {});
  await sleep(1500);
}

function decodeJwtPayload(token) {
  try {
    let p = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    while (p.length % 4) p += "=";
    return JSON.parse(Buffer.from(p, "base64").toString("utf8"));
  } catch {
    return null;
  }
}
// New-format Supabase JWTs (ES256) carry the project ref in `iss`
// (https://<ref>.supabase.co/auth/v1) instead of the legacy `ref` claim.
function jwtProjectRef(payload) {
  if (!payload) return null;
  if (payload.ref) return payload.ref;
  const m = /^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(payload.iss || "");
  return m ? m[1] : null;
}

async function main() {
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium" });

  // ---------- 1. BOOT + HOME (published URL) ----------
  let ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  let page = await ctx.newPage();
  instrument(page, "home");
  const bootErrors = [];
  page.on("pageerror", (e) => bootErrors.push(e.message));
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector('h1, [class*="hero"]', { timeout: 15000 }).catch(() => {});
  check("published URL boots (HTTP 200 + app shell)", (await page.title()) === "SUFU — Need something? Sufu it.", await page.title());
  const homeText = await page.locator("body").innerText();
  check("Home renders meaningful content", /sufu|need something|explore|post/i.test(homeText), homeText.slice(0, 80).replace(/\n/g, " "));
  check("Home: no error boundary", !/something went wrong/i.test(homeText));
  await page.close();

  // ---------- 2. EXPLORE ----------
  page = await ctx.newPage();
  instrument(page, "explore");
  await page.goto(`${BASE}/#/explore`, { waitUntil: "networkidle" });
  await page.waitForSelector("body", { timeout: 10000 });
  const exploreText = await page.locator("body").innerText();
  check("Explore loads", !/error boundary/i.test(exploreText) && exploreText.trim().length > 40, exploreText.slice(0, 60).replace(/\n/g, " "));
  await page.close();

  // ---------- 3. POST page ----------
  page = await ctx.newPage();
  instrument(page, "post");
  await page.goto(`${BASE}/#/post`, { waitUntil: "networkidle" });
  await page.waitForSelector("body", { timeout: 10000 });
  const postText = await page.locator("body").innerText();
  check("Post page renders (signed-out guard or form)", /post|sign in|create an account/i.test(postText));
  await page.close();

  // ---------- 4. LISTING PAGE ----------
  page = await ctx.newPage();
  instrument(page, "listing");
  await page.goto(`${BASE}/#/listing/${PRODUCT_LISTING}`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Gaming chair", { timeout: 15000 });
  check("Listing page loads (live data)", true);
  // Provider link capture for provider-page test
  const providerHref = await page.locator('a[href*="/provider/"]').first().getAttribute("href").catch(() => null);
  // Refresh persistence
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("text=Gaming chair", { timeout: 15000 });
  check("Listing page survives refresh", true);
  await page.close();

  // ---------- 5. PROVIDER PAGE ----------
  if (providerHref) {
    page = await ctx.newPage();
    instrument(page, "provider");
    await page.goto(`${BASE}${providerHref}`, { waitUntil: "networkidle" });
    await page.waitForSelector("body", { timeout: 10000 });
    const provText = await page.locator("body").innerText();
    check("Provider page loads", !/error boundary|Provider not found/i.test(provText));
    await page.close();
  } else {
    check("Provider page loads", false, "no /provider/ link found on listing page");
  }

  // ---------- 6. AUTH ENTRY POINT (signed out) ----------
  page = await ctx.newPage();
  instrument(page, "auth-entry");
  await page.goto(`${BASE}/#/profile`, { waitUntil: "networkidle" });
  await page.click('button:has-text("Sign in / create account")');
  await page.waitForSelector('input[type="email"]', { timeout: 8000 });
  check("Auth entry point opens sign-in modal", true);
  await page.keyboard.press("Escape");
  await sleep(400);
  await page.close();

  // ---------- 7. UI SIGN-UP (fresh identity) ----------
  page = await ctx.newPage();
  instrument(page, "signup");
  await page.goto(`${BASE}/#/profile`, { waitUntil: "networkidle" });
  await page.click('button:has-text("Sign in / create account")');
  await page.waitForSelector('input[type="email"]', { timeout: 8000 });
  await page.click('button[aria-pressed="false"]:has-text("Create account")');
  await page.waitForSelector("#auth-name", { timeout: 5000 });
  await page.fill("#auth-name", "Beta Gate User");
  await page.fill("#auth-email-signup", SIGNUP_EMAIL);
  await page.fill("#auth-password-signup", "SufuTest123!");
  await page.click('form button[type="submit"]');
  const inboxMsg = await page.waitForSelector("text=Check your inbox", { timeout: 6000 }).catch(() => null);
  const modalClosed = await page.locator('input[type="email"]').count().then((n) => n === 0);
  await sleep(1500);
  if (inboxMsg) {
    signupOutcome = "confirmation-required";
    check("UI sign-up accepted (email confirmation required by config)", true, "modal shows 'Check your inbox'");
  } else if (modalClosed) {
    signupOutcome = "auto-signed-in";
    check("UI sign-up accepted (auto sign-in)", true);
  } else {
    const errText = await page.locator('[role="alert"]').first().innerText().catch(() => "");
    check("UI sign-up accepted", false, errText || "no success indicator");
  }
  await page.close();
  console.log(`SIGNUP_EMAIL=${SIGNUP_EMAIL} OUTCOME=${signupOutcome}`);
  writeFileSync(".live-gate-signup.txt", `${SIGNUP_EMAIL}\n${signupOutcome}\n`);

  // ---------- 8. SIGN-IN (existing confirmed account) + SESSION PERSISTENCE ----------
  page = await ctx.newPage();
  instrument(page, "buyer");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await signIn(page, BUYER);
  await page.goto(`${BASE}/#/profile`, { waitUntil: "networkidle" });
  await page.waitForSelector('button:has-text("Sign out")', { timeout: 10000 });
  check("sign-in succeeds (confirmed account)", true);

  // Deployed bundle → correct Supabase project identity
  const tokenInfo = await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      if (k.includes("auth-token")) {
        try {
          const v = JSON.parse(localStorage.getItem(k));
          return v?.access_token || null;
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const payload = decodeJwtPayload(tokenInfo || "");
  const ref = jwtProjectRef(payload);
  check(
    "deployed app bound to expected Supabase project",
    ref === "zrbeofmdyaxkcpsyqiqy",
    `iss/ref=${ref ?? "unreadable"}`
  );

  // Session persistence across reload
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('button:has-text("Sign out")', { timeout: 10000 }).catch(() => {});
  check("session persists across reload", (await page.locator('button:has-text("Sign out")').count()) > 0);

  // Buyer: own saved listing + own application visible (owner-scoped UI)
  await page.goto(`${BASE}/#/profile`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Saved listings", { timeout: 10000 });
  await page.waitForSelector("text=Gaming chair", { timeout: 10000 });
  check("buyer sees own saved listing", true);
  const myApps = page.locator('section[aria-label="My applications"]');
  if ((await myApps.count()) > 0) {
    const appsText = await myApps.innerText();
    check("buyer sees own application (Delivery driver)", /Delivery driver/i.test(appsText));
  } else {
    check("buyer sees own application (Delivery driver)", false, "no My applications section");
  }

  // Buyer inbox: sees own conversation with seller
  await page.goto(`${BASE}/#/inbox`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=UI Smoke Seller", { timeout: 10000 }).catch(() => {});
  check("buyer inbox lists own conversation (participant)", (await page.locator("text=UI Smoke Seller").count()) > 0);
  const buyerThreadHref = await page.locator('a[href*="/inbox/"]').first().getAttribute("href").catch(() => null);
  await ctx.close();

  // ---------- 9. SELLER (User B) — sees own view, NOT buyer's private data ----------
  const sellerCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  page = await sellerCtx.newPage();
  instrument(page, "seller");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await signIn(page, SELLER);
  await page.goto(`${BASE}/#/inbox`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=UI Smoke Buyer", { timeout: 10000 });
  check("seller inbox lists conversation with buyer (participant)", true);
  const sellerThreadHref = await page.locator('a[href*="/inbox/"]').first().getAttribute("href");
  await page.goto(`${BASE}/#/profile`, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Applications received", { timeout: 10000 });
  await page.waitForSelector("text=UI Smoke Buyer", { timeout: 10000 });
  check("seller sees buyer's application (provider view — by design)", true);
  // Buyer's saved listing must NOT appear in seller's Saved listings
  const sellerSaved = page.locator('section[aria-label="Saved listings"]');
  const sellerSavedText = (await sellerSaved.count()) > 0 ? await sellerSaved.innerText() : "";
  check("seller cannot see buyer's saved listing", !/Gaming chair/i.test(sellerSavedText), sellerSavedText.slice(0, 60).replace(/\n/g, " ") || "(empty)");
  await sellerCtx.close();

  // ---------- 10. THIRD-PARTY PRIVACY (anon, live UI) ----------
  const anonCtx = await browser.newContext();
  page = await anonCtx.newPage();
  instrument(page, "anon-privacy");
  const threadUrl = buyerThreadHref || sellerThreadHref;
  if (threadUrl) {
    await page.goto(`${BASE}${threadUrl}`, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Sign in to read your messages", { timeout: 8000 }).catch(() => {});
    await sleep(500);
    const prompt = await page.locator("text=Sign in to read your messages").count();
    const notFound = await page.locator("text=Conversation not found").count();
    const leak = await page.locator("text=Is the chair still available?").count();
    check("anon third party cannot open private thread", prompt + notFound > 0);
    check("thread content does not leak to third party", leak === 0);
  } else {
    check("anon third party cannot open private thread", false, "no thread href captured");
    check("thread content does not leak to third party", false, "no thread href captured");
  }
  // Protected route while signed out
  await page.goto(`${BASE}/#/inbox`, { waitUntil: "networkidle" });
  await sleep(600);
  const inboxText = await page.locator("body").innerText();
  check("protected route (inbox) gates signed-out users", /sign in to read your messages|sign in/i.test(inboxText));
  await anonCtx.close();

  // ---------- 11. SIGN-OUT + POST-SIGN-OUT PROTECTION ----------
  page = await browser.newContext().then((c) => c.newPage());
  instrument(page, "signout");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await signIn(page, BUYER);
  await page.goto(`${BASE}/#/profile`, { waitUntil: "networkidle" });
  await page.waitForSelector('button:has-text("Sign out")', { timeout: 10000 });
  await page.click('button:has-text("Sign out")');
  await page.waitForSelector('button:has-text("Sign in / create account")', { timeout: 10000 });
  check("sign-out returns to signed-out state", true);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('button:has-text("Sign in / create account")', { timeout: 10000 });
  check("post-sign-out protection (reload stays signed out)", (await page.locator('button:has-text("Sign out")').count()) === 0);
  await page.close();

  // ---------- 12. MOBILE VIEWPORT BOOT ----------
  const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 700 } });
  page = await mobileCtx.newPage();
  instrument(page, "mobile");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await sleep(800);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check("mobile (375px) Home boots without horizontal overflow", overflow <= 0, `overflow=${overflow}px`);
  await page.goto(`${BASE}/#/explore`, { waitUntil: "networkidle" });
  await sleep(800);
  const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check("mobile (375px) Explore boots without horizontal overflow", overflow2 <= 0, `overflow=${overflow2}px`);
  await mobileCtx.close();

  await browser.close();

  // ---------- CONSOLE / NETWORK REPORT ----------
  const benign = (s) =>
    /favicon|ERR_ABORTED|net::|No server is configured|WebSocket|preflight/i.test(s) || !s;
  const realConsoleErrors = consoleErrors.filter((e) => !benign(e));
  const realFailed = failedRequests.filter((e) => !/favicon|ERR_ABORTED|preflight/i.test(e));
  check("no fatal browser console errors", realConsoleErrors.length === 0, realConsoleErrors.slice(0, 3).join(" | ") || "(none)");
  check("no unexpected failed network requests", realFailed.length === 0, realFailed.slice(0, 3).join(" | ") || "(none)");

  console.log(results.join("\n"));
  const failed = results.filter((r) => r.startsWith("FAIL"));
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error("LIVE ACCEPTANCE ERROR:", e);
  process.exit(2);
});

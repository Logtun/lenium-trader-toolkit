(() => {
"use strict";
// Lenium Trader Toolkit: fan-made, static, no backend, no market data.
// Rules and the fee formula as read from lenium.capital on Oct 23, 2026 (Rules, Pricing, How It Works, Tools pages).
const $ = (id) => document.getElementById(id);
const SITE_URL = location.origin;
const usd = (c, sign) => { // c in cents
  const neg = c < 0, a = Math.abs(c) / 100;
  const s = "$" + a.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (neg ? "−" : (sign && c > 0 ? "+" : "")) + s;
};
const usd0 = (d) => "$" + Math.round(d).toLocaleString("en-US");
const pct = (x, dp) => (x * 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: dp == null ? 1 : dp }) + "%";

/* ================= TOOL SWITCHER ================= */
const tabs = [["tab-calc", "calc"], ["tab-track", "track"]];
function show(which) {
  tabs.forEach(([t, p]) => { const on = p === which; $(t).setAttribute("aria-selected", on); $(p).hidden = !on; });
  if (history.replaceState) history.replaceState(null, "", which === "track" ? "#tracker" : location.pathname + location.search);
  if (which === "track") drawCard();
}
$("tab-calc").addEventListener("click", () => show("calc"));
$("tab-track").addEventListener("click", () => show("track"));

/* ================= TOOL 1: PAYOUT CALCULATOR ================= */
// Lenium: "Every simulated fill is charged a standard exchange taker fee" (Rules);
// "Fee = rate × contracts × price × (1 − price), rounded up to the next cent", standard rate 0.07 (Fee calculator).
const FEE_RATE_MILLI = 70; // 0.07 in thousandths, so the maths stays in whole numbers
function feeCents(C, p) { // p in cents
  if (C <= 0) return 0;
  const n = FEE_RATE_MILLI * C * p * (100 - p); // fee in cents = n / 100000
  return Math.floor((n + 99999) / 100000);
}
function calc(side, p, stakeDollars, feeOn) {
  const budget = Math.floor(Math.round(stakeDollars * 100 * 100) / 100); // stake in whole cents
  const f = (C) => (feeOn ? feeCents(C, p) : 0);
  // the most whole contracts whose cost (plus fee) fits in the stake
  let C = Math.floor(budget / (p + (feeOn ? 0.07 * p * (100 - p) / 100 : 0)));
  while (C > 0 && C * p + f(C) > budget) C--;
  while ((C + 1) * p + f(C + 1) <= budget) C++;
  const cost = C * p, fee = f(C), spent = cost + fee, payout = C * 100;
  return { side, p, budget, C, cost, fee, spent, payout, profit: payout - spent, ret: spent ? (payout - spent) / spent : 0,
           loss: spent, left: budget - spent, be: payout ? spent / payout : 0 };
}
const cs = { side: "YES" };
const EX = { side: "YES", price: 48, stake: 100 };
function readCalc() {
  let p = Math.round(Number($("price").value));
  let s = Number($("stake").value);
  return { side: cs.side, p, s, feeOn: $("feeOn").checked };
}
function renderCalc() {
  const { side, p, s, feeOn } = readCalc();
  const isEx = side === EX.side && p === EX.price && s === EX.stake;
  $("exTag").hidden = !isEx;
  const valid = Number.isFinite(p) && p >= 1 && p <= 99 && Number.isFinite(s) && s > 0 && s <= 10000000;
  document.querySelectorAll("#calc .stat .v").forEach((el) => el.style.opacity = valid ? 1 : .35);
  if (!valid) { $("oBE").innerHTML = "Enter a price from 1¢ to 99¢ and a stake above $0."; $("bandNote").hidden = true; return null; }
  $("priceRange").value = p;
  const r = calc(side, p, s, feeOn);
  $("oProb").textContent = p + "%";
  $("oProbS").textContent = "the market's price for " + side;
  $("oCts").textContent = r.C.toLocaleString("en-US");
  $("oCtsS").textContent = r.left > 0 ? usd(r.left) + " of your stake left unspent" : "whole contracts";
  $("oPay").textContent = usd(r.payout);
  $("oProfit").textContent = usd(r.profit, true);
  $("oRet").textContent = (r.ret >= 0 ? "+" : "") + pct(r.ret, 1) + " return on " + usd(r.spent);
  $("oLoss").textContent = r.loss ? usd(-r.loss) : "$0.00";
  $("oLossS").textContent = feeOn ? "cost + fee: everything you put in" : "everything you put in";
  $("oFee").textContent = feeOn ? usd(r.fee) : "$0.00";
  $("oFeeS").textContent = feeOn ? (r.cost ? pct(r.fee / r.cost, 1) + " of the cost" : "on this order") : "before any fees";
  if (r.C === 0) {
    $("oBE").innerHTML = "Your stake is too small to buy one contract at " + p + "¢.";
  } else {
    $("oBE").innerHTML = "To break even you need to be right more than <b>" + pct(r.be, 2) + "</b> of the time" +
      (feeOn ? " (" + p + "% before fees)." : ", before any fees.");
  }
  const band = p >= 20 && p <= 80;
  $("bandNote").hidden = band;
  if (!band) $("bandNote").innerHTML = "Heads-up: " + p + "¢ " + side + " is outside Lenium's opening price range. Their Rules say contracts must be priced between 20¢ and 80¢ YES at entry" +
    (side === "NO" ? " (a NO at " + p + "¢ is checked as YES " + (100 - p) + "¢)" : "") + ", so you couldn't open this in a Lenium account. The math still holds.";
  const P = (p / 100).toFixed(2);
  $("formula").innerHTML =
    "<p>A " + side + " contract costs " + p + "¢ and pays $1 if " + side + " is right, $0 if not.</p>" +
    "<p>Implied probability = price = " + p + "%</p>" +
    "<p>Contracts = stake ÷ price, in whole contracts" + (feeOn ? " (cost + fee must fit in the stake)" : "") + " = " + r.C.toLocaleString("en-US") + "</p>" +
    "<p>Cost = " + r.C.toLocaleString("en-US") + " × " + p + "¢ = " + usd(r.cost) + "</p>" +
    (feeOn ? "<p>Fee = 0.07 × " + r.C.toLocaleString("en-US") + " × " + P + " × (1 − " + P + "), rounded up to the cent = " + usd(r.fee) + "</p>" : "<p>Fee: not included (before any fees)</p>") +
    "<p>Payout if right = " + r.C.toLocaleString("en-US") + " × $1 = " + usd(r.payout) + "</p>" +
    "<p>Profit if right = payout − cost" + (feeOn ? " − fee" : "") + " = " + usd(r.profit, true) + "</p>" +
    "<p>Loss if wrong = cost" + (feeOn ? " + fee" : "") + " = " + usd(r.loss) + "</p>" +
    "<p>Break-even = (cost" + (feeOn ? " + fee" : "") + ") ÷ payout = " + pct(r.be, 2) + "</p>" +
    "<p style='color:var(--sub)'>Fee formula and the 0.07 standard taker rate are from Lenium's fee calculator; their Rules say a standard exchange taker fee is simulated on every fill. Assumes you hold to settlement: selling early is charged a second fee. Lenium also caps one position at 5% of your balance at entry.</p>";
  return r;
}
function setSide(s) {
  cs.side = s;
  $("sideYes").setAttribute("aria-pressed", s === "YES"); $("sideNo").setAttribute("aria-pressed", s === "NO");
  renderCalc();
}
$("sideYes").addEventListener("click", () => setSide("YES"));
$("sideNo").addEventListener("click", () => setSide("NO"));
["price", "stake"].forEach((id) => $(id).addEventListener("input", renderCalc));
$("feeOn").addEventListener("change", renderCalc);
$("priceRange").addEventListener("input", () => { $("price").value = $("priceRange").value; renderCalc(); });

/* ================= TOOL 2: EVALUATION TRACKER ================= */
// Lenium Rules page, Oct 23 2026: flat 10% target, 10% static floor, 30 calendar days (60 with Double Time),
// no daily loss limit, no minimum trading days, 5% max position, 10% max exposure, 15% consistency per market (25% with boost).
const SIZES = [
  { s: 5000, fee: 55, reset: 41 }, { s: 10000, fee: 85, reset: 63 }, { s: 25000, fee: 149, reset: 111, tag: "Popular" },
  { s: 50000, fee: 289, reset: 216 }, { s: 75000, fee: 429, reset: 321 }, { s: 100000, fee: 549, reset: 411 }
];
const ts = { size: 25000 };
const sizesEl = $("sizes");
SIZES.forEach((o) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "chip"; b.textContent = "$" + (o.s / 1000) + "K"; b.dataset.size = o.s;
  b.addEventListener("click", () => { ts.size = o.s; renderTrack(); persist(); });
  sizesEl.append(b);
});
function acct() {
  const o = SIZES.find((x) => x.s === ts.size) || SIZES[2];
  const s = o.s, dbl = $("dblTime").checked, boost = $("consBoost").checked;
  return { ...o, target: s * 0.10, targetBal: s * 1.10, floor: s * 0.90, dd: s * 0.10, window: dbl ? 60 : 30,
           consPct: boost ? 0.25 : 0.15, cons: s * 0.10 * (boost ? 0.25 : 0.15), maxPos: s * 0.05, maxExp: s * 0.10 };
}
function rule(k, v, s, wide) { return `<div class="rule${wide ? " wide" : ""}"><div class="k">${k}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ""}</div>`; }
let lastTrack = null;
function renderTrack() {
  const a = acct();
  sizesEl.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", Number(b.dataset.size) === a.s));
  $("rules").innerHTML =
    rule("Profit target", usd0(a.target), "10%: reach " + usd0(a.targetBal)) +
    rule("Floor (max drawdown)", usd0(a.floor), "10% static: set on day one, never rises") +
    rule("Time to pass", a.window + " days", "calendar days from activation") +
    rule("Consistency rule", usd0(a.cons) + " / market", pct(a.consPct, 0) + " of the target; going over raises the target, never ends the account") +
    rule("Max position", usd0(a.maxPos), "5% of balance at entry (at start)") +
    rule("Max total exposure", usd0(a.maxExp), "10% of balance, all open positions (at start)") +
    rule("Daily loss limit", "None", "") +
    rule("Minimum trading days", "None", "") +
    rule("Opening price range", "20¢–80¢ YES", "at entry; closing is always allowed") +
    rule("Evaluation fee", "$" + a.fee, "one-time · reset $" + a.reset);
  $("dayOf").textContent = "of " + a.window;
  $("day").max = a.window;
  if (!$("bal").value) $("bal").placeholder = String(a.s);
  const B = Number($("bal").value), hasB = $("bal").value !== "" && Number.isFinite(B) && B >= 0;
  $("prog").hidden = !hasB; $("sharePanel").hidden = !hasB;
  if (!hasB) { lastTrack = null; return null; }
  const dayRaw = $("day").value, day = dayRaw === "" ? null : Math.round(Number(dayRaw));
  const profit = B - a.s, frac = Math.max(0, Math.min(1, profit / a.target));
  const toGo = Math.max(0, a.targetBal - B), room = B - a.floor;
  $("barFill").style.width = (frac * 100).toFixed(1) + "%";
  $("bar").classList.toggle("done", B >= a.targetBal);
  $("barL").textContent = pct(frac, 0) + " of the way";
  $("barR").textContent = "target " + usd0(a.target);
  const pc = (x) => usd(Math.round(x * 100), true);
  $("tProfit").textContent = pc(profit);
  $("tProfit").className = "v " + (profit > 0 ? "g" : profit < 0 ? "r" : "");
  $("tProfitS").textContent = (profit >= 0 ? "+" : "−") + pct(Math.abs(profit) / a.s, 2) + " on " + usd0(a.s);
  $("tToGo").textContent = usd(Math.round(toGo * 100));
  $("tToGoS").textContent = toGo > 0 ? "to reach " + usd0(a.targetBal) : "target reached";
  $("tRoom").textContent = usd(Math.round(room * 100));
  $("tRoom").className = "v " + (room <= 0 ? "r" : room < 0.25 * a.dd ? "" : "");
  $("tRoomS").textContent = room > 0 ? pct(room / B, 1) + " of your balance" : "at or below the floor";
  let daysLeft = null;
  if (day != null && Number.isFinite(day) && day >= 1) {
    daysLeft = a.window - day;
    $("tDays").textContent = daysLeft >= 0 ? String(daysLeft) : "0";
    $("tDaysS").textContent = daysLeft > 0 ? "after today, of " + a.window : daysLeft === 0 ? "today is the last day" : "past the " + a.window + "-day window";
  } else { $("tDays").textContent = "–"; $("tDaysS").textContent = "enter your day"; }
  let st, cls, sub;
  if (room <= 0) { st = "Below the floor"; cls = "bad"; sub = "Lenium ends an evaluation once equity touches or drops below the floor (" + usd0(a.floor) + ")."; }
  else if (B >= a.targetBal) { st = "Target hit (simulated)"; cls = "hit"; sub = "You're past " + usd0(a.targetBal) + ". If one market made more than " + usd0(a.cons) + ", the consistency rule raises the target: check your dashboard."; }
  else if (daysLeft != null && daysLeft < 0) { st = "Window over"; cls = "bad"; sub = "Lenium treats expired evaluations like breaches (reset $" + a.reset + ")."; }
  else if (room < 0.25 * a.dd) { st = "Close to floor"; cls = "warn"; sub = "Only " + usd(Math.round(room * 100)) + " above the floor, under a quarter of your drawdown. Size down: a resolved market can lose its whole cost at once."; }
  else { st = "On track"; cls = "ok"; sub = usd(Math.round(toGo * 100)) + " to go · " + usd(Math.round(room * 100)) + " above the floor" + (daysLeft != null && daysLeft >= 0 ? " · " + daysLeft + " days left" : "") + "."; }
  $("status").className = "status " + cls; $("stTxt").textContent = st; $("stSub").textContent = sub;
  lastTrack = { a, B, profit, frac, toGo, room, day, daysLeft, st, cls };
  drawCard();
  return lastTrack;
}
["bal", "day"].forEach((id) => $(id).addEventListener("input", () => { renderTrack(); persist(); }));
["dblTime", "consBoost"].forEach((id) => $(id).addEventListener("change", () => { renderTrack(); persist(); }));
$("handle").addEventListener("input", () => { drawCard(); persist(); });
function persist() {
  try { localStorage.setItem("lenium-tracker", JSON.stringify({ size: ts.size, bal: $("bal").value, day: $("day").value,
    dbl: $("dblTime").checked, boost: $("consBoost").checked, handle: $("handle").value })); } catch (e) {}
}
function restore() {
  try {
    const d = JSON.parse(localStorage.getItem("lenium-tracker") || "null"); if (!d) return;
    if (SIZES.some((x) => x.s === d.size)) ts.size = d.size;
    $("bal").value = d.bal || ""; $("day").value = d.day || ""; $("dblTime").checked = !!d.dbl; $("consBoost").checked = !!d.boost; $("handle").value = d.handle || "";
  } catch (e) {}
}

/* ================= SHARE CARD (canvas) ================= */
const W = 1200, H = 675, canvas = $("card"), ctx = canvas.getContext("2d");
const C = { bg: "#0f1222", bg2: "#0a0c18", blue: "#6d85ff", yes: "#00e87a", no: "#ff5c5c", warn: "#ffc24b", text: "#f2f4f8", sub: "#9aa3b8", line: "rgba(255,255,255,0.10)" };
const FB = ', system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const fD = (w, s) => `${w} ${s}px "Bricolage Grotesque"${FB}`, fS = (w, s) => `${w} ${s}px "Geist"${FB}`, fM = (w, s) => `${w} ${s}px "Geist Mono", ui-monospace, Menlo, monospace`;
const assets = {};
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
const handleVal = () => $("handle").value.trim().replace(/^@+/, "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 15);
function drawCard() {
  const t = lastTrack; if (!t) return;
  const a = t.a, stColor = { ok: C.blue, warn: C.warn, hit: C.yes, bad: C.no }[t.cls];
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(150, -60, 10, 150, -60, 760); g.addColorStop(0, "rgba(109,133,255,0.30)"); g.addColorStop(1, "rgba(109,133,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // logo (Lenium's own mark + wordmark, cut from their preview image)
  if (assets.mark) ctx.drawImage(assets.mark, 64, 52, 48, 48);
  if (assets.word) { const h = 32, w = assets.word.width * h / assets.word.height; ctx.drawImage(assets.word, 124, 60, w, h); }
  const hd = handleVal();
  ctx.textAlign = "right"; ctx.fillStyle = C.text; ctx.font = fS(600, 28);
  if (hd) ctx.fillText("@" + hd, W - 64, 86);
  ctx.textAlign = "left";
  ctx.fillStyle = C.blue; ctx.font = fM(600, 22); ctx.fillText("MY LENIUM EVALUATION", 64, 168);
  ctx.fillStyle = C.text; ctx.font = fD(800, 76); ctx.fillText("$" + (a.s / 1000) + "K account", 64, 248);
  if (t.day != null && t.day >= 1) { ctx.textAlign = "right"; ctx.fillStyle = C.sub; ctx.font = fD(700, 40); ctx.fillText("Day " + Math.min(t.day, 999) + " of " + a.window, W - 64, 248); ctx.textAlign = "left"; }
  // progress bar
  const bx = 64, by = 290, bw = W - 128, bh = 34;
  rr(bx, by, bw, bh, 17); ctx.fillStyle = C.bg2; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
  if (t.frac > 0) { rr(bx, by, Math.max(34, bw * t.frac), bh, 17); const lg = ctx.createLinearGradient(bx, 0, bx + bw, 0); lg.addColorStop(0, t.frac >= 1 ? "#00b862" : "#4f6bff"); lg.addColorStop(1, t.frac >= 1 ? C.yes : C.blue); ctx.fillStyle = lg; ctx.fill(); }
  ctx.fillStyle = C.sub; ctx.font = fM(500, 22);
  ctx.fillText(pct(t.frac, 0) + " of the way to the 10% target", bx, by + 70);
  ctx.textAlign = "right"; ctx.fillText("target " + usd0(a.target), bx + bw, by + 70); ctx.textAlign = "left";
  // stats
  const stats = [["BALANCE", usd(Math.round(t.B * 100)), C.text], ["PROFIT", usd(Math.round(t.profit * 100), true), t.profit > 0 ? C.yes : t.profit < 0 ? C.no : C.text], ["ABOVE FLOOR", t.room > 0 ? usd(Math.round(t.room * 100)) : "$0.00", C.text]];
  const sw = (bw - 40) / 3;
  stats.forEach(([k, v, col], i) => {
    const x = bx + i * (sw + 20), y = 405;
    rr(x, y, sw, 116, 16); ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.fill(); ctx.strokeStyle = C.line; ctx.stroke();
    ctx.fillStyle = C.sub; ctx.font = fM(600, 18); ctx.fillText(k, x + 22, y + 38);
    let fs = 44; ctx.font = fD(800, fs); while (ctx.measureText(v).width > sw - 44 && fs > 24) { fs -= 2; ctx.font = fD(800, fs); }
    ctx.fillStyle = col; ctx.fillText(v, x + 22, y + 92);
  });
  // status pill
  ctx.font = fD(800, 30); const label = t.st, lw = ctx.measureText(label).width + 76;
  rr(64, 552, lw, 58, 29); ctx.fillStyle = C.bg2; ctx.fill(); ctx.strokeStyle = stColor; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.arc(96, 581, 9, 0, Math.PI * 2); ctx.fillStyle = stColor; ctx.fill();
  ctx.fillStyle = stColor; ctx.fillText(label, 118, 592);
  ctx.textAlign = "right"; ctx.fillStyle = C.sub; ctx.font = fS(500, 20);
  ctx.fillText("lenium.capital · simulated evaluation account", W - 64, 578);
  ctx.fillText("made by @iamlogtun · not official", W - 64, 606);
  ctx.textAlign = "left";
}
function shareText() {
  const t = lastTrack; if (!t) return "";
  const a = t.a, day = t.day != null && t.day >= 1 ? ", day " + t.day + " of " + a.window : "";
  return "My $" + (a.s / 1000) + "K @Lenium_Capital evaluation: " + usd(Math.round(t.profit * 100), true) + " (" + pct(t.frac, 0) + " of the way to the 10% target)" + day + ". " + t.st + ".\n\nSimulated account. Track yours → " + SITE_URL;
}
const fileName = () => "lenium-evaluation" + (handleVal() ? "-" + handleVal() : "") + ".png";
const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isInApp = /FBAN|FBAV|Instagram|Line\/|WhatsApp|Twitter|; wv\)/i.test(navigator.userAgent);
let lastUrl = null;
function blobNow() {
  drawCard();
  const d = canvas.toDataURL("image/png"), bin = atob(d.split(",")[1]), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], { type: "image/png" });
}
const intentUrl = () => "https://x.com/intent/tweet?text=" + encodeURIComponent(shareText());
function showModal(url, withX) {
  $("modalImg").src = url;
  $("modalTitle").textContent = withX ? "Save your card, then post" : "Save your card";
  $("modalSteps").innerHTML = withX ? "Press and hold the image, tap <strong>Save to Photos</strong>, then tap <strong>Open X</strong> and attach it." : "Press and hold the image, then tap <strong>Save to Photos</strong>.";
  const ox = $("modalOpenX"); ox.hidden = !withX; if (withX) ox.href = intentUrl();
  $("modal").hidden = false;
}
function saveBlob(blob, withX) {
  if (lastUrl) URL.revokeObjectURL(lastUrl);
  lastUrl = URL.createObjectURL(blob);
  if (isIOS || isInApp) return showModal(lastUrl, withX);
  const el = document.createElement("a"); el.href = lastUrl; el.download = fileName(); document.body.append(el); el.click(); el.remove();
  if (withX) { toast("Card saved 📎 attach it to your post"); setTimeout(() => { const w = window.open(intentUrl(), "_blank"); if (w) try { w.opener = null; } catch (e) {} }, 600); }
  else toast("Card downloaded.");
}
$("btnDownload").addEventListener("click", () => saveBlob(blobNow(), false));
let canShareFiles = false;
try { const pr = new File([new Blob(["x"], { type: "image/png" })], "p.png", { type: "image/png" }); canShareFiles = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [pr] })); } catch (e) {}
$("btnShareX").addEventListener("click", () => {
  const blob = blobNow();
  if (canShareFiles) {
    const file = new File([blob], fileName(), { type: "image/png" });
    let p; try { p = navigator.share({ files: [file], text: shareText() }); } catch (e) { return saveBlob(blob, true); }
    p.then(() => {}, (e) => { if (!e || e.name !== "AbortError") saveBlob(blob, true); });
    return;
  }
  saveBlob(blob, true);
});
$("modalClose").addEventListener("click", () => ($("modal").hidden = true));
$("modal").addEventListener("click", (e) => { if (e.target.id === "modal") $("modal").hidden = true; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("modal").hidden = true; });
let tt = 0;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 4000); }

/* ================= BOOT ================= */
restore();
renderCalc();
renderTrack();
if (/^#track/.test(location.hash)) show("track");
Promise.all([
  loadImg("assets/mark.png").then((i) => (assets.mark = i)).catch(() => {}),
  loadImg("assets/word.png").then((i) => (assets.word = i)).catch(() => {}),
  document.fonts ? Promise.all([document.fonts.load('800 40px "Bricolage Grotesque"'), document.fonts.load('600 20px "Geist"'), document.fonts.load('600 20px "Geist Mono"')]).catch(() => {}) : Promise.resolve()
]).then(() => { drawCard(); document.documentElement.dataset.ready = "1"; });
window.__lt = { calc, feeCents, acct, renderCalc, renderTrack, shareText, setSide, show, state: () => lastTrack };
})();

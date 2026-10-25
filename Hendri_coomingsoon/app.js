
      (function () {
        document.documentElement.setAttribute("data-theme", "dark");
        /* Backend hook: set to a Google Apps Script web app URL to store accounts in a Sheet. Empty = local only. */
        const SHEET_API_URL = "";
        var KEY = "hendri_coomingsoon_v1";
        var USERS_KEY = "hendri_coomingsoon_users";
        var SESSION_KEY = "hendri_coomingsoon_session";
        var CATS = [
          { id: "waitlist", name: "Waitlist" },
          { id: "testnet", name: "Testnet" },
          { id: "mint", name: "Mint (OpenSea)", short: "Mint" },
          { id: "whitelist", name: "Whitelist" },
          { id: "airdrop", name: "Airdrop" },
          { id: "lainnya", name: "Lainnya" }
        ];
        var CHAINS = [
          ["ink", "Ink"], ["ethereum", "Ethereum"], ["robinhood", "Robinhood Chain"], ["binance", "BNB Chain"],
          ["hyperliquid", "Hype"], ["base", "Base"], ["arbitrum", "Arbitrum"], ["optimism", "Optimism"],
          ["polygon", "Polygon"], ["solana", "Solana"], ["monad", "Monad"], ["megaeth", "MegaETH"]
        ];
        var CHAIN_NAME = {}; CHAINS.forEach(function (c) { CHAIN_NAME[c[0]] = c[1]; });
        var CAT = {}; CATS.forEach(function (c) { CAT[c.id] = c; });
        var DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
        var $ = function (id) { return document.getElementById(id); };

        /* ---------- storage ---------- */
        var persistent = true;
        function blank() { return { v: 1, checkins: [], streak: 0, longest: 0, last: null, tasks: [] }; }
        function norm(d) {
          var b = blank();
          if (!d || typeof d !== "object") return b;
          return {
            v: 1,
            checkins: Array.isArray(d.checkins) ? d.checkins.filter(function (x) { return typeof x === "string"; }) : [],
            streak: +d.streak || 0, longest: +d.longest || 0, last: typeof d.last === "string" ? d.last : null,
            tasks: Array.isArray(d.tasks) ? d.tasks.filter(function (t) { return t && t.id && t.name; }).map(function (t) {
              t.addrs = strList(t.addrs);
              t.xs = strList(t.xs).map(normX).filter(Boolean);
              t.opensea = typeof t.opensea === "string" ? t.opensea : "";
              t.osSlug = typeof t.osSlug === "string" ? t.osSlug : (t.opensea ? parseOS(t.opensea) || "" : "");
              return t;
            }) : []
          };
        }
        function strList(a) {
          return Array.isArray(a) ? a.filter(function (x) { return typeof x === "string"; }).map(function (x) { return x.trim(); }).filter(Boolean) : [];
        }
        /* OpenSea: slug from https://opensea.io/collection/<slug>[/…][?…] or a bare slug; null if unparsable */
        function parseOS(s) {
          var v = String(s == null ? "" : s).trim();
          if (!v) return null;
          var m = v.match(/\/collection\/([^\/?#]+)/i);
          if (m) { try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; } }
          return /^[A-Za-z0-9_-]+$/.test(v) ? v : null;
        }
        function normX(s) {
          var v = String(s == null ? "" : s).replace(/\s+/g, "");
          v = v.replace(/^(https?:\/\/)?(www\.|mobile\.)?(x|twitter)\.com\//i, "");
          v = v.replace(/^@+/, "").split(/[\/?#]/)[0];
          return v ? "@" + v : "";
        }
        /* localStorage wrapper with an in-memory fallback */
        var mem = {};
        try { var t0 = "__hc_test"; localStorage.setItem(t0, "1"); localStorage.removeItem(t0); } catch (e) { persistent = false; }
        function sGet(k) {
          if (persistent) {
            try { var v = localStorage.getItem(k); if (v != null) mem[k] = v; return v != null ? v : (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null); }
            catch (e) { persistent = false; showPreviewNote(); }
          }
          return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null;
        }
        function sSet(k, v) {
          mem[k] = v;
          if (!persistent) return false;
          try { localStorage.setItem(k, v); return true; }
          catch (e) { persistent = false; showPreviewNote(); return false; }
        }
        function sDel(k) {
          delete mem[k];
          if (persistent) { try { localStorage.removeItem(k); } catch (e) {} }
        }
        var currentUser = null, currentName = "";
        function dataKey(lower) { return KEY + "__" + lower; }
        function load() {
          if (!currentUser) return blank();
          try { var raw = sGet(dataKey(currentUser)); return raw ? norm(JSON.parse(raw)) : blank(); }
          catch (e) { return blank(); }
        }
        var S = blank();
        function showPreviewNote() { try { var n = $("previewNote"); if (n) n.hidden = persistent; } catch (e) {} }
        /* S (in memory) is the source of truth; storage is best-effort and can never abort a save */
        function save() {
          if (!currentUser) return true;
          sSet(dataKey(currentUser), JSON.stringify(S));
          return true;
        }
        function safe(fn) {
          return function (e) {
            try { return fn.apply(this, arguments); }
            catch (err) { try { console.error(err); toast("Ada error, coba lagi ya"); } catch (x) {} }
          };
        }
        showPreviewNote();

        /* ---------- helpers ---------- */
        function pad(n) { return n < 10 ? "0" + n : "" + n; }
        function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
        function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
        function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
        function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
        function initials(name) {
          var w = String(name || "?").trim().split(/\s+/).filter(Boolean);
          if (!w.length) return "?";
          return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
        }
        function logo(chain, custom) {
          if (chain !== "lainnya") {
            var tpl = document.querySelector('#logoTpl img[data-chain="' + chain + '"]');
            if (tpl) return tpl.cloneNode(true);
          }
          var s = document.createElement("span");
          s.className = "x-clogo"; s.setAttribute("aria-hidden", "true");
          s.textContent = chain === "lainnya" && custom ? initials(custom) : "+";
          return s;
        }
        function chainName(t) { return t.chain === "lainnya" ? (t.customChain || "Lainnya") : CHAIN_NAME[t.chain] || t.chain; }
        function chainKey(t) { return t.chain === "lainnya" ? "c:" + String(t.customChain || "").trim().toLowerCase() : t.chain; }
        var toastT;
        function toast(msg) {
          var el = $("toast"); el.textContent = msg; el.classList.add("is-show");
          clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove("is-show"); }, 2200);
        }
        function shortAddr(a) { return a.length > 14 ? a.slice(0, 6) + "…" + a.slice(-4) : a; }
        function copyFallback(text) {
          var ok = false, ta = document.createElement("textarea");
          ta.value = text; ta.setAttribute("readonly", "");
          ta.style.position = "fixed"; ta.style.top = "0"; ta.style.left = "0"; ta.style.opacity = "0"; ta.style.pointerEvents = "none";
          document.body.appendChild(ta);
          try { ta.select(); ta.setSelectionRange(0, text.length); ok = document.execCommand("copy"); } catch (e) { ok = false; }
          ta.remove();
          return ok;
        }
        function copyText(text) {
          var done = function () { toast("Address disalin ✓"); };
          var fallback = function () { if (copyFallback(text)) done(); else toast("Gagal menyalin di mode ini"); };
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).then(done, fallback);
              return;
            }
          } catch (e) {}
          fallback();
        }

        /* ---------- check-in ---------- */
        function curStreak() {
          var now = new Date();
          return S.last === ymd(now) || S.last === ymd(addDays(now, -1)) ? S.streak : 0;
        }
        function renderCheckin() {
          var now = new Date(), today = ymd(now), done = S.last === today, set = {};
          S.checkins.forEach(function (d) { set[d] = 1; });
          var btn = $("checkBtn");
          btn.disabled = done;
          btn.textContent = done ? "✓ Sudah check-in hari ini" : "Check-in Hari Ini";
          var cs = curStreak();
          $("ciSub").textContent = done ? "Mantap! Balik lagi besok ya 🚀" : cs > 0 ? "Jangan putus! Tap sekarang biar streak lanjut." : "Satu tap sehari, jaga streak-nya!";
          $("stCur").textContent = "🔥 " + cs;
          $("stLong").textContent = S.longest;
          $("stTotal").textContent = S.checkins.length;
          var w = "";
          for (var i = 6; i >= 0; i--) {
            var d = addDays(now, -i), k = ymd(d), on = !!set[k];
            w += '<div class="x-day' + (on ? " is-on" : "") + (i === 0 ? " is-today" : "") + '" title="' + k + '"><i>' + (on ? "✓" : "") + "</i>" + DAYS[d.getDay()] + "</div>";
          }
          $("week").innerHTML = w;
          var h = "";
          for (var j = 29; j >= 0; j--) {
            var dd = addDays(now, -j), kk = ymd(dd);
            h += '<span class="' + (set[kk] ? "is-on" : "") + (j === 0 ? " is-today" : "") + '" title="' + kk + (set[kk] ? " ✓" : "") + '"></span>';
          }
          $("heat").innerHTML = h;
          $("heatStart").textContent = addDays(now, -29).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        }
        $("checkBtn").addEventListener("click", safe(function () {
          var now = new Date(), today = ymd(now);
          if (S.last === today) return;
          var yest = ymd(addDays(now, -1));
          S.streak = S.last === yest ? S.streak + 1 : 1;
          S.last = today;
          if (S.checkins.indexOf(today) < 0) S.checkins.push(today);
          S.longest = Math.max(S.longest, S.streak);
          save(); renderCheckin();
          toast(S.streak > 1 ? "🔥 Streak " + S.streak + " hari! Gas terus!" : "✓ Check-in berhasil!");
          var b = $("checkBtn"); b.classList.remove("is-pop"); void b.offsetWidth; b.classList.add("is-pop");
          try { confetti(b); } catch (e) {}
        }));
        function confetti(el) {
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          var r = el.getBoundingClientRect(), box = document.createElement("div");
          box.className = "x-confetti";
          var colors = ["#8b5cf6", "#3b82f6", "#22d3ee", "#f472b6", "#fbbf24", "#34d399"];
          for (var i = 0; i < 48; i++) {
            var p = document.createElement("i"), a = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 180;
            p.style.setProperty("--x", r.left + r.width / 2 + (Math.random() - 0.5) * r.width * 0.6 + "px");
            p.style.setProperty("--y", r.top + r.height / 2 + "px");
            p.style.setProperty("--dx", Math.cos(a) * dist + "px");
            p.style.setProperty("--dy", Math.sin(a) * dist - 60 + Math.random() * 200 + "px");
            p.style.setProperty("--r", Math.random() * 720 - 360 + "deg");
            p.style.setProperty("--c", colors[i % colors.length]);
            p.style.animationDelay = Math.random() * 0.1 + "s";
            box.appendChild(p);
          }
          document.body.appendChild(box);
          setTimeout(function () { box.remove(); }, 1700);
        }

        /* ---------- tasks ---------- */
        var F = { cat: "all", chain: "all", q: "" };
        function deadline(t) { return t.date ? new Date(t.date + "T" + (t.time || "23:59")) : null; }
        function due(t) {
          var d = deadline(t); if (!d || isNaN(d)) return null;
          var now = new Date(), diff = d - now, pre = t.cat === "mint" ? "Mint" : "Deadline";
          var when = d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" }) + (t.time ? ", " + t.time : "");
          if (diff < 0) return { txt: "Lewat", when: when, cls: "is-past", urgent: false };
          if (t.date === ymd(now)) return { txt: "Hari ini!", when: when, cls: "is-soon", urgent: true };
          if (diff < 864e5) return { txt: pre + " " + Math.max(1, Math.ceil(diff / 36e5)) + " jam lagi", when: when, cls: "is-soon", urgent: true };
          var days = Math.round((addDays(d, 0) - addDays(now, 0)) / 864e5);
          return { txt: pre + " " + days + " hari lagi", when: when, cls: "", urgent: false };
        }
        function sorted(list) {
          return list.slice().sort(function (a, b) {
            if (!!a.done !== !!b.done) return a.done ? 1 : -1;
            var da = deadline(a), db = deadline(b);
            if (da && db) return da - db;
            if (da) return -1; if (db) return 1;
            return (b.created || 0) - (a.created || 0);
          });
        }
        function renderFilters() {
          var counts = { all: S.tasks.length };
          S.tasks.forEach(function (t) { counts[t.cat] = (counts[t.cat] || 0) + 1; });
          var h = '<button type="button" class="x-tab" data-cat="all" aria-pressed="' + (F.cat === "all") + '">Semua <small>' + counts.all + "</small></button>";
          CATS.forEach(function (c) {
            h += '<button type="button" class="x-tab" data-cat="' + c.id + '" aria-pressed="' + (F.cat === c.id) + '">' + (c.short || c.name) + (counts[c.id] ? " <small>" + counts[c.id] + "</small>" : "") + "</button>";
          });
          $("catTabs").innerHTML = h;
          // chain chips: only chains in use
          var used = {}, order = [];
          S.tasks.forEach(function (t) { var k = chainKey(t); if (!used[k]) { used[k] = t; order.push(k); } });
          var box = $("chainTabs");
          box.innerHTML = "";
          box.hidden = order.length < 2;
          if (F.chain !== "all" && !used[F.chain]) F.chain = "all";
          if (order.length < 2) return;
          var all = document.createElement("button");
          all.type = "button"; all.className = "x-tab"; all.dataset.chain = "all"; all.setAttribute("aria-pressed", F.chain === "all");
          all.textContent = "Semua chain"; box.appendChild(all);
          order.sort(function (a, b) { return chainName(used[a]).localeCompare(chainName(used[b])); });
          order.forEach(function (k) {
            var t = used[k], b = document.createElement("button");
            b.type = "button"; b.className = "x-tab x-tab--chain"; b.dataset.chain = k; b.setAttribute("aria-pressed", F.chain === k);
            b.appendChild(logo(t.chain, t.customChain));
            b.appendChild(document.createTextNode(chainName(t)));
            box.appendChild(b);
          });
        }
        function renderStats() {
          var on = S.tasks.filter(function (t) { return !t.done; });
          $("sTotal").textContent = S.tasks.length;
          $("sOn").textContent = on.length;
          $("sDone").textContent = S.tasks.length - on.length;
          var now = new Date();
          var mints = on.filter(function (t) { var d = deadline(t); return t.cat === "mint" && d && d >= now; })
            .sort(function (a, b) { return deadline(a) - deadline(b); });
          if (mints.length) {
            var u = due(mints[0]);
            $("sNext").textContent = mints[0].name;
            $("sNextWhen").textContent = u.txt + " · " + u.when;
          } else {
            $("sNext").textContent = "—";
            $("sNextWhen").textContent = "Belum ada jadwal mint";
          }
        }
        function renderList() {
          var q = F.q.trim().toLowerCase();
          var items = sorted(S.tasks).filter(function (t) {
            if (F.cat !== "all" && t.cat !== F.cat) return false;
            if (F.chain !== "all" && chainKey(t) !== F.chain) return false;
            if (q && (t.name + " " + (t.notes || "") + " " + chainName(t) + " " + (t.addrs || []).join(" ") + " " + (t.xs || []).join(" ") + " " + (t.opensea || "") + " " + (t.osSlug || "")).toLowerCase().indexOf(q) < 0) return false;
            return true;
          });
          var list = $("list"); list.innerHTML = "";
          if (!S.tasks.length) {
            list.innerHTML = '<div class="x-empty"><b>🪂</b><p>Belum ada garapan. Tambahin yang pertama!</p></div>';
            return;
          }
          if (!items.length) {
            list.innerHTML = '<div class="x-empty"><b>🔍</b><p>Nggak ada garapan yang cocok sama filter ini.</p></div>';
            return;
          }
          items.forEach(function (t, i) {
            var u = due(t), c = CAT[t.cat] || CAT.lainnya;
            var el = document.createElement("article");
            el.className = "x-task" + (t.done ? " is-done" : "") + (u && u.urgent && !t.done ? " is-urgent" : "");
            el.dataset.id = t.id;
            el.style.animationDelay = Math.min(i, 8) * 0.03 + "s";
            el.innerHTML =
              '<div class="x-task__top"><span class="x-slot"></span><div class="x-task__meta"><span class="x-task__chain">' + esc(chainName(t)) +
              "</span><h3>" + esc(t.name) + '</h3></div><span class="x-badge x-cat-' + c.id + '">' + esc(c.short || c.name) + "</span></div>" +
              (u ? '<p class="x-due ' + u.cls + '">⏰ ' + esc(u.txt) + " <small>· " + esc(u.when) + "</small></p>" : "") +
              (t.notes ? '<p class="x-notes">' + esc(t.notes) + "</p>" : "") +
              idChips(t) +
              (t.osSlug ? '<div class="os-panel" data-slug="' + esc(t.osSlug) + '"></div>' : "") +
              '<div class="x-actions"><button type="button" class="x-sbtn x-status' + (t.done ? " is-done" : "") + '" data-act="toggle" aria-label="Ubah status, sekarang ' + (t.done ? "Done" : "Ongoing") + '">' +
              (t.done ? "Done" : "Ongoing") + "</button>" +
              (t.link ? '<a class="x-sbtn x-sbtn--open" href="' + esc(t.link) + '" target="_blank" rel="noopener">Buka ↗</a>' : "") +
              (t.osSlug && t.opensea ? '<a class="x-sbtn" href="' + esc(t.opensea) + '" target="_blank" rel="noopener" aria-label="Buka ' + esc(t.name) + ' di OpenSea">OpenSea ↗</a>' : "") +
              '<span class="x-spacer"></span><button type="button" class="x-sbtn" data-act="edit" aria-label="Edit ' + esc(t.name) + '">✎</button>' +
              '<button type="button" class="x-sbtn x-sbtn--del" data-act="del" aria-label="Hapus ' + esc(t.name) + '">🗑</button></div>';
            var slot = el.querySelector(".x-slot");
            slot.replaceWith(logo(t.chain, t.customChain));
            list.appendChild(el);
          });
          try { osMount(); } catch (e) { try { console.error(e); } catch (x) {} }
        }
        function idChips(t) {
          var addrs = t.addrs || [], xs = t.xs || [];
          if (!addrs.length && !xs.length) return "";
          var h = '<div class="x-ids">';
          addrs.forEach(function (a) {
            h += '<button type="button" class="x-idchip x-mono" data-act="copy" data-addr="' + esc(a) + '" title="' + esc(a) + '" aria-label="Salin address ' + esc(a) + '">' +
              esc(shortAddr(a)) + ' <i aria-hidden="true">⧉</i></button>';
          });
          xs.forEach(function (x) {
            var n = x.replace(/^@/, "");
            h += '<a class="x-idchip" href="https://x.com/' + encodeURIComponent(n) + '" target="_blank" rel="noopener" aria-label="Buka ' + esc(x) + ' di X">' +
              esc(x) + ' <i aria-hidden="true">↗</i></a>';
          });
          return h + "</div>";
        }
        function renderAll() { renderCheckin(); renderFilters(); renderStats(); renderList(); }

        $("catTabs").addEventListener("click", function (e) {
          var b = e.target.closest("[data-cat]"); if (!b) return;
          F.cat = b.dataset.cat; renderFilters(); renderList();
        });
        $("chainTabs").addEventListener("click", function (e) {
          var b = e.target.closest("[data-chain]"); if (!b) return;
          F.chain = b.dataset.chain; renderFilters(); renderList();
        });
        $("q").addEventListener("input", function (e) { F.q = e.target.value; renderList(); });
        $("list").addEventListener("click", safe(function (e) {
          var b = e.target.closest("[data-act]"); if (!b) return;
          var id = b.closest(".x-task").dataset.id, t = S.tasks.find(function (x) { return x.id === id; });
          if (!t) return;
          if (b.dataset.act === "copy") { copyText(b.dataset.addr || ""); return; }
          if (b.dataset.act === "toggle") {
            t.done = !t.done; save(); renderStats(); renderList();
            toast(t.done ? "✓ " + t.name + " selesai!" : t.name + " balik ke Ongoing");
          } else if (b.dataset.act === "edit") openForm(t);
          else if (b.dataset.act === "del") {
            ask("Hapus garapan?", "“" + t.name + "” bakal dihapus permanen.", "Hapus", function () {
              S.tasks = S.tasks.filter(function (x) { return x.id !== id; });
              save(); renderFilters(); renderStats(); renderList(); toast("Garapan dihapus");
            });
          }
        }));

        /* ---------- sheets ---------- */
        var lastFocus;
        function openOv(ov, focusEl) {
          lastFocus = document.activeElement;
          ov.classList.add("is-open"); ov.setAttribute("aria-hidden", "false");
          document.body.style.overflow = "hidden";
          setTimeout(function () { if (focusEl) focusEl.focus({ preventScroll: true }); }, 60);
        }
        function closeOv(ov) {
          ov.classList.remove("is-open"); ov.setAttribute("aria-hidden", "true");
          if (!document.querySelector(".x-overlay.is-open")) document.body.style.overflow = "";
          if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
        }
        document.querySelectorAll(".x-overlay").forEach(function (ov) {
          ov.addEventListener("click", function (e) { if (e.target === ov || e.target.closest("[data-close]")) closeOv(ov); });
        });
        document.addEventListener("keydown", function (e) {
          if (e.key === "Escape") { var o = document.querySelector(".x-overlay.is-open:last-of-type") || document.querySelector(".x-overlay.is-open"); if (o) closeOv(o); }
        });
        var confCb = null;
        function ask(title, msg, okLabel, cb) {
          $("confTitle").textContent = title; $("confMsg").textContent = msg; $("confOk").textContent = okLabel;
          confCb = cb; openOv($("confOv"), $("confOk"));
        }
        $("confOk").addEventListener("click", safe(function () { var cb = confCb; confCb = null; closeOv($("confOv")); if (cb) cb(); }));

        /* ---------- form ---------- */
        var editing = null, fCat = null, fChain = null;
        (function buildPickers() {
          var h = "";
          CATS.forEach(function (c) { h += '<button type="button" class="x-tab" role="radio" data-v="' + c.id + '">' + c.name + "</button>"; });
          $("fCats").innerHTML = h;
          var box = $("fChains");
          CHAINS.concat([["lainnya", "Lainnya"]]).forEach(function (c) {
            var b = document.createElement("button");
            b.type = "button"; b.className = "x-chainopt"; b.setAttribute("role", "radio"); b.dataset.v = c[0];
            b.appendChild(logo(c[0], null));
            var s = document.createElement("span"); s.textContent = c[1]; b.appendChild(s);
            box.appendChild(b);
          });
        })();
        function syncPickers() {
          $("fCats").querySelectorAll("[data-v]").forEach(function (b) {
            var on = b.dataset.v === fCat; b.setAttribute("aria-checked", on); b.setAttribute("aria-pressed", on);
          });
          $("fChains").querySelectorAll("[data-v]").forEach(function (b) { b.setAttribute("aria-checked", b.dataset.v === fChain); });
          $("fCustom").hidden = fChain !== "lainnya";
          var other = $("fChains").querySelector('[data-v="lainnya"] .x-clogo');
          other.textContent = fChain === "lainnya" && $("fCustom").value.trim() ? initials($("fCustom").value) : "+";
          $("fLinkLabel").innerHTML = (fCat === "mint" ? "Link OpenSea / mint" : "Link") + ' <span class="x-opt">(opsional)</span>';
          $("fLink").placeholder = fCat === "mint" ? "https://opensea.io/…" : "https://…";
        }
        $("fCats").addEventListener("click", function (e) { var b = e.target.closest("[data-v]"); if (b) { fCat = b.dataset.v; syncPickers(); } });
        $("fChains").addEventListener("click", function (e) {
          var b = e.target.closest("[data-v]"); if (!b) return;
          fChain = b.dataset.v; syncPickers(); clearErr();
          if (fChain === "lainnya") $("fCustom").focus();
        });
        $("fCustom").addEventListener("input", function () { syncPickers(); unmark($("fCustom")); });
        $("fName").addEventListener("input", function () { unmark($("fName")); if (!document.querySelector("#form .is-invalid")) clearErr(); });
        $("fLink").addEventListener("input", function () { unmark($("fLink")); });
        $("fOS").addEventListener("input", function () { unmark($("fOS")); $("fOSErr").textContent = ""; });
        function clearErr() {
          $("fErr").textContent = "";
          $("fOSErr").textContent = "";
          document.querySelectorAll("#form .is-invalid").forEach(function (el) { el.classList.remove("is-invalid"); });
          ["fName", "fCustom", "fLink", "fOS"].forEach(function (id) { $(id).removeAttribute("aria-invalid"); });
        }
        function unmark(el) {
          el.classList.remove("is-invalid"); el.removeAttribute("aria-invalid");
          var f = el.closest(".x-field"); if (f) f.classList.remove("is-invalid");
        }
        function fail(msg, el, focus) {
          $("fErr").textContent = "⚠ " + msg;
          el.classList.add("is-invalid");
          if (el.tagName === "INPUT") el.setAttribute("aria-invalid", "true");
          var f = el.closest(".x-field"); if (f) f.classList.add("is-invalid");
          var field = f || el;
          try { field.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) { try { field.scrollIntoView(); } catch (x) {} }
          if (focus) setTimeout(function () { try { el.focus({ preventScroll: true }); } catch (e) {} }, 250);
          return false;
        }
        var MULTI = {
          fAddrs: { ph: "0x...", mono: true, label: "Wallet address", rm: "Hapus address" },
          fXs: { ph: "@username", mono: false, label: "Username X", rm: "Hapus username" }
        };
        function syncRows(box) {
          var rows = box.querySelectorAll(".x-mrow"), many = rows.length > 1;
          rows.forEach(function (r, i) {
            r.querySelector(".x-mrm").hidden = !many;
            r.querySelector("input").setAttribute("aria-label", MULTI[box.id].label + (many ? " " + (i + 1) : ""));
          });
        }
        function addRow(box, value, focus) {
          var cfg = MULTI[box.id], row = document.createElement("div");
          row.className = "x-mrow";
          var inp = document.createElement("input");
          inp.className = "x-input" + (cfg.mono ? " x-mono" : "");
          inp.type = "text"; inp.placeholder = cfg.ph; inp.autocomplete = "off"; inp.spellcheck = false;
          inp.setAttribute("autocapitalize", "off"); inp.maxLength = 120; inp.value = value || "";
          inp.addEventListener("keydown", function (e) { if (e.key === "Enter") e.preventDefault(); });
          var rm = document.createElement("button");
          rm.type = "button"; rm.className = "x-mrm"; rm.textContent = "✕"; rm.setAttribute("aria-label", cfg.rm);
          row.appendChild(inp); row.appendChild(rm); box.appendChild(row);
          syncRows(box);
          if (focus) setTimeout(function () { try { inp.focus({ preventScroll: false }); } catch (e) {} }, 30);
        }
        function fillRows(box, values) {
          box.innerHTML = "";
          (values && values.length ? values : [""]).forEach(function (v) { addRow(box, v, false); });
        }
        function readRows(box) {
          return Array.prototype.map.call(box.querySelectorAll("input"), function (i) { return String(i.value || "").trim(); }).filter(Boolean);
        }
        ["fAddrs", "fXs"].forEach(function (id) {
          var box = $(id);
          box.addEventListener("click", safe(function (e) {
            var b = e.target.closest(".x-mrm"); if (!b) return;
            var row = b.closest(".x-mrow"), next = row.nextElementSibling || row.previousElementSibling;
            row.remove(); syncRows(box);
            if (next) { var ni = next.querySelector("input"); if (ni) ni.focus({ preventScroll: true }); }
          }));
        });
        $("fAddrAdd").addEventListener("click", safe(function () { addRow($("fAddrs"), "", true); }));
        $("fXAdd").addEventListener("click", safe(function () { addRow($("fXs"), "", true); }));
        fillRows($("fAddrs"), []); fillRows($("fXs"), []);

        function openForm(t) {
          editing = t || null;
          $("formTitle").textContent = t ? "Edit Garapan" : "Tambah Garapan";
          $("fSubmit").textContent = t ? "Simpan perubahan" : "Simpan";
          $("fName").value = t ? t.name : "";
          fCat = t && CAT[t.cat] ? t.cat : null;
          fChain = t ? t.chain : null;
          $("fCustom").value = t && t.customChain ? t.customChain : "";
          $("fLink").value = t ? t.link || "" : "";
          $("fOS").value = t ? t.opensea || "" : "";
          $("fDate").value = t ? t.date || "" : "";
          $("fTime").value = t ? t.time || "" : "";
          $("fNotes").value = t ? t.notes || "" : "";
          fillRows($("fAddrs"), t ? t.addrs || [] : []);
          fillRows($("fXs"), t ? t.xs || [] : []);
          clearErr();
          syncPickers();
          $("form").scrollTop = 0;
          openOv($("formOv"), $("fName"));
        }
        $("addBtn").addEventListener("click", safe(function () { openForm(null); }));

        /* Simpan: a plain button with a direct handler. No <form>, no submit event, no HTML5 validation,
           so it works inside an iframe sandboxed with allow-scripts only. */
        function readForm() {
          var link = String($("fLink").value || "").trim(), date = $("fDate").value || "";
          if (link && !/^https?:\/\//i.test(link)) link = "https://" + link;
          return {
            name: String($("fName").value || "").trim(),
            cat: fCat && CAT[fCat] ? fCat : "lainnya",
            chain: fChain,
            custom: String($("fCustom").value || "").trim(),
            link: link, date: date, time: date ? $("fTime").value || "" : "",
            osRaw: String($("fOS").value || "").trim(),
            notes: String($("fNotes").value || "").trim(),
            addrs: readRows($("fAddrs")).map(function (a) { return a.replace(/\s+/g, ""); }).filter(Boolean),
            xs: readRows($("fXs")).map(normX).filter(Boolean)
          };
        }
        function validate(v) {
          clearErr();
          if (!v.name) return fail("Nama project wajib diisi.", $("fName"), true);
          if (!v.chain) return fail("Pilih chain dulu ya.", $("fChains"), false);
          if (v.chain === "lainnya" && !v.custom) return fail("Ketik nama chain-nya.", $("fCustom"), true);
          if (v.link && !/^https?:\/\/[^\s.]+\.[^\s]+/i.test(v.link)) return fail("Link-nya kayaknya belum bener.", $("fLink"), true);
          if (v.osRaw) {
            v.osSlug = parseOS(v.osRaw);
            if (!v.osSlug) {
              $("fOSErr").textContent = "Format: https://opensea.io/collection/nama-collection atau slug-nya aja";
              return fail("Link OpenSea nggak kebaca.", $("fOS"), true);
            }
            v.opensea = /^https?:\/\//i.test(v.osRaw) ? v.osRaw : (/\/collection\//i.test(v.osRaw) ? "https://" + v.osRaw.replace(/^\/+/, "") : "https://opensea.io/collection/" + encodeURIComponent(v.osSlug));
          } else { v.osSlug = ""; v.opensea = ""; }
          return true;
        }
        var saving = false;
        function submitForm() {
          if (saving) return;
          saving = true;
          try {
            var v = readForm();
            if (!validate(v)) return;
            var data = {
              name: v.name, cat: v.cat, chain: v.chain, customChain: v.chain === "lainnya" ? v.custom : "",
              link: v.link, date: v.date, time: v.time, notes: v.notes,
              addrs: v.addrs, xs: v.xs, opensea: v.opensea, osSlug: v.osSlug
            };
            var wasEdit = !!editing;
            if (editing) {
              for (var k in data) editing[k] = data[k];
            } else {
              var t = { id: uid(), done: false, created: Date.now() };
              for (var j in data) t[j] = data[j];
              S.tasks.push(t);
              F.cat = "all"; F.chain = "all"; F.q = ""; try { $("q").value = ""; } catch (e) {}
            }
            editing = null;
            save();
            closeOv($("formOv"));
            try { renderFilters(); renderStats(); renderList(); } catch (e) { try { console.error(e); } catch (x) {} }
            toast(wasEdit ? "Perubahan disimpan ✓" : "Garapan ditambahkan ✓");
          } catch (err) {
            try { console.error(err); } catch (x) {}
            $("fErr").textContent = "⚠ Gagal menyimpan, coba lagi ya.";
          } finally {
            setTimeout(function () { saving = false; }, 350);
          }
        }
        (function bindSubmit(btn) {
          var tx = 0, ty = 0, touched = 0;
          btn.addEventListener("touchstart", function (e) {
            var p = e.touches && e.touches[0]; if (p) { tx = p.clientX; ty = p.clientY; }
          }, { passive: true });
          btn.addEventListener("touchend", function (e) {
            var p = e.changedTouches && e.changedTouches[0];
            if (p && (Math.abs(p.clientX - tx) > 12 || Math.abs(p.clientY - ty) > 12)) return; // a scroll, not a tap
            touched = Date.now();
            if (e.cancelable) e.preventDefault(); // stop the follow-up click, we handle it here
            submitForm();
          });
          btn.addEventListener("click", function (e) {
            if (Date.now() - touched < 800) return; // already handled by touchend
            submitForm();
          });
        })($("fSubmit"));
        ["fName", "fCustom", "fLink", "fOS"].forEach(function (id) {
          $(id).addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); submitForm(); } });
        });

        /* ---------- export / import ---------- */
        $("exportBtn").addEventListener("click", function () {
          if (!currentUser) { toast("Masuk dulu ya buat export data"); showAuth("masuk"); return; }
          try {
            var blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
            var a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "hendri_coomingsoon-" + currentUser + "-backup-" + ymd(new Date()) + ".json";
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
            toast("⬇ Backup di-download");
          } catch (err) { toast("Gagal export di mode ini"); }
        });
        $("importBtn").addEventListener("click", function () {
          if (!currentUser) { toast("Masuk dulu ya buat import data"); showAuth("masuk"); return; }
          $("importFile").value = ""; $("importFile").click(); });
        $("importFile").addEventListener("change", function (e) {
          var f = e.target.files && e.target.files[0]; if (!f) return;
          var r = new FileReader();
          r.onload = function () {
            var d;
            try { d = JSON.parse(r.result); } catch (err) { toast("File-nya bukan JSON yang valid"); return; }
            if (!d || typeof d !== "object" || (!Array.isArray(d.tasks) && !Array.isArray(d.checkins))) { toast("Format backup nggak dikenali"); return; }
            if (!currentUser) return;
            ask("Import data?", "Data @" + currentName + " sekarang bakal ditimpa sama isi file “" + f.name + "”.", "Import", function () {
              S = norm(d); F.cat = "all"; F.chain = "all"; save(); renderAll(); toast("⬆ Data berhasil di-import");
            });
          };
          r.onerror = function () { toast("Gagal baca file"); };
          try { r.readAsText(f); } catch (err) { toast("Gagal baca file"); }
        });

        /* ---------- OpenSea API layer ---------- */
        var OS = (function () {
          var BASE = "https://api.opensea.io", CUSTOM = "hendri_os_custom_key", AUTO = "hendri_os_key";
          var backoffUntil = 0, minting = null;
          function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
          function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
          function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
          function err(code, msg) { var e = new Error(msg || code); e.code = code; return e; }
          function expMs(x) {
            if (x == null || x === "") return 0;
            if (typeof x === "number" || /^\d+$/.test(String(x))) { var n = +x; return n < 1e12 ? n * 1000 : n; }
            var t = Date.parse(x); return isNaN(t) ? 0 : t;
          }
          function customKey() { var k = lsGet(CUSTOM); return k && k.trim() ? k.trim() : ""; }
          function autoKey() {
            try {
              var a = JSON.parse(lsGet(AUTO) || "null");
              if (a && a.api_key && (!a.expires_at || expMs(a.expires_at) > Date.now() + 30000)) return a;
            } catch (e) {}
            return null;
          }
          async function mint() {
            if (minting) return minting;
            minting = (async function () {
              var res;
              try { res = await fetch(BASE + "/api/v2/auth/keys", { method: "POST" }); }
              catch (e) { throw err("KEY_LIMIT", "Gagal membuat API key"); }
              if (!res.ok) throw err("KEY_LIMIT", "Gagal membuat API key (" + res.status + ")");
              var j = await res.json();
              if (!j || !j.api_key) throw err("KEY_LIMIT", "Respon API key nggak valid");
              lsSet(AUTO, JSON.stringify({ api_key: j.api_key, expires_at: j.expires_at || null }));
              return j.api_key;
            })();
            try { return await minting; } finally { minting = null; }
          }
          async function getKey() {
            var c = customKey(); if (c) return c;
            var a = autoKey(); if (a) return a.api_key;
            return mint();
          }
          async function get(path) {
            if (Date.now() < backoffUntil) throw err("RATE", "Rate limit, tunggu sebentar");
            var retried = false;
            while (true) {
              var key = await getKey();
              var res = await fetch(BASE + path, { headers: { "x-api-key": key } });
              if (res.status === 401 && !retried && !customKey()) { retried = true; lsDel(AUTO); continue; }
              if (res.status === 429) {
                var r = parseInt(res.headers.get("X-RateLimit-Reset"), 10);
                backoffUntil = r ? (r < 1e12 ? r * 1000 : r) : Date.now() + 60000;
                throw err("RATE", "Rate limit, tunggu sebentar");
              }
              if (res.status === 404) return null;
              if (!res.ok) throw err("HTTP", "OpenSea error " + res.status);
              return res.json();
            }
          }
          function enc(s) { return encodeURIComponent(s); }
          return {
            getKey: getKey, get: get,
            drop: function (slug) { return get("/api/v2/drops/" + enc(slug)); },
            stats: function (slug) { return get("/api/v2/collections/" + enc(slug) + "/stats"); },
            topOffer: function (slug) { return get("/api/v2/collections/" + enc(slug) + "/offer_aggregates?limit=1&sort_direction=desc"); },
            customKey: customKey, autoKey: autoKey, expMs: expMs,
            setCustom: function (k) { if (k) lsSet(CUSTOM, k); else lsDel(CUSTOM); },
            backoffUntil: function () { return backoffUntil; }
          };
        })();
        window.OS = OS;

        function osStatus() {
          var c = OS.customKey(), a = OS.autoKey(), parts = [];
          parts.push(c ? "✓ Pakai API key pribadi." : "Belum ada API key pribadi.");
          if (a) {
            var ms = OS.expMs(a.expires_at);
            parts.push("Key otomatis aktif" + (ms ? ", berlaku sampai " + new Date(ms).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "") + ".");
          } else parts.push("Key otomatis belum aktif (dibuat saat pertama dipakai).");
          $("osStatus").textContent = parts.join(" ");
        }
        $("osKeyBtn").addEventListener("click", safe(function () {
          $("osKeyIn").value = OS.customKey();
          osStatus();
          openOv($("osOv"), $("osKeyIn"));
        }));
        $("osKeySave").addEventListener("click", safe(function () {
          var k = String($("osKeyIn").value || "").trim();
          OS.setCustom(k); osStatus();
          toast(k ? "API key disimpan ✓" : "API key pribadi dikosongkan");
        }));
        $("osKeyDel").addEventListener("click", safe(function () {
          OS.setCustom(""); $("osKeyIn").value = ""; osStatus();
          toast("API key pribadi dihapus");
        }));
        $("osKeyIn").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); $("osKeySave").click(); } });

        /* ---------- OpenSea panels ---------- */
        var OS_STALE = 60000, OS_GAP = 400;
        var osCache = {}, osBusy = {}, osQueued = {}, osQueue = [], osPumping = false;
        var osIO = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
          es.forEach(function (en) { en.target._osVis = en.isIntersecting; });
        }, { rootMargin: "200px 0px" }) : null;
        function osPanels(slug) {
          return Array.prototype.filter.call(document.querySelectorAll(".os-panel[data-slug]"), function (p) { return slug == null || p.dataset.slug === slug; });
        }
        function osTaskDl(p) {
          var card = p.closest(".x-task"), id = card && card.dataset.id;
          var t = id ? S.tasks.find(function (x) { return x.id === id; }) : null;
          var d = t ? deadline(t) : null;
          return d && !isNaN(d) ? +d : 0;
        }
        function osT(s) { var t = s ? Date.parse(s) : NaN; return isNaN(t) ? 0 : t; }
        function osNum(n) {
          var v = Number(n); if (n == null || n === "" || !isFinite(v)) return null;
          return v.toFixed(4).replace(/\.?0+$/, "");
        }
        function osPrice(p) {
          if (p == null || p === "") return "";
          if (typeof p !== "object") { var n = osNum(p); return n == null ? String(p) : n; }
          var amt = p.token_unit != null ? p.token_unit : p.value != null ? p.value : p.amount;
          var cur = p.currency, sym = p.symbol || (cur && typeof cur === "object" ? cur.symbol : cur) || "";
          if (amt != null && p.decimals != null && /^\d+$/.test(String(amt)) && String(amt).length > 6) amt = Number(amt) / Math.pow(10, +p.decimals);
          var s = osNum(amt);
          return s == null ? "" : (s + (sym ? " " + sym : ""));
        }
        function osStage(st) { return st ? (st.label || st.stage_type || "") : ""; }
        function osState(d, now) {
          if (!d) return { kind: "none" };
          if (d.is_minting) return { kind: "live", stage: d.active_stage || null };
          var start = d.next_stage ? osT(d.next_stage.start_time) : 0, stage = d.next_stage || null;
          if (!(start > now)) {
            start = 0; stage = null;
            (Array.isArray(d.stages) ? d.stages.slice() : []).sort(function (a, b) { return osT(a.start_time) - osT(b.start_time); })
              .some(function (s) { var t = osT(s.start_time); if (t > now) { start = t; stage = s; return true; } return false; });
          }
          return start > now ? { kind: "soon", start: start, stage: stage } : { kind: "none" };
        }
        function osNeedsMarket(slug, d) {
          var now = Date.now(), st = osState(d, now);
          if (st.kind === "live") return true;
          if (st.kind === "soon") return false;
          return osPanels(slug).some(function (p) { return !(osTaskDl(p) > now); }) || !osPanels(slug).length;
        }
        function osCd(ms) {
          var s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
          return (d ? d + "h " : "") + pad(h) + "j " + pad(m) + "m " + pad(x) + "d";
        }
        function osAgo(at) {
          var s = Math.max(0, Math.floor((Date.now() - at) / 1000));
          return s < 60 ? s + " dtk lalu" : s < 3600 ? Math.floor(s / 60) + " mnt lalu" : Math.floor(s / 3600) + " jam lalu";
        }
        function osErrMsg(code) {
          return code === "KEY_LIMIT" ? "API OpenSea lagi limit, coba lagi nanti" : code === "RATE" ? "Kebanyakan request, tunggu bentar" : "Gagal ambil data OpenSea";
        }
        function osCdHtml(label, to, slug) {
          return '<p class="x-oscd" role="timer"><small>' + esc(label) + '</small><span class="x-cd" data-to="' + to + '" data-slug="' + esc(slug) + '">' + osCd(to - Date.now()) + "</span></p>";
        }
        function osTiles(m) {
          m = m || {};
          var s = m.stats && m.stats.total, o = m.offer && Array.isArray(m.offer.offer_aggregates) ? m.offer.offer_aggregates[0] : null;
          var fn = s ? osNum(s.floor_price) : null, floor = fn != null ? fn + (s.floor_price_symbol ? " " + s.floor_price_symbol : "") : "—";
          var op = o && o.offer_price, on = op ? osNum(op.token_unit) : null, top = on != null ? on + (op.symbol ? " " + op.symbol : "") : "—";
          var usd = op && op.usd_price != null && op.usd_price !== "" && isFinite(Number(op.usd_price)) ? "$" + Number(op.usd_price).toFixed(2) : "";
          return '<div class="x-ostiles"><div class="x-ostile"><span>Floor</span><b>' + esc(floor) + "</b></div>" +
            '<div class="x-ostile"><span>Top offer</span><b>' + esc(top) + "</b>" + (usd ? "<small>" + esc(usd) + "</small>" : "") + "</div></div>";
        }
        function osRender(p) {
          var slug = p.dataset.slug, c = osCache[slug], now = Date.now(), h = "";
          if (c && c.err) h += '<div class="x-oserr" role="alert"><span>⚠ ' + esc(osErrMsg(c.err)) + '</span><button type="button" class="x-osretry" data-osretry="' + esc(slug) + '" aria-label="Coba ambil data OpenSea lagi">↻</button></div>';
          if (!c || !c.at) {
            if (!c || !c.err) h = '<div class="x-skel x-skel--s"></div><div class="x-skel x-skel--big"></div><div class="x-skel"></div>';
            p.innerHTML = h; p.setAttribute("aria-busy", !c || !c.err ? "true" : "false");
            return;
          }
          p.setAttribute("aria-busy", osBusy[slug] ? "true" : "false");
          var st = osState(c.drop, now), dl = osTaskDl(p);
          if (st.kind === "soon") {
            var lb = osStage(st.stage), pr = st.stage ? osPrice(st.stage.price) : "";
            h += '<div class="x-oshead">⏳ Mint dalam' + (lb || pr ? " <small>" + esc([lb, pr].filter(Boolean).join(" · ")) + "</small>" : "") + "</div>" +
              osCdHtml("Mulai", st.start, slug);
          } else if (st.kind === "live") {
            var a = st.stage, la = osStage(a) || "Mint", pa = a ? osPrice(a.price) : "", end = a ? osT(a.end_time) : 0;
            var tot = Number(c.drop.total_supply), max = Number(c.drop.max_supply);
            h += '<div class="x-oshead"><span class="x-oslive">🟢 Mint LIVE</span><span>' + esc(la) + "</span>" + (pa ? "<small>" + esc(pa) + "</small>" : "") + "</div>";
            if (isFinite(tot) && c.drop.total_supply != null && c.drop.total_supply !== "") {
              var hasMax = isFinite(max) && max > 0, pct = hasMax ? Math.min(100, tot / max * 100) : 0;
              h += "<div>" + (hasMax ? '<div class="x-osbar" role="progressbar" aria-valuemin="0" aria-valuemax="' + max + '" aria-valuenow="' + tot + '" aria-label="Minted"><i style="width:' + pct.toFixed(2) + '%"></i></div>' : "") +
                '<p class="x-ossupply">' + tot.toLocaleString("id-ID") + (hasMax ? " / " + max.toLocaleString("id-ID") : "") + " minted</p></div>";
            }
            if (end > now) h += osCdHtml("Selesai dalam", end, slug);
            h += osTiles(c.market);
          } else if (dl > now) {
            h += '<div class="x-oshead">⏳ Mint dalam <small>Jadwal kamu</small></div>' + osCdHtml("Mulai", dl, slug);
          } else {
            h += osTiles(c.market);
          }
          h += '<div class="x-osfoot"><span>update <span class="x-osago" data-at="' + c.at + '">' + osAgo(c.at) + "</span></span><span>Data: OpenSea</span></div>";
          p.innerHTML = h;
        }
        function osRenderSlug(slug) { osPanels(slug).forEach(osRender); }
        async function osLoad(slug) {
          if (osBusy[slug]) return;
          osBusy[slug] = true;
          var c = osCache[slug] || (osCache[slug] = {});
          try {
            var d;
            try { d = await OS.drop(slug); }
            catch (e) { if (e && e.code === "HTTP") d = null; else throw e; }
            var market = null;
            if (osNeedsMarket(slug, d)) {
              var r = await Promise.all([OS.stats(slug), OS.topOffer(slug)]);
              market = { stats: r[0], offer: r[1] };
            }
            c.drop = d || null; c.market = market; c.at = Date.now(); c.err = ""; c.errAt = 0;
          } catch (e) {
            c.err = (e && e.code) || "ERR"; c.errAt = Date.now();
          } finally {
            osBusy[slug] = false;
            osRenderSlug(slug);
          }
        }
        function osPump() {
          if (osPumping) return;
          var next = function () {
            var slug = osQueue.shift();
            if (!slug) { osPumping = false; return; }
            delete osQueued[slug];
            osLoad(slug);
            setTimeout(next, OS_GAP);
          };
          osPumping = true; next();
        }
        function osEnqueue(slug) {
          if (osBusy[slug] || osQueued[slug]) return;
          osQueued[slug] = true; osQueue.push(slug); osPump();
        }
        function osStale(slug) {
          var c = osCache[slug]; if (!c) return true;
          return Date.now() - Math.max(c.at || 0, c.errAt || 0) >= OS_STALE - 2000;
        }
        function osCanAuto() { return !document.hidden && Date.now() >= OS.backoffUntil(); }
        function osMount() {
          if (!osCache) return;
          var seen = {};
          osPanels().forEach(function (p) {
            if (osIO) osIO.observe(p);
            osRender(p);
            var slug = p.dataset.slug;
            if (seen[slug]) return; seen[slug] = 1;
            if (!osCache[slug] || (osStale(slug) && osCanAuto())) osEnqueue(slug);
          });
        }
        $("list").addEventListener("click", function (e) {
          var b = e.target.closest("[data-osretry]"); if (!b) return;
          var slug = b.dataset.osretry, c = osCache[slug];
          if (c) { c.err = ""; }
          osRenderSlug(slug);
          osEnqueue(slug);
        });
        setInterval(function () {
          if (!osCanAuto()) return;
          var seen = {};
          osPanels().forEach(function (p) {
            var slug = p.dataset.slug;
            if (seen[slug] || p._osVis === false) return; seen[slug] = 1;
            if (osStale(slug)) osEnqueue(slug);
          });
        }, OS_STALE);
        /* one shared 1 s ticker for every countdown and "update … lalu" label */
        setInterval(function () {
          if (document.hidden) return;
          var now = Date.now();
          document.querySelectorAll(".x-cd[data-to]").forEach(function (el) {
            var left = +el.dataset.to - now;
            el.textContent = osCd(left);
            if (left <= 0 && !el._fired) {
              el._fired = true;
              var slug = el.dataset.slug, c = osCache[slug];
              if (c && now - (c.at || 0) > 10000 && osCanAuto()) osEnqueue(slug); else osRenderSlug(slug);
            }
          });
          document.querySelectorAll(".x-osago[data-at]").forEach(function (el) { el.textContent = osAgo(+el.dataset.at); });
        }, 1000);

        /* ---------- tick ---------- */
        var lastDay = ymd(new Date());
        setInterval(function () {
          var d = ymd(new Date());
          if (d !== lastDay) { lastDay = d; renderCheckin(); }
          if (!document.querySelector(".x-overlay.is-open")) {
            $("list").classList.add("x-quiet"); renderStats(); renderList();
            setTimeout(function () { $("list").classList.remove("x-quiet"); }, 50);
          }
        }, 60000);
        document.addEventListener("visibilitychange", function () { if (!document.hidden) renderAll(); });

        /* ---------- hashing ---------- */
        function utf8(str) {
          if (window.TextEncoder) return new TextEncoder().encode(str);
          var s = unescape(encodeURIComponent(str)), b = new Uint8Array(s.length);
          for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
          return b;
        }
        function toHex(bytes) {
          var h = ""; for (var i = 0; i < bytes.length; i++) h += (bytes[i] < 16 ? "0" : "") + bytes[i].toString(16);
          return h;
        }
        /* small pure-JS SHA-256, used when crypto.subtle is unavailable (e.g. non-secure context) */
        var SHA_K = (function () {
          var k = [], n = 2;
          while (k.length < 64) {
            var prime = true;
            for (var d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break; }
            if (prime) k.push((Math.pow(n, 1 / 3) % 1) * 4294967296 | 0);
            n++;
          }
          return k;
        })();
        function sha256js(str) {
          var ror = function (x, r) { return (x >>> r) | (x << (32 - r)); };
          var bytes = utf8(str), l = bytes.length, total = Math.ceil((l + 9) / 64) * 64;
          var m = new Uint8Array(total); m.set(bytes); m[l] = 0x80;
          var dv = new DataView(m.buffer);
          dv.setUint32(total - 8, Math.floor(l / 0x20000000)); dv.setUint32(total - 4, (l << 3) >>> 0);
          var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
          var w = new Array(64);
          for (var off = 0; off < total; off += 64) {
            var i;
            for (i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4) | 0;
            for (i = 16; i < 64; i++) {
              var x = w[i - 15], y = w[i - 2];
              w[i] = (w[i - 16] + (ror(x, 7) ^ ror(x, 18) ^ (x >>> 3)) + w[i - 7] + (ror(y, 17) ^ ror(y, 19) ^ (y >>> 10))) | 0;
            }
            var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
            for (i = 0; i < 64; i++) {
              var t1 = (h + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & f) ^ (~e & g)) + SHA_K[i] + w[i]) | 0;
              var t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
              h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
            }
            H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
            H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
          }
          return H.map(function (v) { return ("0000000" + (v >>> 0).toString(16)).slice(-8); }).join("");
        }
        async function sha256Hex(str) {
          try {
            if (window.crypto && crypto.subtle && crypto.subtle.digest) {
              var buf = await crypto.subtle.digest("SHA-256", utf8(str));
              return toHex(new Uint8Array(buf));
            }
          } catch (e) {}
          return sha256js(str);
        }
        function makeSalt() {
          var b = new Uint8Array(16);
          try { crypto.getRandomValues(b); }
          catch (e) { for (var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256); }
          return toHex(b);
        }

        /* ---------- accounts (local now, Sheet later) ---------- */
        function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
        function getUsers() {
          try { var u = JSON.parse(sGet(USERS_KEY) || "{}"); return u && typeof u === "object" && !Array.isArray(u) ? u : {}; }
          catch (e) { return {}; }
        }
        function setUsers(u) { sSet(USERS_KEY, JSON.stringify(u)); }
        /* Apps Script web app: text/plain avoids a CORS preflight. Body {action, username, hash, salt}; reply {ok, error, salt}. */
        async function api(action, username, hash, salt) {
          var res = await fetch(SHEET_API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ action: action, username: username, hash: hash || "", salt: salt || "" })
          });
          var j = await res.json();
          return j && typeof j === "object" ? j : { ok: false, error: "Respon server nggak valid" };
        }
        /* check: {ok:true} = username free; {ok:false, error:"taken"} = dipakai */
        async function usernameAvailable(username) {
          if (SHEET_API_URL) { var r = await api("check", username); return !!r.ok; }
          return !has(getUsers(), username.toLowerCase());
        }
        async function register(username, password) {
          var lower = username.toLowerCase(), salt = makeSalt(), hash = await sha256Hex(salt + password);
          if (SHEET_API_URL) {
            var r = await api("register", username, hash, salt);
            return r.ok ? { ok: true, username: username, first: true } : { ok: false, error: r.error || "Gagal daftar, coba lagi ya" };
          }
          var users = getUsers();
          if (has(users, lower)) return { ok: false, error: "taken" };
          var first = Object.keys(users).length === 0;
          users[lower] = { username: username, salt: salt, hash: hash, createdAt: new Date().toISOString() };
          setUsers(users);
          return { ok: true, username: username, first: first };
        }
        /* remote login is two calls: {action:"login"} without hash returns {ok, salt}; then with hash returns {ok} */
        async function login(username, password) {
          var lower = username.toLowerCase();
          if (SHEET_API_URL) {
            var s = await api("login", username);
            if (!s.ok || !s.salt) return { ok: false, error: "wrong" };
            var r = await api("login", username, await sha256Hex(s.salt + password), s.salt);
            return r.ok ? { ok: true, username: r.username || username } : { ok: false, error: "wrong" };
          }
          var u = getUsers()[lower];
          if (!u || !u.salt || !u.hash) return { ok: false, error: "wrong" };
          var h = await sha256Hex(u.salt + password);
          return h === u.hash ? { ok: true, username: u.username || username } : { ok: false, error: "wrong" };
        }
        /* the first account to register takes over data saved before accounts existed */
        function claimLegacy(lower) {
          var old = sGet(KEY); if (old == null) return;
          try { if (sGet(dataKey(lower)) == null) sSet(dataKey(lower), JSON.stringify(norm(JSON.parse(old)))); } catch (e) {}
          sDel(KEY);
        }

        /* ---------- session + auth screen ---------- */
        var EYE_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
        var EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.8 0 3.3-.5 4.6-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
        document.querySelectorAll("[data-eye]").forEach(function (b) {
          b.innerHTML = EYE_ON;
          b.addEventListener("click", function () {
            var inp = $(b.dataset.eye), show = inp.type === "password";
            inp.type = show ? "text" : "password";
            b.innerHTML = show ? EYE_OFF : EYE_ON;
            b.setAttribute("aria-pressed", show);
            b.setAttribute("aria-label", show ? "Sembunyikan password" : "Tampilkan password");
            try { inp.focus({ preventScroll: true }); } catch (e) {}
          });
        });
        var USER_RE = /^[A-Za-z0-9_]{3,20}$/;
        function userFormatErr(u) {
          if (!u) return "Username wajib diisi";
          if (!/^[A-Za-z0-9_]*$/.test(u)) return "Cuma boleh huruf, angka, dan underscore";
          if (u.length < 3) return "Minimal 3 karakter";
          if (u.length > 20) return "Maksimal 20 karakter";
          return "";
        }
        function takenMsg(u) { return "Username @" + u + " udah dipakai, coba yang lain"; }
        function markInp(el, bad) {
          el.classList.toggle("is-invalid", !!bad);
          if (bad) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
        }
        function setUserMsg(msg, ok) {
          var m = $("rUserMsg");
          m.textContent = msg || ""; m.classList.toggle("is-ok", !!ok);
          $("rUserHint").hidden = !!msg;
          markInp($("rUser"), msg && !ok);
        }
        function clearAuthErrors() {
          ["lErr", "rErr", "rPassErr", "rPass2Err"].forEach(function (id) { $(id).textContent = ""; });
          setUserMsg("");
          ["lUser", "lPass", "rUser", "rPass", "rPass2"].forEach(function (id) { markInp($(id), false); });
        }
        function focusLater(el) { setTimeout(function () { try { el.focus({ preventScroll: true }); } catch (e) {} }, 60); }
        function showTab(name) {
          var masuk = name !== "daftar";
          $("tabMasuk").setAttribute("aria-selected", masuk);
          $("tabDaftar").setAttribute("aria-selected", !masuk);
          $("pMasuk").hidden = !masuk; $("pDaftar").hidden = masuk;
          clearAuthErrors();
          focusLater(masuk ? $("lUser") : $("rUser"));
        }
        document.querySelectorAll("[data-tab], [data-goto]").forEach(function (b) {
          b.addEventListener("click", function () { showTab(b.dataset.tab || b.dataset.goto); });
        });
        var pageEl = $("top");
        function showAuth(tab) {
          document.querySelectorAll(".x-overlay.is-open").forEach(function (ov) { ov.classList.remove("is-open"); ov.setAttribute("aria-hidden", "true"); });
          $("auth").hidden = false;
          pageEl.inert = true; pageEl.setAttribute("aria-hidden", "true");
          document.body.style.overflow = "hidden";
          ["lPass", "rPass", "rPass2"].forEach(function (id) { $(id).value = ""; $(id).type = "password"; });
          document.querySelectorAll("[data-eye]").forEach(function (b) { b.innerHTML = EYE_ON; b.setAttribute("aria-pressed", "false"); b.setAttribute("aria-label", "Tampilkan password"); });
          showTab(tab || "masuk");
        }
        function hideAuth() {
          $("auth").hidden = true;
          pageEl.inert = false; pageEl.removeAttribute("aria-hidden");
          document.body.style.overflow = "";
        }
        function startSession(username) {
          currentName = username; currentUser = username.toLowerCase();
          sSet(SESSION_KEY, JSON.stringify({ username: username, at: Date.now() }));
          S = load();
          F.cat = "all"; F.chain = "all"; F.q = ""; $("q").value = "";
          $("userName").textContent = "@" + username;
          $("userBox").hidden = false;
          ["lUser", "lPass", "rUser", "rPass", "rPass2"].forEach(function (id) { $(id).value = ""; });
          hideAuth();
          renderAll();
        }
        function endSession() {
          sDel(SESSION_KEY);
          currentUser = null; currentName = ""; S = blank();
          $("userBox").hidden = true;
          renderAll();
          showAuth("masuk");
        }
        $("logoutBtn").addEventListener("click", safe(function () {
          ask("Keluar dari akun?", "Kamu bakal keluar dari @" + currentName + ". Data kamu tetap tersimpan, tinggal masuk lagi.", "Keluar", function () {
            endSession(); toast("Sampai jumpa lagi 👋");
          });
        }));

        function setBusy(btn, busy, label) { btn.disabled = busy; btn.textContent = label; }

        /* live username check, debounced */
        var chkT = null, chkSeq = 0;
        $("rUser").addEventListener("input", function () {
          clearTimeout(chkT); chkSeq++;
          $("rErr").textContent = "";
          var u = $("rUser").value.trim();
          setUserMsg("");
          if (!u) return;
          var seq = chkSeq;
          chkT = setTimeout(function () {
            var fe = userFormatErr(u);
            if (fe) { setUserMsg(fe); return; }
            usernameAvailable(u).then(function (ok) {
              if (seq !== chkSeq) return;
              setUserMsg(ok ? "✓ @" + u + " tersedia" : takenMsg(u), ok);
            }, function () {});
          }, 400);
        });
        $("rPass").addEventListener("input", function () { $("rPassErr").textContent = ""; markInp($("rPass"), false); });
        $("rPass2").addEventListener("input", function () { $("rPass2Err").textContent = ""; markInp($("rPass2"), false); });
        ["lUser", "lPass"].forEach(function (id) {
          $(id).addEventListener("input", function () { $("lErr").textContent = ""; markInp($("lUser"), false); markInp($("lPass"), false); });
        });

        var authBusy = false;
        async function doRegister() {
          if (authBusy) return;
          clearTimeout(chkT); chkSeq++;
          $("rErr").textContent = ""; $("rPassErr").textContent = ""; $("rPass2Err").textContent = "";
          markInp($("rPass"), false); markInp($("rPass2"), false);
          var u = $("rUser").value.trim(), p = $("rPass").value, p2 = $("rPass2").value, first = null;
          var fe = userFormatErr(u);
          if (fe) { setUserMsg(fe); first = $("rUser"); } else setUserMsg("");
          if (p.length < 4) { $("rPassErr").textContent = "Password minimal 4 karakter"; markInp($("rPass"), true); first = first || $("rPass"); }
          else if (p !== p2) { $("rPass2Err").textContent = "Password nggak sama, cek lagi ya"; markInp($("rPass2"), true); first = first || $("rPass2"); }
          if (first) { focusLater(first); return; }
          authBusy = true; setBusy($("rSubmit"), true, "Mendaftar…");
          try {
            if (!(await usernameAvailable(u))) { setUserMsg(takenMsg(u)); focusLater($("rUser")); return; }
            var r = await register(u, p);
            if (!r.ok) {
              if (r.error === "taken") { setUserMsg(takenMsg(u)); focusLater($("rUser")); }
              else $("rErr").textContent = "⚠ " + r.error;
              return;
            }
            if (r.first) claimLegacy(r.username.toLowerCase());
            startSession(r.username);
            toast("Akun berhasil dibuat ✓");
          } catch (e) {
            try { console.error(e); } catch (x) {}
            $("rErr").textContent = "⚠ Gagal terhubung, coba lagi ya";
          } finally {
            authBusy = false; setBusy($("rSubmit"), false, "Daftar");
          }
        }
        async function doLogin() {
          if (authBusy) return;
          $("lErr").textContent = "";
          var u = $("lUser").value.trim(), p = $("lPass").value;
          if (!u || !p) {
            $("lErr").textContent = "Isi username dan password dulu ya";
            focusLater(!u ? $("lUser") : $("lPass")); return;
          }
          authBusy = true; setBusy($("lSubmit"), true, "Masuk…");
          try {
            var r = await login(u, p);
            if (!r.ok) {
              $("lErr").textContent = "Username atau password salah";
              markInp($("lUser"), true); markInp($("lPass"), true);
              focusLater($("lPass")); return;
            }
            startSession(r.username);
            toast("Hai, @" + r.username + " 👋");
          } catch (e) {
            try { console.error(e); } catch (x) {}
            $("lErr").textContent = "⚠ Gagal terhubung, coba lagi ya";
          } finally {
            authBusy = false; setBusy($("lSubmit"), false, "Masuk");
          }
        }
        $("lSubmit").addEventListener("click", function () { doLogin(); });
        $("rSubmit").addEventListener("click", function () { doRegister(); });
        ["lUser", "lPass"].forEach(function (id) {
          $(id).addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doLogin(); } });
        });
        ["rUser", "rPass", "rPass2"].forEach(function (id) {
          $(id).addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); doRegister(); } });
        });

        /* restore session */
        (function initAuth() {
          var sess = null;
          try { sess = JSON.parse(sGet(SESSION_KEY) || "null"); } catch (e) { sess = null; }
          var name = sess && typeof sess.username === "string" ? sess.username : "";
          if (name && USER_RE.test(name) && (SHEET_API_URL || has(getUsers(), name.toLowerCase()))) {
            startSession(name);
          } else {
            if (sess) sDel(SESSION_KEY);
            renderAll();
            showAuth("masuk");
          }
        })();
      })();
    
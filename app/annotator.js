// Annotator — ⌘-click (Ctrl-click on Windows) any button, card or section to attach
// a description. Saved notes render as callouts with an arrow pointing at the element.
// Notes can carry a custom number (e.g. "1", "2a", "Step 3") and can be connected
// card-to-card with arrows (Step 1 → Step 2 → …) to show a flow.
// Notes are stored per page in localStorage and can be exported / imported as JSON.
(() => {
  "use strict";
  if (window.__annotatorLoaded) return;
  window.__annotatorLoaded = true;

  const PAGE = decodeURIComponent(location.pathname.split("/").pop() || "page").replace(/\.dc\.html$|\.html?$/, "");
  const KEY = "annotator:" + PAGE;
  const ACCENT = "#2563eb";

  let notes = load();
  let visible = true;
  let editor = null;          // { el, note, box }
  let hoverEl = null;
  let modHeld = false;
  let linking = null;         // id of the note we're drawing a connection from

  const numOf = (note, i) => (note.num != null && String(note.num).trim() !== "" ? String(note.num).trim() : String(i + 1));

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch {}
    updateToolbar();
  }

  // ---------- element targeting ----------
  const isOurs = (el) => el && el.closest && el.closest("[data-annotator-ui]");
  const textOf = (el) => (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);

  function selectorFor(el) {
    const parts = [];
    while (el && el.nodeType === 1 && el !== document.documentElement) {
      if (el.id) { parts.unshift("#" + CSS.escape(el.id)); break; }
      const parent = el.parentElement;
      if (!parent) break;
      const idx = Array.prototype.indexOf.call(parent.children, el) + 1;
      parts.unshift(el.tagName.toLowerCase() + ":nth-child(" + idx + ")");
      el = parent;
    }
    return parts.join(" > ");
  }

  const cache = new Map();
  function resolve(note) {
    const hit = cache.get(note.id);
    if (hit && hit.isConnected && hit.tagName.toLowerCase() === note.tag && textOf(hit) === note.text) return hit;
    let el = null;
    try { el = document.querySelector(note.selector); } catch {}
    if (el && el.tagName.toLowerCase() === note.tag && (!note.text || textOf(el) === note.text)) {
      cache.set(note.id, el); return el;
    }
    // Fallback: same tag + same text anywhere on the page (React re-renders shift nth-child paths).
    if (note.text) {
      const all = document.getElementsByTagName(note.tag);
      for (let i = 0; i < all.length; i++) {
        if (!isOurs(all[i]) && textOf(all[i]) === note.text) { cache.set(note.id, all[i]); return all[i]; }
      }
    }
    cache.delete(note.id);
    return null;
  }

  // ---------- styles ----------
  const style = document.createElement("style");
  style.textContent = `
  [data-annotator-ui]{font-family:Inter,system-ui,-apple-system,sans-serif;font-size:13px;line-height:1.4;color:#0e0e10;box-sizing:border-box}
  [data-annotator-ui] *{box-sizing:border-box}
  .ann-layer{position:fixed;inset:0;pointer-events:none;z-index:2147483000}
  .ann-layer svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
  .ann-hl{position:fixed;pointer-events:none;z-index:2147483001;border:2px solid ${ACCENT};background:rgba(37,99,235,.08);border-radius:4px;transition:all .06s}
  .ann-ring{position:absolute;border:2px dashed ${ACCENT};border-radius:4px}
  .ann-card{position:absolute;pointer-events:auto;width:260px;min-width:140px;min-height:36px;max-width:70vw;max-height:70vh;background:#fff;border:1.5px solid ${ACCENT};border-radius:8px;
    padding:8px 10px;box-shadow:0 6px 20px rgba(20,20,40,.18);cursor:grab;white-space:pre-wrap;word-break:break-word;resize:both;overflow:auto}
  .ann-card:active{cursor:grabbing}
  .ann-num{float:left;margin:0 7px 0 -3px;min-width:17px;height:17px;padding:0 5px;border-radius:9px;background:${ACCENT};color:#fff;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;white-space:nowrap;cursor:text}
  .ann-card.ann-src{box-shadow:0 0 0 3px rgba(37,99,235,.35),0 6px 20px rgba(20,20,40,.18)}
  .ann-linking .ann-card:not(.ann-src){cursor:copy;outline:2px dashed ${ACCENT};outline-offset:3px}
  .ann-linking .ann-card:not(.ann-src):hover .ann-acts{display:none}
  .ann-link-hit{pointer-events:stroke;cursor:pointer}
  .ann-link-hit:hover + .ann-link{stroke:#e1251b}
  .ann-banner{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:2147483003;background:${ACCENT};color:#fff;border-radius:8px;padding:7px 12px;font-weight:600;box-shadow:0 4px 14px rgba(20,20,40,.2);display:none}
  .ann-card .ann-acts{display:none;position:absolute;top:4px;right:4px;gap:4px;background:#fff;padding:2px;border-radius:6px}
  .ann-card:hover .ann-acts{display:flex}
  .ann-acts button,.ann-editor button,.ann-bar button{border:1px solid #d8d8de;background:#fff;border-radius:5px;font:inherit;font-size:12px;cursor:pointer;padding:3px 8px;color:#0e0e10}
  .ann-acts button{padding:1px 6px;font-size:11px;box-shadow:0 1px 3px rgba(0,0,0,.12)}
  .ann-editor{position:fixed;z-index:2147483002;width:300px;height:190px;min-width:220px;min-height:150px;max-width:80vw;max-height:80vh;background:#fff;border:1.5px solid ${ACCENT};border-radius:10px;padding:10px;box-shadow:0 10px 30px rgba(20,20,40,.25);resize:both;overflow:auto;display:flex;flex-direction:column}
  .ann-editor .ann-head{flex:none;display:flex;align-items:center;gap:8px;margin-bottom:6px}
  .ann-editor .ann-head label{flex:none;font-size:11px;font-weight:600;color:#6b6b72;display:flex;align-items:center;gap:4px}
  .ann-editor .ann-numin{width:64px;border:1px solid #d8d8de;border-radius:5px;padding:2px 6px;font:inherit;font-size:12px;outline:none}
  .ann-editor .ann-numin:focus{border-color:${ACCENT}}
  .ann-editor .ann-target{flex:1;min-width:0;font-size:11px;color:#6b6b72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ann-editor textarea{flex:1;width:100%;min-height:60px;resize:none;border:1px solid #d8d8de;border-radius:6px;padding:7px;font:inherit;outline:none}
  .ann-editor textarea:focus{border-color:${ACCENT};box-shadow:0 0 0 3px rgba(37,99,235,.15)}
  .ann-editor .ann-row{flex:none;display:flex;gap:6px;margin-top:8px;align-items:center}
  .ann-editor .ann-row .ann-sp{flex:1;font-size:11px;color:#9a9aa1}
  .ann-editor .ann-primary,.ann-bar .ann-primary{background:${ACCENT};border-color:${ACCENT};color:#fff}
  .ann-editor .ann-danger{color:#e1251b}
  .ann-bar{position:fixed;left:14px;bottom:14px;z-index:2147483002;display:flex;gap:6px;align-items:center;background:#fff;border:1px solid #e5e5e9;border-radius:8px;padding:6px 8px;box-shadow:0 4px 14px rgba(20,20,40,.14)}
  .ann-bar .ann-lbl{font-weight:600;font-size:12px;padding:0 4px}
  .ann-bar .ann-hint{font-size:11px;color:#6b6b72;padding-right:4px}
  body.ann-picking, body.ann-picking *{cursor:crosshair !important}
  `;

  // ---------- DOM scaffolding ----------
  const layer = document.createElement("div");
  layer.className = "ann-layer"; layer.setAttribute("data-annotator-ui", "");
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.innerHTML = `<defs><marker id="ann-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${ACCENT}"/></marker></defs>`;
  layer.appendChild(svg);

  const hl = document.createElement("div");
  hl.className = "ann-hl"; hl.setAttribute("data-annotator-ui", ""); hl.style.display = "none";

  const bar = document.createElement("div");
  bar.className = "ann-bar"; bar.setAttribute("data-annotator-ui", "");
  const banner = document.createElement("div");
  banner.className = "ann-banner"; banner.setAttribute("data-annotator-ui", "");
  banner.textContent = "Click another note to connect it · click the same pair again to disconnect · Esc to cancel";
  bar.innerHTML = `<span class="ann-lbl">Notes <span data-count>0</span></span>
    <span class="ann-hint">${/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"}+click to add</span>
    <button data-act="toggle">Hide</button>
    <button data-act="chain" title="Connect notes in number order: 1 → 2 → 3 …">Connect in order</button>
    <button data-act="export">Export</button>
    <button data-act="import">Import</button>
    <button data-act="clear">Clear</button>
    <input type="file" accept="application/json" style="display:none">`;

  function mount() {
    document.head.appendChild(style);
    document.body.appendChild(layer);
    document.body.appendChild(hl);
    document.body.appendChild(bar);
    document.body.appendChild(banner);
    updateToolbar();
    requestAnimationFrame(tick);
  }

  function updateToolbar() {
    bar.querySelector("[data-count]").textContent = notes.length;
    bar.querySelector('[data-act="toggle"]').textContent = visible ? "Hide" : "Show";
  }

  bar.addEventListener("click", (e) => {
    const act = e.target.closest("button")?.dataset.act;
    if (act === "toggle") { visible = !visible; updateToolbar(); }
    if (act === "chain") chainInOrder();
    if (act === "export") {
      const blob = new Blob([JSON.stringify({ page: PAGE, notes }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = PAGE + " - notes.json"; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    if (act === "import") bar.querySelector("input").click();
    if (act === "clear" && notes.length && confirm("Delete all " + notes.length + " notes on this page?")) { notes = []; save(); }
  });
  bar.querySelector("input").addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const incoming = Array.isArray(data) ? data : data.notes;
      if (!Array.isArray(incoming)) throw new Error();
      const ids = new Set(notes.map((n) => n.id));
      notes = notes.concat(incoming.filter((n) => n && n.id && !ids.has(n.id)));
      save();
    } catch { alert("That file isn't a valid notes export."); }
    e.target.value = "";
  });

  // ---------- picking (⌘/Ctrl + click) ----------
  const isMod = (e) => e.metaKey || e.ctrlKey;

  function setPicking(on) {
    modHeld = on;
    document.body.classList.toggle("ann-picking", on && !editor);
    if (!on) { hl.style.display = "none"; hoverEl = null; }
  }
  window.addEventListener("keydown", (e) => {
    if (e.key === "Meta" || e.key === "Control") setPicking(true);
    if (e.key === "Escape" && editor) closeEditor();
    if (e.key === "Escape" && linking) setLinking(null);
  }, true);
  window.addEventListener("keyup", (e) => { if (e.key === "Meta" || e.key === "Control") setPicking(false); }, true);
  window.addEventListener("blur", () => setPicking(false));

  document.addEventListener("mousemove", (e) => {
    if (!isMod(e) || editor) { if (hoverEl) setPicking(false); return; }
    if (!modHeld) setPicking(true);
    const el = e.target;
    if (isOurs(el) || el === document.body || el === document.documentElement) { hl.style.display = "none"; hoverEl = null; return; }
    hoverEl = el;
    const r = el.getBoundingClientRect();
    Object.assign(hl.style, { display: "block", left: r.left - 2 + "px", top: r.top - 2 + "px", width: r.width + 4 + "px", height: r.height + 4 + "px" });
  }, true);

  // Swallow the whole click sequence so the underlying button/link doesn't fire.
  const swallow = (e) => {
    if (!isMod(e) || isOurs(e.target)) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  };
  ["pointerdown", "mousedown", "pointerup", "mouseup", "auxclick"].forEach((t) => document.addEventListener(t, swallow, true));
  document.addEventListener("click", (e) => {
    if (!isMod(e) || isOurs(e.target)) return;
    swallow(e);
    const el = e.target;
    if (el === document.body || el === document.documentElement) return;
    const existing = notes.find((n) => resolve(n) === el);
    openEditor(el, existing);
  }, true);

  // ---------- editor ----------
  function openEditor(el, note, focusNum) {
    closeEditor();
    setPicking(false);
    const box = document.createElement("div");
    box.className = "ann-editor"; box.setAttribute("data-annotator-ui", "");
    const label = el.tagName.toLowerCase() + (textOf(el) ? " · “" + textOf(el).slice(0, 40) + "”" : "");
    box.innerHTML = `<div class="ann-head"><label>No. <input class="ann-numin" maxlength="12"></label><div class="ann-target"></div></div>
      <textarea placeholder="Describe what this does…"></textarea>
      <div class="ann-row">
        ${note ? '<button class="ann-danger" data-act="del">Delete</button>' : ""}
        <span class="ann-sp">${/Mac/.test(navigator.platform) ? "⌘" : "Ctrl"}+Enter to save</span>
        <button data-act="cancel">Cancel</button>
        <button class="ann-primary" data-act="save">Save</button>
      </div>`;
    box.querySelector(".ann-target").textContent = label;
    const ta = box.querySelector("textarea");
    ta.value = note ? note.body : "";
    const numIn = box.querySelector(".ann-numin");
    numIn.placeholder = note ? String(notes.indexOf(note) + 1) : String(notes.length + 1);
    numIn.value = note && note.num != null ? note.num : "";
    numIn.title = "Leave blank to number automatically";
    document.body.appendChild(box);

    const r = el.getBoundingClientRect();
    const W = 300, H = box.offsetHeight;
    let left = r.right + 14, top = r.top;
    if (left + W > innerWidth - 8) left = r.left - W - 14;
    if (left < 8) { left = Math.max(8, Math.min(r.left, innerWidth - W - 8)); top = r.bottom + 10; }
    if (top + H > innerHeight - 8) top = Math.max(8, innerHeight - H - 8);
    Object.assign(box.style, { left: left + "px", top: Math.max(8, top) + "px" });

    editor = { el, note, box };
    const ring = document.createElement("div");
    ring.className = "ann-hl"; ring.setAttribute("data-annotator-ui", "");
    Object.assign(ring.style, { left: r.left - 2 + "px", top: r.top - 2 + "px", width: r.width + 4 + "px", height: r.height + 4 + "px" });
    document.body.appendChild(ring);
    editor.ring = ring;

    const commit = () => {
      const body = ta.value.trim();
      if (!body) { if (note) remove(note.id); closeEditor(); return; }
      const num = numIn.value.trim() || null;
      if (note) { note.body = body; note.num = num; }
      else {
        const n = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), selector: selectorFor(el),
          tag: el.tagName.toLowerCase(), text: textOf(el), body, num, links: [], dx: null, dy: null, created: new Date().toISOString() };
        notes.push(n); cache.set(n.id, el);
      }
      save(); visible = true; updateToolbar(); closeEditor();
    };
    box.addEventListener("click", (e) => {
      const act = e.target.closest("button")?.dataset.act;
      if (act === "save") commit();
      if (act === "cancel") closeEditor();
      if (act === "del") { remove(note.id); closeEditor(); }
    });
    [ta, numIn].forEach((f) => f.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey || f === numIn)) { e.preventDefault(); commit(); } }));
    setTimeout(() => (focusNum ? (numIn.focus(), numIn.select()) : ta.focus()), 0);
  }
  function closeEditor() {
    if (!editor) return;
    editor.box.remove(); editor.ring && editor.ring.remove();
    editor = null;
  }
  function remove(id) {
    notes = notes.filter((n) => n.id !== id);
    notes.forEach((n) => { if (n.links) n.links = n.links.filter((t) => t !== id); });
    cache.delete(id); if (linking === id) setLinking(null); save();
  }

  // ---------- connections between notes ----------
  function setLinking(id) {
    linking = id;
    document.body.classList.toggle("ann-linking", !!id);
    banner.style.display = id ? "block" : "none";
    for (const [nid, v] of cards) v.card.classList.toggle("ann-src", nid === id);
  }
  function toggleLink(fromId, toId) {
    const a = notes.find((n) => n.id === fromId), b = notes.find((n) => n.id === toId);
    if (!a || !b || a === b) return;
    a.links = a.links || []; b.links = b.links || [];
    if (a.links.includes(toId)) a.links = a.links.filter((t) => t !== toId);
    else if (b.links.includes(fromId)) b.links = b.links.filter((t) => t !== fromId);
    else a.links.push(toId);
    save();
  }
  // Connect every note to the next one by number: 1 → 2 → 3 … (numbers like "2a" or "Step 3" sort by their digits).
  function chainInOrder() {
    if (notes.length < 2) return;
    const key = (n, i) => { const m = numOf(n, i).match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : Infinity; };
    const sorted = notes.map((n, i) => ({ n, i, k: key(n, i) })).sort((a, b) => a.k - b.k || a.i - b.i).map((x) => x.n);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i], b = sorted[i + 1];
      a.links = a.links || [];
      if (!a.links.includes(b.id) && !(b.links || []).includes(a.id)) a.links.push(b.id);
    }
    save();
  }
  document.addEventListener("pointerdown", (e) => { if (linking && !e.target.closest(".ann-card")) setLinking(null); }, true);

  // ---------- rendering callouts + arrows ----------
  const cards = new Map(); // id -> { card, path, ring }
  let drag = null;

  function ensure(note, i) {
    let v = cards.get(note.id);
    if (!v) {
      const card = document.createElement("div");
      card.className = "ann-card";
      card.innerHTML = `<span class="ann-num"></span><span class="ann-body"></span>
        <span class="ann-acts"><button data-act="link" title="Connect this note to another one">Connect →</button><button data-act="edit">Edit</button><button data-act="del">✕</button></span>`;
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("fill", "none"); path.setAttribute("stroke", ACCENT); path.setAttribute("stroke-width", "2");
      path.setAttribute("marker-end", "url(#ann-arrow)");
      const ring = document.createElement("div"); ring.className = "ann-ring";
      svg.appendChild(path); layer.appendChild(ring); layer.appendChild(card);
      if (note.w) card.style.width = note.w + "px";
      if (note.h) card.style.height = note.h + "px";
      v = { card, path, ring };
      cards.set(note.id, v);

      // Persist manual box resizes (drag from the bottom-right corner) per note.
      if (window.ResizeObserver) {
        let saveTimer = null;
        new ResizeObserver(() => {
          const n = notes.find((x) => x.id === note.id); if (!n) return;
          n.w = card.offsetWidth; n.h = card.offsetHeight;
          clearTimeout(saveTimer); saveTimer = setTimeout(save, 250);
        }).observe(card);
      }

      card.addEventListener("click", (e) => {
        const act = e.target.closest("button")?.dataset.act;
        const n = notes.find((x) => x.id === note.id);
        if (!n) return;
        if (linking && !act) { if (linking !== n.id) toggleLink(linking, n.id); setLinking(null); return; }
        if (act === "link") { setLinking(linking === n.id ? null : n.id); return; }
        if (e.target.closest(".ann-num")) { const el = resolve(n); if (el) openEditor(el, n, true); return; }
        if (act === "del") remove(n.id);
        if (act === "edit") { const el = resolve(n); if (el) openEditor(el, n); }
      });
      card.addEventListener("dblclick", () => { const n = notes.find((x) => x.id === note.id); const el = n && resolve(n); if (el) openEditor(el, n); });
      card.addEventListener("pointerdown", (e) => {
        if (e.target.closest("button, .ann-num") || linking) return;
        // Bottom-right corner is the native resize handle — let the browser handle it, don't start a drag.
        const cr = card.getBoundingClientRect();
        if (e.clientX > cr.right - 16 && e.clientY > cr.bottom - 16) return;
        const n = notes.find((x) => x.id === note.id); const el = n && resolve(n); if (!el) return;
        const r = el.getBoundingClientRect();
        drag = { n, r, sx: e.clientX, sy: e.clientY, dx0: card.offsetLeft - r.right, dy0: card.offsetTop - r.top };
        card.setPointerCapture(e.pointerId); e.preventDefault();
      });
      card.addEventListener("pointermove", (e) => {
        if (!drag || drag.n.id !== note.id) return;
        drag.n.dx = drag.dx0 + e.clientX - drag.sx;
        drag.n.dy = drag.dy0 + e.clientY - drag.sy;
      });
      card.addEventListener("pointerup", () => { if (drag && drag.n.id === note.id) { drag = null; save(); } });
    }
    v.card.querySelector(".ann-num").textContent = numOf(note, i);
    v.card.querySelector(".ann-body").textContent = note.body;
    return v;
  }

  const links = new Map(); // "from>to" -> { hit, path }
  function edgePoint(b, tx, ty) {
    // Point where the line from b's centre toward (tx,ty) leaves box b.
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return [cx, cy];
    const s = Math.min(dx ? (b.w / 2) / Math.abs(dx) : Infinity, dy ? (b.h / 2) / Math.abs(dy) : Infinity);
    return [cx + dx * s, cy + dy * s];
  }

  function tick() {
    const live = new Set();
    const boxes = new Map();
    notes.forEach((note, i) => {
      live.add(note.id);
      const v = ensure(note, i);
      const el = visible ? resolve(note) : null;
      const r = el && el.getBoundingClientRect();
      const shown = r && (r.width || r.height) && r.bottom > -40 && r.top < innerHeight + 40;
      v.card.style.display = v.ring.style.display = shown ? "" : "none";
      v.path.style.display = shown ? "" : "none";
      if (!shown) return;

      Object.assign(v.ring.style, { left: r.left - 3 + "px", top: r.top - 3 + "px", width: r.width + 6 + "px", height: r.height + 6 + "px" });

      const cw = v.card.offsetWidth, ch = v.card.offsetHeight;
      let x, y;
      if (note.dx != null) { x = r.right + note.dx; y = r.top + note.dy; }
      else {
        // Default placement: to the right, else left, else below.
        x = r.right + 40; y = r.top - ch - 16;
        if (x + cw > innerWidth - 8) x = r.left - cw - 40;
        if (x < 8) { x = Math.min(Math.max(8, r.left), innerWidth - cw - 8); y = r.bottom + 30; }
        if (y < 8) y = r.bottom + 30;
      }
      v.card.style.left = x + "px"; v.card.style.top = y + "px";
      boxes.set(note.id, { x, y, w: cw, h: ch });

      // Arrow from nearest card edge to nearest point on the element's border.
      const cx = x + cw / 2, cy = y + ch / 2;
      const tx = Math.max(r.left, Math.min(cx, r.right)), ty = Math.max(r.top, Math.min(cy, r.bottom));
      const inside = cx > r.left && cx < r.right && cy > r.top && cy < r.bottom;
      const ex = inside ? r.left + r.width / 2 : tx, ey = inside ? r.top : ty;
      const sx = Math.max(x, Math.min(ex, x + cw)), sy = Math.max(y, Math.min(ey, y + ch));
      const mx = (sx + ex) / 2, my = (sy + ey) / 2 - 18;
      v.path.setAttribute("d", `M${sx},${sy} Q${mx},${my} ${ex},${ey}`);
      v.path.style.display = Math.hypot(ex - sx, ey - sy) < 6 ? "none" : "";
    });
    for (const [id, v] of cards) if (!live.has(id)) { v.card.remove(); v.path.remove(); v.ring.remove(); cards.delete(id); }

    // Card-to-card connectors (dashed arrows).
    const liveLinks = new Set();
    notes.forEach((a) => (a.links || []).forEach((toId) => {
      const k = a.id + ">" + toId; liveLinks.add(k);
      let l = links.get(k);
      if (!l) {
        const hit = document.createElementNS(svgNS, "path");
        hit.setAttribute("class", "ann-link-hit"); hit.setAttribute("fill", "none");
        hit.setAttribute("stroke", "transparent"); hit.setAttribute("stroke-width", "12");
        const t = document.createElementNS(svgNS, "title"); t.textContent = "Click to remove this connection"; hit.appendChild(t);
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("class", "ann-link"); path.setAttribute("fill", "none"); path.setAttribute("stroke", ACCENT);
        path.setAttribute("stroke-width", "2"); path.setAttribute("stroke-dasharray", "6 4"); path.setAttribute("marker-end", "url(#ann-arrow)");
        hit.addEventListener("click", () => {
          const from = notes.find((n) => n.id === a.id);
          if (from && confirm("Remove this connection?")) { from.links = (from.links || []).filter((x) => x !== toId); save(); }
        });
        svg.appendChild(hit); svg.appendChild(path);
        l = { hit, path }; links.set(k, l);
      }
      const A = boxes.get(a.id), B = boxes.get(toId);
      const on = A && B && cards.get(a.id).card.style.display !== "none" && cards.get(toId).card.style.display !== "none";
      l.hit.style.display = l.path.style.display = on ? "" : "none";
      if (!on) return;
      const [sx, sy] = edgePoint(A, B.x + B.w / 2, B.y + B.h / 2);
      const [ex, ey] = edgePoint(B, A.x + A.w / 2, A.y + A.h / 2);
      // Gentle bend perpendicular to the line so overlapping connectors stay readable.
      const len = Math.hypot(ex - sx, ey - sy) || 1, bend = Math.min(40, len * 0.15);
      const mx = (sx + ex) / 2 - ((ey - sy) / len) * bend, my = (sy + ey) / 2 + ((ex - sx) / len) * bend;
      const d = `M${sx},${sy} Q${mx},${my} ${ex},${ey}`;
      l.hit.setAttribute("d", d); l.path.setAttribute("d", d);
    }));
    for (const [k, l] of links) if (!liveLinks.has(k)) { l.hit.remove(); l.path.remove(); links.delete(k); }

    if (editor && editor.ring && editor.el.isConnected) {
      const r = editor.el.getBoundingClientRect();
      Object.assign(editor.ring.style, { left: r.left - 2 + "px", top: r.top - 2 + "px", width: r.width + 4 + "px", height: r.height + 4 + "px" });
    }
    requestAnimationFrame(tick);
  }

  // Keep notes in sync if another tab edits them.
  window.addEventListener("storage", (e) => { if (e.key === KEY) { notes = load(); updateToolbar(); } });

  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();

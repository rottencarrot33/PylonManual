(function () {
  "use strict";

  const root = document.getElementById("manuals");
  const input = document.getElementById("q");
  const clearBtn = document.getElementById("clear");
  const statusEl = document.getElementById("status");
  const emptyEl = document.getElementById("empty");
  const emptyQ = document.getElementById("empty-q");

  const sections = [...root.querySelectorAll("[data-manual]")];
  const cats = [...root.querySelectorAll("[data-cat]")];

  cats.forEach((cat, i) => {
    const panel = cat.querySelector(".acc-panel");
    panel.id = "panel-" + i;
    cat.querySelector(".acc-btn").setAttribute("aria-controls", panel.id);
  });

  function normChar(c) {
    let n = c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (n === "ς") n = "σ";
    return n.length === 1 ? n : c.toLowerCase().charAt(0) || c;
  }

  function norm(s) {
    let out = "";
    for (const c of s) out += normChar(c);
    return out;
  }

  function toTerms(query) {
    return norm(query)
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => (/^[α-ω]+$/.test(w) && w.length >= 5 ? w.replace(/[αεηιουωσ]{1,2}$/, "") : w));
  }

  function highlight(el, words) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      const text = node.nodeValue;
      const n = norm(text);
      const ranges = [];
      words.forEach((w) => {
        let from = 0;
        let pos;
        while ((pos = n.indexOf(w, from)) !== -1) {
          ranges.push([pos, pos + w.length]);
          from = pos + w.length;
        }
      });
      if (!ranges.length) return;

      ranges.sort((a, b) => a[0] - b[0]);
      const merged = [ranges[0]];
      for (const r of ranges.slice(1)) {
        const last = merged[merged.length - 1];
        if (r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
        else merged.push(r);
      }

      const frag = document.createDocumentFragment();
      let cur = 0;
      merged.forEach(([a, b]) => {
        if (a > cur) frag.append(text.slice(cur, a));
        const mark = document.createElement("mark");
        mark.textContent = text.slice(a, b);
        frag.append(mark);
        cur = b;
      });
      if (cur < text.length) frag.append(text.slice(cur));
      node.replaceWith(frag);
    });
  }

  const visibleCats = (section) => [...section.querySelectorAll("[data-cat]")].filter((c) => !c.hidden);

  function setOpen(cat, open) {
    cat.classList.toggle("open", open);
    cat.querySelector(".acc-btn").setAttribute("aria-expanded", String(open));
    cat.querySelector(".acc-panel").inert = !open;
  }

  function refreshLabels() {
    sections.forEach((section) => {
      const list = visibleCats(section);
      const allOpen = list.length > 0 && list.every((c) => c.classList.contains("open"));
      section.querySelector("[data-toggle-all]").textContent = allOpen ? "Κλείσιμο όλων" : "Άνοιγμα όλων";
    });
  }

  const tasks = [...root.querySelectorAll("[data-task]")].map((el) => ({
    el,
    html: el.innerHTML,
    text: norm(el.textContent.replace(/\s+/g, " "))
  }));
  const defaultStatus = '';

  function updateCounts(openMatches) {
    cats.forEach((cat) => {
      const visible = cat.querySelectorAll("[data-task]:not([hidden])").length;
      cat.hidden = visible === 0;
      cat.querySelector("[data-count]").textContent = visible;
      setOpen(cat, openMatches && visible > 0);
    });
    sections.forEach((s) => {
      s.hidden = !s.querySelector("[data-cat]:not([hidden])");
    });
    refreshLabels();
  }

  function run() {
    const raw = input.value.trim();
    clearBtn.hidden = !raw;
    tasks.forEach((t) => {
      t.el.innerHTML = t.html;
      t.el.hidden = false;
    });

    if (!raw) {
      updateCounts(false);
      statusEl.textContent = defaultStatus;
      emptyEl.hidden = true;
      return;
    }

    const words = toTerms(raw);
    let hits = 0;
    tasks.forEach((t) => {
      const ok = words.every((w) => t.text.includes(w));
      t.el.hidden = !ok;
      if (ok) {
        hits++;
        highlight(t.el, words);
      }
    });

    updateCounts(true);
    statusEl.textContent = hits ? `${hits} ${hits === 1 ? "αποτέλεσμα" : "αποτελέσματα"} για «${raw}»` : "";
    emptyEl.hidden = hits > 0;
    if (!hits) emptyQ.textContent = `«${raw}»`;
  }

  root.addEventListener("click", (e) => {
    const btn = e.target.closest(".acc-btn");
    if (btn) {
      const cat = btn.closest("[data-cat]");
      setOpen(cat, !cat.classList.contains("open"));
      refreshLabels();
      return;
    }
    const all = e.target.closest("[data-toggle-all]");
    if (all) {
      const open = all.textContent.startsWith("Άνοιγμα");
      visibleCats(all.closest("[data-manual]")).forEach((c) => setOpen(c, open));
      refreshLabels();
    }
  });

  let timer;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(run, 120);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      input.value = "";
      run();
    }
  });
  clearBtn.addEventListener("click", () => {
    input.value = "";
    run();
    input.focus();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== input) {
      e.preventDefault();
      input.focus();
    }
  });

  const html = document.documentElement;
  html.classList.remove("dark");
  document.getElementById("theme").addEventListener("click", () => html.classList.toggle("dark"));

  const dialog = document.getElementById("shot-modal");
  const shotImg = document.getElementById("shot-img");
  const shotCap = document.getElementById("shot-cap");
  root.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-shot]");
    if (!btn) return;
    const img = btn.querySelector("img");
    shotImg.src = btn.dataset.shot;
    shotImg.alt = img ? img.alt : "";
    shotCap.textContent = btn.dataset.cap || "";
    dialog.showModal();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  const CRC = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });

  function crc32(bytes) {
    let c = 0xffffffff;
    for (const b of bytes) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function zipOne(name, data) {
    const nm = new TextEncoder().encode(name);
    const crc = crc32(data);
    const size = data.length;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, size, true);
    local.setUint32(22, size, true);
    local.setUint16(26, nm.length, true);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(8, 0x0800, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, size, true);
    central.setUint32(24, size, true);
    central.setUint16(28, nm.length, true);

    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, 1, true);
    end.setUint16(10, 1, true);
    end.setUint32(12, 46 + nm.length, true);
    end.setUint32(16, 30 + nm.length + size, true);

    return new Blob([local.buffer, nm, data, central.buffer, nm, end.buffer], { type: "application/zip" });
  }

  function browserSave(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const host = window.claude && window.claude.use ? window.claude.use("downloads").catch(() => null) : Promise.resolve(null);

  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-dl]");
    if (!btn) return;
    const msg = btn.parentNode.querySelector("[data-dl-msg]");
    msg.textContent = "";
    btn.disabled = true;
    try {
      const res = await fetch(btn.dataset.dl);
      if (!res.ok) throw new Error(String(res.status));
      const name = btn.dataset.name;
      const blob = zipOne(name, new Uint8Array(await res.arrayBuffer()));
      const filename = name.replace(/\.[^.]+$/, "") + ".zip";
      const dl = await host;
      if (dl) await dl.save({ filename, data: blob });
      else browserSave(filename, blob);
      msg.textContent = "Το αρχείο αποθηκεύτηκε.";
    } catch (err) {
      if (!(err && err.code === "declined")) msg.textContent = "Η λήψη δεν ολοκληρώθηκε.";
    } finally {
      btn.disabled = false;
    }
  });

  updateCounts(false);
  statusEl.textContent = defaultStatus;

  const hashId = decodeURIComponent(location.hash.slice(1));
  const target = hashId && document.getElementById(hashId);
  if (target && target.hasAttribute("data-cat")) {
    setOpen(target, true);
    refreshLabels();
    target.scrollIntoView();
  }
})();

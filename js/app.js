(function () {
  "use strict";
  var MANUALS = window.MANUALS || [];
  var root = document.getElementById("manuals");
  var input = document.getElementById("q");
  var clearBtn = document.getElementById("clear");
  var statusEl = document.getElementById("status");
  var emptyEl = document.getElementById("empty");

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function fmt(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<span class="ui">$1</span>')
      .replace(/›/g, '<span class="arrow" aria-hidden="true">›</span>');
  }
  function normChar(c) {
    var n = c.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (n === "ς") n = "σ";
    return n.length === 1 ? n : c.toLowerCase().charAt(0) || c;
  }
  function norm(s) {
    var out = "";
    for (var i = 0; i < s.length; i++) out += normChar(s[i]);
    return out;
  }
  function plain(s) { return s.replace(/\*\*/g, ""); }

  function stepHtml(step) {
    if (Array.isArray(step)) {
      return "<li>" + fmt(step[0]) + "<ul>" +
        step[1].map(function (x) { return "<li>" + fmt(x) + "</li>"; }).join("") +
        "</ul></li>";
    }
    return "<li>" + fmt(step) + "</li>";
  }
  function taskText(it) {
    var parts = [it.t, it.w || "", it.n || "", it.r || "", it.x || ""];
    (it.img || []).forEach(function (im) { parts.push(im[1]); });
    it.s.forEach(function (st) {
      if (Array.isArray(st)) { parts.push(st[0]); parts = parts.concat(st[1]); }
      else parts.push(st);
    });
    return norm(plain(parts.join(" ")));
  }

  var html = "";
  MANUALS.forEach(function (m) {
    html += '<section class="manual" id="' + m.id + '" data-manual>' +
      '<div class="manual-head"><div><h2>' + esc(m.title) + "</h2><p>" + esc(m.sub) + "</p></div>" +
      '<button type="button" class="toggle-all" data-toggle-all="' + m.id + '">Άνοιγμα όλων</button></div>' +
      '<div class="accordion" id="acc-' + m.id + '">';
    m.cats.forEach(function (c) {
      var cid = m.id + "-" + c.id;
      html += '<div class="accordion-item" data-cat id="' + c.id + '">' +
        '<h3 class="accordion-header m-0">' +
        '<button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#c-' + cid +
        '" aria-expanded="false" aria-controls="c-' + cid + '">' +
        '<span class="ttl">' + esc(c.title) + '</span><span class="count" data-count>' + c.items.length + "</span></button></h3>" +
        '<div id="c-' + cid + '" class="accordion-collapse collapse"><div class="accordion-body">' +
        (c.intro ? '<p class="cat-intro">' + fmt(c.intro) + "</p>" : "") +
        '<div class="tasks">';
      c.items.forEach(function (it) {
        html += '<article class="task" data-task>' +
          "<h3>" + fmt(it.t) + "</h3>" +
          (it.w ? '<p class="when">' + fmt(it.w) + "</p>" : "") +
          '<ol class="steps">' + it.s.map(stepHtml).join("") + "</ol>" +
          (it.n ? '<p class="note"><b>Προσοχή:</b> ' + fmt(it.n) + "</p>" : "") +
          (it.r ? '<p class="result"><b>Αποτέλεσμα:</b> ' + fmt(it.r) + "</p>" : "") +
          (it.x ? '<p class="extra">' + fmt(it.x) + "</p>" : "") +
          (it.img ? '<div class="shots">' + it.img.map(function (im) {
            var cap = im[1] || "";
            var alt = cap || plain(it.t);
            return '<figure class="shot"><button type="button" class="shot-btn" data-src="' + esc(im[0]) +
              '" data-cap="' + esc(cap) + '" data-alt="' + esc(alt) + '" aria-label="Μεγέθυνση εικόνας"><img src="' + esc(im[0]) +
              '" alt="' + esc(alt) + '" loading="lazy" decoding="async"></button>' +
              (cap ? "<figcaption>" + esc(cap) + "</figcaption>" : "") + "</figure>";
          }).join("") + "</div>" : "") +
          "</article>";
      });
      html += "</div></div></div></div>";
    });
    html += "</div></section>";
  });
  root.innerHTML = html;

  var tasks = [];
  var i = 0;
  MANUALS.forEach(function (m) {
    m.cats.forEach(function (c) {
      c.items.forEach(function (it) {
        var el = root.querySelectorAll("[data-task]")[i++];
        tasks.push({ el: el, text: taskText(it), html: el.innerHTML });
      });
    });
  });

  function setOpen(item, open) {
    var btn = item.querySelector(".accordion-button");
    var body = item.querySelector(".accordion-collapse");
    body.classList.toggle("show", open);
    btn.classList.toggle("collapsed", !open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function refreshToggleLabels() {
    root.querySelectorAll("[data-manual]").forEach(function (sec) {
      var items = Array.prototype.filter.call(sec.querySelectorAll("[data-cat]"), function (x) {
        return !x.classList.contains("cat-hidden");
      });
      var allOpen = items.length && items.every(function (x) {
        return x.querySelector(".accordion-collapse").classList.contains("show");
      });
      sec.querySelector("[data-toggle-all]").textContent = allOpen ? "Κλείσιμο όλων" : "Άνοιγμα όλων";
    });
  }
  root.addEventListener("click", function (e) {
    var t = e.target.closest("[data-toggle-all]");
    if (!t) return;
    var sec = document.getElementById(t.getAttribute("data-toggle-all"));
    var open = t.textContent.indexOf("Άνοιγμα") === 0;
    sec.querySelectorAll("[data-cat]").forEach(function (item) {
      if (!item.classList.contains("cat-hidden")) setOpen(item, open);
    });
    refreshToggleLabels();
  });
  root.addEventListener("shown.bs.collapse", refreshToggleLabels);
  root.addEventListener("hidden.bs.collapse", refreshToggleLabels);

  function highlight(el, terms) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var text = node.nodeValue;
      var n = norm(text);
      var ranges = [];
      terms.forEach(function (term) {
        var from = 0, pos;
        while ((pos = n.indexOf(term, from)) !== -1) {
          ranges.push([pos, pos + term.length]);
          from = pos + term.length;
        }
      });
      if (!ranges.length) return;
      ranges.sort(function (a, b) { return a[0] - b[0]; });
      var merged = [ranges[0]];
      for (var k = 1; k < ranges.length; k++) {
        var last = merged[merged.length - 1];
        if (ranges[k][0] <= last[1]) last[1] = Math.max(last[1], ranges[k][1]);
        else merged.push(ranges[k]);
      }
      var frag = document.createDocumentFragment();
      var cur = 0;
      merged.forEach(function (r) {
        if (r[0] > cur) frag.appendChild(document.createTextNode(text.slice(cur, r[0])));
        var mk = document.createElement("mark");
        mk.textContent = text.slice(r[0], r[1]);
        frag.appendChild(mk);
        cur = r[1];
      });
      if (cur < text.length) frag.appendChild(document.createTextNode(text.slice(cur)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  var total = tasks.length;
  function defaultView() {
    root.querySelectorAll("[data-cat]").forEach(function (item, idx) {
      item.classList.remove("cat-hidden");
      setOpen(item, false);
      var n = item.querySelectorAll("[data-task]").length;
      item.querySelector("[data-count]").textContent = n;
    });
    root.querySelectorAll("[data-manual]").forEach(function (s) { s.hidden = false; });
    statusEl.textContent = total + " οδηγίες σε " + root.querySelectorAll("[data-cat]").length + " κατηγορίες";
    emptyEl.hidden = true;
    refreshToggleLabels();
  }

  function run() {
    var raw = input.value.trim();
    clearBtn.hidden = !raw;
    tasks.forEach(function (t) { t.el.innerHTML = t.html; t.el.hidden = false; });
    if (!raw) { defaultView(); return; }

    var terms = norm(raw).split(/\s+/).filter(Boolean).map(function (w) {
      if (/^[α-ω]+$/.test(w) && w.length >= 5) w = w.replace(/[αεηιουωσ]{1,2}$/, "");
      return w;
    });
    var hits = 0;
    tasks.forEach(function (t) {
      var ok = terms.every(function (term) { return t.text.indexOf(term) !== -1; });
      t.el.hidden = !ok;
      if (ok) { hits++; highlight(t.el, terms); }
    });
    root.querySelectorAll("[data-cat]").forEach(function (item) {
      var visible = item.querySelectorAll("[data-task]:not([hidden])").length;
      item.classList.toggle("cat-hidden", visible === 0);
      item.querySelector("[data-count]").textContent = visible;
      setOpen(item, visible > 0);
    });
    root.querySelectorAll("[data-manual]").forEach(function (s) {
      s.hidden = !s.querySelector("[data-cat]:not(.cat-hidden)");
    });
    statusEl.textContent = hits
      ? hits + (hits === 1 ? " αποτέλεσμα" : " αποτελέσματα") + " για «" + raw + "»"
      : "";
    emptyEl.hidden = hits > 0;
    if (!hits) document.getElementById("empty-q").textContent = "«" + raw + "»";
    refreshToggleLabels();
  }

  var timer;
  input.addEventListener("input", function () {
    clearTimeout(timer);
    timer = setTimeout(run, 120);
  });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { input.value = ""; run(); }
  });
  clearBtn.addEventListener("click", function () { input.value = ""; run(); input.focus(); });
  document.querySelectorAll("[data-q]").forEach(function (b) {
    b.addEventListener("click", function () { input.value = b.getAttribute("data-q"); run(); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== input) { e.preventDefault(); input.focus(); }
  });


  var docEl = document.documentElement;
  docEl.classList.remove("mode-dark");
  document.getElementById("theme").addEventListener("click", function () {
    docEl.classList.toggle("mode-dark");
  });


  var modalEl = document.getElementById("shot-modal");
  var modal = modalEl && window.bootstrap ? new bootstrap.Modal(modalEl) : null;
  root.addEventListener("click", function (e) {
    var b = e.target.closest(".shot-btn");
    if (!b || !modal) return;
    var img = document.getElementById("shot-img");
    img.src = b.getAttribute("data-src");
    img.alt = b.getAttribute("data-alt");
    document.getElementById("shot-cap").textContent = b.getAttribute("data-cap");
    modal.show();
  });

  defaultView();

  var h = (location.hash || "").slice(1);
  if (h) {
    var target = document.getElementById(h);
    if (target && target.hasAttribute("data-cat")) {
      setOpen(target, true);
      refreshToggleLabels();
      target.scrollIntoView();
    }
  }
})();

/* app.js — Main site logic (load items from Firestore, render, search, filter) */
(function () {
  "use strict";

  var state = { cat: "All", q: "", items: [], categories: [] };

  /* ---------- helpers ---------- */
  function fmtNum(n) { return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".0", "") + "k" : String(n); }
  function fmtDate(s) {
    var d = new Date(s + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- thumbnails ---------- */
  function art(cat) {
    var s = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
    var faint = 'fill="currentColor" fill-opacity=".14" stroke="none"';
    if (cat === "Python scripts") {
      return '<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="8" y="8" width="144" height="94" rx="10" ' + s + '/><path d="M8 28h144" ' + s + '/>' +
        '<circle cx="20" cy="18" r="2.5" fill="currentColor"/><circle cx="30" cy="18" r="2.5" fill="currentColor"/><circle cx="40" cy="18" r="2.5" fill="currentColor"/>' +
        '<path d="M24 46l10 8-10 8" ' + s + '/><path d="M44 64h30M44 78h52M24 78h8" ' + s + '/></svg>';
    }
    if (cat === "Flutter templates") {
      return '<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="52" y="4" width="56" height="102" rx="12" ' + s + '/><rect x="60" y="14" width="40" height="26" rx="5" ' + faint + '/>' +
        '<path d="M60 52h40M60 62h28" ' + s + '/><rect x="60" y="76" width="40" height="14" rx="7" ' + faint + '/><path d="M72 98h16" ' + s + '/></svg>';
    }
    if (cat === "HTML templates") {
      return '<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="8" y="8" width="144" height="94" rx="10" ' + s + '/><path d="M8 28h144" ' + s + '/>' +
        '<rect x="18" y="38" width="124" height="26" rx="5" ' + faint + '/><rect x="18" y="72" width="38" height="20" rx="5" ' + s + '/><rect x="61" y="72" width="38" height="20" rx="5" ' + s + '/><rect x="104" y="72" width="38" height="20" rx="5" ' + s + '/></svg>';
    }
    if (cat === "Telegram bots") {
      return '<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="12" y="10" width="86" height="34" rx="12" ' + faint + '/><path d="M26 22h42M26 32h26" ' + s + '/>' +
        '<rect x="62" y="56" width="86" height="34" rx="12" ' + s + '/><path d="M76 68h42M76 78h26" ' + s + '/></svg>';
    }
    return '<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="10" y="38" width="36" height="34" rx="8" ' + s + '/><rect x="62" y="10" width="36" height="34" rx="8" ' + faint + '/><rect x="62" y="66" width="36" height="34" rx="8" ' + s + '/><rect x="114" y="38" width="36" height="34" rx="8" ' + s + '/>' +
      '<path d="M46 55h8l8-28M46 55h8l8 28M98 27h8l8 28M98 83h8l8-28" ' + s + '/></svg>';
  }

  var ICON_DL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg>';
  var ICON_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>';

  /* ---------- load from Firestore ---------- */
  function loadCategories(callback) {
    db.collection("categories").get().then(function (snap) {
      var cats = [];
      snap.forEach(function (doc) {
        var d = doc.data();
        cats.push({ id: doc.id, name: d.name || "", hue: d.hue || 220 });
      });
      cats.sort(function (a, b) { return a.name.localeCompare(b.name); });
      callback(cats);
    }).catch(function () { callback([]); });
  }

  function loadItems(callback) {
    db.collection("items")
      .where("status", "==", "published")
      .get()
      .then(function (snap) {
        var items = [];
        snap.forEach(function (doc) {
          var d = doc.data();
          items.push({
            id: doc.id,
            title: d.title || "",
            category: d.category || "",
            downloads: d.downloads || 0,
            date: d.date || "",
            image: d.image || "",
            link: d.link || "#",
            version: d.version || "",
            details: d.details || ""
          });
        });
        items.sort(function (a, b) { return b.date.localeCompare(a.date); });
        callback(items);
      })
      .catch(function (err) {
        console.error("Error loading items:", err);
        callback([]);
      });
  }

  /* ---------- render ---------- */
  function renderChips() {
    var counts = { All: state.items.length };
    state.items.forEach(function (i) { counts[i.category] = (counts[i.category] || 0) + 1; });
    var wrap = document.getElementById("chips");
    if (!wrap) return;
    var catNames = state.categories.map(function (c) { return c.name; });
    wrap.innerHTML = ["All"].concat(catNames).map(function (c) {
      return '<button class="chip" type="button" data-cat="' + esc(c) + '" aria-pressed="' + (state.cat === c) + '">' +
        esc(c) + ' <span class="n">' + (counts[c] || 0) + '</span></button>';
    }).join("");
  }

  function renderGrid() {
    var q = state.q.trim().toLowerCase();
    var list = state.items.filter(function (i) {
      return (state.cat === "All" || i.category === state.cat) &&
        (!q || (i.title + " " + i.category).toLowerCase().indexOf(q) !== -1);
    });

    var countEl = document.getElementById("count");
    var grid = document.getElementById("grid");
    if (!countEl || !grid) return;

    countEl.textContent = list.length + (list.length === 1 ? " result" : " results");

    if (!list.length) {
      grid.innerHTML = '<div class="empty"><b>No matches</b>Try a different keyword or pick another category.</div>';
      return;
    }
    grid.innerHTML = list.map(function (i) {
      var catObj = state.categories.find(function (c) { return c.name === i.category; });
      var hue = catObj ? catObj.hue : 220;
      var thumb = i.image ? '<img src="' + esc(i.image) + '" alt="" loading="lazy">' : art(i.category);
      return '<a class="card" href="' + esc(i.link) + '">' +
        '<div class="thumb" style="--h:' + hue + '">' + thumb + '<span class="free">Free</span></div>' +
        '<div class="body"><h2 class="title">' + esc(i.title) + '</h2>' +
        '<div class="meta"><span title="Downloads">' + ICON_DL + fmtNum(i.downloads) + '</span>' +
        '<span title="Date added">' + ICON_CAL + fmtDate(i.date) + '</span></div></div></a>';
    }).join("");
  }

  function renderStats() {
    var total = state.items.reduce(function (s, i) { return s + i.downloads; }, 0);
    var el1 = document.getElementById("statScripts");
    var el2 = document.getElementById("statDownloads");
    if (el1) el1.textContent = state.items.length;
    if (el2) el2.textContent = fmtNum(total);
  }

  /* ---------- events ---------- */
  var chipsEl = document.getElementById("chips");
  if (chipsEl) {
    chipsEl.addEventListener("click", function (e) {
      var b = e.target.closest(".chip");
      if (!b) return;
      state.cat = b.getAttribute("data-cat");
      renderChips();
      renderGrid();
    });
  }

  var qEl = document.getElementById("q");
  if (qEl) {
    qEl.addEventListener("input", function (e) {
      state.q = e.target.value;
      renderGrid();
    });
  }

  /* ---------- init ---------- */
  loadCategories(function (cats) {
    state.categories = cats;
    loadItems(function (items) {
      state.items = items;
      renderStats();
      renderChips();
      renderGrid();
    });
  });
})();

/* app.js — Main site logic */
(function () {
  "use strict";

  var state = { cat: "All", q: "", tag: "", sort: "newest", items: [], categories: [], allTags: [], currentItem: null, visibleCount: 19 };

  function fmtNum(n) { return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".0", "") + "k" : String(n); }
  function fmtDate(s) { var d = new Date(s + "T00:00:00"); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]; }); }

  function art(cat) {
    var s = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
    var faint = 'fill="currentColor" fill-opacity=".14" stroke="none"';
    if (cat === "Python scripts") return '<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="8" y="8" width="144" height="94" rx="10" '+s+'/><path d="M8 28h144" '+s+'/><circle cx="20" cy="18" r="2.5" fill="currentColor"/><circle cx="30" cy="18" r="2.5" fill="currentColor"/><circle cx="40" cy="18" r="2.5" fill="currentColor"/><path d="M24 46l10 8-10 8" '+s+'/><path d="M44 64h30M44 78h52M24 78h8" '+s+'/></svg>';
    if (cat === "Flutter templates") return '<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="52" y="4" width="56" height="102" rx="12" '+s+'/><rect x="60" y="14" width="40" height="26" rx="5" '+faint+'/><path d="M60 52h40M60 62h28" '+s+'/><rect x="60" y="76" width="40" height="14" rx="7" '+faint+'/><path d="M72 98h16" '+s+'/></svg>';
    if (cat === "HTML templates") return '<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="8" y="8" width="144" height="94" rx="10" '+s+'/><path d="M8 28h144" '+s+'/><rect x="18" y="38" width="124" height="26" rx="5" '+faint+'/><rect x="18" y="72" width="38" height="20" rx="5" '+s+'/><rect x="61" y="72" width="38" height="20" rx="5" '+s+'/><rect x="104" y="72" width="38" height="20" rx="5" '+s+'/></svg>';
    if (cat === "Telegram bots") return '<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="12" y="10" width="86" height="34" rx="12" '+faint+'/><path d="M26 22h42M26 32h26" '+s+'/><rect x="62" y="56" width="86" height="34" rx="12" '+s+'"/><path d="M76 68h42M76 78h26" '+s+'/></svg>';
    return '<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="10" y="38" width="36" height="34" rx="8" '+s+'"/><rect x="62" y="10" width="36" height="34" rx="8" '+faint+'"/><rect x="62" y="66" width="36" height="34" rx="8" '+s+'"/><rect x="114" y="38" width="36" height="34" rx="8" '+s+'"/><path d="M46 55h8l8-28M46 55h8l8 28M98 27h8l8 28M98 83h8l8-28" '+s+'/></svg>';
  }

  var ICON_DL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg>';
  var ICON_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>';

  /* ---------- load ---------- */
  function loadCategories(cb) {
    db.collection("categories").get().then(function (snap) {
      var cats = [];
      snap.forEach(function (doc) { var d = doc.data(); cats.push({ id: doc.id, name: d.name || "", hue: d.hue || 220 }); });
      cats.sort(function (a, b) { return a.name.localeCompare(b.name); });
      cb(cats);
    }).catch(function () { cb([]); });
  }

  function loadItems(cb) {
    db.collection("items").where("status", "==", "published").get().then(function (snap) {
      var items = [];
      snap.forEach(function (doc) {
        var d = doc.data();
        items.push({
          id: doc.id, title: d.title || "", category: d.category || "",
          downloads: d.downloads || 0, date: d.date || "", image: d.image || "",
          link: d.link || "#", version: d.version || "", details: d.details || "",
          author: d.author || "SHA REEQ", tags: d.tags || [],
          installation: d.installation !== false,
          youtube: d.youtube || ""
        });
      });
      cb(items);
    }).catch(function () { cb([]); });
  }

  /* ---------- tags helper ---------- */
  function collectTags(items) {
    var tagSet = {};
    items.forEach(function (i) { (i.tags || []).forEach(function (t) { tagSet[t] = true; }); });
    var tags = Object.keys(tagSet);
    tags.sort();
    return tags;
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

  function renderTagChips() {
    var wrap = document.getElementById("tagChips");
    if (!wrap) return;
    if (!state.allTags.length) { wrap.innerHTML = ""; return; }
    wrap.innerHTML = '<button class="chip" type="button" data-tag="All" aria-pressed="' + (state.tag === "" || state.tag === "All") + '">All Tags</button>' +
      state.allTags.map(function (t) {
        return '<button class="chip" type="button" data-tag="' + esc(t) + '" aria-pressed="' + (state.tag === t) + '">' + esc(t) + '</button>';
      }).join("");
  }

  function renderGrid() {
    var q = state.q.trim().toLowerCase();
    var list = state.items.filter(function (i) {
      if (state.cat !== "All" && i.category !== state.cat) return false;
      if (state.tag && state.tag !== "All" && (i.tags || []).indexOf(state.tag) === -1) return false;
      if (q) {
        var haystack = (i.title + " " + i.category + " " + i.details + " " + (i.tags || []).join(" ")).toLowerCase();
        if (haystack.indexOf(q) === -1) return false;
      }
      return true;
    });

    if (state.sort === "newest") list.sort(function (a, b) { return b.date.localeCompare(a.date); });
    else if (state.sort === "downloads") list.sort(function (a, b) { return b.downloads - a.downloads; });
    else if (state.sort === "alpha") list.sort(function (a, b) { return a.title.localeCompare(b.title); });

    var countEl = document.getElementById("count");
    var grid = document.getElementById("grid");
    if (!countEl || !grid) return;
    countEl.textContent = list.length + (list.length === 1 ? " result" : " results");
    if (!list.length) {
      grid.innerHTML = '<div class="empty"><b>No matches</b>Try a different keyword or pick another category.</div>';
      return;
    }
    var shown = list.slice(0, state.visibleCount);
    grid.innerHTML = shown.map(function (i) {
      var catObj = state.categories.find(function (c) { return c.name === i.category; });
      var hue = catObj ? catObj.hue : 220;
      var thumb = i.image ? '<img src="' + esc(i.image) + '" alt="" loading="lazy">' : art(i.category);
      var tagsHtml = (i.tags || []).slice(0, 3).map(function (t) {
        return '<span style="font-size:11px;color:var(--muted);margin-left:4px;">#' + esc(t) + '</span>';
      }).join("");
      return '<div class="card" data-id="' + esc(i.id) + '" role="button" tabindex="0">' +
        '<div class="thumb" style="--h:' + hue + '">' + thumb + '<span class="free">Free</span></div>' +
        '<div class="body"><h2 class="title">' + esc(i.title) + tagsHtml + '</h2>' +
        '<div class="meta"><span title="Downloads">' + ICON_DL + fmtNum(i.downloads) + '</span>' +
        '<span title="Date added">' + ICON_CAL + fmtDate(i.date) + '</span></div></div></div>';
    }).join("");
    if (list.length > state.visibleCount) {
      grid.innerHTML += '<div class="load-more-wrap"><button class="load-more-btn" id="loadMore">Load more (' + (list.length - state.visibleCount) + ' remaining)</button></div>';
    }
  }

  function renderStats() {
    var total = state.items.reduce(function (s, i) { return s + i.downloads; }, 0);
    var el1 = document.getElementById("statScripts");
    var el2 = document.getElementById("statDownloads");
    if (el1) el1.textContent = state.items.length;
    if (el2) el2.textContent = fmtNum(total);
  }

  /* ---------- download tracking ---------- */
  function trackDownload(itemId) {
    try {
      var key = "ddlist_dl_" + itemId;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "1");
        db.collection("items").doc(itemId).update({ downloads: firebase.firestore.FieldValue.increment(1) });
      }
    } catch (e) {}
  }

  /* ---------- detail modal ---------- */
  var detailBg = document.getElementById("detailBg");
  var detailClose = document.getElementById("detailClose");

  function openDetail(itemId) {
    var item = state.items.find(function (i) { return i.id === itemId; });
    if (!item) return;
    state.currentItem = item;

    var catObj = state.categories.find(function (c) { return c.name === item.category; });
    var hue = catObj ? catObj.hue : 220;

    var hero = document.getElementById("detailHero");
    hero.style.setProperty("--h", hue);
    var thumb = document.getElementById("heroThumb");
    thumb.innerHTML = item.image ? '<img src="' + esc(item.image) + '" alt="">' : art(item.category);

    var ytDiv = document.getElementById("heroYt");
    if (item.youtube) {
      var vid = "";
      var m = item.youtube.match(/(?:v=|youtu\.be\/|embed\/)([^&?#]+)/);
      if (m) vid = m[1];
      if (vid) {
        ytDiv.innerHTML = '<iframe src="https://www.youtube.com/embed/' + esc(vid) + '?rel=0" allowfullscreen title="Video preview"></iframe>';
        ytDiv.style.display = "";
      } else { ytDiv.style.display = "none"; ytDiv.innerHTML = ""; }
    } else { ytDiv.style.display = "none"; ytDiv.innerHTML = ""; }

    document.getElementById("detailCategory").textContent = item.category;
    document.getElementById("detailTitle").textContent = item.title;
    document.getElementById("detailMeta").innerHTML =
      '<span>' + ICON_CAL + ' Added ' + fmtDate(item.date) + '</span>' +
      '<span>' + ICON_DL + ' ' + fmtNum(item.downloads) + ' downloads</span>';

    var tagsContainer = document.getElementById("detailTags");
    tagsContainer.innerHTML = (item.tags || []).map(function (t) {
      return '<span class="detail-tag-item">#' + esc(t) + '</span>';
    }).join("");

    document.getElementById("detailDesc").innerHTML = "<p>" + esc(item.details || "No details provided.").replace(/\n/g, "</p><p>") + "</p>";
    document.getElementById("detailVersion").textContent = item.version || "\u2014";
    document.getElementById("detailDate").textContent = fmtDate(item.date);
    document.getElementById("detailDownloads").textContent = fmtNum(item.downloads);

    var dlBtn = document.getElementById("detailLink");
    dlBtn.href = item.link;
    dlBtn.setAttribute("data-install", item.installation ? "1" : "0");

    /* dev card - only show if installation enabled */
    var devCard = document.querySelector(".dev-card");
    if (devCard) devCard.style.display = item.installation !== false ? "" : "none";

    trackDownload(item.id);
    loadComments(item.id);

    document.getElementById("reportForm").classList.remove("open");
    document.getElementById("reportSuccess").classList.remove("show");

    detailBg.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeDetail() {
    detailBg.classList.remove("open");
    document.body.style.overflow = "";
    state.currentItem = null;
  }

  detailClose.addEventListener("click", closeDetail);
  detailBg.addEventListener("click", function (e) { if (e.target === detailBg) closeDetail(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeDetail(); closeInstall(); } });

  document.getElementById("grid").addEventListener("click", function (e) {
    var card = e.target.closest(".card");
    if (card) openDetail(card.dataset.id);
  });
  document.getElementById("grid").addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      var card = e.target.closest(".card");
      if (card) { e.preventDefault(); openDetail(card.dataset.id); }
    }
  });

  /* ---------- install popup ---------- */
  var installBg = document.getElementById("installBg");
  var installClose = document.getElementById("installClose");
  var installPhone = document.getElementById("installPhone");
  var installDlBtn = document.getElementById("installDlBtn");
  var installSkip = document.getElementById("installSkip");

  function openInstall() {
    installBg.classList.add("open");
    installPhone.value = "";
    installPhone.focus();
  }
  function closeInstall() {
    installBg.classList.remove("open");
  }

  installClose.addEventListener("click", closeInstall);
  installBg.addEventListener("click", function (e) { if (e.target === installBg) closeInstall(); });

  document.getElementById("detailLink").addEventListener("click", function (e) {
    e.preventDefault();
    var item = state.currentItem;
    if (!item) return;
    if (this.getAttribute("data-install") === "1") {
      openInstall();
    } else {
      window.open(item.link, "_blank");
    }
  });

  installDlBtn.addEventListener("click", function () {
    var item = state.currentItem;
    if (!item) return;
    var phone = installPhone.value.trim();
    if (phone) {
      db.collection("leads").add({
        itemId: item.id, itemTitle: item.title,
        phone: phone,
        date: new Date().toISOString().slice(0, 10),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(function () {});
    }
    closeInstall();
    window.open(item.link, "_blank");
  });

  installSkip.addEventListener("click", function () {
    var item = state.currentItem;
    if (!item) return;
    closeInstall();
    window.open(item.link, "_blank");
  });

  /* ---------- comments ---------- */
  function loadComments(itemId) {
    var list = document.getElementById("commentsList");
    var count = document.getElementById("commentCount");
    list.innerHTML = '<p class="comment-empty">Loading...</p>';
    db.collection("comments").where("itemId", "==", itemId).get().then(function (snap) {
      var comments = [];
      snap.forEach(function (doc) { var d = doc.data(); if (!d.blocked) comments.push(d); });
      comments.sort(function (a, b) { return (b.date || "") > (a.date || "") ? 1 : -1; });
      count.textContent = comments.length;
      if (!comments.length) { list.innerHTML = '<p class="comment-empty">No comments yet. Be the first!</p>'; return; }
      list.innerHTML = comments.map(function (c) {
        var name = c.user || "Anonymous";
        var initials = name.split(" ").map(function (w) { return w.charAt(0); }).join("").toUpperCase().slice(0, 2);
        var hue = 0;
        for (var j = 0; j < name.length; j++) hue = (hue * 31 + name.charCodeAt(j)) % 360;
        var bg = "hsl(" + hue + " 45% 45%)";
        return '<div class="comment-item"><div class="comment-head"><div class="comment-avatar" style="background:' + bg + '">' + esc(initials) + '</div><div class="comment-info"><span class="comment-user">' + esc(name) + '</span></div><span class="comment-date">' + fmtDate(c.date) + '</span></div><div class="comment-text">' + esc(c.text || "") + '</div></div>';
      }).join("");
    }).catch(function () { list.innerHTML = '<p class="comment-empty">No comments yet.</p>'; count.textContent = "0"; });
  }

  document.getElementById("commentForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!state.currentItem) return;
    var name = document.getElementById("commentName").value.trim();
    var text = document.getElementById("commentText").value.trim();
    if (!name || !text) return;
    db.collection("comments").add({
      itemId: state.currentItem.id, itemTitle: state.currentItem.title,
      user: name, text: text,
      date: new Date().toISOString().slice(0, 10),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () { document.getElementById("commentText").value = ""; loadComments(state.currentItem.id); })
      .catch(function (err) { alert("Error: " + err.message); });
  });

  /* ---------- report ---------- */
  document.getElementById("reportBtn").addEventListener("click", function () {
    document.getElementById("reportForm").classList.toggle("open");
  });
  document.getElementById("submitReport").addEventListener("click", function () {
    if (!state.currentItem) return;
    var reason = document.getElementById("reportReason").value;
    var email = document.getElementById("reportEmail").value.trim();
    var details = document.getElementById("reportDetails").value.trim();
    db.collection("reports").add({
      itemId: state.currentItem.id, itemTitle: state.currentItem.title,
      reason: reason, email: email, details: details, user: "Visitor",
      status: "open",
      date: new Date().toISOString().slice(0, 10),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      document.getElementById("reportSuccess").classList.add("show");
      document.getElementById("reportForm").classList.remove("open");
    }).catch(function (err) { alert("Error: " + err.message); });
  });

  /* ---------- events ---------- */
  document.getElementById("chips").addEventListener("click", function (e) {
    var b = e.target.closest(".chip");
    if (!b) return;
    state.cat = b.getAttribute("data-cat");
    state.visibleCount = 19;
    renderChips(); renderGrid();
  });

  document.getElementById("tagChips").addEventListener("click", function (e) {
    var b = e.target.closest(".chip");
    if (!b) return;
    state.tag = b.getAttribute("data-tag");
    state.visibleCount = 19;
    renderTagChips(); renderGrid();
  });

  document.getElementById("q").addEventListener("input", function (e) {
    state.q = e.target.value; state.visibleCount = 19; renderGrid();
  });

  document.getElementById("sortSelect").addEventListener("change", function (e) {
    state.sort = e.target.value; state.visibleCount = 19; renderGrid();
  });

  document.getElementById("grid").addEventListener("click", function (e) {
    var loadBtn = e.target.closest(".load-more-btn");
    if (loadBtn) { state.visibleCount += 19; renderGrid(); return; }
  });

  /* ---------- init ---------- */
  loadCategories(function (cats) {
    state.categories = cats;
    loadItems(function (items) {
      state.items = items;
      state.allTags = collectTags(items);
      renderStats(); renderChips(); renderTagChips(); renderGrid();
    });
  });
})();

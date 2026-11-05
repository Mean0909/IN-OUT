/**
 * app.js
 * ------------------------------------------------------------------
 * SISD-IN Document Management System — application logic.
 *
 * Everything here is plain, vanilla JavaScript. No build step,
 * no framework, no network calls. Application data is stored in IndexedDB,
 * with automatic one-time migration from legacy LocalStorage.
 * ------------------------------------------------------------------
 */

"use strict";

/* ============================================================
   1. STATE & CONSTANTS
   ============================================================ */

const STORAGE_KEY = "sisd_in_documents";

/** In-memory copy of every document, loaded from IndexedDB. */
let documents = [];

/** UI state for the documents table. */
const tableState = {
  searchTerm: "",
  filters: { dateFrom: "", dateTo: "", company: "", status: "", receivedBy: "" },
  sortKey: "dateIn",
  sortDir: "desc",
  page: 1,
  perPage: 20,
};

let editingId = null;          // id of the document currently being edited, or null when adding
let pendingDeleteId = null;    // id awaiting delete confirmation
let importRows = [];           // parsed rows staged for import
let selectedAttachmentName = ""; // name of the file chosen in the Add/Edit form
let selectedAttachmentData = ""; // data URL of the selected file
let selectedAttachmentType = ""; // MIME type of the selected file

/* ============================================================
   2. STORAGE HELPERS
   ============================================================ */

const IDB_NAME = "SISD_IN_Database";
const IDB_STORE = "appData";
const LEGACY_KEYS = [STORAGE_KEY, "sisd_company_information", "sisd_to_ddg_documents", "sisd_document_subjects"];
let sisdDb = null;
const storageCache = new Map();

function openSisdDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("IndexedDB is not supported"));
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open IndexedDB"));
  });
}

function idbGetAll() {
  return new Promise((resolve, reject) => {
    const tx = sisdDb.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function storageSet(key, value) {
  storageCache.set(key, value);
  if (!sisdDb) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error(e); } return; }
  try {
    const tx = sisdDb.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put({ key, value });
    tx.onerror = () => showToast("មិនអាចរក្សាទុកទិន្នន័យបានទេ។ សូម Backup ទិន្នន័យ។", "error");
  } catch (e) { console.error("IndexedDB save failed", e); showToast("មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ។", "error"); }
}

function storageGet(key, fallback = null) { return storageCache.has(key) ? storageCache.get(key) : fallback; }

async function initializeStorage() {
  try {
    sisdDb = await openSisdDatabase();
    const records = await idbGetAll();
    records.forEach(record => storageCache.set(record.key, record.value));
    // One-time migration: copy existing LocalStorage data without deleting the originals.
    for (const key of LEGACY_KEYS) {
      if (!storageCache.has(key)) {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          try { const value = JSON.parse(raw); storageCache.set(key, value); storageSet(key, value); }
          catch (e) { console.warn("Skipping invalid legacy value:", key, e); }
        }
      }
    }
    return "indexeddb";
  } catch (e) {
    console.warn("IndexedDB unavailable; using LocalStorage fallback.", e);
    sisdDb = null;
    for (const key of LEGACY_KEYS) {
      try { const raw = localStorage.getItem(key); if (raw !== null) storageCache.set(key, JSON.parse(raw)); } catch (_) {}
    }
    return "localstorage";
  }
}

function loadDocuments() {
  const saved = storageGet(STORAGE_KEY);
  if (Array.isArray(saved)) { documents = saved; return; }
  // First run only: seed demo data if no existing database is present.
  documents = JSON.parse(JSON.stringify(SISD_SAMPLE_DATA));
  saveDocuments();
}

function saveDocuments() { storageSet(STORAGE_KEY, documents); }

/* ============================================================
   3. SMALL UTILITIES
   ============================================================ */

function pad2(n) { return String(n).padStart(2, "0"); }

function generateId() {
  const n = documents.length ? Math.max(...documents.map((d) => parseInt(d.id.replace(/\D/g, ""), 10) || 0)) + 1 : 1;
  return "SISD-" + String(n).padStart(6, "0");
}

/**
 * Year-based running number. Starts at 0001 for each new calendar year.
 * Existing records are filtered by their incoming date, so previous years
 * do not affect the current year's sequence.
 */
function generateDocumentNo(dateInputValue = todayInputDate()) {
  const targetYear = String(dateInputValue || todayInputDate()).slice(0, 4);
  const max = documents.reduce((m, d) => {
    const recordYear = parseDateKey(d.dateIn).slice(0, 4);
    if (recordYear !== targetYear) return m;
    const n = parseInt(String(d.documentNo || "").replace(/\D/g, ""), 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return String(max + 1).padStart(4, "0");
}

/** "2026-09-16" (HTML date input) -> "16/09/2026" (storage format) */
function toStorageDate(inputDateValue) {
  if (!inputDateValue) return "";
  const [y, m, d] = inputDateValue.split("-");
  return `${d}/${m}/${y}`;
}

/** "16/09/2026" (storage format) -> "2026-09-16" (HTML date input) */
function toInputDate(storageDateValue) {
  if (!storageDateValue) return "";
  const [d, m, y] = storageDateValue.split("/");
  if (!d || !m || !y) return "";
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Parse "16/09/2026" into a real Date object for comparisons/sorting. */
function parseStorageDate(storageDateValue) {
  if (!storageDateValue) return null;
  const [d, m, y] = storageDateValue.split("/").map((s) => parseInt(s, 10));
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
}

function nowIso() {
  return new Date().toISOString();
}

function todayStorageDate() {
  const d = new Date();
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function showToast(message, type = "success") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.className = "toast " + type;
  el.setAttribute("role", type === "error" ? "alert" : "status");
  el.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
  el.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.hidden = true; }, 4500);
}

/* ============================================================
   4. NAVIGATION / VIEW SWITCHING
   ============================================================ */

function switchView(viewName) {
  closeAllModals();
  document.querySelectorAll(".view").forEach((v) => { v.hidden = true; });
  const target = document.getElementById("view-" + viewName);
  if (target) target.hidden = false;

  document.querySelectorAll(".nav-link").forEach((a) => {
    a.classList.toggle("active", a.dataset.view === viewName);
  });

  closeSidebarMobile();

  if (viewName === "documents") renderTable();
  if (viewName === "dashboard") renderDashboard();
}

function closeSidebarMobile() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarScrim").classList.remove("show");
}

/* ============================================================
   5. DASHBOARD
   ============================================================ */

function renderDashboard() {
  const today = todayStorageDate();
  const now = new Date();
  const monthKey = `${pad2(now.getMonth() + 1)}/${now.getFullYear()}`;

  const total = documents.length;
  const todays = documents.filter((d) => d.dateIn === today).length;
  const thisMonth = documents.filter((d) => {
    const parts = (d.dateIn || "").split("/");
    if (parts.length !== 3) return false;
    return `${parts[1]}/${parts[2]}` === monthKey;
  }).length;
  const processing = documents.filter((d) => d.status === "Processing").length;
  const completed = documents.filter((d) => d.status === "Completed").length;
  const archived = documents.filter((d) => d.status === "Archived").length;

  const cards = [
    { label: t("card_total"), value: total, cls: "" },
    { label: t("card_today"), value: todays, cls: "accent-gold" },
    { label: t("card_month"), value: thisMonth, cls: "accent-info" },
    { label: t("card_processing"), value: processing, cls: "accent-warning" },
    { label: t("card_completed"), value: completed, cls: "accent-success" },
    { label: t("card_archived"), value: archived, cls: "accent-muted" },
  ];

  document.getElementById("dashboardCards").innerHTML = cards.map((c) => `
    <div class="card ${c.cls}">
      <div class="card-label">${c.label}</div>
      <div class="card-value">${c.value.toLocaleString()}</div>
    </div>
  `).join("");

  const recent = [...documents]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const tbody = document.querySelector("#recentTable tbody");
  if (recent.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">${escapeHtml(t("no_documents_yet"))}</td></tr>`;
  } else {
    tbody.innerHTML = recent.map((d) => `
      <tr>
        <td>${escapeHtml(d.documentNo)}</td>
        <td>${escapeHtml(d.dateIn)}</td>
        <td class="doc-name-cell" title="${escapeHtml(d.documentName)}">${escapeHtml(d.documentName)}</td>
        <td>${escapeHtml(d.companyName)}</td>
        <td>${statusBadge(d.status)}</td>
      </tr>
    `).join("");
  }
}

function statusBadge(status) {
  const map = {
    Received: "badge-received",
    Processing: "badge-processing",
    Completed: "badge-completed",
    Archived: "badge-archived",
  };
  const label = status ? t("status_" + status) : "";
  return `<span class="badge ${map[status] || "badge-received"}">${escapeHtml(label)}</span>`;
}

/* ============================================================
   6. DOCUMENTS TABLE: FILTER, SEARCH, SORT, PAGINATE
   ============================================================ */

function getFilteredSortedDocs() {
  const term = tableState.searchTerm.trim().toLowerCase();
  const f = tableState.filters;

  let result = documents.filter((d) => {
    if (term) {
      const haystack = [
        d.documentNo, d.companyDocumentNo, d.documentName, d.companyName,
        d.nickName, d.giver, d.receivedBy, d.remark,
      ].join(" ").toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    if (f.dateFrom || f.dateTo) {
      const docDate = parseStorageDate(d.dateIn);
      if (!docDate) return false;
      if (f.dateFrom && docDate < new Date(f.dateFrom)) return false;
      if (f.dateTo && docDate > new Date(f.dateTo + "T23:59:59")) return false;
    }
    if (f.company && !(d.companyName || "").toLowerCase().includes(f.company.toLowerCase())) return false;
    if (f.status && d.status !== f.status) return false;
    if (f.receivedBy && !(d.receivedBy || "").toLowerCase().includes(f.receivedBy.toLowerCase())) return false;
    return true;
  });

  const key = tableState.sortKey;
  const dir = tableState.sortDir === "asc" ? 1 : -1;
  result.sort((a, b) => {
    let av, bv;
    if (key === "dateIn") {
      av = parseStorageDate(a.dateIn) || new Date(0);
      bv = parseStorageDate(b.dateIn) || new Date(0);
    } else if (key === "documentNo") {
      av = parseInt(a.documentNo, 10) || 0;
      bv = parseInt(b.documentNo, 10) || 0;
    } else {
      av = (a[key] || "").toString().toLowerCase();
      bv = (b[key] || "").toString().toLowerCase();
    }
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });

  return result;
}

function renderTable() {
  let filtered = getFilteredSortedDocs();
  const typeFilter = document.getElementById("documentTypeFilter")?.value || "all";
  if (typeFilter === "incoming") filtered = filtered.filter(d => !d.status || !["Completed","complete","completed"].includes(String(d.status)));
  if (typeFilter === "edited") filtered = filtered.filter(d => (d.history && d.history.length) || (d.updatedAt && d.createdAt && d.updatedAt !== d.createdAt));
  if (typeFilter === "completed") filtered = filtered.filter(d => ["Completed","complete","completed"].includes(String(d.status)));
  const totalRecords = filtered.length;
  const perPage = tableState.perPage;
  const totalPages = Math.max(1, Math.ceil(totalRecords / perPage));
  if (tableState.page > totalPages) tableState.page = totalPages;
  const start = (tableState.page - 1) * perPage;
  const pageRows = filtered.slice(start, start + perPage);

  const tbody = document.getElementById("mainTableBody");
  if (pageRows.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="9">${escapeHtml(t("empty_table"))}</td></tr>`;
  } else {
    tbody.innerHTML = pageRows.map((d) => `
      <tr>
        <td>${escapeHtml(d.documentNo)}</td>
        <td>${escapeHtml(d.dateIn)}</td>
        <td>${escapeHtml(d.timeIn)}</td>
        <td>${escapeHtml(d.companyDocumentNo)}</td>
        <td>${escapeHtml(d.nickName)}</td>
        <td>${escapeHtml(d.companyName)}</td>
        <td class="doc-name-cell" title="${escapeHtml(d.documentName)}">${escapeHtml(d.documentName)}</td>
        <td>${escapeHtml(d.giver || "")}</td>
        <td class="col-action">
          <div class="row-actions">
            <button class="btn btn-ghost btn-sm" data-action="view" data-id="${d.id}">${escapeHtml(t("btn_view"))}</button>
            <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${d.id}">${escapeHtml(t("btn_edit"))}</button>
            <button class="btn btn-ghost btn-sm" data-action="delete" data-id="${d.id}">${escapeHtml(t("btn_delete"))}</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  document.getElementById("resultsSummary").textContent =
    totalRecords === 0
      ? t("results_summary_zero")
      : tf("results_summary", { start: start + 1, end: Math.min(start + perPage, totalRecords), total: totalRecords });

  renderPagination(totalPages);
  updateSortIndicators();
}

function renderPagination(totalPages) {
  const el = document.getElementById("pagination");
  const cur = tableState.page;
  let html = `<button ${cur === 1 ? "disabled" : ""} data-page="prev">${escapeHtml(t("pagination_prev"))}</button>`;

  const pageWindow = 2;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= cur - pageWindow && p <= cur + pageWindow)) {
      html += `<button class="${p === cur ? "active" : ""}" data-page="${p}">${p}</button>`;
    } else if (p === cur - pageWindow - 1 || p === cur + pageWindow + 1) {
      html += `<span>…</span>`;
    }
  }
  html += `<button ${cur === totalPages ? "disabled" : ""} data-page="next">${escapeHtml(t("pagination_next"))}</button>`;
  el.innerHTML = html;
}

function updateSortIndicators() {
  document.querySelectorAll("#mainTable thead th[data-sort]").forEach((th) => {
    th.classList.remove("sort-asc", "sort-desc");
    if (th.dataset.sort === tableState.sortKey) {
      th.classList.add(tableState.sortDir === "asc" ? "sort-asc" : "sort-desc");
    }
  });
}

/* ============================================================
   7. ADD / EDIT FORM
   ============================================================ */


function populateDropdowns() {
  const selectDefault = t("select_default");
  const filterAll = t("filter_all");

  const statusSel = document.getElementById("f_status");
  const curStatus = statusSel.value;
  statusSel.innerHTML = SISD_STATUS_OPTIONS.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  if (curStatus) statusSel.value = curStatus;

  // Filter dropdowns
  const filterStatus = document.getElementById("filterStatus");
  const curFStatus = filterStatus.value;
  filterStatus.innerHTML = `<option value="">${escapeHtml(filterAll)}</option>` +
    SISD_STATUS_OPTIONS.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  filterStatus.value = curFStatus;
}

function resetForm() {
  editingId = null;
  selectedAttachmentName = "";
  selectedAttachmentData = "";
  selectedAttachmentType = "";
  document.getElementById("documentForm").reset();
  document.getElementById("f_id").value = "";
  // Document-in date/time are automatic on new records; numbering resets by year.
  document.getElementById("f_dateIn").value = todayInputDate();
  document.getElementById("f_documentNo").value = generateDocumentNo(document.getElementById("f_dateIn").value);
  document.getElementById("f_timeIn").value = currentInputTime();
  document.getElementById("f_status").value = "Received";
  document.getElementById("f_attachmentName").textContent = t("attachment_hint");
  document.getElementById("formTitle").textContent = t("form_add_title");
  document.getElementById("cancelEditBtn").hidden = true;
  document.getElementById("saveBtn").textContent = t("btn_save");
  document.getElementById("formMsg").textContent = "";
  document.getElementById("formMsg").className = "form-msg";
}

function openAddForm() {
  resetForm();
  switchView("add");
}

function openEditForm(doc) {
  editingId = doc.id;
  document.getElementById("f_id").value = doc.id;
  document.getElementById("f_documentNo").value = doc.documentNo;
  document.getElementById("f_dateIn").value = toInputDate(doc.dateIn);
  document.getElementById("f_timeIn").value = doc.timeIn;
  document.getElementById("f_companyDocumentNo").value = doc.companyDocumentNo || "";
  document.getElementById("f_companyName").value = doc.companyName || "";
  document.getElementById("f_nickName").value = doc.nickName || "";
  document.getElementById("f_documentName").value = doc.documentName || "";
  document.getElementById("f_giver").value = doc.giver || "";

  document.getElementById("f_status").value = doc.status || "Received";
  document.getElementById("f_receivedBy").value = doc.receivedBy || "";
  document.getElementById("f_remark").value = doc.remark || "";

  selectedAttachmentName = doc.attachment || "";
  selectedAttachmentData = doc.attachmentData || "";
  selectedAttachmentType = doc.attachmentType || "";
  document.getElementById("f_attachmentName").textContent = doc.attachment
    ? `${t("label_attachment")}: ${doc.attachment}`
    : t("attachment_hint");

  document.getElementById("formTitle").textContent = t("form_edit_title");
  document.getElementById("cancelEditBtn").hidden = false;
  document.getElementById("saveBtn").textContent = t("btn_update");
  document.getElementById("formMsg").textContent = "";
  document.getElementById("formMsg").className = "form-msg";

  switchView("add");
}

function handleFormSubmit(e) {
  e.preventDefault();

  const dateIn = document.getElementById("f_dateIn").value;
  const timeIn = document.getElementById("f_timeIn").value;
  const documentName = document.getElementById("f_documentName").value.trim();
  if (documentName) {
    try {
      const key = "sisd_document_subjects";
      const saved = storageGet(key, []);
      if (!saved.some(x => String(x).toLowerCase() === documentName.toLowerCase())) {
        saved.push(documentName);
        storageSet(key, saved);
      }
      const list = document.getElementById("documentSubjectList");
      if (list) {
        const defaults = [...list.querySelectorAll("option")].map(o => o.value);
        list.innerHTML = [...new Set([...defaults, ...saved])].map(x => `<option value="${escapeHtml(x)}"></option>`).join("");
      }
    } catch (_) {}
  }
  const companyName = document.getElementById("f_companyName").value.trim();
  const giver = document.getElementById("f_giver").value.trim();

  const missing = [];
  if (!dateIn) missing.push(t("missing_date_in"));
  if (!timeIn) missing.push(t("missing_time_in"));
  if (!documentName) missing.push(t("missing_document_name"));
  if (!companyName) missing.push(t("missing_company_name"));

  const msgEl = document.getElementById("formMsg");
  if (missing.length) {
    msgEl.textContent = `${t("msg_missing_prefix")} ${missing.join(", ")}.`;
    msgEl.className = "form-msg error";
    return;
  }

  const record = {
    id: editingId || generateId(),
    documentNo: editingId
      ? document.getElementById("f_documentNo").value
      : generateDocumentNo(dateIn),
    dateIn: toStorageDate(dateIn),
    timeIn,
    documentName,
    companyDocumentNo: document.getElementById("f_companyDocumentNo").value.trim(),
    nickName: document.getElementById("f_nickName").value.trim(),
    companyName,
    giver,
    attachment: selectedAttachmentName,
    attachmentData: selectedAttachmentData,
    attachmentType: selectedAttachmentType,
    status: document.getElementById("f_status").value || "Received",
    receivedBy: document.getElementById("f_receivedBy").value.trim(),
    remark: document.getElementById("f_remark").value.trim(),
    createdAt: editingId ? getDoc(editingId).createdAt : nowIso(),
    updatedAt: nowIso(),
  };

  if (editingId) {
    const idx = documents.findIndex((d) => d.id === editingId);
    documents[idx] = record;
  } else {
    documents.push(record);
  }
  saveDocuments();

  msgEl.textContent = editingId ? t("toast_updated") : t("toast_saved");
  msgEl.className = "form-msg success";
  showToast(editingId ? t("toast_updated") : t("toast_saved"), "success");

  renderDashboard();
  renderTable();

  setTimeout(() => { resetForm(); }, 400);
}

function getDoc(id) {
  return documents.find((d) => d.id === id);
}

/* ============================================================
   8. VIEW / DELETE MODALS
   ============================================================ */

function renderAttachment(d) {
  if (!d.attachment) return "—";
  const name = escapeHtml(d.attachment);
  const data = d.attachmentData || "";
  const type = d.attachmentType || "";
  if (!data) {
    return `<span>${name}</span> <span class="muted">(${escapeHtml(t("attachment_not_stored"))})</span>`;
  }

  const safeData = escapeHtml(data);
  const download = `<a class="btn btn-ghost btn-sm" href="${safeData}" download="${name}">${escapeHtml(t("attachment_download"))}</a>`;
  if (type.startsWith("image/")) {
    return `<div class="attachment-viewer"><div class="attachment-actions"><strong>${name}</strong>${download}</div><img src="${safeData}" alt="${name}" class="attachment-image"></div>`;
  }
  if (type === "application/pdf") {
    return `<div class="attachment-viewer"><div class="attachment-actions"><strong>${name}</strong>${download}</div><iframe src="${safeData}" class="attachment-pdf" title="${name}"></iframe></div>`;
  }
  return `<div class="attachment-actions"><strong>${name}</strong>${download}<span class="muted">${escapeHtml(t("attachment_preview_unavailable"))}</span></div>`;
}

function openViewModal(id) {
  const d = getDoc(id);
  if (!d) return;
  closeAllModals();
  document.getElementById("viewModalBody").innerHTML = `
    <dl class="detail-grid">
      <dt>${escapeHtml(t("detail_doc_no"))}</dt><dd>${escapeHtml(d.documentNo)}</dd>
      <dt>${escapeHtml(t("detail_date_in"))}</dt><dd>${escapeHtml(d.dateIn)}</dd>
      <dt>${escapeHtml(t("detail_time_in"))}</dt><dd>${escapeHtml(d.timeIn)}</dd>
      <dt>${escapeHtml(t("detail_company_doc_no"))}</dt><dd>${escapeHtml(d.companyDocumentNo) || "—"}</dd>
      <dt>${escapeHtml(t("detail_company_name"))}</dt><dd>${escapeHtml(d.companyName)}</dd>
      <dt>${escapeHtml(t("detail_nick_name"))}</dt><dd>${escapeHtml(d.nickName) || "—"}</dd>
      <dt>${escapeHtml(t("detail_doc_name"))}</dt><dd>${escapeHtml(d.documentName)}</dd>
      <dt>${escapeHtml(t("detail_giver"))}</dt><dd>${escapeHtml(d.giver) || "—"}</dd>
      <dt>${escapeHtml(t("detail_status"))}</dt><dd>${statusBadge(d.status)}</dd>
      <dt>${escapeHtml(t("detail_received_by"))}</dt><dd>${escapeHtml(d.receivedBy) || "—"}</dd>
      <dt>${escapeHtml(t("detail_remark"))}</dt><dd>${escapeHtml(d.remark) || "—"}</dd>
      <dt>${escapeHtml(t("detail_attachment"))}</dt><dd>${renderAttachment(d)}</dd>
    </dl>
  `;
  document.getElementById("viewEditBtn").dataset.id = id;
  document.getElementById("viewModalBackdrop").hidden = false;
}

function openDeleteModal(id) {
  const d = getDoc(id);
  if (!d) return;
  closeAllModals();
  pendingDeleteId = id;
  document.getElementById("deleteDocLabel").textContent = `${d.documentNo} — ${d.documentName}`;
  document.getElementById("deleteModalBackdrop").hidden = false;
}

function closeModal(id) {
  document.getElementById(id).hidden = true;
}

/** Safety net: only one modal should ever be visible at once. */
function closeAllModals() {
  document.querySelectorAll(".modal-backdrop").forEach((bd) => { bd.hidden = true; });
}

function confirmDelete() {
  if (!pendingDeleteId) return;
  documents = documents.filter((d) => d.id !== pendingDeleteId);
  saveDocuments();
  pendingDeleteId = null;
  closeModal("deleteModalBackdrop");
  renderDashboard();
  renderTable();
  showToast(t("toast_deleted"), "success");
}

/* ============================================================
   9. CSV IMPORT
   ============================================================ */

/** Minimal CSV parser supporting quoted fields containing commas/newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const IMPORT_HEADER_ALIASES = {
  documentNo: ["no.", "no", "documentno", "sisd-in doc.", "sisd-in doc"],
  dateIn: ["date-in", "datein", "date"],
  timeIn: ["time-in", "timein", "time"],
  documentName: ["doc. name", "doc name", "documentname", "កម្មវត្ថុ", "doc. name / កម្មវត្ថុ"],
  companyDocumentNo: ["no_com", "no.com", "companydocumentno"],
  nickName: ["nick name", "nickname", "nick na"],
  companyName: ["company-name", "companyname", "company name"],
  source: ["source", "អ.ស.ហ.", "ប្រភព"],
  giver: ["giver", "អ្នកប្រគល់"],
  status: ["status", "ស្ថានភាព"],
  receivedBy: ["received by", "receivedby", "អ្នកទទួល"],
  remark: ["remark", "កំណត់សម្គាល់"],
};

function mapHeaderRow(headerRow) {
  const map = {}; // column index -> field key
  headerRow.forEach((h, idx) => {
    const norm = h.trim().toLowerCase();
    for (const [field, aliases] of Object.entries(IMPORT_HEADER_ALIASES)) {
      if (aliases.includes(norm)) { map[idx] = field; break; }
    }
  });
  return map;
}

function handleImportFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCsv(String(reader.result));
    if (rows.length < 2) {
      showToast(t("toast_no_data_csv"), "error");
      return;
    }
    const headerMap = mapHeaderRow(rows[0]);
    const dataRows = rows.slice(1);

    const existingNos = new Set(documents.map((d) => d.documentNo));
    let valid = 0, invalid = 0, duplicate = 0;

    importRows = dataRows.map((r) => {
      const rec = {};
      Object.entries(headerMap).forEach(([idx, field]) => { rec[field] = (r[idx] || "").trim(); });

      const isValid = !!(rec.dateIn && rec.timeIn && rec.documentName && rec.companyName);
      const isDup = rec.documentNo && existingNos.has(rec.documentNo);
      if (isDup) duplicate++;
      else if (isValid) valid++;
      else invalid++;

      return { ...rec, __valid: isValid, __duplicate: isDup };
    });

    renderImportPreview(valid, invalid, duplicate);
  };
  reader.readAsText(file);
}

function renderImportPreview(valid, invalid, duplicate) {
  document.getElementById("importPreviewWrap").hidden = false;
  document.getElementById("importSummary").innerHTML = `
    <div><b>${importRows.length}</b>${escapeHtml(t("import_summary_detected"))}</div>
    <div><b>${valid}</b>${escapeHtml(t("import_summary_valid"))}</div>
    <div><b>${invalid}</b>${escapeHtml(t("import_summary_invalid"))}</div>
    <div><b>${duplicate}</b>${escapeHtml(t("import_summary_duplicate"))}</div>
  `;

  const cols = ["documentNo", "dateIn", "timeIn", "documentName", "companyName", "status", "giver", "receivedBy"];
  const colLabels = [t("th_no"), t("th_date"), t("th_time"), t("th_docname_full"), t("label_company"), t("label_status"), t("label_giver"), t("label_receivedby")];
  const table = document.getElementById("importPreviewTable");
  table.querySelector("thead tr").innerHTML = colLabels.map((c) => `<th>${escapeHtml(c)}</th>`).join("") + `<th>${escapeHtml(t("th_status"))}</th>`;
  table.querySelector("tbody").innerHTML = importRows.slice(0, 50).map((r) => `
    <tr>
      ${cols.map((c) => `<td>${escapeHtml(r[c] || "")}</td>`).join("")}
      <td>${r.__duplicate ? `<span class="badge badge-processing">${escapeHtml(t("import_summary_duplicate"))}</span>` : (r.__valid ? `<span class="badge badge-completed">${escapeHtml(t("import_summary_valid"))}</span>` : `<span class="badge badge-archived">${escapeHtml(t("import_summary_invalid"))}</span>`)}</td>
    </tr>
  `).join("");
}

function confirmImport() {
  const overwrite = document.getElementById("overwriteDuplicates").checked;
  let imported = 0, updated = 0, skipped = 0;

  importRows.forEach((r) => {
    if (!r.__valid && !r.__duplicate) { skipped++; return; }

    if (r.__duplicate) {
      if (!overwrite) { skipped++; return; }
      const idx = documents.findIndex((d) => d.documentNo === r.documentNo);
      if (idx > -1) {
        documents[idx] = {
          ...documents[idx],
          dateIn: r.dateIn || documents[idx].dateIn,
          timeIn: r.timeIn || documents[idx].timeIn,
          documentName: r.documentName || documents[idx].documentName,
          companyDocumentNo: r.companyDocumentNo || documents[idx].companyDocumentNo,
          nickName: r.nickName || documents[idx].nickName,
          companyName: r.companyName || documents[idx].companyName,
          status: r.status || documents[idx].status || "Received",
          giver: r.giver || documents[idx].giver || "",
          receivedBy: r.receivedBy || documents[idx].receivedBy || "",
          updatedAt: nowIso(),
        };
        updated++;
      }
      return;
    }

    documents.push({
      id: generateId(),
      documentNo: r.documentNo || generateDocumentNo(),
      dateIn: r.dateIn,
      timeIn: r.timeIn,
      documentName: r.documentName,
      companyDocumentNo: r.companyDocumentNo || "",
      nickName: r.nickName || "",
      companyName: r.companyName,
      giver: r.giver || "",
      attachment: "",
      status: r.status && SISD_STATUS_OPTIONS.includes(r.status) ? r.status : "Received",
      receivedBy: r.receivedBy || "",
      remark: r.remark || "",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    imported++;
  });

  saveDocuments();
  renderDashboard();
  renderTable();
  cancelImport();
  showToast(tf("toast_import_complete", { imported, updated, skipped }), "success");
}

function cancelImport() {
  importRows = [];
  document.getElementById("importPreviewWrap").hidden = true;
  document.getElementById("importFileInput").value = "";
}

/* ============================================================
   10. EXPORT (CSV / EXCEL / PRINT)
   ============================================================ */

const EXPORT_COLUMNS = [
  ["documentNo", "No."],
  ["dateIn", "Date-in"],
  ["timeIn", "Time-in"],
  ["documentName", "Doc. Name / កម្មវត្ថុ"],
  ["companyDocumentNo", "No_Com"],
  ["nickName", "Nick Name"],
  ["companyName", "Company-Name"],
  ["source", "Source"],
  ["status", "Status"],
  ["giver", "Giver"],
  ["receivedBy", "Received By"],
  ["remark", "Remark"],
];

function currentExportSet() {
  // Respect active filters/search from the Documents page.
  return getFilteredSortedDocs();
}

function exportCsv() {
  const rows = currentExportSet();
  const header = EXPORT_COLUMNS.map(([, label]) => csvEscape(label)).join(",");
  const body = rows.map((r) => EXPORT_COLUMNS.map(([key]) => csvEscape(r[key])).join(",")).join("\n");
  downloadBlob(`\uFEFF${header}\n${body}`, "text/csv;charset=utf-8", `SISD-IN-export-${fileStamp()}.csv`);
  showToast(tf("toast_export_csv", { count: rows.length }), "success");
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function exportExcel() {
  const rows = currentExportSet();
  const headerHtml = EXPORT_COLUMNS.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("");
  const bodyHtml = rows.map((r) => `<tr>${EXPORT_COLUMNS.map(([key]) => `<td>${escapeHtml(r[key])}</td>`).join("")}</tr>`).join("");
  const html = `<html><head><meta charset="UTF-8"></head><body><table border="1">
    <thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></body></html>`;
  downloadBlob(html, "application/vnd.ms-excel", `SISD-IN-export-${fileStamp()}.xls`);
  showToast(tf("toast_export_excel", { count: rows.length }), "success");
}

function fileStamp() {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;
}

function downloadBlob(content, mime, filename) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================================================
   11. BACKUP / RESTORE
   ============================================================ */

function backupData() {
  // Versioned full backup: include every LocalStorage-backed SISD-IN dataset.
  const payload = {
    app: "SISD-IN",
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    datasets: {
      documents,
      companyInfos,
      ddgDocuments,
      savedSubjects: storageGet("sisd_document_subjects", []),
    },
  };
  downloadBlob(JSON.stringify(payload, null, 2), "application/json", `SISD-IN-full-backup-${fileStamp()}.json`);
  showToast(t("toast_backup_done"), "success");
}

let restoreFileContent = null;

function handleRestoreFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      // Backward compatible with older backups that were just an array of documents.
      if (Array.isArray(parsed)) {
        restoreFileContent = { legacy: true, documents: parsed, companyInfos: [], ddgDocuments: [], savedSubjects: [] };
      } else if (parsed && parsed.app === "SISD-IN" && parsed.datasets && Array.isArray(parsed.datasets.documents)) {
        const ds = parsed.datasets;
        if ((ds.companyInfos !== undefined && !Array.isArray(ds.companyInfos)) ||
            (ds.ddgDocuments !== undefined && !Array.isArray(ds.ddgDocuments))) throw new Error("Invalid dataset");
        restoreFileContent = {
          legacy: false,
          documents: ds.documents,
          companyInfos: ds.companyInfos || [],
          ddgDocuments: ds.ddgDocuments || [],
          savedSubjects: Array.isArray(ds.savedSubjects) ? ds.savedSubjects : [],
        };
      } else {
        throw new Error("Unsupported backup format");
      }
      document.getElementById("restoreBtn").disabled = false;
      const count = restoreFileContent.documents.length + restoreFileContent.companyInfos.length + restoreFileContent.ddgDocuments.length;
      showToast(tf("toast_restore_loaded", { count }), "success");
    } catch (e) {
      console.error("Invalid SISD-IN backup", e);
      restoreFileContent = null;
      document.getElementById("restoreBtn").disabled = true;
      showToast(t("toast_invalid_backup"), "error");
    }
  };
  reader.readAsText(file);
}

function restoreData() {
  if (!restoreFileContent) return;
  const count = restoreFileContent.documents.length + restoreFileContent.companyInfos.length + restoreFileContent.ddgDocuments.length;
  if (!confirm(`Restore ${count} records? This will replace the current SISD-IN data in this browser.`)) return;
  documents = restoreFileContent.documents;
  // Older backups contain only incoming documents; preserve extended datasets.
  if (!restoreFileContent.legacy) {
    companyInfos = restoreFileContent.companyInfos;
    ddgDocuments = restoreFileContent.ddgDocuments;
    storageSet("sisd_document_subjects", restoreFileContent.savedSubjects || []);
  }
  saveDocuments();
  saveCompanyInfos();
  saveDdgDocuments();
  renderDashboard();
  renderTable();
  populateCompanyLists();
  renderCompanyInfoTable();
  renderDdgTable();
  renderHistory();
  renderReports();
  showToast(tf("toast_restore_done", { count }), "success");
  document.getElementById("restoreFileInput").value = "";
  document.getElementById("restoreBtn").disabled = true;
  restoreFileContent = null;
}

function resetDemoData() {
  documents = JSON.parse(JSON.stringify(SISD_SAMPLE_DATA));
  saveDocuments();
  renderDashboard();
  renderTable();
  showToast(t("toast_demo_reset"), "success");
}

/* ============================================================
   12. EVENT WIRING
   ============================================================ */

function wireEvents() {
  // Sidebar navigation
  document.querySelectorAll(".nav-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (a.dataset.view === "add") { openAddForm(); return; }
      switchView(a.dataset.view);
    });
  });
  document.querySelectorAll("[data-view-target]").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.viewTarget));
  });

  // Mobile menu
  document.getElementById("menuToggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("sidebarScrim").classList.toggle("show");
  });
  document.getElementById("sidebarScrim").addEventListener("click", closeSidebarMobile);

  // Form
  document.getElementById("documentForm").addEventListener("submit", handleFormSubmit);
  document.getElementById("f_dateIn")?.addEventListener("change", () => {
    if (!editingId) document.getElementById("f_documentNo").value = generateDocumentNo(document.getElementById("f_dateIn").value);
  });
  document.getElementById("clearFormBtn").addEventListener("click", resetForm);
  document.getElementById("cancelEditBtn").addEventListener("click", () => { resetForm(); switchView("documents"); });

  document.getElementById("f_attachment").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) {
      selectedAttachmentName = "";
      selectedAttachmentData = "";
      selectedAttachmentType = "";
      document.getElementById("f_attachmentName").textContent = t("attachment_hint");
      return;
    }

    const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      e.target.value = "";
      selectedAttachmentName = "";
      selectedAttachmentData = "";
      selectedAttachmentType = "";
      document.getElementById("f_attachmentName").textContent = t("attachment_too_large");
      showToast(t("attachment_too_large"), "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      selectedAttachmentName = file.name;
      selectedAttachmentData = String(reader.result || "");
      selectedAttachmentType = file.type || "application/octet-stream";
      document.getElementById("f_attachmentName").textContent = `${t("attachment_selected")}: ${file.name}`;
    };
    reader.onerror = () => {
      selectedAttachmentName = "";
      selectedAttachmentData = "";
      selectedAttachmentType = "";
      document.getElementById("f_attachmentName").textContent = t("attachment_read_error");
      showToast(t("attachment_read_error"), "error");
    };
    reader.readAsDataURL(file);
  });

  // Search + filters
  document.getElementById("searchInput").addEventListener("input", (e) => {
    tableState.searchTerm = e.target.value;
    tableState.page = 1;
    renderTable();
  });
  document.getElementById("toggleFiltersBtn").addEventListener("click", () => {
    const panel = document.getElementById("filtersPanel");
    panel.hidden = !panel.hidden;
  });
  document.getElementById("applyFiltersBtn").addEventListener("click", () => {
    tableState.filters = {
      dateFrom: document.getElementById("filterDateFrom").value,
      dateTo: document.getElementById("filterDateTo").value,
      company: document.getElementById("filterCompany").value,
      status: document.getElementById("filterStatus").value,
      receivedBy: document.getElementById("filterReceivedBy").value,
    };
    tableState.page = 1;
    renderTable();
  });
  document.getElementById("resetFiltersBtn").addEventListener("click", () => {
    document.querySelectorAll("#filtersPanel input, #filtersPanel select").forEach((el) => { el.value = ""; });
    tableState.filters = { dateFrom: "", dateTo: "", company: "", status: "", receivedBy: "" };
    tableState.page = 1;
    renderTable();
  });

  document.getElementById("perPageSelect").addEventListener("change", (e) => {
    tableState.perPage = parseInt(e.target.value, 10);
    tableState.page = 1;
    renderTable();
  });

  // Sorting
  document.querySelectorAll("#mainTable thead th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (tableState.sortKey === key) {
        tableState.sortDir = tableState.sortDir === "asc" ? "desc" : "asc";
      } else {
        tableState.sortKey = key;
        tableState.sortDir = "asc";
      }
      renderTable();
    });
  });

  // Pagination
  document.getElementById("pagination").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-page]");
    if (!btn) return;
    const p = btn.dataset.page;
    if (p === "prev") tableState.page = Math.max(1, tableState.page - 1);
    else if (p === "next") tableState.page += 1;
    else tableState.page = parseInt(p, 10);
    renderTable();
  });

  // Row actions (view / edit / delete)
  document.getElementById("mainTableBody").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === "view") openViewModal(id);
    if (btn.dataset.action === "edit") openEditForm(getDoc(id));
    if (btn.dataset.action === "delete") openDeleteModal(id);
  });

  // Modals
  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.close));
  });
  document.querySelectorAll(".modal-backdrop").forEach((bd) => {
    bd.addEventListener("click", (e) => { if (e.target === bd) bd.hidden = true; });
  });
  document.getElementById("viewEditBtn").addEventListener("click", (e) => {
    const id = e.target.closest("button").dataset.id;
    closeModal("viewModalBackdrop");
    openEditForm(getDoc(id));
  });
  document.getElementById("confirmDeleteBtn").addEventListener("click", confirmDelete);

  // Print
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("exportPrintBtn").addEventListener("click", () => window.print());

  // Import
  document.getElementById("importFileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleImportFile(file);
  });
  document.getElementById("confirmImportBtn").addEventListener("click", confirmImport);
  document.getElementById("cancelImportBtn").addEventListener("click", cancelImport);

  // Export
  document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
  document.getElementById("exportExcelBtn").addEventListener("click", exportExcel);

  // Backup / restore
  document.getElementById("backupBtn").addEventListener("click", backupData);
  document.getElementById("restoreFileInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleRestoreFile(file);
  });
  document.getElementById("restoreBtn").addEventListener("click", restoreData);
  document.getElementById("resetDemoBtn").addEventListener("click", () => {
    if (confirm(t("confirm_reset_demo"))) resetDemoData();
  });

  // Keyboard: close topmost open modal with Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-backdrop").forEach((bd) => { bd.hidden = true; });
    }
  });
}

/* ============================================================
   13. LANGUAGE CHANGE HOOK
   ------------------------------------------------------------
   i18n.js calls this (if defined) whenever the EN/KH toggle is
   used, so every piece of UI this file builds by hand gets
   re-rendered in the newly selected language.
   ============================================================ */

function onLanguageChanged() {
  populateDropdowns();
  renderDashboard();
  renderTable();
  // Keep the Add/Edit form's dynamically-set title & button in sync.
  document.getElementById("formTitle").textContent = editingId ? t("form_edit_title") : t("form_add_title");
  document.getElementById("saveBtn").textContent = editingId ? t("btn_update") : t("btn_save");
}

/* ============================================================
   14. INIT
   ============================================================ */

async function init() {
  const storageMode = await initializeStorage();
  loadDocuments();
  populateDropdowns();
  wireEvents();
  resetForm();
  renderDashboard();
  renderTable();
  wireExtendedFeatures();
  const modeNote = document.getElementById("storageModeNote");
  if (modeNote) modeNote.textContent = storageMode === "indexeddb" ? "ទិន្នន័យរក្សាទុកក្នុង IndexedDB" : "កំពុងប្រើ LocalStorage ជំនួស (IndexedDB មិនអាចប្រើបាន)";
}

document.addEventListener("DOMContentLoaded", init);

/* ============================================================
   15. EXTENDED DMS: COMPANY INFO, DOCUMENT TO DDG, HISTORY,
       DASHBOARD DAILY STATS AND REPORT EXPORTS
   ============================================================ */

const COMPANY_INFO_KEY = "sisd_company_information";
const DDG_STORAGE_KEY = "sisd_to_ddg_documents";
let companyInfos = [];
let ddgDocuments = [];
let ddgSelectedAttachment = { name: "", data: "", type: "" };

function loadExtendedData() {
  companyInfos = storageGet(COMPANY_INFO_KEY, []);
  ddgDocuments = storageGet(DDG_STORAGE_KEY, []);
  if (!Array.isArray(companyInfos)) companyInfos = [];
  if (!Array.isArray(ddgDocuments)) ddgDocuments = [];
}
function saveCompanyInfos() { storageSet(COMPANY_INFO_KEY, companyInfos); }
function saveDdgDocuments() { storageSet(DDG_STORAGE_KEY, ddgDocuments); }
function todayInputDate() { const d=new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function currentInputTime() { const d=new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function generateDdgNo() { const max=ddgDocuments.reduce((m,d)=>Math.max(m,parseInt(d.documentNo,10)||0),0); return String(max+1).padStart(3,"0"); }
function findCompanyInfo(nick) { const n=String(nick||"").trim().toLowerCase(); return companyInfos.find(x=>String(x.nickName||"").trim().toLowerCase()===n); }
function applyCompanyInfo(info, ids) {
  if (!info) return;
  const map={companyName:"f_companyName",orgType:"f_orgType",receivedBy:"f_receivedBy",giver:"f_giver"};
  if(ids){ map.companyName=ids.company; map.orgType=ids.org; map.receivedBy=ids.received; map.giver=ids.giver; }
  Object.entries(map).forEach(([k,id])=>{const el=document.getElementById(id); if(el && info[k]!==undefined) el.value=info[k]||"";});
}
function populateCompanyLists() {
  const dl=document.getElementById("companyNickList"); if(dl) dl.innerHTML=companyInfos.map(x=>`<option value="${escapeHtml(x.nickName||"")}">${escapeHtml(x.companyName||"")}</option>`).join("");
  const org=document.getElementById("orgTypeList"); if(org){ const vals=[...new Set(companyInfos.map(x=>x.orgType).filter(Boolean))]; org.innerHTML=vals.map(x=>`<option value="${escapeHtml(x)}"></option>`).join(""); }
}
function renderCompanyInfoTable() {
  const body=document.getElementById("companyInfoBody"); if(!body)return;
  const q=(document.getElementById("companyInfoSearch")?.value||"").toLowerCase();
  const rows=companyInfos.filter(x=>[x.nickName,x.companyName,x.orgType,x.receivedBy,x.giver].join(" ").toLowerCase().includes(q));
  body.innerHTML=rows.length?rows.map(x=>`<tr><td>${escapeHtml(x.nickName)}</td><td>${escapeHtml(x.companyName)}</td><td>${escapeHtml(x.orgType||"")}</td><td>${escapeHtml(x.receivedBy||"")}</td><td>${escapeHtml(x.giver||"")}</td><td><button class="btn btn-ghost btn-sm" data-ci-edit="${escapeHtml(x.id)}">${escapeHtml(t("btn_edit"))}</button> <button class="btn btn-ghost btn-sm" data-ci-delete="${escapeHtml(x.id)}">${escapeHtml(t("btn_delete"))}</button></td></tr>`).join(""): `<tr class="empty-row"><td colspan="6">${escapeHtml(t("no_documents_yet"))}</td></tr>`;
}
function resetCompanyInfoForm(){ ["ci_nickName","ci_companyName","ci_orgType","ci_receivedBy","ci_giver"].forEach(id=>{const e=document.getElementById(id);if(e)e.value="";}); document.getElementById("companyInfoMsg").textContent=""; document.getElementById("companyInfoForm").dataset.editId=""; }
function saveCompanyInfo(e){
  e.preventDefault(); const nick=document.getElementById("ci_nickName").value.trim(), company=document.getElementById("ci_companyName").value.trim();
  if(!nick||!company){document.getElementById("companyInfoMsg").textContent=t("msg_missing_prefix")+" Nick Name, Company Name.";return;}
  const editId=document.getElementById("companyInfoForm").dataset.editId;
  const rec={id:editId||("CI-"+Date.now()),nickName:nick,companyName:company,orgType:document.getElementById("ci_orgType").value.trim(),receivedBy:document.getElementById("ci_receivedBy").value.trim(),giver:document.getElementById("ci_giver").value.trim(),updatedAt:nowIso()};
  const idx=companyInfos.findIndex(x=>x.id===rec.id); if(idx>=0) companyInfos[idx]=rec; else companyInfos.push(rec); saveCompanyInfos(); populateCompanyLists(); renderCompanyInfoTable(); resetCompanyInfoForm(); showToast(t("toast_info_saved"));
}
function editCompanyInfo(id){ const x=companyInfos.find(a=>a.id===id);if(!x)return; document.getElementById("companyInfoForm").dataset.editId=id; ["nickName","companyName","orgType","receivedBy","giver"].forEach(k=>{document.getElementById("ci_"+k).value=x[k]||"";}); switchView("add-info"); }
function deleteCompanyInfo(id){ if(!confirm(t("confirm_delete_info")))return; companyInfos=companyInfos.filter(x=>x.id!==id); saveCompanyInfos(); populateCompanyLists(); renderCompanyInfoTable(); }

function resetDdgForm(){
  document.getElementById("ddgForm").reset(); document.getElementById("ddg_id").value="";
  document.getElementById("ddg_no").value="";
  document.getElementById("ddg_date").value=todayInputDate(); document.getElementById("ddg_time").value=currentInputTime();
  document.getElementById("ddgSaveBtn").textContent=t("btn_save");
}
function saveDdg(e){
 e.preventDefault();
 const no=document.getElementById("ddg_no").value.trim(), date=document.getElementById("ddg_date").value||todayInputDate(), time=document.getElementById("ddg_time").value||currentInputTime(), officer=document.getElementById("ddg_officer").value.trim(), name=document.getElementById("ddg_name").value.trim(), company=document.getElementById("ddg_company").value.trim();
 if(!no||!officer||!name||!company){document.getElementById("ddgMsg").textContent="សូមបំពេញលេខរៀង ឈ្មោះមន្ត្រី កម្មវត្ថុ និងឈ្មោះក្រុមហ៊ុន។";return;}
 const editing=document.getElementById("ddg_id").value; const existing=ddgDocuments.find(x=>x.id===editing); const duplicate=ddgDocuments.some(x=>x.documentNo===no&&x.id!==editing);
 if(duplicate){document.getElementById("ddgMsg").textContent="លេខរៀងនេះមានរួចហើយ សូមពិនិត្យម្តងទៀត។";return;}
 const id=editing||("DDG-"+Date.now()); const rec={...(existing||{}),id,documentNo:no,dateIn:toStorageDate(date),timeIn:time,officerName:officer,companyName:company,documentName:name,destination:existing?.destination||"DDG",status:existing?.status||"Received",history:existing?.history||[],createdAt:existing?.createdAt||nowIso(),updatedAt:nowIso()};
 if(existing){const i=ddgDocuments.findIndex(x=>x.id===id);ddgDocuments[i]=rec;}else ddgDocuments.push(rec);
 saveDdgDocuments();resetDdgForm();renderDdgTable();renderDashboard();renderHistory();showToast(t("toast_ddg_saved"));
}
function renderDdgTable(){
 const body=document.getElementById("ddgBody");if(!body)return;const q=(document.getElementById("ddgSearch")?.value||"").trim().toLowerCase();
 const rows=ddgDocuments.filter(d=>[d.documentNo,d.id,d.officerName,d.companyName,d.nickName,d.documentName].join(" ").toLowerCase().includes(q)).sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
 body.innerHTML=rows.length?rows.map(d=>{const revisions=(d.history||[]).filter(h=>h.action==="Edit tracked");return `<tr><td>${escapeHtml(d.documentNo)}</td><td>${escapeHtml(d.dateIn||"")}</td><td>${escapeHtml(d.timeIn||"")}</td><td>${escapeHtml(d.officerName||d.giver||"")}</td><td>${escapeHtml(d.companyName||"")}</td><td class="doc-name-cell">${escapeHtml(d.documentName||"")}</td><td>${revisions.length}</td><td class="row-actions"><button class="btn btn-ghost btn-sm" data-ddg-view="${escapeHtml(d.id)}">${escapeHtml(t("btn_view"))}</button><button class="btn btn-ghost btn-sm" data-ddg-update="${escapeHtml(d.id)}">កែសម្រួល (${revisions.length})</button><button class="btn btn-primary btn-sm" data-ddg-complete="${escapeHtml(d.id)}">${escapeHtml(t("btn_complete"))}</button></td></tr>`;}).join(""):`<tr class="empty-row"><td colspan="8">${escapeHtml(t("empty_table"))}</td></tr>`;
}
function ddgAttachmentHtml(d){if(!d.attachment)return"—";const data=d.attachmentData||"",name=escapeHtml(d.attachment);if(!data)return `${name} <span class="muted">(${escapeHtml(t("attachment_not_stored"))})</span>`;const href=escapeHtml(data);const dl=`<a class="btn btn-ghost btn-sm" href="${href}" download="${name}">${escapeHtml(t("attachment_download"))}</a>`;if((d.attachmentType||"").startsWith("image/"))return `<div class="attachment-viewer"><div class="attachment-actions"><strong>${name}</strong>${dl}</div><img src="${href}" class="attachment-image" alt="${name}"></div>`;if(d.attachmentType==="application/pdf")return `<div class="attachment-viewer"><div class="attachment-actions"><strong>${name}</strong>${dl}</div><iframe src="${href}" class="attachment-pdf"></iframe></div>`;return `<div class="attachment-actions"><strong>${name}</strong>${dl}</div>`;}
function viewDdg(id){const d=ddgDocuments.find(x=>x.id===id);if(!d)return;closeAllModals();document.getElementById("viewModalBody").innerHTML=`<dl class="detail-grid"><dt>លេខរៀង (ID)</dt><dd>${escapeHtml(d.documentNo)}</dd><dt>កាលបរិច្ឆេទ</dt><dd>${escapeHtml(d.dateIn||"")}</dd><dt>ម៉ោង</dt><dd>${escapeHtml(d.timeIn||"")}</dd><dt>ឈ្មោះមន្ត្រី</dt><dd>${escapeHtml(d.officerName||d.giver||"—")}</dd><dt>ឈ្មោះក្រុមហ៊ុន</dt><dd>${escapeHtml(d.companyName||"")}</dd><dt>កម្មវត្ថុ</dt><dd>${escapeHtml(d.documentName||"")}</dd></dl><hr><h4>ប្រវត្តិការកែសម្រួល</h4><div class="history-list">${(d.history||[]).slice().reverse().map(h=>`<div class="history-item"><b>${escapeHtml(h.action)}</b> — ${escapeHtml(h.from||"")} — ${escapeHtml(h.date||"")} ${escapeHtml(h.time||"")}<small>${escapeHtml(h.timestamp||"")}</small></div>`).join("")||"—"}</div>`;document.getElementById("viewEditBtn").hidden=true;document.getElementById("viewModalBackdrop").hidden=false;}
function openDdgUpdate(id){
 const d=ddgDocuments.find(x=>x.id===id);if(!d)return;
 document.getElementById("ddgUpdateId").value=id;
 document.getElementById("ddgUpdateFrom").value="";
 document.getElementById("ddgUpdateDocumentId").value=d.id||d.documentNo||"";
 document.getElementById("ddgUpdateTimestamp").value=new Date().toLocaleString();
 document.getElementById("ddgUpdateModalBackdrop").hidden=false;
}
function submitDdgUpdate(e){
 e.preventDefault();
 const id=document.getElementById("ddgUpdateId").value,d=ddgDocuments.find(x=>x.id===id);
 const role=document.getElementById("ddgUpdateFrom").value;
 if(!d||!role){showToast("សូមជ្រើសរើសតួនាទីអ្នកកែសម្រួល","error");return;}
 const now=new Date(),timestamp=now.toISOString();
 d.history=d.history||[];
 d.history.push({action:"Edit tracked",from:role,date:todayStorageDate(),time:currentInputTime(),remark:"Revision recorded; document fields were not changed.",timestamp,recordType:"revision"});
 d.updatedAt=timestamp; saveDdgDocuments(); closeModal("ddgUpdateModalBackdrop");
 renderDdgTable();renderHistory();renderDashboard();showToast("បានកត់ត្រាប្រវត្តិអ្នកកែសម្រួលដោយជោគជ័យ");
}
function completeDdg(id){const d=ddgDocuments.find(x=>x.id===id);if(!d)return;const now=new Date();d.status="Completed";d.history=d.history||[];d.history.push({action:"Complete",from:"SISD",date:todayStorageDate(),time:currentInputTime(),remark:t("complete_note"),timestamp:now.toISOString()});d.completedAt=now.toISOString();d.updatedAt=now.toISOString();saveDdgDocuments();renderDdgTable();renderHistory();renderDashboard();showToast(t("toast_completed"));}
function renderHistory(){const body=document.getElementById("historyBody");if(!body)return;const q=(document.getElementById("historySearch")?.value||"").toLowerCase();const rows=[];ddgDocuments.forEach(d=>(d.history||[]).forEach(h=>rows.push({...h,documentNo:d.documentNo,documentName:d.documentName,companyName:d.companyName,status:d.status})));const f=rows.filter(x=>Object.values(x).join(" ").toLowerCase().includes(q)).sort((a,b)=>String(b.timestamp).localeCompare(String(a.timestamp)));body.innerHTML=f.length?f.map(x=>`<tr><td>${escapeHtml(x.documentNo)}</td><td>${escapeHtml(x.documentName)}</td><td>${escapeHtml(x.companyName)}</td><td>${escapeHtml(x.from||"")}</td><td>${escapeHtml(x.date||"")}</td><td>${escapeHtml(x.time||"")}</td><td>${statusBadge(x.status)}</td><td>${escapeHtml(x.timestamp||"")}</td></tr>`).join(""):`<tr class="empty-row"><td colspan="8">${escapeHtml(t("no_history"))}</td></tr>`;}

function parseDateKey(storage){const p=(storage||"").split("/");return p.length===3?`${p[2]}-${pad2(p[1])}-${pad2(p[0])}`:"";}
function statsFor(period){const now=new Date(), today=todayInputDate(), month=`${now.getFullYear()}-${pad2(now.getMonth()+1)}`, year=String(now.getFullYear());const inDocs=documents.filter(d=>parseDateKey(d.dateIn)===period);const ddg=ddgDocuments.filter(d=>parseDateKey(d.dateIn)===period&&d.destination==="DDG");const dg=ddgDocuments.filter(d=>parseDateKey(d.dateIn)===period&&d.destination==="DG");const histories=ddgDocuments.flatMap(d=>d.history||[]).filter(h=>parseDateKey(h.date)===period&&(h.action==="Update"||h.action==="Edit tracked"));const completed=ddgDocuments.filter(d=>(d.completedAt?d.completedAt.slice(0,10):parseDateKey(d.dateIn))===period&&d.status==="Completed");return {period,inDocs:inDocs.length,ddg:ddg.length,dg:dg.length,updated:histories.length,completed:completed.length};}
function renderDashboard(){
 const today=todayInputDate();const dateInput=document.getElementById("dashboardDate");if(dateInput&&!dateInput.value)dateInput.value=today;const selected=dateInput?.value||today;
 const countFor=(key)=>{
  const hist=ddgDocuments.flatMap(d=>(d.history||[]).map(h=>({...h,doc:d}))).filter(h=>parseDateKey(h.date)===key);
  return [
   {label:"Doc IN",value:documents.filter(d=>parseDateKey(d.dateIn)===key).length},
   {label:"Doc edit from SISD",value:hist.filter(h=>h.action==="Edit tracked"&&h.from==="ប្រធាននាយកដ្ឋាន").length},
   {label:"Doc to DDG",value:ddgDocuments.filter(d=>parseDateKey(d.dateIn)===key&&d.destination==="DDG").length},
   {label:"Doc edit from DDG",value:hist.filter(h=>h.action==="Edit tracked"&&h.from==="អគ្គរង").length},
   {label:"Doc edit from DG",value:hist.filter(h=>h.action==="Edit tracked"&&h.from==="នាយក").length},
   {label:"Document complete",value:ddgDocuments.filter(d=>d.completedAt&&d.completedAt.slice(0,10)===key).length}
  ];
 };
 const todayCounts=countFor(selected);
 const chart=document.getElementById("dashboardBarChart");if(chart){const max=Math.max(1,...todayCounts.map(x=>x.value));chart.innerHTML=todayCounts.map(x=>`<div class="bar-item"><div class="bar-value">${x.value}</div><div class="bar-track"><div class="bar-fill" style="height:${Math.max(x.value?5:0,x.value/max*100)}%"></div></div><div class="bar-label">${escapeHtml(x.label)}</div></div>`).join("");}
 renderDailyComparison(selected);
 const updateBody=document.getElementById("todayUpdatesBody");if(updateBody){const us=[];ddgDocuments.forEach(d=>(d.history||[]).forEach(h=>{if((h.action==="Update"||h.action==="Edit tracked")&&parseDateKey(h.date)===today)us.push({d,h});}));us.sort((a,b)=>String(b.h.timestamp).localeCompare(String(a.h.timestamp)));updateBody.innerHTML=us.length?us.map(x=>`<tr><td>${escapeHtml(x.d.documentNo)}</td><td>${escapeHtml(x.d.documentName)}</td><td>${escapeHtml(x.h.from||"")}</td><td>${escapeHtml(x.h.date||"")}</td><td>${escapeHtml(x.h.time||"")}</td><td>${escapeHtml(x.h.timestamp||"")}</td></tr>`).join(""):`<tr class="empty-row"><td colspan="6">${escapeHtml(t("no_history"))}</td></tr>`;}
 const recent=[...documents].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5),tbody=document.querySelector("#recentTable tbody");if(tbody)tbody.innerHTML=recent.length?recent.map(d=>`<tr><td>${escapeHtml(d.documentNo)}</td><td>${escapeHtml(d.dateIn)}</td><td>${escapeHtml(d.documentName)}</td><td>${escapeHtml(d.nickName||"")}</td><td>${escapeHtml(d.companyName)}</td></tr>`).join(""):`<tr class="empty-row"><td colspan="5">${escapeHtml(t("no_documents_yet"))}</td></tr>`;
}
function renderReports() {
  const monthInput = document.getElementById("reportMonth");
  const monthKey = monthInput?.value || todayInputDate().slice(0, 7);
  const [yy, mm] = monthKey.split("-").map(Number);
  const prevDate = new Date(yy, mm - 2, 1);
  const previousKey = `${prevDate.getFullYear()}-${pad2(prevDate.getMonth()+1)}`;
  const inMonth = value => parseDateKey(value).startsWith(monthKey);
  const inPrevious = value => parseDateKey(value).startsWith(previousKey);
  const completedFor = key => ddgDocuments.filter(d => d.completedAt && d.completedAt.slice(0,7) === key).length;
  const count = predicate => ({
    incoming: documents.filter(d => predicate(d.dateIn)).length,
    ddg: ddgDocuments.filter(d => predicate(d.dateIn) && d.destination === "DDG").length,
    dg: ddgDocuments.filter(d => predicate(d.dateIn) && d.destination === "DG").length,
    edited: ddgDocuments.flatMap(d => d.history || []).filter(h => predicate(h.date) && (h.action === "Update" || h.action === "Edit tracked")).length
  });
  const current = count(inMonth), previous = count(inPrevious);
  current.completed = completedFor(monthKey);
  previous.completed = completedFor(previousKey);
  const labels = [["ឯកសារចូល","incoming"],["ឯកសារទៅ DDG","ddg"],["ឯកសារទៅ DG","dg"],["ការកែសម្រួល","edited"],["ឯកសារបានបញ្ចប់","completed"]];
  const stats = document.getElementById("monthlyReportStats");
  if (stats) stats.innerHTML = labels.map(([label,key]) => `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${current[key]}</div></div>`).join("");
  const body = document.querySelector("#reportTable tbody");
  if (body) body.innerHTML = labels.map(([label,key]) => {
    const a=current[key], b=previous[key], diff=a-b;
    const pct=b===0 ? (a===0 ? "0.00%" : "ថ្មី") : `${(diff/b*100).toFixed(2)}%`;
    return `<tr><td>${label}</td><td>${a}</td><td>${b}</td><td>${diff>0?"+":""}${diff}</td><td>${pct}</td></tr>`;
  }).join("");
}
function renderDailyComparison(selectedDate) {
  const body = document.querySelector("#dailyComparisonTable tbody");
  if (!body) return;
  const selected = selectedDate || document.getElementById("reportDate")?.value || todayInputDate();
  const date = new Date(`${selected}T12:00:00`);
  date.setDate(date.getDate() - 1);
  const previous = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  const countFor = (key) => ({
    "Incoming documents": documents.filter(d => parseDateKey(d.dateIn) === key).length,
    "Documents to DDG": ddgDocuments.filter(d => parseDateKey(d.dateIn) === key && d.destination === "DDG").length,
    "Documents to DG": ddgDocuments.filter(d => parseDateKey(d.dateIn) === key && d.destination === "DG").length,
    "Updates recorded": ddgDocuments.flatMap(d => d.history || []).filter(h => parseDateKey(h.date) === key && (h.action === "Update" || h.action === "Edit tracked")).length,
    "Documents completed": ddgDocuments.filter(d => d.completedAt && d.completedAt.slice(0, 10) === key).length,
  });
  const todayCounts = countFor(selected), previousCounts = countFor(previous);
  body.innerHTML = Object.keys(todayCounts).map(label => {
    const current = todayCounts[label], prior = previousCounts[label], change = current - prior;
    const pct = prior === 0 ? (current === 0 ? "0%" : "N/A (new)") : `${(change / prior * 100).toFixed(2)}%`;
    const changeText = change > 0 ? `+${change}` : String(change);
    return `<tr><td>${escapeHtml(label)}</td><td>${current}</td><td>${prior}</td><td>${escapeHtml(changeText)}</td><td>${escapeHtml(pct)}</td></tr>`;
  }).join("");
  const roleBody=document.querySelector("#revisionRoleTable tbody");
  if(roleBody){
    const roles=["ប្រធាននាយកដ្ឋាន","អគ្គរង","នាយក"];
    roleBody.innerHTML=roles.map(role=>{
      const all=ddgDocuments.flatMap(d=>d.history||[]).filter(h=>h.action==="Edit tracked"&&h.from===role);
      const onDay=all.filter(h=>parseDateKey(h.date)===selected).length;
      return `<tr><td>${escapeHtml(role)}</td><td>${onDay}</td><td>${all.length}</td></tr>`;
    }).join("");
  }
}

function reportRows(){const body=document.querySelectorAll("#reportTable tbody tr");return [...body].map(tr=>[...tr.children].map(td=>td.textContent.trim()));}
function exportReportExcel(){const rows=reportRows(),html=`<html><head><meta charset="UTF-8"></head><body><table border="1"><tr>${[...document.querySelectorAll("#reportTable thead th")].map(th=>`<th>${escapeHtml(th.textContent)}</th>`).join("")}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}</table></body></html>`;downloadBlob(html,"application/vnd.ms-excel",`SISD-report-${fileStamp()}.xls`);}
function exportReportWord(){const rows=reportRows();const html=`<html><head><meta charset="UTF-8"><title>SISD Summary Report</title></head><body><h1>SISD Summary Report</h1><table border="1" cellspacing="0" cellpadding="5"><tr>${[...document.querySelectorAll("#reportTable thead th")].map(th=>`<th>${escapeHtml(th.textContent)}</th>`).join("")}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}</table></body></html>`;downloadBlob(html,"application/msword",`SISD-report-${fileStamp()}.doc`);}
function exportReportPdf(){const rows=reportRows(),headers=[...document.querySelectorAll("#reportTable thead th")].map(th=>th.textContent.trim());const w=window.open("","_blank");if(!w){showToast(t("popup_blocked"),"error");return;}w.document.write(`<html><head><meta charset="UTF-8"><title>SISD PDF Report</title><style>body{font-family:Arial,sans-serif;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #777;padding:6px;text-align:left}h1{font-size:20px}</style></head><body><h1>SISD Summary Report</h1><table><tr>${headers.map(h=>`<th>${escapeHtml(h)}</th>`).join("")}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}</table><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();}

// Restore normal View/Edit button when viewing an incoming document.
const originalOpenViewModal = openViewModal;
openViewModal = function(id){document.getElementById("viewEditBtn").hidden=false; originalOpenViewModal(id);};

let companyImportRows=[];
function previewCompanyImport(){
 const file=document.getElementById("companyImportFile")?.files?.[0];if(!file){showToast("សូមជ្រើសរើសឯកសារ CSV ដែលបាននាំចេញពី Excel។","error");return;}
 const reader=new FileReader();reader.onload=()=>{try{const rows=parseCsv(String(reader.result||""));if(rows.length<2)throw new Error("No rows");const norm=x=>String(x||"").trim().toLowerCase();const heads=rows[0].map(norm);const pick=(r,aliases)=>{const i=heads.findIndex(h=>aliases.includes(h));return i>=0?String(r[i]||"").trim():"";};const aliases={nick:["nick name","nickname","nick","ឈ្មោះកាត់ក្រុមហ៊ុន"],company:["company name","company-name","companyname","ឈ្មោះក្រុមហ៊ុន"],org:["organization type","org type","orgtype","ប្រភេទអង្គភាព"],received:["received by","receivedby","អ្នកទទួល"],giver:["giver","អ្នកប្រគល់"]};const seenNick=new Set(),seenCompany=new Set();companyImportRows=rows.slice(1).map(r=>({nickName:pick(r,aliases.nick),companyName:pick(r,aliases.company),orgType:pick(r,aliases.org),receivedBy:pick(r,aliases.received),giver:pick(r,aliases.giver)})).filter(x=>x.nickName||x.companyName).map(x=>{const nk=x.nickName.toLowerCase(),ck=x.companyName.toLowerCase();const duplicate=companyInfos.some(c=>String(c.nickName||"").trim().toLowerCase()===nk||String(c.companyName||"").trim().toLowerCase()===ck)||seenNick.has(nk)||seenCompany.has(ck);seenNick.add(nk);seenCompany.add(ck);return {...x,__valid:!!(x.nickName&&x.companyName),__duplicate:duplicate};});const valid=companyImportRows.filter(x=>x.__valid&&!x.__duplicate).length,dup=companyImportRows.filter(x=>x.__duplicate).length,invalid=companyImportRows.filter(x=>!x.__valid).length;document.getElementById("companyImportSummary").textContent=`រកឃើញ ${companyImportRows.length} ជួរ · អាចបញ្ចូល ${valid} · ស្ទួន ${dup} · មិនពេញលេញ ${invalid}`;const table=document.getElementById("companyImportPreviewTable");table.querySelector("thead tr").innerHTML=["Nick Name","Company Name","Organization Type","Received By","Giver","Result"].map(x=>`<th>${x}</th>`).join("");table.querySelector("tbody").innerHTML=companyImportRows.map(x=>`<tr><td>${escapeHtml(x.nickName)}</td><td>${escapeHtml(x.companyName)}</td><td>${escapeHtml(x.orgType)}</td><td>${escapeHtml(x.receivedBy)}</td><td>${escapeHtml(x.giver)}</td><td>${x.__duplicate?"Duplicate":x.__valid?"Ready":"Invalid"}</td></tr>`).join("");document.getElementById("companyImportPreviewWrap").hidden=false;}catch(err){showToast("មិនអាចអាន CSV បានទេ។ សូមរក្សាទុក Excel ជា CSV UTF-8 រួចសាកល្បងម្ដងទៀត។","error");}};reader.readAsText(file);
}
function confirmCompanyImport(){let added=0,skipped=0;companyImportRows.forEach(x=>{if(!x.__valid||x.__duplicate){skipped++;return;}companyInfos.push({id:"CI-"+Date.now()+"-"+added,nickName:x.nickName,companyName:x.companyName,orgType:x.orgType,receivedBy:x.receivedBy,giver:x.giver,updatedAt:nowIso()});added++;});saveCompanyInfos();populateCompanyLists();renderCompanyInfoTable();cancelCompanyImport();showToast(`បាននាំចូល ${added} ក្រុមហ៊ុន · រំលង ${skipped} ជួរ`,"success");}
function cancelCompanyImport(){companyImportRows=[];const w=document.getElementById("companyImportPreviewWrap");if(w)w.hidden=true;const f=document.getElementById("companyImportFile");if(f)f.value="";}

function wireExtendedFeatures(){
  loadExtendedData(); populateCompanyLists(); resetDdgForm(); renderCompanyInfoTable(); renderDdgTable(); renderHistory();
  const reportMonthInput = document.getElementById("reportMonth");
  if (reportMonthInput && !reportMonthInput.value) reportMonthInput.value = todayInputDate().slice(0, 7);
  renderReports();
  document.getElementById("topSettingsBtn")?.addEventListener("click",()=>switchView("settings"));
  document.getElementById("companyImportPreviewBtn")?.addEventListener("click",previewCompanyImport);
  document.getElementById("confirmCompanyImportBtn")?.addEventListener("click",confirmCompanyImport);
  document.getElementById("cancelCompanyImportBtn")?.addEventListener("click",cancelCompanyImport);
  const cform=document.getElementById("companyInfoForm"); if(cform)cform.addEventListener("submit",saveCompanyInfo);
  document.getElementById("clearCompanyInfoBtn")?.addEventListener("click",resetCompanyInfoForm); document.getElementById("companyInfoSearch")?.addEventListener("input",renderCompanyInfoTable);
  document.getElementById("companyInfoBody")?.addEventListener("click",e=>{const ed=e.target.closest("[data-ci-edit]"),del=e.target.closest("[data-ci-delete]");if(ed)editCompanyInfo(ed.dataset.ciEdit);if(del)deleteCompanyInfo(del.dataset.ciDelete);});
  document.getElementById("f_nickName")?.addEventListener("input",()=>applyCompanyInfo(findCompanyInfo(document.getElementById("f_nickName").value)));
  
  document.getElementById("ddgForm")?.addEventListener("submit",saveDdg);document.getElementById("ddgClearBtn")?.addEventListener("click",resetDdgForm);document.getElementById("ddgSearch")?.addEventListener("input",renderDdgTable);document.getElementById("ddgRefreshBtn")?.addEventListener("click",renderDdgTable);
  document.getElementById("ddgBody")?.addEventListener("click",e=>{const v=e.target.closest("[data-ddg-view]"),u=e.target.closest("[data-ddg-update]"),c=e.target.closest("[data-ddg-complete]");if(v)viewDdg(v.dataset.ddgView);if(u)openDdgUpdate(u.dataset.ddgUpdate);if(c)completeDdg(c.dataset.ddgComplete);});
  document.getElementById("ddg_attachment")?.addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;if(f.size>5*1024*1024){e.target.value="";showToast(t("attachment_too_large"),"error");return;}const r=new FileReader();r.onload=()=>{ddgSelectedAttachment={name:f.name,data:String(r.result),type:f.type||"application/octet-stream"};document.getElementById("ddg_attachmentName").textContent=`${t("attachment_selected")}: ${f.name}`;};r.readAsDataURL(f);});
  document.getElementById("ddgUpdateForm")?.addEventListener("submit",submitDdgUpdate);document.getElementById("dashboardDate")?.addEventListener("change",renderDashboard);document.getElementById("historySearch")?.addEventListener("input",renderHistory);document.getElementById("reportRefreshBtn")?.addEventListener("click",renderReports);document.getElementById("reportMonth")?.addEventListener("change",renderReports);document.getElementById("reportExcelBtn")?.addEventListener("click",exportReportExcel);document.getElementById("reportWordBtn")?.addEventListener("click",exportReportWord);document.getElementById("reportPdfBtn")?.addEventListener("click",exportReportPdf);
  document.querySelectorAll("[data-view-target]").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.viewTarget==="reports")renderReports();}));
}

function onLanguageChanged(){
  try {
    const savedSubjects = storageGet("sisd_document_subjects", []);
    const subjectList = document.getElementById("documentSubjectList");
    if (subjectList) {
      const defaults = [...subjectList.querySelectorAll("option")].map(o => o.value);
      subjectList.innerHTML = [...new Set([...defaults, ...savedSubjects])].map(x => `<option value="${escapeHtml(x)}"></option>`).join("");
    }
  } catch (_) {}
  populateDropdowns(); renderDashboard(); renderTable(); populateCompanyLists(); renderCompanyInfoTable(); renderDdgTable(); renderHistory(); renderReports();
  const ft=document.getElementById("formTitle"); if(ft)ft.textContent=editingId?t("form_edit_title"):t("form_add_title");
  const sb=document.getElementById("saveBtn"); if(sb)sb.textContent=editingId?t("btn_update"):t("btn_save");
}

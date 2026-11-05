/**
 * i18n.js
 * ------------------------------------------------------------------
 * English / Khmer language toggle for the SISD-IN system.
 *
 * How it works:
 *  - TRANSLATIONS holds every UI string in both languages.
 *  - t(key) returns the string in the currently selected language.
 *  - tf(key, vars) does the same but substitutes {placeholders}.
 *  - applyStaticTranslations() fills every element in index.html that
 *    carries a data-i18n / data-i18n-placeholder / data-i18n-title
 *    attribute.
 *  - Anything app.js builds dynamically (dashboard cards, table rows,
 *    toasts, modal content, pagination…) calls t()/tf() itself, and
 *    app.js's onLanguageChanged() re-renders those parts whenever the
 *    language is switched.
 *  - The chosen language is remembered in LocalStorage so it persists
 *    across visits.
 * ------------------------------------------------------------------
 */

"use strict";

const LANG_STORAGE_KEY = "sisd_in_lang";

const TRANSLATIONS = {
  brand_title: { en: "SISD-IN Document Management System", km: "ប្រព័ន្ធគ្រប់គ្រងឯកសារចូល SISD-IN" },
  brand_subtitle: { en: "Incoming Document Registration & Records Management", km: "ការចុះបញ្ជី និងគ្រប់គ្រងឯកសារចូល" },
  storage_pill_title: { en: "Data is stored locally in this browser.", km: "ទិន្នន័យរក្សាទុកក្នុងកុំព្យូទ័រនេះ។" },
  storage_pill: { en: "Data is stored locally in this browser", km: "ទិន្នន័យរក្សាទុកក្នុងកុំព្យូទ័រនេះ" },

  nav_dashboard: { en: "Dashboard", km: "ផ្ទាំងគ្រប់គ្រង" },
  nav_add: { en: "Add Document", km: "បញ្ចូលឯកសារ" },
  nav_documents: { en: "Documents", km: "បញ្ជីឯកសារ" },
  nav_import_export: { en: "Import / Export", km: "នាំចូល / នាំចេញ" },
  nav_settings: { en: "Settings", km: "ការកំណត់" },

  sidebar_footer_1: { en: "SISD-IN · Offline prototype", km: "SISD-IN · គំរូគ្មានអ៊ីនធឺណិត" },
  sidebar_footer_2: { en: "No data leaves this browser.", km: "គ្មានទិន្នន័យចេញពីកម្មវិធីនេះទេ។" },

  dashboard_heading: { en: "Dashboard", km: "ផ្ទាំងគ្រប់គ្រង" },
  dashboard_sub: { en: "Overview of all incoming documents recorded in SISD-IN.", km: "ទិដ្ឋភាពទូទៅនៃឯកសារចូលទាំងអស់ដែលបានកត់ត្រានៅក្នុង SISD-IN។" },

  card_total: { en: "Total Documents", km: "ចំនួនឯកសារសរុប" },
  card_today: { en: "Today's Documents", km: "ឯកសារថ្ងៃនេះ" },
  card_month: { en: "This Month", km: "ខែនេះ" },
  card_processing: { en: "Processing", km: "កំពុងដំណើរការ" },
  card_completed: { en: "Completed", km: "បានបញ្ចប់" },
  card_archived: { en: "Archived", km: "ទុកក្នុងបណ្ណសារ" },

  recent_heading: { en: "Recently added", km: "បានបញ្ចូលថ្មីៗ" },
  view_all: { en: "View all →", km: "មើលទាំងអស់ →" },

  th_no: { en: "No.", km: "លេខរៀង" },
  th_date: { en: "Date-in", km: "កាលបរិច្ឆេទ" },
  th_time: { en: "Time-in", km: "ម៉ោង" },
  th_docname: { en: "Document Name", km: "កម្មវត្ថុ" },
  th_docname_full: { en: "Document Name / កម្មវត្ថុ", km: "កម្មវត្ថុ" },
  th_company_short: { en: "Company", km: "ក្រុមហ៊ុន" },
  th_giver: { en: "Giver", km: "អ្នកប្រគល់" },
  th_nocom: { en: "No. Com", km: "លេខលិខិត" },
  th_action: { en: "Action", km: "សកម្មភាព" },
  th_status: { en: "Status", km: "ស្ថានភាព" },


  form_add_title: { en: "Add Incoming Document", km: "បញ្ចូលឯកសារចូល" },
  form_edit_title: { en: "Edit Document", km: "កែប្រែឯកសារ" },
  form_required_note: { en: "Fields marked", km: "កន្លែងដែលមាន" },
  form_required_note_2: { en: "are required.", km: "ត្រូវតែបំពេញ។" },

  label_no: { en: "No.", km: "លេខរៀង" },
  label_date: { en: "Date-in", km: "កាលបរិច្ឆេទ" },
  label_time: { en: "Time-in", km: "ម៉ោងទទួល" },
  label_nocom: { en: "No. Com", km: "លេខលិខិត" },
  label_company: { en: "Company Name", km: "ឈ្មោះក្រុមហ៊ុន" },
  label_nick: { en: "Nick Name", km: "ឈ្មោះកាត់" },
  label_docname: { en: "Document Name", km: "កម្មវត្ថុ" },
  placeholder_company_document_no: { en: "e.g. ABC/2026/015", km: "ឧ. ABC/2026/015" },
  placeholder_giver: { en: "Enter giver name", km: "បញ្ចូលឈ្មោះអ្នកប្រគល់" },
  label_source: { en: "Source", km: "ប្រភព" },
  label_source_other: { en: "Other source (please specify)", km: "ប្រភពផ្សេងទៀត (សូមបញ្ជាក់)" },
  label_giver: { en: "Giver", km: "អ្នកប្រគល់" },
  label_channel: { en: "Channel", km: "មធ្យោបាយទទួល" },
  label_status: { en: "Status", km: "ស្ថានភាព" },
  label_receivedby: { en: "Received By", km: "អ្នកទទួល" },
  label_attachment: { en: "Attachment", km: "ឯកសារភ្ជាប់" },
  attachment_hint: { en: "No file selected. (File name is stored; the file itself stays on your computer.)", km: "មិនទាន់ជ្រើសរើសឯកសារទេ។ (ឈ្មោះឯកសារនឹងត្រូវរក្សាទុក ប៉ុន្តែឯកសារខ្លួនឯងនៅតែស្ថិតក្នុងកុំព្យូទ័ររបស់អ្នក។)" },
  attachment_selected: { en: "Selected", km: "បានជ្រើសរើស" },
  attachment_download: { en: "Download", km: "ទាញយក" },
  attachment_not_stored: { en: "Only the file name was saved", km: "បានរក្សាទុកតែឈ្មោះឯកសារ" },
  attachment_preview_unavailable: { en: "Preview is not available for this file type.", km: "មិនអាចបង្ហាញមើលឯកសារប្រភេទនេះបានទេ។" },
  attachment_too_large: { en: "File is too large. Maximum size is 5 MB.", km: "ឯកសារធំពេក។ ទំហំអតិបរមាគឺ 5 MB។" },
  attachment_read_error: { en: "Could not read the selected file.", km: "មិនអាចអានឯកសារដែលបានជ្រើសរើសបានទេ។" },
  label_remark: { en: "Remark", km: "កំណត់សម្គាល់" },
  select_default: { en: "-- Select --", km: "-- ជ្រើសរើស --" },

  btn_save: { en: "Save Document", km: "រក្សាទុកឯកសារ" },
  btn_update: { en: "Update Document", km: "កែប្រែឯកសារ" },
  btn_clear: { en: "Clear", km: "សម្អាត" },
  btn_cancel_edit: { en: "Cancel Edit", km: "បោះបង់ការកែប្រែ" },

  documents_heading: { en: "Documents", km: "ឯកសារចូល" },
  documents_sub: { en: "Search, filter, sort and manage every incoming document.", km: "ស្វែងរក ត្រង តម្រៀប និងគ្រប់គ្រងឯកសារចូលទាំងអស់។" },

  search_placeholder: { en: "Search by No., Company, Doc. Name, Nick Name, Source, Giver, Remark", km: "ស្វែងរកតាមលេខរៀង ឈ្មោះក្រុមហ៊ុន កម្មវត្ថុ ឈ្មោះកាត់ ប្រភព អ្នកប្រគល់ និងកំណត់សម្គាល់"},
  btn_advanced_filter: { en: "Advanced Search / Filter ▾", km: "ស្វែងរកលម្អិត / ត្រង ▾" },
  btn_print: { en: "Print", km: "បោះពុម្ព" },

  filter_date_from: { en: "Date From", km: "ចាប់ពីថ្ងៃទី" },
  filter_date_to: { en: "Date To", km: "ដល់ថ្ងៃទី" },
  filter_all: { en: "All", km: "ទាំងអស់" },
  btn_search: { en: "Search", km: "ស្វែងរក" },
  btn_reset_filter: { en: "Reset Filter", km: "សម្អាតការត្រង" },

  per_page_label: { en: "Per page:", km: "ក្នុងមួយទំព័រ៖" },

  btn_view: { en: "View", km: "មើល" },
  btn_edit: { en: "Edit", km: "កែប្រែ" },
  btn_delete: { en: "Delete", km: "លុប" },
  btn_close: { en: "Close", km: "បិទ" },
  btn_cancel: { en: "Cancel", km: "បោះបង់" },

  empty_table: { en: "No matching documents found.", km: "រកមិនឃើញឯកសារដែលត្រូវគ្នា។" },
  no_documents_yet: { en: "No documents yet.", km: "មិនទាន់មានឯកសារទេ។" },

  pagination_prev: { en: "Previous", km: "មុន" },
  pagination_next: { en: "Next", km: "បន្ទាប់" },

  modal_view_title: { en: "Document Information", km: "ព័ត៌មានឯកសារ" },
  detail_doc_no: { en: "Document No.", km: "លេខឯកសារ" },
  detail_date_in: { en: "Date-in", km: "កាលបរិច្ឆេទ" },
  detail_time_in: { en: "Time-in", km: "ម៉ោង" },
  detail_company_doc_no: { en: "Company Document No.", km: "លេខលិខិតក្រុមហ៊ុន" },
  detail_company_name: { en: "Company Name", km: "ឈ្មោះក្រុមហ៊ុន" },
  detail_nick_name: { en: "Nick Name", km: "ឈ្មោះកាត់" },
  detail_doc_name: { en: "Document Name / កម្មវត្ថុ", km: "កម្មវត្ថុ" },
  detail_source: { en: "Source", km: "ប្រភព" },
  detail_giver: { en: "Giver", km: "អ្នកប្រគល់" },
  detail_channel: { en: "Channel", km: "មធ្យោបាយទទួល" },
  detail_status: { en: "Status", km: "ស្ថានភាព" },
  detail_received_by: { en: "Received By", km: "អ្នកទទួល" },
  detail_remark: { en: "Remark", km: "កំណត់សម្គាល់" },
  detail_attachment: { en: "Attachment", km: "ឯកសារភ្ជាប់" },

  modal_delete_title: { en: "Delete Document", km: "លុបឯកសារ" },
  delete_confirm_text: { en: "Are you sure you want to delete this document?", km: "តើអ្នកប្រាកដជាចង់លុបឯកសារនេះមែនទេ?" },

  import_export_heading: { en: "Import / Export", km: "នាំចូល / នាំចេញ" },
  import_export_sub: { en: "Bring in data from an Excel/CSV export, or send data out.", km: "នាំចូលទិន្នន័យពី Excel/CSV ឬនាំចេញទិន្នន័យ។" },
  import_heading: { en: "Import Data", km: "នាំចូលទិន្នន័យ" },
  import_sub: { en: "Import a CSV file exported from Excel. Expected columns: No., Date-in, Time-in, Doc. Name, No_Com, Nick Name, Company-Name, Source, Status, Giver, Received By, Remark.",
  km: "នាំចូលឯកសារ CSV ដែលបាននាំចេញពី Excel។ ជួរឈរដែលត្រូវការ៖ No., Date-in, Time-in, Doc. Name, No_Com, Nick Name, Company-Name, Source, Channel, Status, Giver, Received By, Remark។" },
  checkbox_overwrite: { en: "Overwrite existing records when a matching No. is found", km: "សរសេរជាន់លើកំណត់ត្រាដែលមានស្រាប់ នៅពេលរកឃើញលេខដូចគ្នា" },
  btn_import: { en: "Import", km: "នាំចូល" },

  export_heading: { en: "Export Data", km: "នាំចេញទិន្នន័យ" },
  export_sub: { en: "Exports respect any active filter on the Documents page.", km: "ការនាំចេញគោរពតាមតម្រងដែលកំពុងប្រើនៅទំព័រឯកសារ។" },
  btn_export_csv: { en: "Export CSV", km: "នាំចេញ CSV" },
  btn_export_excel: { en: "Export Excel (.xls)", km: "នាំចេញ Excel (.xls)" },

  settings_heading: { en: "Settings", km: "ការកំណត់" },
  settings_sub: { en: "Data lives only in this browser's LocalStorage. Back it up regularly.", km: "ទិន្នន័យមាននៅតែក្នុង LocalStorage របស់កម្មវិធីរុករកនេះប៉ុណ្ណោះ។ សូមបម្រុងទុកជាប្រចាំ។" },
  backup_heading: { en: "Backup Data", km: "បម្រុងទុកទិន្នន័យ" },
  backup_sub: { en: "Download the entire database as a JSON file. Keep it somewhere safe — clearing browser data will erase LocalStorage.", km: "ទាញយកមូលដ្ឋានទិន្នន័យទាំងមូលជាឯកសារ JSON។ រក្សាទុកនៅកន្លែងមានសុវត្ថិភាព — ការសម្អាតទិន្នន័យកម្មវិធីរុករកនឹងលុប LocalStorage។" },
  restore_heading: { en: "Restore Data", km: "ស្តារទិន្នន័យ" },
  restore_sub: { en: "Restore from a previously exported JSON backup. This replaces the current database.", km: "ស្តារពីឯកសារបម្រុងទុក JSON ដែលបាននាំចេញពីមុន។ វានឹងជំនួសមូលដ្ឋានទិន្នន័យបច្ចុប្បន្ន។" },
  reset_demo_heading: { en: "Reset Demo Data", km: "កំណត់ទិន្នន័យសាកល្បងឡើងវិញ" },
  reset_demo_sub: { en: "Wipes everything and reloads the original 11 sample/demo records. Cannot be undone.", km: "លុបទិន្នន័យទាំងអស់ ហើយផ្ទុកកំណត់ត្រាគំរូ ១១ ឡើងវិញ។ មិនអាចមិនធ្វើវិញបានទេ។" },
  btn_reset_demo: { en: "Reset to Demo Data", km: "កំណត់ទៅជាទិន្នន័យសាកល្បង" },
  notice_strong: { en: "Data is stored locally in this browser.", km: "ទិន្នន័យរក្សាទុកក្នុងកម្មវិធីរុករកនេះប៉ុណ្ណោះ។" },
  notice_text: { en: "This application works fully offline after the page has loaded and never sends any data to an external server.", km: "កម្មវិធីនេះដំណើរការគ្មានអ៊ីនធឺណិតទាំងស្រុងបន្ទាប់ពីទំព័របានផ្ទុក ហើយមិនដែលផ្ញើទិន្នន័យទៅម៉ាស៊ីនមេខាងក្រៅឡើយ។" },

  status_Received: { en: "Received", km: "ទទួលបាន" },
  status_Processing: { en: "Processing", km: "កំពុងដំណើរការ" },
  status_Completed: { en: "Completed", km: "បានបញ្ចប់" },
  status_Archived: { en: "Archived", km: "ទុកក្នុងបណ្ណសារ" },

  channel_Onsite: { en: "Onsite", km: "ផ្ទាល់នៅការិយាល័យ" },
  channel_Email: { en: "Email", km: "អ៊ីមែល" },
  channel_Official_Letter: { en: "Official Letter", km: "លិខិតផ្លូវការ" },
  channel_Courier: { en: "Courier", km: "អ្នកដឹកជញ្ជូន" },
  channel_Other: { en: "Other", km: "ផ្សេងៗ" },

  toast_saved: { en: "Document saved successfully.", km: "បានរក្សាទុកឯកសារដោយជោគជ័យ។" },
  toast_updated: { en: "Document updated.", km: "បានកែប្រែឯកសារ។" },
  toast_deleted: { en: "Document deleted.", km: "បានលុបឯកសារ។" },
  msg_missing_prefix: { en: "Please fill in required fields:", km: "សូមបំពេញព័ត៌មានដែលត្រូវការ៖" },
  missing_date_in: { en: "Date-in", km: "កាលបរិច្ឆេទ" },
  missing_time_in: { en: "Time-in", km: "ម៉ោង" },
  missing_document_name: { en: "Document Name", km: "កម្មវត្ថុ" },
  missing_company_name: { en: "Company Name", km: "ឈ្មោះក្រុមហ៊ុន" },
  missing_source: { en: "Source", km: "ប្រភព" },
  missing_channel: { en: "Channel", km: "មធ្យោបាយទទួល" },

  toast_no_data_csv: { en: "The CSV file has no data rows.", km: "ឯកសារ CSV មិនមានទិន្នន័យទេ។" },
  toast_backup_done: { en: "Backup downloaded.", km: "បានទាញយកឯកសារបម្រុងទុក។" },
  toast_invalid_backup: { en: "This file is not a valid SISD-IN backup.", km: "ឯកសារនេះមិនមែនជាឯកសារបម្រុងទុក SISD-IN ត្រឹមត្រូវទេ។" },
  toast_demo_reset: { en: "Demo data restored.", km: "បានស្តារទិន្នន័យសាកល្បង។" },
  toast_import_complete: { en: "Import complete: {imported} added, {updated} updated, {skipped} skipped.", km: "នាំចូលបានចប់សព្វគ្រប់៖ បានបន្ថែម {imported}, បានកែប្រែ {updated}, បានរំលង {skipped}។" },
  toast_export_csv: { en: "Exported {count} records to CSV.", km: "បាននាំចេញ {count} កំណត់ត្រាទៅ CSV។" },
  toast_export_excel: { en: "Exported {count} records to Excel.", km: "បាននាំចេញ {count} កំណត់ត្រាទៅ Excel។" },
  toast_restore_loaded: { en: "Backup file loaded: {count} records ready to restore.", km: "បានផ្ទុកឯកសារបម្រុងទុក៖ {count} កំណត់ត្រាត្រៀមរួចរាល់ដើម្បីស្តារ។" },
  toast_restore_done: { en: "Restored {count} records.", km: "បានស្តារ {count} កំណត់ត្រា។" },

  results_summary_zero: { en: "Showing 0 records", km: "កំពុងបង្ហាញ ០ កំណត់ត្រា" },
  results_summary: { en: "Showing {start}–{end} of {total} records", km: "កំពុងបង្ហាញ {start}–{end} នៃ {total} កំណត់ត្រា" },

  import_summary_detected: { en: "Records detected", km: "កំណត់ត្រាបានរកឃើញ" },
  import_summary_valid: { en: "Valid", km: "ត្រឹមត្រូវ" },
  import_summary_invalid: { en: "Invalid", km: "មិនត្រឹមត្រូវ" },
  import_summary_duplicate: { en: "Duplicate", km: "ស្ទួន" },

  confirm_reset_demo: { en: "This will erase all current data and reload the demo dataset. Continue?", km: "សកម្មភាពនេះនឹងលុបទិន្នន័យបច្ចុប្បន្នទាំងអស់ ហើយផ្ទុកទិន្នន័យសាកល្បងឡើងវិញ។ បន្តទេ?" },
};

/** Currently active language: "en" or "km". Restored from LocalStorage, defaults to English. */
let currentLang = localStorage.getItem(LANG_STORAGE_KEY) === "km" ? "km" : "en";

/** Translate a single key into the current language. */
function t(key) {
  const entry = TRANSLATIONS[key];
  if (!entry) return key;
  return entry[currentLang] || entry.en || key;
}

/** Translate a key and substitute {placeholders} with values from vars. */
function tf(key, vars) {
  let str = t(key);
  Object.entries(vars || {}).forEach(([k, v]) => {
    str = str.replace(new RegExp("\\{" + k + "\\}", "g"), v);
  });
  return str;
}

/** Fill every static element that declares a data-i18n* attribute. */
function applyStaticTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (TRANSLATIONS[key]) el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (TRANSLATIONS[key]) el.placeholder = t(key);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.dataset.i18nTitle;
    if (TRANSLATIONS[key]) el.title = t(key);
  });

  // Translate placeholders for form fields.
  // This also supports the current HTML even if data-i18n-placeholder
  // has not yet been added to those inputs.
  const placeholderMap = {
    f_companyDocumentNo: "placeholder_company_document_no",
    f_giver: "placeholder_giver"
  };

  Object.entries(placeholderMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el && TRANSLATIONS[key]) {
      el.placeholder = t(key);
    }
  });

  const root = document.getElementById("htmlRoot");
  if (root) root.lang = currentLang;

  document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.langBtn === currentLang);
  });
}

/** Switch the active language, persist it, and refresh the whole UI. */
function setLanguage(lang) {
  if (lang !== "en" && lang !== "km") return;
  currentLang = lang;
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  applyStaticTranslations();
  // app.js defines this to re-render dashboard/table/form text it builds itself.
  if (typeof onLanguageChanged === "function") onLanguageChanged();
}

function wireLanguageToggle() {
  document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
    btn.addEventListener("click", () => setLanguage(btn.dataset.langBtn));
  });
  applyStaticTranslations();
}

document.addEventListener("DOMContentLoaded", wireLanguageToggle);

/* Extended DMS translations */
Object.assign(TRANSLATIONS, {
  nav_add_info:{en:"Add Information",km:"បញ្ចូលព័ត៌មាន"}, nav_add:{en:"Document in",km:"ឯកសារចូល"}, nav_ddg:{en:"Document to DDG",km:"ឯកសារទៅ DDG"}, nav_documents:{en:"Document List",km:"បញ្ជីឯកសារ"}, nav_records:{en:"Records / History",km:"កំណត់ត្រា / ប្រវត្តិ"}, nav_reports:{en:"Reports",km:"របាយការណ៍"},
  add_info_heading:{en:"Add Information",km:"បញ្ចូលព័ត៌មាន"}, add_info_sub:{en:"Save company information for auto-complete and auto-fill in new documents.",km:"រក្សាទុកព័ត៌មានក្រុមហ៊ុនសម្រាប់បំពេញស្វ័យប្រវត្តិក្នុងឯកសារថ្មី។"}, saved_info_heading:{en:"Saved Company Information",km:"ព័ត៌មានក្រុមហ៊ុនដែលបានរក្សាទុក"},
  label_org_type:{en:"Organization Type",km:"ប្រភេទស្ថាប័ន"}, label_destination:{en:"Destination",km:"គោលដៅ"}, label_update_from:{en:"Updated by / កែប្រែពី",km:"កែប្រែពីនរណា"}, label_timestamp:{en:"Timestamp",km:"ពេលវេលាកត់ត្រា"}, label_month:{en:"Month",km:"ខែ"}, label_year:{en:"Year",km:"ឆ្នាំ"}, label_period:{en:"Period",km:"រយៈពេល"},
  ddg_heading:{en:"Document to DDG",km:"ឯកសារទៅ DDG"}, ddg_sub:{en:"Register documents sent to DDG or DG, upload supporting files, and track updates.",km:"ចុះបញ្ជីឯកសារដែលផ្ញើទៅ DDG ឬ DG បញ្ចូលឯកសារភ្ជាប់ និងតាមដានការកែប្រែ។"},
  records_heading:{en:"Records / History",km:"កំណត់ត្រា / ប្រវត្តិ"}, records_sub:{en:"Audit trail of updates and completed documents.",km:"ប្រវត្តិនៃការកែប្រែ និងឯកសារដែលបានបញ្ចប់។"}, history_heading:{en:"History",km:"ប្រវត្តិ"}, no_history:{en:"No history records.",km:"មិនទាន់មានកំណត់ត្រាប្រវត្តិទេ។"},
  reports_heading:{en:"Summary Reports",km:"របាយការណ៍សរុប"}, reports_sub:{en:"Daily, monthly and yearly document activity.",km:"សកម្មភាពឯកសារប្រចាំថ្ងៃ ប្រចាំខែ និងប្រចាំឆ្នាំ។"}, daily_report_heading:{en:"Report Summary",km:"សេចក្តីសង្ខេបរបាយការណ៍"}, report_in:{en:"Document in",km:"ឯកសារចូល"}, report_ddg:{en:"Document to DDG",km:"ឯកសារទៅ DDG"}, report_dg:{en:"Document to DG",km:"ឯកសារទៅ DG"}, report_updated:{en:"Updated",km:"បានកែប្រែ"}, report_completed:{en:"Complete",km:"បានបញ្ចប់"},
  btn_complete:{en:"Complete",km:"បញ្ចប់"}, btn_update:{en:"Update",km:"កែប្រែ"}, btn_export_word:{en:"Export Word",km:"នាំចេញ Word"}, btn_export_pdf:{en:"Export PDF",km:"នាំចេញ PDF"},
  toast_info_saved:{en:"Company information saved.",km:"បានរក្សាទុកព័ត៌មានក្រុមហ៊ុន។"}, confirm_delete_info:{en:"Delete this company information?",km:"តើលុបព័ត៌មានក្រុមហ៊ុននេះឬ?"}, toast_ddg_saved:{en:"Document to DDG saved.",km:"បានរក្សាទុកឯកសារទៅ DDG។"}, toast_update_recorded:{en:"Update recorded with timestamp.",km:"បានកត់ត្រាការកែប្រែជាមួយពេលវេលា។"}, toast_completed:{en:"Document marked complete.",km:"បានសម្គាល់ឯកសារថាបានបញ្ចប់។"}, complete_note:{en:"Document completed / approved.",km:"ឯកសារបានបញ្ចប់ / អនុម័ត។"}, update_heading:{en:"Update Document",km:"កែប្រែឯកសារ"}, popup_blocked:{en:"Please allow pop-ups to print the PDF report.",km:"សូមអនុញ្ញាត Pop-up ដើម្បីបង្កើត PDF report។"}
});
Object.assign(TRANSLATIONS,{today_updates_heading:{en:"Today's Updates",km:"ការកែប្រែថ្ងៃនេះ"}});

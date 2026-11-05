# SISD-IN Document Management System

**Incoming Document Registration & Records Management**

A self-contained, offline web application that replaces the Excel file
used to record and track incoming documents. Built with plain HTML,
CSS and JavaScript only — no server, no build step, no external
dependencies.

## Files

```
sisd-in-document-system/
├── index.html   # Page structure (dashboard, forms, table, modals)
├── style.css    # All styling and responsive layout
├── app.js       # CRUD, search, filter, sort, pagination, import/export, backup
├── data.js      # Demo/sample data (used only the first time the app runs)
└── README.md    # This file
```

## How to run it

1. Copy the whole `sisd-in-document-system` folder to any computer.
2. Double-click **`index.html`**. It opens in your default browser.
3. That's it — no server, no installation, no internet connection required.

Works in any modern browser (Chrome, Edge, Firefox). Keep all five
files together in the same folder; the app won't work if `style.css`,
`app.js`, or `data.js` are moved or renamed.

## How data is stored

Application records are stored locally in the browser's **IndexedDB** database
(`SISD_IN_Database`). The database is device- and browser-specific; records are
not uploaded to a server and are not shared with other computers.

On first launch after this update, SISD-IN automatically copies the existing
LocalStorage datasets (incoming documents, company information, DDG documents,
and saved subjects) into IndexedDB. The original LocalStorage values are kept
as a safety copy; they are not deleted during migration. The interface and
existing workflows remain the same.

IndexedDB quota is determined by the browser, available disk space, and browser
storage policy. There is no single fixed capacity guarantee. Keep regular JSON
backups using Settings → Backup Data. Clearing site/browser data can delete the
local database. Use the same browser and same app origin/folder to access the
same database.

If IndexedDB is unavailable, the app falls back to LocalStorage where possible.

## Everyday use

- **Dashboard** — live counts: total, today's, this month, processing,
  completed, archived.
- **Add Document** (បញ្ចូលឯកសារ) — the document number is generated
  automatically; required fields are Date-in, Time-in, Document Name,
  Company Name, Source, and Channel.
- **Documents** (ឯកសារចូល) — instant search across No., company
  document No., document name, company name, nick name, source,
  channel, received-by and remark; an **Advanced Search / Filter**
  panel for date range, company, source, channel, status, and
  received-by; click any column header to sort; choose 20/50/100 rows
  per page.
- **View / Edit / Delete** — from the Action column or the search
  results. Deleting always asks for confirmation first.

## Importing from Excel/CSV

1. In Excel, save your sheet as **CSV (Comma delimited) (*.csv)**.
2. Go to **Import / Export → Import Data** and choose the file.
3. The app shows a preview with counts of records detected, valid,
   invalid, and duplicate (matched by document No.).
4. Tick **"Overwrite existing records…"** if you want duplicates to
   replace what's already stored; otherwise duplicates are skipped.
5. Click **Import**.

Recognized column headers (case-insensitive): `No.`, `Date-in`,
`Time-in`, `Doc. Name`, `No_Com`, `Nick Name`, `Company-Name`,
`Source`, `Channel`, `Status`, `Received By`, `Remark`.

## Exporting data

From **Import / Export → Export Data**:

- **Export CSV** — a `.csv` file you can reopen in Excel.
- **Export Excel (.xls)** — an Excel-readable file (HTML table saved
  with an `.xls` extension — double-click and Excel opens it directly).
- **Print** — a clean, browser-native print/PDF layout.

Exports respect whatever search term or advanced filter is currently
active on the Documents page. Clear filters first to export everything.

## Backing up and restoring

LocalStorage can be lost if the browser's data/cache is cleared, the
browser is reinstalled, or you switch computers — so back up regularly.

- **Settings → Backup Data**: downloads the full database as a
  timestamped `.json` file. Keep this file somewhere safe (a shared
  drive, USB, etc.).
- **Settings → Restore Data**: choose a previously downloaded `.json`
  backup to restore it. This **replaces** whatever is currently
  stored, so restore only when you're sure.
- **Settings → Reset Demo Data**: wipes everything and reloads the
  original 11 sample records — useful for training or testing.

## Limitations of browser LocalStorage

- **Not shared** between browsers or devices — each browser/computer
  has its own separate copy of the data.
- **Can be cleared** by the user or the browser (clearing "site data"
  or "cookies and site data" for this page deletes it).
- **No real multi-user support** — if two people open the app on two
  different computers, they each have their own database; nothing
  syncs automatically. Use the JSON backup/restore feature to move
  data between machines.
- **Attachments are not stored as files.** Browsers do not allow web
  pages to keep a permanent copy of a file on disk. The Attachment
  field only remembers the **file name** you chose; keep the actual
  scanned file in your normal shared folder and use the name as a
  pointer to it.
- **Storage size** is limited (typically a few MB per browser), which
  is far more than enough for tens of thousands of text records, but
  is not designed for storing the scanned files themselves.

For long-term, multi-user, networked use, this prototype would need
to be paired with a real backend/database — but as a drop-in
replacement for a single-user Excel workflow, it works fully offline
out of the box.


## Update notes (2026-10-21)

- Full backup now includes all three LocalStorage datasets: incoming documents, company information, and documents routed to DDG (including their history).
- Restore validates the backup structure and asks for confirmation before replacing data. Legacy backups containing only an array of incoming documents remain supported; restoring one preserves the existing company/DDG datasets.
- Reports now include a selected-day versus previous-calendar-day comparison for incoming documents, documents to DDG/DG, updates, and completions. Percentage change displays `N/A (new)` when the previous-day count is zero and today's count is non-zero.
- This remains a single-browser, offline prototype. It does not synchronize data between devices or users.

## Update notes (2026-10-21)
- Dashboard now includes a date selector, six daily activity bar indicators, daily change comparison, and revision counts by role.
- Daily Change Comparison has been moved out of Reports and into the Dashboard.
- Add Information includes a shortcut to the Import Data section. Import currently uses CSV exported from Excel and provides preview/duplicate checks before confirming.
- Incoming-document list displays Nick Name before Company Name and no longer displays the Status column in the list.
- Document to DDG's Update action is now a revision-tracking action only. It asks for one of three roles (Department Head / Deputy Director General / Director), records an automatic timestamp, and does not edit document details.
- Revision events are included in history and role-count summaries.

Note: This remains a local-browser prototype. Data is not synchronized across browsers or computers. Keep backups before importing/restoring data. For real multi-user use, migrate to a shared database and authentication.


## Update notes (SISD-IN revision)

- Removed the six summary cards from the Dashboard; the six-category Daily Activity bar chart remains, with a selectable date.
- Daily Change Comparison remains on the Dashboard and now includes revision counts by role. It is not part of the Reports page.
- Settings is opened from the gear button in the top bar instead of a Sidebar menu item.
- Incoming document form places Nick Name before Company Name and hides the Status field while preserving a default status internally for compatibility.
- Add Information includes a separate company-list import preview, duplicate checks, and confirmation. For offline use, save the Excel workbook as CSV UTF-8 first; direct `.xlsx` parsing is not bundled. Duplicate rows are skipped and existing company records are retained.
- Document to DDG form now uses a manually entered unique ID, automatic date/time, officer name, company name, and subject only. Legacy DDG data is retained in LocalStorage; the list displays the key fields, revision count, a revision-recording button, and Complete button.
- The revision button only records the selected role (Department Head, Deputy Director General, or Director), document ID, and timestamp; it does not edit the document fields.
- Complete records completion and timestamp.

Important: this remains an offline LocalStorage prototype. Data stays in the current browser profile and does not synchronize to other computers. Export a full JSON backup before replacing the application files.


## Update notes (2026-10)
- Incoming document number now increments by calendar year and starts at `0001` for a new year.
- Save/update notifications are more visible and accessible.
- Reports menu now shows monthly summary only, with a month selector and export options.
- Existing LocalStorage data keys and saved records are preserved.


## Update notes (2026-10-31)
- Sidebar navigation reordered: Dashboard, Document List, Document in, Document to DDG, Add Information, Reports, Import/Export.
- Document List includes filters for incoming, edited, and completed incoming records.
- Monthly Reports show KPI summary cards and month-over-month comparison with absolute and percentage change.
- Incoming document subject supports searchable suggestions and free-text subjects; custom subjects are remembered in this browser.

## Update notes — IndexedDB

- Migrated application datasets from LocalStorage to IndexedDB with one-time automatic migration.
- Kept original LocalStorage values during migration as a safety copy.
- Added LocalStorage fallback when IndexedDB is unavailable.
- Kept JSON Backup/Restore and existing UI/features.

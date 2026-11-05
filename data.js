/**
 * data.js
 * ------------------------------------------------------------------
 * Demo / sample dataset for the SISD-IN Document Management System.
 *
 * This data is used ONLY the very first time the app runs in a
 * browser (i.e. when localStorage key "sisd_in_documents" does not
 * exist yet). After that, everything the user does is read from and
 * written to localStorage, and this file is no longer consulted.
 *
 * IMPORTANT: All records below are fictional demo/test data.
 * No real, confidential, or production SISD records are included.
 * ------------------------------------------------------------------
 */

const SISD_SAMPLE_DATA = [
  {
    id: "SISD-000001", documentNo: "001", dateIn: "02/09/2026", timeIn: "08:45",
    documentName: "Submission of quarterly compliance report for review",
    companyDocumentNo: "ABC/2026/101", nickName: "ABC", companyName: "ABC Securities Co., Ltd. (DEMO)",
    source: "ក្រុមហ៊ុន", giver: "Srey Mean", status: "Received",
    receivedBy: "SISD-IN Desk (DEMO)", attachment: "", remark: "Demo/test data",
    createdAt: "2026-09-02T08:45:00", updatedAt: "2026-09-03T10:00:00",
  },
  {
    id: "SISD-000002", documentNo: "002", dateIn: "03/09/2026", timeIn: "09:15",
    documentName: "Request for approval of new branch office opening",
    companyDocumentNo: "XYZ/2026/044", nickName: "XYZ", companyName: "XYZ Investment Co., Ltd. (DEMO)",
    source: "ក្រុមហ៊ុន", giver: "Dara Phal", status: "Processing",
    receivedBy: "SISD-IN Desk (DEMO)", attachment: "xyz-branch-request.pdf", remark: "Demo/test data",
    createdAt: "2026-09-03T09:15:00", updatedAt: "2026-09-03T09:15:00",
  },
  {
    id: "SISD-000003", documentNo: "003", dateIn: "04/09/2026", timeIn: "13:30",
    documentName: "License application for non-bank financial service",
    companyDocumentNo: "CFS/2026/012", nickName: "CFS", companyName: "Cambodia Financial Services (DEMO)",
    source: "អាជ្ញាធរសេវាហិរញ្ញវត្ថុមិនមែនធនាគារ", giver: "Srey Mean", status: "Completed",
    receivedBy: "SISD-IN Desk (DEMO)", attachment: "", remark: "Demo/test data",
    createdAt: "2026-09-04T13:30:00", updatedAt: "2026-09-04T13:30:00",
  },
  {
    id: "SISD-000004", documentNo: "004", dateIn: "05/09/2026", timeIn: "10:05",
    documentName: "Notification of change in company director",
    companyDocumentNo: "ESP/2026/077", nickName: "ESP", companyName: "Example Securities Plc. (DEMO)",
    source: "ក្រុមហ៊ុន", giver: "Chan Sophea", status: "Received",
    receivedBy: "SISD-IN Desk (DEMO)", attachment: "director-change-notice.pdf", remark: "Demo/test data",
    createdAt: "2026-09-05T10:05:00", updatedAt: "2026-09-06T11:00:00",
  },
  {
    id: "SISD-000005", documentNo: "005", dateIn: "08/09/2026", timeIn: "14:20",
    documentName: "Response letter regarding prior inspection findings",
    companyDocumentNo: "DC/2026/033", nickName: "DC", companyName: "Demo Capital Co., Ltd. (DEMO)",
    source: "ក្រុមហ៊ុន", giver: "Dara Phal", status: "Completed",
    receivedBy: "SISD-IN Desk (DEMO)", attachment: "", remark: "Demo/test data",
    createdAt: "2026-09-08T14:20:00", updatedAt: "2026-09-08T14:20:00",
  },
  {
    id: "SISD-000006", documentNo: "006", dateIn: "09/09/2026", timeIn: "08:50",
    documentName: "Meeting invitation for annual regulatory forum",
    companyDocumentNo: "MEF/2026/009", nickName: "MEF", companyName: "ក្រសួងសេដ្ឋកិច្ច និងហិរញ្ញវត្ថុ (DEMO)",
    source: "ក្រសួងសេដ្ឋកិច្ច និងហិរញ្ញវត្ថុ", giver: "Srey Mean", status: "Archived",
    receivedBy: "SISD-IN Desk (DEMO)", attachment: "meeting-invite.pdf", remark: "Demo/test data",
    createdAt: "2026-09-09T08:50:00", updatedAt: "2026-09-09T08:50:00",
  },
  {
    id: "SISD-000007", documentNo: "007", dateIn: "10/09/2026", timeIn: "11:40",
    documentName: "Additional document submission for pending license file",
    companyDocumentNo: "ABC/2026/108", nickName: "ABC", companyName: "ABC Securities Co., Ltd. (DEMO)",
    source: "ក្រុមហ៊ុន", giver: "Chan Sophea", status: "Processing",
    receivedBy: "SISD-IN Desk (DEMO)", attachment: "", remark: "Demo/test data",
    createdAt: "2026-09-10T11:40:00", updatedAt: "2026-09-12T09:00:00",
  },
  {
    id: "SISD-000008", documentNo: "008", dateIn: "11/09/2026", timeIn: "15:10",
    documentName: "Request for extension of reporting deadline",
    companyDocumentNo: "XYZ/2026/051", nickName: "XYZ", companyName: "XYZ Investment Co., Ltd. (DEMO)",
    source: "ក្រុមហ៊ុន", giver: "Dara Phal", status: "Received",
    receivedBy: "SISD-IN Desk (DEMO)", attachment: "", remark: "Demo/test data",
    createdAt: "2026-09-11T15:10:00", updatedAt: "2026-09-13T10:30:00",
  },
  {
    id: "SISD-000009", documentNo: "009", dateIn: "14/09/2026", timeIn: "09:00",
    documentName: "Notification of updated shareholder structure",
    companyDocumentNo: "CFS/2026/019", nickName: "CFS", companyName: "Cambodia Financial Services (DEMO)",
    source: "អ.ស.ហ.", giver: "Srey Mean", status: "Completed",
    receivedBy: "SISD-IN Desk (DEMO)", attachment: "shareholder-structure.pdf", remark: "Demo/test data",
    createdAt: "2026-09-14T09:00:00", updatedAt: "2026-09-14T09:00:00",
  },
  {
    id: "SISD-000010", documentNo: "010", dateIn: "15/09/2026", timeIn: "16:05",
    documentName: "Submission of audited financial statements",
    companyDocumentNo: "ESP/2026/084", nickName: "ESP", companyName: "Example Securities Plc. (DEMO)",
    source: "ក្រុមហ៊ុន", giver: "Chan Sophea", status: "Archived",
    receivedBy: "SISD-IN Desk (DEMO)", attachment: "audited-fs-2026.pdf", remark: "Demo/test data",
    createdAt: "2026-09-15T16:05:00", updatedAt: "2026-09-15T16:05:00",
  },
  {
    id: "SISD-000011", documentNo: "011", dateIn: "16/09/2026", timeIn: "09:15",
    documentName: "Request for document submission - regulatory questionnaire",
    companyDocumentNo: "ABC/2026/015", nickName: "ABC", companyName: "ABC Securities Co., Ltd. (DEMO)",
    source: "ក្រុមហ៊ុន", giver: "Srey Mean", status: "Processing",
    receivedBy: "SISD-IN Desk (DEMO)", attachment: "", remark: "Demo/test data",
    createdAt: "2026-09-16T09:15:00", updatedAt: "2026-09-16T09:15:00",
  },
];

// Options used to populate dropdowns throughout the app.
const SISD_SOURCE_OPTIONS = [
  "អ.ស.ហ.",
  "អាជ្ញាធរសេវាហិរញ្ញវត្ថុមិនមែនធនាគារ",
  "ក្រសួងសេដ្ឋកិច្ច និងហិរញ្ញវត្ថុ",
  "ក្រុមហ៊ុន",
  "ធនាគារ",
  "ស្ថាប័នផ្សេងៗ",
  "ផ្សេងៗ",
];

const SISD_STATUS_OPTIONS = ["Received", "Processing", "Completed", "Archived"];

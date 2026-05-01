import { differenceInDays, format, parseISO, isValid } from "date-fns";

export type AccreditationStatus = "active" | "upcoming" | "warning" | "critical" | "expired" | "snoozed" | "not_yet_accredited";
export type AccreditationType = "programme" | "institutional";
export type WorkflowStatus = "self_assessment" | "application_submitted" | "vetting" | "visitation" | "accredited";

export interface Accreditation {
  id: string;
  programmeName: string;
  accreditationType: AccreditationType;
  faculty: string;
  department: string;
  startDate: string;
  expiryDate: string;
  email: string;
  workflowStatus: WorkflowStatus;
  institutionId: string;
  daysUntilExpiry: number;
  status: AccreditationStatus;
  notes?: string;
  completionPercentage?: number;
  documentCount?: number;
  snoozedUntil?: string;
  remarks?: string;
  programmeCategory?: 'EP' | 'NP';
  firstAccreditationDate?: string;
}

export interface AccreditationDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  notes?: string;
}

export interface AccreditationCheckpoint {
  id: string;
  checkpointName: string;
  isCompleted: boolean;
  updatedAt: string;
  workflowStage?: WorkflowStatus;
}

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  role: 'super_admin' | 'dean' | 'admin' | 'user';
  department: string | null;
  faculty: string | null;
  status: 'active' | 'pending_approval';
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_email: string;
  action: string;
  method: string;
  path: string;
  details: string;
  ip_address: string;
  timestamp: string;
  status?: number;
}

export interface DashboardMetrics {
  total: number;
  active: number;
  upcoming: number;
  warning: number;
  critical: number;
  expired: number;
  snoozed: number;
  not_yet_accredited: number;
  complianceRate: number;
}

// Parse Excel serial date to ISO string
function excelSerialToDate(serial: number): Date {
  // Excel dates start from 1900-01-01, but there's a bug where 1900 is treated as leap year
  const excelEpoch = new Date(1899, 11, 30);
  return new Date(excelEpoch.getTime() + serial * 86400000);
}

// Normalise human-readable date strings into something Date() can parse.
// Handles formats found in the HTU template like:
//   "31st Aug. 2027", "September 31, 2028", "  Aug. 31, 2025", "Dec 31, 2027/2029"
function normaliseHumanDate(raw: string): string {
  let s = raw.trim();
  // Ambiguous dual-year "2027/2029" — take the later year
  s = s.replace(/(\d{4})\/(\d{4})/g, (_, y1, y2) =>
    String(Math.max(Number(y1), Number(y2)))
  );
  // Strip ordinal suffixes: 31st → 31, 22nd → 22, 3rd → 3, 4th → 4
  s = s.replace(/(\d+)(st|nd|rd|th)\b/gi, "$1");
  // Normalise abbreviated months with trailing dots: "Aug." → "Aug", "Sept." → "Sep"
  s = s.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\./gi, "$1");
  // Collapse multiple spaces
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// Parse various date formats to ISO string
export function parseExcelDate(value: unknown): string {
  if (!value) return "";

  // String handling
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    // Try ISO format first
    const isoDate = parseISO(trimmed);
    if (isValid(isoDate)) {
      return format(isoDate, "yyyy-MM-dd");
    }

    // Try various numeric formats (DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY)
    const numericFormats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      /(\d{1,2})-(\d{1,2})-(\d{4})/,
    ];
    for (const regex of numericFormats) {
      if (trimmed.match(regex)) {
        const date = new Date(trimmed);
        if (isValid(date)) return format(date, "yyyy-MM-dd");
      }
    }

    // Try normalising human-readable formats
    const normalised = normaliseHumanDate(trimmed);
    const humanDate = new Date(normalised);
    if (isValid(humanDate)) {
      return format(humanDate, "yyyy-MM-dd");
    }
  }

  // Excel serial number
  if (typeof value === "number") {
    const date = excelSerialToDate(value);
    if (isValid(date)) {
      return format(date, "yyyy-MM-dd");
    }
  }

  // Date object
  if (value instanceof Date && isValid(value)) {
    return format(value, "yyyy-MM-dd");
  }

  return "";
}

// Calculate days until expiry
export function calculateDaysUntilExpiry(expiryDate: string): number {
  const expiry = parseISO(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInDays(expiry, today);
}

// Determine status based on days until expiry
export function getStatus(daysUntilExpiry: number, snoozedUntil?: string): AccreditationStatus {
  if (snoozedUntil && new Date(snoozedUntil) > new Date()) {
    return "snoozed";
  }

  if (daysUntilExpiry <= 0) return "expired";
  if (daysUntilExpiry <= 90) return "critical"; // 3 months
  if (daysUntilExpiry <= 365) return "warning"; // 12 months
  if (daysUntilExpiry <= 450) return "upcoming"; // 15 months
  return "active";
}

// Get status label
export function getStatusLabel(status: AccreditationStatus): string {
  const labels: Record<AccreditationStatus, string> = {
    active: "Active",
    upcoming: "Upcoming Renewal",
    warning: "Warning",
    critical: "Critical",
    expired: "Expired",
    snoozed: "Snoozed",
    not_yet_accredited: "Not Yet Accredited",
  };
  return labels[status];
}

export function getWorkflowLabel(status: WorkflowStatus): string {
  const labels: Record<WorkflowStatus, string> = {
    self_assessment: "Self-Assessment",
    application_submitted: "Application Submitted",
    vetting: "GTEC Vetting",
    visitation: "GTEC Visitation",
    accredited: "Fully Accredited",
  };
  return labels[status];
}

export function getAccreditationTypeLabel(type: AccreditationType): string {
  return type === "programme" ? "Programme Accreditation" : "Institutional Accreditation";
}

// Column name mappings for flexible Excel parsing
const columnMappings = {
  programmeName: [
    "Programme / Course Name",
    "Programme Name",
    "Course Name",
    "Programme",
    "Name",
    "Program Name",
    "Program",
  ],
  startDate: [
    "Accreditation Start Date",
    "Start Date",
    "Accreditation Start",
    "Start",
    "Begin Date",
  ],
  expiryDate: [
    "Accreditation Expiry Date",
    "Expiry Date",
    "Accreditation Expiry",
    "End Date",
    "Expiry",
    "Expiration Date",
  ],
  email: [
    "Responsible Email Address",
    "Email",
    "Responsible Email",
    "Contact Email",
    "Email Address",
    "Contact",
  ],
  faculty: [
    "Faculty",
    "School",
    "Faculty/School",
    "Academic Unit",
  ],
  department: [
    "Department",
    "Department Name",
    "Section",
  ],
  accreditationType: [
    "Accreditation Type",
    "Type",
    "Programme/Institutional",
  ],
  workflowStatus: [
    "Workflow Status",
    "GTEC Status",
    "GTEC Stage",
    "Workflow Stage",
  ],
  remarks: [
    "Remarks",
    "Administrative Remarks",
    "Comments",
    "Notes",
  ],
  programmeCategory: [
    "Category",
    "Programme Category",
    "Type (EP/NP)",
    "Status (EP/NP)",
  ],
  firstAccreditationDate: [
    "First Accreditation Date",
    "First Accreditation",
    "1st Accreditation",
    "Original Accreditation Date",
  ],
};

// Find matching column name
function findColumnName(row: Record<string, unknown>, possibleNames: string[]): string | null {
  const keys = Object.keys(row);
  for (const name of possibleNames) {
    const found = keys.find(
      (key) => key.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (found) return found;
  }
  return null;
}

// Process raw Excel data into Accreditation objects
export function processAccreditationData(rawData: Record<string, unknown>[]): Accreditation[] {
  if (!rawData || rawData.length === 0) return [];

  // Find column names from first row
  const firstRow = rawData[0];
  const programmeCol = findColumnName(firstRow, columnMappings.programmeName);
  const startCol = findColumnName(firstRow, columnMappings.startDate);
  const expiryCol = findColumnName(firstRow, columnMappings.expiryDate);
  const emailCol = findColumnName(firstRow, columnMappings.email);
  const facultyCol = findColumnName(firstRow, columnMappings.faculty);
  const departmentCol = findColumnName(firstRow, columnMappings.department);
  const typeCol = findColumnName(firstRow, columnMappings.accreditationType);
  const workflowCol = findColumnName(firstRow, columnMappings.workflowStatus);
  const remarksCol = findColumnName(firstRow, columnMappings.remarks);
  const categoryCol = findColumnName(firstRow, columnMappings.programmeCategory);
  const firstAccrCol = findColumnName(firstRow, columnMappings.firstAccreditationDate);

  if (!programmeCol) {
    console.error("Required columns not found. Found columns:", Object.keys(firstRow));
    throw new Error(
      "Required columns not found. Please ensure your Excel file has a 'Programme Name' column."
    );
  }

  return rawData
    .map((row, index) => {
      const programmeName = row[programmeCol]?.toString()?.trim() || "";
      const expiryDateRaw = row[expiryCol];
      const startDateRaw = startCol ? row[startCol] : null;
      const email = emailCol ? row[emailCol]?.toString()?.trim() || "" : "";

      // Skip rows with no programme name
      if (!programmeName) return null;

      const expiryDate = expiryDateRaw ? parseExcelDate(expiryDateRaw) : "";
      const startDate = startDateRaw ? parseExcelDate(startDateRaw) : "";

      const faculty = facultyCol ? row[facultyCol]?.toString()?.trim() || "" : "";
      const department = departmentCol ? row[departmentCol]?.toString()?.trim() || "" : "";

      const accreditationTypeRaw = typeCol ? row[typeCol]?.toString()?.toLowerCase()?.trim() : "";
      const accreditationType: AccreditationType =
        accreditationTypeRaw?.includes("inst") ? "institutional" : "programme";

      const workflowRaw = workflowCol ? row[workflowCol]?.toString()?.toLowerCase()?.replace(/\s+/g, '_')?.trim() : "";
      let workflowStatus: WorkflowStatus = "self_assessment";

      if (workflowRaw) {
        if (workflowRaw.includes("self") || workflowRaw.includes("assessment")) workflowStatus = "self_assessment";
        else if (workflowRaw.includes("sub") || workflowRaw.includes("apply")) workflowStatus = "application_submitted";
        else if (workflowRaw.includes("vet")) workflowStatus = "vetting";
        else if (workflowRaw.includes("visit")) workflowStatus = "visitation";
        else if (workflowRaw.includes("accred")) workflowStatus = "accredited";
      }

      // If no expiry date → Not Yet Accredited (awaiting GTEC decision)
      if (!expiryDate) {
        return {
          id: `acc-${index + 1}`,
          programmeName,
          faculty,
          department,
          startDate,
          expiryDate: "",
          email,
          accreditationType,
          workflowStatus,
          institutionId: "HTU",
          daysUntilExpiry: 0,
          status: "not_yet_accredited" as AccreditationStatus,
          remarks: remarksCol ? row[remarksCol]?.toString()?.trim() || "" : "",
          programmeCategory: categoryCol ? (row[categoryCol]?.toString()?.trim() === 'NP' ? 'NP' : 'EP') : 'EP',
          firstAccreditationDate: firstAccrCol ? parseExcelDate(row[firstAccrCol]) : "",
        };
      }

      const daysUntilExpiry = calculateDaysUntilExpiry(expiryDate);
      const status = getStatus(daysUntilExpiry);

      return {
        id: `acc-${index + 1}`,
        programmeName,
        faculty,
        department,
        startDate,
        expiryDate,
        email,
        accreditationType,
        workflowStatus,
        institutionId: "HTU",
        daysUntilExpiry,
        status,
        remarks: remarksCol ? row[remarksCol]?.toString()?.trim() || "" : "",
        programmeCategory: categoryCol ? (row[categoryCol]?.toString()?.trim() === 'NP' ? 'NP' : 'EP') : 'EP',
        firstAccreditationDate: firstAccrCol ? parseExcelDate(row[firstAccrCol]) : "",
      };
    })
    .filter((item): item is Accreditation => item !== null);
}

// Calculate dashboard metrics
export function calculateMetrics(accreditations: Accreditation[]): DashboardMetrics {
  const total = accreditations.length;
  const active = accreditations.filter((a) => a.status === "active").length;
  const upcoming = accreditations.filter((a) => a.status === "upcoming").length;
  const warning = accreditations.filter((a) => a.status === "warning").length;
  const critical = accreditations.filter((a) => a.status === "critical").length;
  const expired = accreditations.filter((a) => a.status === "expired").length;
  const snoozed = accreditations.filter((a) => a.snoozedUntil && new Date(a.snoozedUntil) > new Date()).length;
  const not_yet_accredited = accreditations.filter((a) => a.status === "not_yet_accredited").length;
  // Compliance rate excludes not_yet_accredited from denominator
  const accreditedTotal = total - not_yet_accredited;
  const complianceRate = accreditedTotal > 0 ? Math.round((active / accreditedTotal) * 100) : 0;

  return { total, active, upcoming, warning, critical, expired, snoozed, not_yet_accredited, complianceRate };
}

// Format days until expiry for display
export function formatDaysUntilExpiry(days: number): string {
  if (days <= 0) {
    const absDays = Math.abs(days);
    if (absDays === 0) return "Expired today";
    if (absDays === 1) return "Expired 1 day ago";
    if (absDays < 30) return `Expired ${absDays} days ago`;
    const months = Math.floor(absDays / 30);
    return `Expired ${months} month${months > 1 ? "s" : ""} ago`;
  }

  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    if (remainingDays === 0) return `${months} month${months > 1 ? "s" : ""}`;
    return `${months} month${months > 1 ? "s" : ""}, ${remainingDays} day${remainingDays > 1 ? "s" : ""}`;
  }

  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  if (remainingMonths === 0) return `${years} year${years > 1 ? "s" : ""}`;
  return `${years} year${years > 1 ? "s" : ""}, ${remainingMonths} month${remainingMonths > 1 ? "s" : ""}`;
}

// Format date for display
export function formatDisplayDate(dateString: string): string {
  if (!dateString) return "N/A";
  try {
    const date = parseISO(dateString);
    return format(date, "MMM dd, yyyy");
  } catch {
    return dateString;
  }
}

// Generate email content
export function generateEmailContent(
  accreditation: Accreditation,
  isUrgent: boolean = false
): { subject: string; body: string } {
  const { programmeName, expiryDate, daysUntilExpiry, status } = accreditation;
  const formattedDate = formatDisplayDate(expiryDate);

  if (status === "expired") {
    return {
      subject: `URGENT: ${programmeName} - Accreditation Has Expired`,
      body: `Dear Team,

This is an urgent notification regarding the accreditation status of ${programmeName}.

CRITICAL ALERT: The accreditation for this programme expired on ${formattedDate}.

Immediate action is required to:
1. Contact the accrediting body for reinstatement options
2. Assess impact on current students
3. Implement emergency remediation plan
4. Notify all relevant stakeholders

Please treat this as a matter of highest priority and respond with an action plan within 24 hours.

Best regards,
OFFICE OF THE PRO-VICE CHANCELLOR`,
    };
  }

  if (status === "critical" || isUrgent) {
    return {
      subject: `URGENT: ${programmeName} - Accreditation Expires in ${daysUntilExpiry} Days`,
      body: `Dear Team,

This is an urgent notification regarding the accreditation status of ${programmeName}.

CRITICAL ALERT: The accreditation for this programme will expire on ${formattedDate} (${daysUntilExpiry} days remaining).

Immediate action is required to:
1. Escalate to department leadership
2. Submit renewal application immediately
3. Request expedited processing if available
4. Prepare contingency plans

Please provide an update on the renewal status within 48 hours.

Best regards,
OFFICE OF THE PRO-VICE CHANCELLOR`,
    };
  }

  return {
    subject: `Reminder: ${programmeName} - Accreditation Renewal Required`,
    body: `Dear Team,

This is a reminder regarding the accreditation status of ${programmeName}.

NOTICE: The accreditation for this programme will expire on ${formattedDate} (${daysUntilExpiry} days remaining).

Recommended actions:
1. Initiate renewal application process
2. Gather required documentation
3. Contact accrediting body for requirements
4. Allocate budget for renewal fees
5. Assign renewal coordinator

Please begin the renewal planning process and provide a timeline for completion.

Best regards,
OFFICE OF THE PRO-VICE CHANCELLOR`,
  };
}

// Sample data for demo purposes
export const sampleAccreditations: Accreditation[] = [
  {
    id: "acc-1",
    programmeName: "BSc Computer Science",
    accreditationType: "programme",
    faculty: "Faculty of Applied Sciences",
    department: "Computer Science",
    startDate: "2021-09-01",
    expiryDate: "2025-08-31",
    email: "cs.dept@university.edu",
    workflowStatus: "accredited",
    institutionId: "HTU",
    daysUntilExpiry: calculateDaysUntilExpiry("2025-08-31"),
    status: getStatus(calculateDaysUntilExpiry("2025-08-31")),
  },
  {
    id: "acc-2",
    programmeName: "BSc Electrical Engineering",
    accreditationType: "programme",
    faculty: "Faculty of Engineering",
    department: "Electrical Engineering",
    startDate: "2022-01-15",
    expiryDate: "2025-05-15",
    email: "ee.dept@university.edu",
    workflowStatus: "accredited",
    institutionId: "HTU",
    daysUntilExpiry: calculateDaysUntilExpiry("2025-05-15"),
    status: getStatus(calculateDaysUntilExpiry("2025-05-15")),
  },
  {
    id: "acc-3",
    programmeName: "HND Accountancy",
    accreditationType: "programme",
    faculty: "Faculty of Business",
    department: "Accountancy",
    startDate: "2022-06-01",
    expiryDate: "2026-06-30",
    email: "accountancy@university.edu",
    workflowStatus: "accredited",
    institutionId: "HTU",
    daysUntilExpiry: calculateDaysUntilExpiry("2026-06-30"),
    status: getStatus(calculateDaysUntilExpiry("2026-06-30")),
  },
  {
    id: "acc-4",
    programmeName: "BSc Mechanical Engineering",
    accreditationType: "programme",
    faculty: "Faculty of Engineering",
    department: "Mechanical Engineering",
    startDate: "2020-09-01",
    expiryDate: "2025-02-28",
    email: "mech.eng@university.edu",
    workflowStatus: "accredited",
    institutionId: "HTU",
    daysUntilExpiry: calculateDaysUntilExpiry("2025-02-28"),
    status: getStatus(calculateDaysUntilExpiry("2025-02-28")),
  },
  {
    id: "acc-5",
    programmeName: "MBA Business Administration",
    accreditationType: "programme",
    faculty: "Faculty of Business",
    department: "Business Administration",
    startDate: "2023-01-15",
    expiryDate: "2028-01-14",
    email: "business@university.edu",
    workflowStatus: "accredited",
    institutionId: "HTU",
    daysUntilExpiry: calculateDaysUntilExpiry("2028-01-14"),
    status: getStatus(calculateDaysUntilExpiry("2028-01-14")),
  },
  {
    id: "acc-6",
    programmeName: "BSc Nursing",
    accreditationType: "programme",
    faculty: "Faculty of Applied Health Sciences",
    department: "Nursing",
    startDate: "2021-03-01",
    expiryDate: "2024-12-31",
    email: "nursing@university.edu",
    workflowStatus: "accredited",
    institutionId: "HTU",
    daysUntilExpiry: calculateDaysUntilExpiry("2024-12-31"),
    status: getStatus(calculateDaysUntilExpiry("2024-12-31")),
  },
  {
    id: "acc-7",
    programmeName: "HND Civil Engineering",
    accreditationType: "programme",
    faculty: "Faculty of Engineering",
    department: "Civil Engineering",
    startDate: "2022-09-01",
    expiryDate: "2027-08-31",
    email: "civil.eng@university.edu",
    workflowStatus: "accredited",
    institutionId: "HTU",
    daysUntilExpiry: calculateDaysUntilExpiry("2027-08-31"),
    status: getStatus(calculateDaysUntilExpiry("2027-08-31")),
  },
  {
    id: "acc-8",
    programmeName: "BSc Pharmacy",
    accreditationType: "programme",
    faculty: "Faculty of Applied Health Sciences",
    department: "Pharmacy",
    startDate: "2020-06-01",
    expiryDate: "2025-07-15",
    email: "pharmacy@university.edu",
    workflowStatus: "accredited",
    institutionId: "HTU",
    daysUntilExpiry: calculateDaysUntilExpiry("2025-07-15"),
    status: getStatus(calculateDaysUntilExpiry("2025-07-15")),
  },
];

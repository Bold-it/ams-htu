import { differenceInDays, format, parseISO, isValid } from "date-fns";

export type AccreditationStatus = "active" | "warning" | "critical" | "expired";

export interface Accreditation {
  id: string;
  programmeName: string;
  faculty: string;
  department: string;
  startDate: string;
  expiryDate: string;
  email: string;
  daysUntilExpiry: number;
  status: AccreditationStatus;
}

export interface DashboardMetrics {
  total: number;
  active: number;
  warning: number;
  critical: number;
  expired: number;
  complianceRate: number;
}

// Parse Excel serial date to ISO string
function excelSerialToDate(serial: number): Date {
  // Excel dates start from 1900-01-01, but there's a bug where 1900 is treated as leap year
  const excelEpoch = new Date(1899, 11, 30);
  return new Date(excelEpoch.getTime() + serial * 86400000);
}

// Parse various date formats to ISO string
export function parseExcelDate(value: any): string {
  if (!value) return "";

  // If it's already a valid date string
  if (typeof value === "string") {
    // Try ISO format first
    const isoDate = parseISO(value);
    if (isValid(isoDate)) {
      return format(isoDate, "yyyy-MM-dd");
    }

    // Try various date formats
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY or MM/DD/YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
      /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY
    ];

    for (const regex of formats) {
      const match = value.match(regex);
      if (match) {
        // Try to parse as date
        const date = new Date(value);
        if (isValid(date)) {
          return format(date, "yyyy-MM-dd");
        }
      }
    }
  }

  // If it's a number (Excel serial date)
  if (typeof value === "number") {
    const date = excelSerialToDate(value);
    if (isValid(date)) {
      return format(date, "yyyy-MM-dd");
    }
  }

  // If it's a Date object
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
export function getStatus(daysUntilExpiry: number): AccreditationStatus {
  if (daysUntilExpiry <= 0) return "expired";
  if (daysUntilExpiry <= 90) return "critical"; // 3 months
  if (daysUntilExpiry <= 365) return "warning"; // 12 months
  return "active";
}

// Get status label
export function getStatusLabel(status: AccreditationStatus): string {
  const labels: Record<AccreditationStatus, string> = {
    active: "Active",
    warning: "Warning",
    critical: "Critical",
    expired: "Expired",
  };
  return labels[status];
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
};

// Find matching column name
function findColumnName(row: any, possibleNames: string[]): string | null {
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
export function processAccreditationData(rawData: any[]): Accreditation[] {
  if (!rawData || rawData.length === 0) return [];

  // Find column names from first row
  const firstRow = rawData[0];
  const programmeCol = findColumnName(firstRow, columnMappings.programmeName);
  const startCol = findColumnName(firstRow, columnMappings.startDate);
  const expiryCol = findColumnName(firstRow, columnMappings.expiryDate);
  const emailCol = findColumnName(firstRow, columnMappings.email);
  const facultyCol = findColumnName(firstRow, columnMappings.faculty);
  const departmentCol = findColumnName(firstRow, columnMappings.department);

  if (!programmeCol || !expiryCol) {
    console.error("Required columns not found. Found columns:", Object.keys(firstRow));
    throw new Error(
      "Required columns not found. Please ensure your Excel file has 'Programme Name' and 'Expiry Date' columns."
    );
  }

  return rawData
    .map((row, index) => {
      const programmeName = row[programmeCol]?.toString()?.trim() || "";
      const expiryDateRaw = row[expiryCol];
      const startDateRaw = startCol ? row[startCol] : null;
      const email = emailCol ? row[emailCol]?.toString()?.trim() || "" : "";

      if (!programmeName || !expiryDateRaw) return null;

      const expiryDate = parseExcelDate(expiryDateRaw);
      const startDate = startDateRaw ? parseExcelDate(startDateRaw) : "";

      const faculty = facultyCol ? row[facultyCol]?.toString()?.trim() || "" : "";
      const department = departmentCol ? row[departmentCol]?.toString()?.trim() || "" : "";

      if (!expiryDate) return null;

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
        daysUntilExpiry,
        status,
      };
    })
    .filter((item): item is Accreditation => item !== null);
}

// Calculate dashboard metrics
export function calculateMetrics(accreditations: Accreditation[]): DashboardMetrics {
  const total = accreditations.length;
  const active = accreditations.filter((a) => a.status === "active").length;
  const warning = accreditations.filter((a) => a.status === "warning").length;
  const critical = accreditations.filter((a) => a.status === "critical").length;
  const expired = accreditations.filter((a) => a.status === "expired").length;
  const complianceRate = total > 0 ? Math.round((active / total) * 100) : 0;

  return { total, active, warning, critical, expired, complianceRate };
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
Quality Assurance Unit`,
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
Quality Assurance Unit`,
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
Quality Assurance Unit`,
  };
}

// Sample data for demo purposes
export const sampleAccreditations: Accreditation[] = [
  {
    id: "acc-1",
    programmeName: "BSc Computer Science",
    faculty: "Faculty of Applied Sciences",
    department: "Computer Science",
    startDate: "2021-09-01",
    expiryDate: "2025-08-31",
    email: "cs.dept@university.edu",
    daysUntilExpiry: calculateDaysUntilExpiry("2025-08-31"),
    status: getStatus(calculateDaysUntilExpiry("2025-08-31")),
  },
  {
    id: "acc-2",
    programmeName: "BSc Electrical Engineering",
    faculty: "Faculty of Engineering",
    department: "Electrical Engineering",
    startDate: "2022-01-15",
    expiryDate: "2025-05-15",
    email: "ee.dept@university.edu",
    daysUntilExpiry: calculateDaysUntilExpiry("2025-05-15"),
    status: getStatus(calculateDaysUntilExpiry("2025-05-15")),
  },
  {
    id: "acc-3",
    programmeName: "HND Accountancy",
    faculty: "Faculty of Business",
    department: "Accountancy",
    startDate: "2022-06-01",
    expiryDate: "2026-06-30",
    email: "accountancy@university.edu",
    daysUntilExpiry: calculateDaysUntilExpiry("2026-06-30"),
    status: getStatus(calculateDaysUntilExpiry("2026-06-30")),
  },
  {
    id: "acc-4",
    programmeName: "BSc Mechanical Engineering",
    faculty: "Faculty of Engineering",
    department: "Mechanical Engineering",
    startDate: "2020-09-01",
    expiryDate: "2025-02-28",
    email: "mech.eng@university.edu",
    daysUntilExpiry: calculateDaysUntilExpiry("2025-02-28"),
    status: getStatus(calculateDaysUntilExpiry("2025-02-28")),
  },
  {
    id: "acc-5",
    programmeName: "MBA Business Administration",
    faculty: "Faculty of Business",
    department: "Business Administration",
    startDate: "2023-01-15",
    expiryDate: "2028-01-14",
    email: "business@university.edu",
    daysUntilExpiry: calculateDaysUntilExpiry("2028-01-14"),
    status: getStatus(calculateDaysUntilExpiry("2028-01-14")),
  },
  {
    id: "acc-6",
    programmeName: "BSc Nursing",
    faculty: "Faculty of Applied Health Sciences",
    department: "Nursing",
    startDate: "2021-03-01",
    expiryDate: "2024-12-31",
    email: "nursing@university.edu",
    daysUntilExpiry: calculateDaysUntilExpiry("2024-12-31"),
    status: getStatus(calculateDaysUntilExpiry("2024-12-31")),
  },
  {
    id: "acc-7",
    programmeName: "HND Civil Engineering",
    faculty: "Faculty of Engineering",
    department: "Civil Engineering",
    startDate: "2022-09-01",
    expiryDate: "2027-08-31",
    email: "civil.eng@university.edu",
    daysUntilExpiry: calculateDaysUntilExpiry("2027-08-31"),
    status: getStatus(calculateDaysUntilExpiry("2027-08-31")),
  },
  {
    id: "acc-8",
    programmeName: "BSc Pharmacy",
    faculty: "Faculty of Applied Health Sciences",
    department: "Pharmacy",
    startDate: "2020-06-01",
    expiryDate: "2025-07-15",
    email: "pharmacy@university.edu",
    daysUntilExpiry: calculateDaysUntilExpiry("2025-07-15"),
    status: getStatus(calculateDaysUntilExpiry("2025-07-15")),
  },
];

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Accreditation, DashboardMetrics, formatDisplayDate, AuditLog } from "./accreditation-data";

export const generateAccreditationReport = (
    accreditations: Accreditation[],
    metrics: DashboardMetrics
) => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();

    // HTU Branding Colors
    const HTU_BLUE: [number, number, number] = [30, 58, 138]; // HTU Blue
    const HTU_RED: [number, number, number] = [220, 38, 38];   // HTU Red

    // Header Title
    doc.setFontSize(22);
    doc.setTextColor(HTU_BLUE[0], HTU_BLUE[1], HTU_BLUE[2]);
    doc.text("HO TECHNICAL UNIVERSITY", 105, 20, { align: "center" });

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("OFFICE OF THE PRO-VICE CHANCELLOR", 105, 30, { align: "center" });

    doc.setFontSize(14);
    doc.text("Accreditation Monitoring Report", 105, 40, { align: "center" });

    // Divider Line
    doc.setDrawColor(HTU_RED[0], HTU_RED[1], HTU_RED[2]);
    doc.setLineWidth(1);
    doc.line(20, 45, 190, 45);

    // Summary Metrics
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("1. System Overview", 20, 55);

    doc.setFont("helvetica", "normal");
    const metricsData = [
        ["Total Registered Programmes", metrics.total.toString()],
        ["Currently Active (Compliant)", `${metrics.active} (${metrics.complianceRate}%)`],
        ["Pending GTEC Decision", metrics.not_yet_accredited.toString()],
        ["Renewal Warning (12 Months)", metrics.warning.toString()],
        ["Critical Attention (3 Months)", metrics.critical.toString()],
        ["Fully Expired Programmes", metrics.expired.toString()],
        ["Snoozed (Reminders Paused)", metrics.snoozed.toString()],
    ];

    autoTable(doc, {
        startY: 60,
        head: [],
        body: metricsData,
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 80, fontStyle: "bold" } },
    });

    const docAny = doc as any;

    // Categorized Programme Details
    doc.setFont("helvetica", "bold");
    doc.text("2. Detailed Programme Status Breakdown", 20, docAny.lastAutoTable.finalY + 15);

    let currentY = docAny.lastAutoTable.finalY + 22;

    const categories: { label: string; status: string; color: [number, number, number] }[] = [
        { label: "EXPIRED", status: "expired", color: [127, 29, 29] },
        { label: "CRITICAL PHASE (<= 3 Months)", status: "critical", color: [220, 38, 38] },
        { label: "SNOOZED (Reminders Paused)", status: "snoozed", color: [100, 116, 139] },
        { label: "WARNING PHASE (<= 12 Months)", status: "warning", color: [202, 138, 4] },
        { label: "UPCOMING RENEWAL (12-15 Months)", status: "upcoming", color: [37, 99, 235] },
        { label: "PENDING GTEC DECISION", status: "not_yet_accredited", color: [79, 70, 229] }, // Indigo-600
        { label: "ACTIVE (> 15 Months)", status: "active", color: [22, 163, 74] },
    ];

    categories.forEach((cat) => {
        const progs = accreditations.filter(a => a.status === cat.status);
        if (progs.length === 0) return;

        doc.setFontSize(10);
        doc.setTextColor(cat.color[0], cat.color[1], cat.color[2]);
        doc.setFont("helvetica", "bold");
        doc.text(`${cat.label} (${progs.length})`, 20, currentY);
        doc.setTextColor(0, 0, 0);

        autoTable(doc, {
            startY: currentY + 5,
            head: [["Programme", "Expiry Date", "Readiness", "Vault"]],
            body: progs.map(a => [
                a.programmeName,
                formatDisplayDate(a.expiryDate),
                a.completionPercentage !== undefined ? `${a.completionPercentage}%` : "0%",
                a.documentCount !== undefined ? `${a.documentCount} files` : "0 files"
            ]),
            headStyles: { fillColor: cat.color },
            styles: { fontSize: 8 },
            margin: { left: 20 },
            tableWidth: 170,
            alternateRowStyles: { fillColor: [250, 251, 252] },
        });

        currentY = docAny.lastAutoTable.finalY + 15;
    });

    // Footer
    const pageCount = docAny.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generated on: ${timestamp} | Page ${i} of ${pageCount}`, 105, 285, { align: "center" });
        doc.text("HTU Accreditation Monitoring System v1.1 - Strict Detail Mode", 105, 290, { align: "center" });
    }

    // Save PDF
    doc.save(`HT_Accreditation_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateAuditLogExport = (logs: AuditLog[]) => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();

    // HTU Branding Colors
    const HTU_BLUE: [number, number, number] = [30, 58, 138];

    // Header
    doc.setFontSize(18);
    doc.setTextColor(HTU_BLUE[0], HTU_BLUE[1], HTU_BLUE[2]);
    doc.text("HTU SYSTEM AUDIT LOG", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Comprehensive History of System Actions", 105, 28, { align: "center" });

    autoTable(doc, {
        startY: 35,
        head: [["Timestamp", "User", "Action", "Status"]],
        body: logs.map(l => [
            new Date(l.timestamp).toLocaleString(),
            l.user_email,
            l.action,
            l.status || "N/A"
        ]),
        headStyles: { fillColor: HTU_BLUE },
        styles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(`HTU_Audit_Log_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateFullLegacyReport = (accreditations: Accreditation[]) => {
    const doc = new jsPDF({ orientation: "landscape" });
    const timestamp = new Date().toLocaleString();

    // HTU Branding Colors
    const HTU_BLUE: [number, number, number] = [30, 58, 138];
    const HTU_RED: [number, number, number] = [220, 38, 38];

    // Page Header
    doc.setFontSize(22);
    doc.setTextColor(HTU_BLUE[0], HTU_BLUE[1], HTU_BLUE[2]);
    doc.text("HO TECHNICAL UNIVERSITY", 148, 20, { align: "center" });

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("OFFICE OF THE PRO-VICE CHANCELLOR", 148, 30, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("HTU ACCREDITATION STATUS", 148, 40, { align: "center" });

    // Divider Line
    doc.setDrawColor(HTU_RED[0], HTU_RED[1], HTU_RED[2]);
    doc.setLineWidth(1);
    doc.line(20, 45, 277, 45);

    // Group by Faculty
    const faculties = [...new Set(accreditations.map(a => a.faculty))].filter(Boolean).sort();
    
    let currentY = 55;

    faculties.forEach((faculty, fIndex) => {
        const facultyProgs = accreditations.filter(a => a.faculty === faculty);
        
        // Add new page if not enough space (very basic check)
        if (currentY > 170 && fIndex > 0) {
            doc.addPage();
            currentY = 25;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(HTU_BLUE[0], HTU_BLUE[1], HTU_BLUE[2]);
        doc.text(`FACULTY: ${faculty.toUpperCase()}`, 20, currentY);
        doc.setTextColor(0, 0, 0);

        autoTable(doc, {
            startY: currentY + 5,
            head: [["S/No.", "Programme", "Type of Programme Existing/New (EP/NP)", "First Accreditation", "Current Accreditation", "Expiry Date of Current Accreditation", "Comments"]],
            body: facultyProgs.map((a, i) => [
                (i + 1).toString().padStart(2, '0'),
                a.programmeName,
                a.programmeCategory || "EP",
                formatDisplayDate(a.firstAccreditationDate || ""),
                formatDisplayDate(a.startDate),
                formatDisplayDate(a.expiryDate),
                a.remarks || "-"
            ]),
            headStyles: { 
                fillColor: [51, 65, 85], // Slate-700
                fontSize: 9,
                halign: 'center'
            },
            styles: { 
                fontSize: 8,
                cellPadding: 3,
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center' },
                1: { cellWidth: 60 },
                2: { cellWidth: 40, halign: 'center' },
                3: { cellWidth: 30, halign: 'center' },
                4: { cellWidth: 30, halign: 'center' },
                5: { cellWidth: 30, halign: 'center' },
                6: { cellWidth: 'auto' }
            },
            margin: { left: 20, right: 20 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
        });

        currentY = (doc as any).lastAutoTable.finalY + 15;
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Official Registry | Generated: ${timestamp} | Page ${i} of ${pageCount}`, 148, 200, { align: "center" });
    }

    const monthYear = new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase() + new Date().getFullYear();
    doc.save(`HTU_Accreditation Status_${monthYear}.pdf`);
};

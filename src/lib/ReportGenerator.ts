import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Accreditation, DashboardMetrics, formatDisplayDate } from "./accreditation-data";

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
    doc.text("Quality Assurance Unit", 105, 30, { align: "center" });

    doc.setFontSize(14);
    doc.text("Accreditation Monitoring Report", 105, 40, { align: "center" });

    // Divider Line
    doc.setDrawColor(HTU_RED[0], HTU_RED[1], HTU_RED[2]);
    doc.setLineWidth(1);
    doc.line(20, 45, 190, 45);

    // Summary Metrics
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("System Overview", 20, 55);

    doc.setFont("helvetica", "normal");
    const metricsData = [
        ["Total Registered Programmes", metrics.total.toString()],
        ["Currently Active (Compliant)", `${metrics.active} (${metrics.complianceRate}%)`],
        ["Renewal Warning (12 Months)", metrics.warning.toString()],
        ["Critical Attention (3 Months)", metrics.critical.toString()],
        ["Fully Expired Programmes", metrics.expired.toString()],
    ];

    autoTable(doc, {
        startY: 60,
        head: [],
        body: metricsData,
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 80, fontStyle: "bold" } },
    });

    // Expiring Programmes Table
    const sortedAcc = [...accreditations].sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    const criticalAcc = sortedAcc.filter(a => a.status !== "active");

    if (criticalAcc.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Programmes Requiring Attention", 20, (doc as any).lastAutoTable.finalY + 15);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [["Programme", "Faculty", "Expiry Date", "Status"]],
            body: criticalAcc.map(a => [
                a.programmeName,
                a.faculty || "N/A",
                formatDisplayDate(a.expiryDate),
                a.status.toUpperCase()
            ]),
            headStyles: { fillColor: HTU_BLUE },
            styles: { fontSize: 9 },
            alternateRowStyles: { fillColor: [245, 247, 250] },
        });
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generated on: ${timestamp} | Page ${i} of ${pageCount}`, 105, 285, { align: "center" });
        doc.text("HTU Accreditation Monitoring System v1.0", 105, 290, { align: "center" });
    }

    // Save PDF
    doc.save(`HT_Accreditation_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

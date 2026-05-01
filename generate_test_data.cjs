const xlsx = require('xlsx');
const path = require('path');

// Comprehensive Test Data for HTU Accreditation Monitoring System
const testData = [
    // CRITICAL (Expired)
    {
        "Programme Name": "BTech Computer Science",
        "Accreditation Type": "programme",
        "Faculty": "Faculty of Applied Sciences and Technology",
        "Department": "Department of Computer Science",
        "Start Date": "2019-03-01",
        "Expiry Date": "2024-03-01",
        "Contact Email": "cs@htu.edu.gh",
        "Workflow Status": "accredited"
    },
    // WARNING (Expiring soon)
    {
        "Programme Name": "BTech Fashion Design",
        "Accreditation Type": "programme",
        "Faculty": "Faculty of Art and Design",
        "Department": "Department of Fashion Design & Textiles",
        "Start Date": "2021-05-20",
        "Expiry Date": "2025-05-20",
        "Contact Email": "fashion@htu.edu.gh",
        "Workflow Status": "under_review"
    },
    // HEALTHY
    {
        "Programme Name": "MSc Food Science",
        "Accreditation Type": "programme",
        "Faculty": "School of Graduate Studies",
        "Department": "MSc. Food Science and Technology",
        "Start Date": "2023-01-10",
        "Expiry Date": "2028-01-10",
        "Contact Email": "grad.studies@htu.edu.gh",
        "Workflow Status": "accredited"
    },
    // RENEWAL IN PROGRESS
    {
        "Programme Name": "BTech Electrical Engineering",
        "Accreditation Type": "programme",
        "Faculty": "Faculty of Engineering",
        "Department": "Department of Electrical and Electronic Engineering",
        "Start Date": "2020-06-15",
        "Expiry Date": "2025-06-15",
        "Contact Email": "electrical@htu.edu.gh",
        "Workflow Status": "renewal_in_progress"
    },
    // BUSINESS SCHOOL
    {
        "Programme Name": "MBA Accounting",
        "Accreditation Type": "programme",
        "Faculty": "HTU Business School",
        "Department": "Department of Accounting and Finance",
        "Start Date": "2022-09-01",
        "Expiry Date": "2027-09-01",
        "Contact Email": "marketing@htu.edu.gh",
        "Workflow Status": "accredited"
    }
];

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(testData);

// Format columns for readability
ws['!cols'] = [
    { wch: 35 }, // Programme Name
    { wch: 18 }, // Type
    { wch: 40 }, // Faculty
    { wch: 45 }, // Department
    { wch: 12 }, // Start
    { wch: 12 }, // Expiry
    { wch: 25 }, // Email
    { wch: 20 }  // Status
];

xlsx.utils.book_append_sheet(wb, ws, "HTU Test Accreditations");

const outputPath = path.join(__dirname, 'HTU_Test_Accreditations.xlsx');
xlsx.writeFile(wb, outputPath);
console.log(`✅ Test Excel file generated at: ${outputPath}`);

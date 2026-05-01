const xlsx = require('xlsx');
const path = require('path');

// Test data covering all statuses, all faculties, and edge cases
const testData = [
  // ===== CRITICAL (Expired or <7 days) =====
  {
    "Programme Name": "Food Chemistry I",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Applied Sciences and Technology",
    "Department": "Department of Food Science and Technology",
    "Start Date": "2019-03-01",
    "Expiry Date": "2024-03-01",
    "Contact Email": "foodsci@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Geotechnical Engineering",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Engineering",
    "Department": "Department of Civil Engineering",
    "Start Date": "2020-01-15",
    "Expiry Date": "2024-01-15",
    "Contact Email": "civil@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Power System Analysis",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Engineering",
    "Department": "Department of Electrical and Electronic Engineering",
    "Start Date": "2019-06-10",
    "Expiry Date": "2024-06-10",
    "Contact Email": "electrical@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },

  // ===== WARNING (7–180 days left) =====
  {
    "Programme Name": "Computer Forensics",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Applied Sciences and Technology",
    "Department": "Department of Computer Science",
    "Start Date": "2022-01-10",
    "Expiry Date": "2026-04-30",
    "Contact Email": "cs@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Fashion Arts and Crafts",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Art and Design",
    "Department": "Department of Fashion Design & Textiles",
    "Start Date": "2021-05-20",
    "Expiry Date": "2026-05-20",
    "Contact Email": "fashion@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Architectural Theory and Conservation",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Built & Natural Environment",
    "Department": "Department of Architectural and Real Estate Development",
    "Start Date": "2022-03-01",
    "Expiry Date": "2026-06-01",
    "Contact Email": "arch@test.htu.edu.gh",
    "Workflow Status": "under_review"
  },
  {
    "Programme Name": "Introduction to Tourism",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Applied Sciences and Technology",
    "Department": "Department of Hospitality and Tourism Management",
    "Start Date": "2021-08-01",
    "Expiry Date": "2026-08-01",
    "Contact Email": "hospitality@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Structural Engineering",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Engineering",
    "Department": "Department of Civil Engineering",
    "Start Date": "2022-04-15",
    "Expiry Date": "2026-07-15",
    "Contact Email": "civil@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },

  // ===== HEALTHY (>180 days left) =====
  {
    "Programme Name": "Artificial Intelligence",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Applied Sciences and Technology",
    "Department": "Department of Computer Science",
    "Start Date": "2023-01-10",
    "Expiry Date": "2027-01-10",
    "Contact Email": "cs@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Data Science",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Applied Sciences and Technology",
    "Department": "Department of Computer Science",
    "Start Date": "2023-01-10",
    "Expiry Date": "2027-01-10",
    "Contact Email": "cs@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Food Biotechnology",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Applied Sciences and Technology",
    "Department": "Department of Food Science and Technology",
    "Start Date": "2023-06-01",
    "Expiry Date": "2028-06-01",
    "Contact Email": "foodsci@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Innovation Systems and Strategies",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Applied Social Sciences",
    "Department": "Department of Economics and Innovation",
    "Start Date": "2023-09-01",
    "Expiry Date": "2027-09-01",
    "Contact Email": "economics@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Digital Platform Management",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Applied Social Sciences",
    "Department": "Department of Applied Modern Languages & Communication (AML&C)",
    "Start Date": "2023-01-15",
    "Expiry Date": "2027-01-15",
    "Contact Email": "languages@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Computer-Aided Design in Textiles",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Art and Design",
    "Department": "Department of Fashion Design & Textiles",
    "Start Date": "2023-02-10",
    "Expiry Date": "2028-02-10",
    "Contact Email": "fashion@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "3D Computer Ceramic Design",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Art and Design",
    "Department": "Department of Industrial Arts",
    "Start Date": "2023-07-01",
    "Expiry Date": "2028-07-01",
    "Contact Email": "industrial.arts@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Sustainable, Resilient & Universal Design",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Built & Natural Environment",
    "Department": "Department of Architectural and Real Estate Development",
    "Start Date": "2023-03-01",
    "Expiry Date": "2027-03-01",
    "Contact Email": "arch@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Renewable Energy Technology",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Built & Natural Environment",
    "Department": "Department of Building Technology",
    "Start Date": "2023-11-01",
    "Expiry Date": "2028-11-01",
    "Contact Email": "building@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Introduction to Geographic Information Systems",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Built & Natural Environment",
    "Department": "Department of Environmental Sciences",
    "Start Date": "2024-01-10",
    "Expiry Date": "2029-01-10",
    "Contact Email": "env.sci@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Renewable Energy Systems Engineering",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Engineering",
    "Department": "Department of Agricultural Engineering",
    "Start Date": "2023-08-01",
    "Expiry Date": "2028-08-01",
    "Contact Email": "agric.eng@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Robotics and Computer Vision",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Engineering",
    "Department": "Department of Electrical and Electronic Engineering",
    "Start Date": "2023-05-20",
    "Expiry Date": "2028-05-20",
    "Contact Email": "electrical@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },

  // ===== UNDER REVIEW / PENDING / RENEWAL =====
  {
    "Programme Name": "Farm Power and Machinery",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Engineering",
    "Department": "Department of Agricultural Engineering",
    "Start Date": "2020-06-01",
    "Expiry Date": "2025-06-01",
    "Contact Email": "agric.eng@test.htu.edu.gh",
    "Workflow Status": "renewal_in_progress"
  },
  {
    "Programme Name": "Applied Time Series Analysis",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Applied Sciences and Technology",
    "Department": "Department of Mathematics and Statistics",
    "Start Date": "2021-02-01",
    "Expiry Date": "2025-09-01",
    "Contact Email": "maths@test.htu.edu.gh",
    "Workflow Status": "under_review"
  },
  {
    "Programme Name": "Principles of Food Production",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Applied Sciences and Technology",
    "Department": "Department of Hospitality and Tourism Management",
    "Start Date": "2020-10-01",
    "Expiry Date": "2025-10-01",
    "Contact Email": "hospitality@test.htu.edu.gh",
    "Workflow Status": "pending_documents"
  },
  {
    "Programme Name": "Building Law",
    "Accreditation Type": "programme",
    "Faculty": "Faculty of Built & Natural Environment",
    "Department": "Department of Building Technology",
    "Start Date": "2020-09-01",
    "Expiry Date": "2025-09-01",
    "Contact Email": "building@test.htu.edu.gh",
    "Workflow Status": "renewal_in_progress"
  },

  // ===== HTU BUSINESS SCHOOL =====
  {
    "Programme Name": "Corporate Finance",
    "Accreditation Type": "programme",
    "Faculty": "HTU Business School",
    "Department": "Department of Accounting and Finance",
    "Start Date": "2022-07-01",
    "Expiry Date": "2026-09-01",
    "Contact Email": "accounting@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Digital Banking",
    "Accreditation Type": "programme",
    "Faculty": "HTU Business School",
    "Department": "Department of Accounting and Finance",
    "Start Date": "2023-01-01",
    "Expiry Date": "2028-01-01",
    "Contact Email": "accounting@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Supply Chain Analytics",
    "Accreditation Type": "programme",
    "Faculty": "HTU Business School",
    "Department": "Department of Logistics and Supply Chain Management",
    "Start Date": "2022-10-01",
    "Expiry Date": "2027-10-01",
    "Contact Email": "logistics@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Strategic Management",
    "Accreditation Type": "programme",
    "Faculty": "HTU Business School",
    "Department": "Department of Management Sciences",
    "Start Date": "2021-11-01",
    "Expiry Date": "2025-11-01",
    "Contact Email": "management@test.htu.edu.gh",
    "Workflow Status": "under_review"
  },
  {
    "Programme Name": "Consumer Behaviour",
    "Accreditation Type": "programme",
    "Faculty": "HTU Business School",
    "Department": "Department of Marketing",
    "Start Date": "2023-04-01",
    "Expiry Date": "2028-04-01",
    "Contact Email": "marketing@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },

  // ===== SCHOOL OF GRADUATE STUDIES =====
  {
    "Programme Name": "Food Product Development",
    "Accreditation Type": "programme",
    "Faculty": "School of Graduate Studies",
    "Department": "MSc. Food Science and Technology",
    "Start Date": "2023-09-01",
    "Expiry Date": "2027-09-01",
    "Contact Email": "grad.studies@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "Agribusiness Development",
    "Accreditation Type": "programme",
    "Faculty": "School of Graduate Studies",
    "Department": "MSc. Food Science and Technology",
    "Start Date": "2023-09-01",
    "Expiry Date": "2027-09-01",
    "Contact Email": "grad.studies@test.htu.edu.gh",
    "Workflow Status": "accredited"
  },
  {
    "Programme Name": "MTech Agricultural Engineering Research",
    "Accreditation Type": "programme",
    "Faculty": "School of Graduate Studies",
    "Department": "MTech Agric Engineering",
    "Start Date": "2022-09-01",
    "Expiry Date": "2026-09-01",
    "Contact Email": "grad.studies@test.htu.edu.gh",
    "Workflow Status": "accredited"
  }
];

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(testData);

// Auto-size columns
const colWidths = [
  { wch: 55 }, // Programme Name
  { wch: 18 }, // Accreditation Type
  { wch: 45 }, // Faculty
  { wch: 55 }, // Department
  { wch: 14 }, // Start Date
  { wch: 14 }, // Expiry Date
  { wch: 35 }, // Contact Email
  { wch: 22 }, // Workflow Status
];
ws['!cols'] = colWidths;

xlsx.utils.book_append_sheet(wb, ws, 'HTU Accreditations Test Data');

const outputPath = path.join(__dirname, 'HTU_Test_Accreditations.xlsx');
xlsx.writeFile(wb, outputPath);
console.log(`✅ Excel file created: ${outputPath}`);
console.log(`📊 Total records: ${testData.length}`);
console.log(`\nStatus breakdown:`);
const statusCount = testData.reduce((acc, r) => { acc[r['Workflow Status']] = (acc[r['Workflow Status']] || 0) + 1; return acc; }, {});
Object.entries(statusCount).forEach(([k, v]) => console.log(`  - ${k}: ${v}`));

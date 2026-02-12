import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const data = [
    {
        "Programme Name": "Bachelor of Technology in Computer Science",
        "Accreditation Expiry Date": "2027-12-31",
        "Accreditation Start Date": "2023-01-01",
        "Responsible Email Address": "hod.cs@htu.edu.gh"
    },
    {
        "Programme Name": "HND Marketing",
        "Accreditation Expiry Date": "2025-06-30",
        "Accreditation Start Date": "2020-07-01",
        "Responsible Email Address": "hod.marketing@htu.edu.gh"
    },
    {
        "Programme Name": "BTech Civil Engineering",
        "Accreditation Expiry Date": "2024-05-15",
        "Accreditation Start Date": "2019-05-15",
        "Responsible Email Address": "dean.engineering@htu.edu.gh"
    }
];

const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Accreditations");

// Ensure public directory exists
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

const filePath = path.join(publicDir, 'sample_accreditation_data.xlsx');

XLSX.writeFile(workbook, filePath);

console.log(`Sample Excel file created at: ${filePath}`);

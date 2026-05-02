import XLSX from 'xlsx';
import path from 'path';

const filePath = 'HTU_Accreditation_Template.xlsx';
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

const progName = "Facilities and Estate";
const matches = data.filter(row => 
  (row['Programme Name'] || row.programme_name || "").toString().includes(progName)
);

if (matches.length > 0) {
  console.log(`FOUND ${matches.length} MATCHES:`);
  console.log(JSON.stringify(matches, null, 2));
} else {
  console.log("Programme not found in template.");
}

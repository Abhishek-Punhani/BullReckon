const fs = require('fs');
const path = require('path');

const srcPath = path.resolve(__dirname, '..', 'app', 'csvs', 'sp500_companies.csv');
const outPath = path.resolve(__dirname, '..', 'public', 'sp500.csv');

function parseCSV(text) {
    const rows = [];
    let row = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
            if (inQuotes && text[i + 1] === '"') { // escaped quote
                cur += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (!inQuotes && (ch === ',')) {
            row.push(cur);
            cur = '';
            continue;
        }
        // treat CRLF and LF as row delimiters when not in quotes
        if (!inQuotes && (ch === '\n' || ch === '\r')) {
            // handle \r\n
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(cur);
            rows.push(row);
            row = [];
            cur = '';
            continue;
        }
        cur += ch;
    }
    // push last field/row
    if (cur !== '' || inQuotes) {
        row.push(cur);
    }
    if (row.length) rows.push(row);
    return rows;
}

function csvEscape(value) {
    if (value == null) return '';
    const s = String(value);
    if (s.includes('"')) return '"' + s.replace(/"/g, '""') + '"';
    if (s.includes(',') || s.includes('\n') || s.includes('\r')) return '"' + s + '"';
    return s;
}

function main() {
    if (!fs.existsSync(srcPath)) {
        console.error('Source file not found:', srcPath);
        process.exitCode = 2;
        return;
    }
    const text = fs.readFileSync(srcPath, 'utf8');
    const rows = parseCSV(text);
    if (!rows.length) {
        console.error('No rows parsed from source');
        process.exitCode = 3;
        return;
    }
    const header = rows[0].map(h => (h || '').trim());
    const symIdx = header.findIndex(h => h.toLowerCase() === 'symbol');
    const shortIdx = header.findIndex(h => ['shortname', 'short name', 'short_name'].includes((h || '').toLowerCase()));
    const nameIdx = shortIdx >= 0 ? shortIdx : header.findIndex(h => h.toLowerCase().includes('name'));
    if (symIdx === -1) {
        console.error('Symbol column not found in header:', header.join(','));
        process.exitCode = 4;
        return;
    }
    const outRows = [];
    outRows.push(['Symbol', 'Name']);
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const sym = (r[symIdx] || '').trim();
        if (!sym) continue;
        const nm = (nameIdx >= 0 && r[nameIdx] != null) ? r[nameIdx].trim() : '';
        outRows.push([sym, nm]);
    }
    const outText = outRows.map(r => r.map(csvEscape).join(',')).join('\n') + '\n';
    // ensure output directory exists
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, outText, 'utf8');
    console.log('Wrote', outPath, 'with', outRows.length - 1, 'entries');
}

main();

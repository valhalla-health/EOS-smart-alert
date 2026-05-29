// ═══════════════════════════════════════════════════════════
//  EOS Smart Alert — Google Apps Script Backend  v3.0
//  Chulalongkorn Hospital NICU
//
//  วิธีใช้ (Container-bound):
//  1. เปิด Google Sheet ชื่อ "EOS_KCMH_Dashboard"
//  2. Extensions → Apps Script → Paste code นี้ → Save
//  3. รัน setupSheets() ครั้งเดียว (▶ Run)
//  4. รัน setupStaffSheet() เพื่อสร้าง Staff sheet + admin แรก
//  5. Deploy → New deployment → Web app
//     - Execute as: Me  |  Who has access: Anyone
//  6. Copy Deployment URL → Config panel ใน EOS Dashboard
// ═══════════════════════════════════════════════════════════

// ─── CONSTANTS ─────────────────────────────────────────────
const EOS_CLIENT_ID   = '658466851314-1a9ub51gpilmg32abobrtqp7772s8dbu.apps.googleusercontent.com';
const ALLOWED_SHEETS  = ['Triage', 'SerialPE', 'AuditLog', 'Calculator'];

// Column order per sheet — determines header row + row insertion order
// v8 fields appended at end so existing sheet data is not disrupted
const SHEET_SCHEMA = {
  Triage:   ['ts','hn','name','motherName','sex','ga','bw','bed','dob',
              'triageOutcome','isSerialPE','chorio','maternalFever','fever',
              'gbs','rom','iap','archived','staff',
              'kpRisk','floor','gaDays','birthAt'],
  SerialPE: ['ts','hn','ageHr','wellbeing','skin','T','P','R','SpO2','BP',
              'rd','management','abxApproved','abxDecision','staff','synced'],
  AuditLog: ['ts','staff','role','action','detail'],
  Calculator:['ts','hn','ga','romHours','maternalTemp','gbsStatus','iapStatus',
              'riskScore','staff'],
};


// ─── HELPERS ───────────────────────────────────────────────
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}
function getSheet(name) {
  const ss = getSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
function out(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


// ─── AUTH ──────────────────────────────────────────────────
/**
 * verifyToken — ตรวจสอบ Google ID Token ผ่าน Google API
 * Pattern เดียวกับ PSS NICU (Code_V5.gs)
 */
function verifyToken(token) {
  if (!token) return null;
  try {
    const res = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + token,
      { muteHttpExceptions: true }
    );
    if (res.getResponseCode() !== 200) return null;
    const p = JSON.parse(res.getContentText());

    // ตรวจสอบ audience (Client ID ต้องตรงกับ EOS app)
    if (p.aud !== EOS_CLIENT_ID) return null;
    // ตรวจสอบวันหมดอายุ
    if (Number(p.exp) < Date.now() / 1000) return null;

    // ตรวจสอบ email ในตาราง Staff sheet
    // คอลัมน์: A=email, B=name, C=role, D=active (TRUE/FALSE)
    const staffSheet = getSpreadsheet().getSheetByName('Staff');
    if (!staffSheet) return null;

    const rows = staffSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === p.email) {
        const isActive = rows[i][3] === true || String(rows[i][3]).toUpperCase() === 'TRUE';
        if (!isActive) return null;
        return { email: p.email, name: rows[i][1], role: rows[i][2] };
      }
    }
    return null; // email ไม่อยู่ใน Staff list
  } catch (e) {
    console.error('verifyToken error:', e.message);
    return null;
  }
}


// ─── doGet ─────────────────────────────────────────────────
function doGet(e) {
  return out({ status: 'online', version: '3.0', ts: new Date().toISOString() });
}


// ─── doPost ────────────────────────────────────────────────
/**
 * รับ POST จาก EOS Dashboard
 *
 * Body (JSON string, Content-Type: text/plain):
 * { action?: 'login', sheet?: string, token: string, ...rowFields }
 *
 * action='login'  → ตรวจ token → ส่งคืน user profile
 * (no action)     → ตรวจ token → เขียนข้อมูลลง sheet
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return out({ status: 'error', message: 'Empty body' });
    }

    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    const token  = body.token;

    // ── LOGIN ──────────────────────────────────────────────
    if (action === 'login') {
      const user = verifyToken(token);
      if (!user) return out({ status: 'unauthorized' });
      return out({ status: 'ok', email: user.email, name: user.name, role: user.role });
    }

    // ── LOAD — ส่งคืน Triage + SerialPE ทั้งหมด ───────────
    if (action === 'load') {
      const user = verifyToken(token);
      if (!user) return out({ status: 'unauthorized' });
      return out({ status: 'ok', triage: readSheet('Triage'), serialPE: readSheet('SerialPE') });
    }

    // ── DATA WRITE — ต้องผ่าน token ก่อน ──────────────────
    const user = verifyToken(token);
    if (!user) return out({ status: 'unauthorized' });

    const sheetName = body.sheet;
    if (!sheetName || !ALLOWED_SHEETS.includes(sheetName)) {
      return out({ status: 'error', message: 'ไม่พบ Sheet เป้าหมาย: ' + sheetName });
    }

    // ── Role guard: nurses cannot write ABX approval fields ─
    if (sheetName === 'SerialPE' && user.role === 'nurse') {
      const forbidden = ['abxApproved', 'abxDecision', 'abxBy', 'abxStartAt'];
      const hasForbidden = forbidden.some(f => body[f] !== undefined && body[f] !== null && body[f] !== false && body[f] !== '');
      if (hasForbidden) return out({ status: 'error', message: 'Insufficient role for ABX approval' });
    }

    // ── Flatten nested intake object (Triage only) ─────────
    const rowData = flattenRow(body, sheetName);
    // ใส่ชื่อ staff จาก token (override ถ้า frontend ส่งมา)
    if (!rowData.staff) rowData.staff = user.name;

    // ── Get or create sheet ────────────────────────────────
    const ss    = getSpreadsheet();
    let   sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);

    // ── Get schema for this sheet ──────────────────────────
    const schema = SHEET_SCHEMA[sheetName] || Object.keys(rowData);

    // ── Write header row if empty ──────────────────────────
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(schema);
      const hr = sheet.getRange(1, 1, 1, schema.length);
      hr.setFontWeight('bold');
      hr.setBackground('#0f766e');
      hr.setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    // ── Check duplicate by ts field ────────────────────────
    const tsNew = String(rowData.ts || '').trim();
    if (tsNew) {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        // Scan full sheet — not capped; GAS handles up to ~10k rows fine for NICU scale
        const tsColIdx = 1; // ts is always column A (schema[0])
        const tsCol = sheet.getRange(2, tsColIdx, lastRow - 1, 1).getValues();
        const idx   = tsCol.findIndex(r => String(r[0]).trim() === tsNew);
        if (idx >= 0) {
          const targetRow = 2 + idx;
          sheet.getRange(targetRow, 1, 1, schema.length).setValues([schemaRow(schema, rowData)]);
          return out({ status: 'success', action: 'updated', sheet: sheetName });
        }
      }
    }

    // ── Append new row ─────────────────────────────────────
    sheet.appendRow(schemaRow(schema, rowData));

    const totalRows = sheet.getLastRow();
    if (totalRows <= 50) sheet.autoResizeColumns(1, schema.length);

    return out({ status: 'success', action: 'appended', sheet: sheetName, totalRows });

  } catch (err) {
    console.error('doPost error:', err.message, err.stack);
    return out({ status: 'error', message: err.message });
  }
}


// ─── UTILITY ───────────────────────────────────────────────
/** แปลง body object → flat row (เอา intake ออกมา flatten) */
function flattenRow(body, sheetName) {
  const exclude = ['action', 'token', 'sheet', 'synced'];
  const row = {};

  Object.keys(body).forEach(k => {
    if (exclude.includes(k)) return;
    if (k === 'intake' && typeof body[k] === 'object' && body[k] !== null) {
      // Flatten intake fields directly (chorio, maternalFever, fever, gbs, rom, iap)
      Object.assign(row, body[k]);
    } else if (k === 'rd' && Array.isArray(body[k])) {
      row[k] = body[k].join('|');
    } else {
      row[k] = body[k] === null || body[k] === undefined ? '' : body[k];
    }
  });
  return row;
}

/** อ่าน sheet ทั้งหมด → คืนเป็น array of objects (ใช้ใน action='load')
 *  อ่านตาม header ชื่อ (ไม่ใช่ position) — ทนต่อการเพิ่ม/เรียงคอลัมน์ใหม่
 */
function readSheet(name) {
  const sheet = getSpreadsheet().getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const lastCol  = sheet.getLastColumn();
  const numRows  = sheet.getLastRow() - 1;
  const headers  = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const values   = sheet.getRange(2, 1, numRows, lastCol).getValues();
  return values
    .map(row => {
      const obj = {};
      headers.forEach((key, i) => {
        if (!key) return;
        const v = row[i];
        // Date objects → ISO string; empty/null → null
        if (v instanceof Date) {
          obj[key] = isNaN(v.getTime()) ? null : v.toISOString();
        } else {
          obj[key] = (v === '' || v === null || v === undefined) ? null : v;
        }
      });
      return obj;
    })
    .filter(r => r.ts); // ข้ามแถวว่าง
}

/** สร้าง array ตาม schema order */
function schemaRow(schema, rowData) {
  return schema.map(key => {
    const val = rowData[key];
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  });
}


// ═══════════════════════════════════════════════════════════
//  ONE-TIME SETUP — รันใน Apps Script Editor
// ═══════════════════════════════════════════════════════════

/** สร้าง Triage + SerialPE + AuditLog + Calculator sheets */
function setupSheets() {
  const ss = getSpreadsheet();
  Object.entries(SHEET_SCHEMA).forEach(([name, schema]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(schema);
      const r = sheet.getRange(1, 1, 1, schema.length);
      r.setFontWeight('bold');
      r.setBackground('#0f766e');
      r.setFontColor('#ffffff');
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, schema.length);
    }
    Logger.log('✅ ' + name + ' ready');
  });
}

/**
 * setupStaffSheet — สร้าง Staff sheet + เพิ่ม admin คนแรก
 * รัน 1 ครั้งหลัง setupSheets()
 */
function setupStaffSheet() {
  const ss    = getSpreadsheet();
  let   sheet = ss.getSheetByName('Staff');
  if (!sheet) sheet = ss.insertSheet('Staff');

  if (sheet.getLastRow() === 0) {
    const headers = ['email', 'name', 'role', 'active'];
    sheet.appendRow(headers);
    const hr = sheet.getRange(1, 1, 1, headers.length);
    hr.setFontWeight('bold');
    hr.setBackground('#7c3aed');
    hr.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  // เพิ่ม admin คนแรก (praew.tvl@gmail.com)
  const rows = sheet.getDataRange().getValues();
  const exists = rows.slice(1).some(r => r[0] === 'praew.tvl@gmail.com');
  if (!exists) {
    sheet.appendRow(['praew.tvl@gmail.com', 'พญ.พีรพร', 'admin', true]);
    Logger.log('✅ Admin seeded: praew.tvl@gmail.com');
  }

  sheet.autoResizeColumns(1, 4);
  Logger.log('✅ Staff sheet ready. เพิ่ม staff เพิ่มได้ที่ Sheet "Staff"');
}

/** ทดสอบ verifyToken ด้วย JWT จริง (ใส่ token ใน args) */
function testVerify() {
  const token = ''; // ← วาง Google ID token จริง
  const user  = verifyToken(token);
  Logger.log(user ? JSON.stringify(user) : 'FAILED / UNAUTHORIZED');
}

/** ทดสอบ doPost login action */
function testLogin() {
  const result = doPost({
    postData: {
      contents: JSON.stringify({ action: 'login', token: '' }) // ← ใส่ token
    }
  });
  Logger.log(result.getContent());
}

/** ทดสอบ connection (doGet) */
function testDoGet() {
  Logger.log(doGet({}).getContent());
}

// ===== Offline Storage & CSV Utilities =====

function getStorageKey(formId) {
  return 'opencode_' + formId;
}

function saveLocal(formId, data) {
  const key = getStorageKey(formId);
  const all = JSON.parse(localStorage.getItem(key) || '[]');
  data._savedAt = new Date().toISOString();
  data._id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  all.push(data);
  localStorage.setItem(key, JSON.stringify(all));
  return data._id;
}

function getLocalData(formId) {
  const key = getStorageKey(formId);
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function deleteLocalRecord(formId, id) {
  const key = getStorageKey(formId);
  let all = JSON.parse(localStorage.getItem(key) || '[]');
  all = all.filter(r => r._id !== id);
  localStorage.setItem(key, JSON.stringify(all));
}

function countLocal(formId) {
  return getLocalData(formId).length;
}

function downloadBlob(content, filename, type) {
  const blob = new Blob(['\ufeff' + content], { type: type + ';charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

function downloadXLS(content, filename) {
  const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>' + content + '</body></html>';
  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename.replace(/\.csv$/, '.xls');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function exportFormCSV(formId, formLabel, fields, headers) {
  const data = getLocalData(formId);
  if (!data.length) {
    alert('⚠️ لا توجد بيانات محفوظة لـ "' + formLabel + '".\nقم بتسجيل بعض البيانات أولاً.');
    return;
  }
  let csv = headers.join(',') + '\n';
  data.forEach(row => {
    csv += fields.map(f => {
      let val = row[f];
      if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
      return escapeCSV(val);
    }).join(',') + '\n';
  });
  downloadBlob(csv, formLabel + '_' + new Date().toISOString().slice(0, 10) + '.csv', 'text/csv');
}

function exportFormXLS(formId, formLabel, fields, headers) {
  const data = getLocalData(formId);
  if (!data.length) {
    alert('⚠️ لا توجد بيانات محفوظة لـ "' + formLabel + '".');
    return;
  }
  let table = '<table dir="rtl" style="font-family:sans-serif;font-size:12px;border-collapse:collapse;width:100%;direction:rtl">';
  table += '<thead><tr style="background:#0f766e;color:#fff">';
  headers.forEach(h => { table += '<th style="padding:8px 10px;border:1px solid #ddd;text-align:right">' + h + '</th>'; });
  table += '</tr></thead><tbody>';
  data.forEach((row, ri) => {
    table += '<tr' + (ri % 2 ? ' style="background:#f5f5f5"' : '') + '>';
    fields.forEach(f => {
      let val = row[f];
      if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
      table += '<td style="padding:6px 10px;border:1px solid #ddd;text-align:right">' + (val !== undefined && val !== null ? val : '') + '</td>';
    });
    table += '</tr>';
  });
  table += '</tbody></table>';
  downloadXLS(table, formLabel + '_' + new Date().toISOString().slice(0, 10) + '.csv');
}

function downloadCSVTemplate(formLabel, fields, headers) {
  let csv = headers.join(',') + '\n';
  csv += fields.map(() => '').join(',') + '\n';
  downloadBlob(csv, formLabel + '_نموذج.csv', 'text/csv');
}

function readCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { reject(new Error('الملف لا يحتوي على بيانات كافية')); return; }
      const headerLine = lines[0];
      const headers = parseCSVLine(headerLine);
      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = parseCSVLine(lines[i]);
        if (vals.length === headers.length && vals.some(v => v.trim())) {
          rows.push(vals);
        }
      }
      resolve({ headers, rows });
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsText(file, 'UTF-8');
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function buildToolbar(formName, backLink) {
  const div = document.createElement('div');
  div.style.cssText = `
    display: flex; flex-wrap: wrap; gap: 8px;
    padding: 12px 16px; margin-bottom: 16px;
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: var(--radius); align-items: center;
  `;
  div.innerHTML = `
    <a href="${backLink}" style="
      display: inline-flex; align-items: center; gap: 5px;
      padding: 7px 14px; border-radius: var(--radius-sm);
      background: var(--bg3); border: 1px solid var(--border);
      color: var(--text2); text-decoration: none;
      font-family: 'Cairo', sans-serif; font-size: 0.82rem; font-weight: 700;
      transition: all 0.2s;
    " onmouseover="this.style.background='var(--bg4)';this.style.color='#fff'" onmouseout="this.style.background='var(--bg3)';this.style.color='var(--text2)'">↩ الرجوع للرئيسية</a>
    <span style="flex:1;min-width:10px"></span>
    <span id="localCount" style="font-size:0.78rem;color:var(--text3);font-weight:600"></span>
    <button onclick="openSavedRecords()" style="
      display: inline-flex; align-items: center; gap: 4px;
      padding: 7px 14px; border-radius: var(--radius-sm);
      background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.2);
      color: #a855f7; cursor: pointer;
      font-family: 'Cairo', sans-serif; font-size: 0.82rem; font-weight: 700;
      transition: all 0.2s;
    " onmouseover="this.style.background='rgba(168,85,247,0.2)'" onmouseout="this.style.background='rgba(168,85,247,0.1)'">📂 السجلات المحفوظة</button>
    <button onclick="saveCurrentForm()" style="
      display: inline-flex; align-items: center; gap: 4px;
      padding: 7px 14px; border-radius: var(--radius-sm);
      background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2);
      color: var(--accent); cursor: pointer;
      font-family: 'Cairo', sans-serif; font-size: 0.82rem; font-weight: 700;
      transition: all 0.2s;
    " onmouseover="this.style.background='rgba(16,185,129,0.2)'" onmouseout="this.style.background='rgba(16,185,129,0.1)'">💾 حفظ محلي</button>
    <button onclick="exportFormCSV(currentFormId, currentFormLabel, currentFields, currentHeaders)" style="
      display: inline-flex; align-items: center; gap: 4px;
      padding: 7px 14px; border-radius: var(--radius-sm);
      background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2);
      color: var(--primary); cursor: pointer;
      font-family: 'Cairo', sans-serif; font-size: 0.82rem; font-weight: 700;
      transition: all 0.2s;
    " onmouseover="this.style.background='rgba(59,130,246,0.2)'" onmouseout="this.style.background='rgba(59,130,246,0.1)'">📥 CSV</button>
    <button onclick="exportFormXLS(currentFormId, currentFormLabel, currentFields, currentHeaders)" style="
      display: inline-flex; align-items: center; gap: 4px;
      padding: 7px 14px; border-radius: var(--radius-sm);
      background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2);
      color: var(--accent); cursor: pointer;
      font-family: 'Cairo', sans-serif; font-size: 0.82rem; font-weight: 700;
      transition: all 0.2s;
    " onmouseover="this.style.background='rgba(16,185,129,0.2)'" onmouseout="this.style.background='rgba(16,185,129,0.1)'">📊 Excel</button>
    <button onclick="downloadCSVTemplate(currentFormLabel, currentFields, currentHeaders)" style="
      display: inline-flex; align-items: center; gap: 4px;
      padding: 7px 14px; border-radius: var(--radius-sm);
      background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2);
      color: var(--warn); cursor: pointer;
      font-family: 'Cairo', sans-serif; font-size: 0.82rem; font-weight: 700;
      transition: all 0.2s;
    " onmouseover="this.style.background='rgba(245,158,11,0.2)'" onmouseout="this.style.background='rgba(245,158,11,0.1)'">📄 نموذج</button>
    <button onclick="document.getElementById('csvImportInput').click()" style="
      display: inline-flex; align-items: center; gap: 4px;
      padding: 7px 14px; border-radius: var(--radius-sm);
      background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2);
      color: #a78bfa; cursor: pointer;
      font-family: 'Cairo', sans-serif; font-size: 0.82rem; font-weight: 700;
      transition: all 0.2s;
    " onmouseover="this.style.background='rgba(139,92,246,0.2)'" onmouseout="this.style.background='rgba(139,92,246,0.1)'">📤 استيراد ملف (CSV / Excel)</button>
    <input type="file" id="csvImportInput" accept=".csv,.xlsx,.xls" style="display:none" onchange="handleFileImport(this)">
    <div id="importProgressWrap" style="display:none;flex:1 1 100%;margin-top:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;gap:8px">
        <span id="importProgressMsg" style="font-size:0.75rem;color:var(--text3);font-weight:600"></span>
        <span id="importProgressPct" style="font-size:0.75rem;color:var(--primary);font-weight:800"></span>
      </div>
      <div style="height:10px;border-radius:6px;background:var(--bg3);border:1px solid var(--border);overflow:hidden">
        <div id="importProgressBar" style="height:100%;width:0%;border-radius:6px;background:linear-gradient(90deg,#0f766e,#10b981);transition:width 0.3s ease"></div>
      </div>
    </div>
  `;
  return div;
}

function updateLocalCount(formId) {
  const el = document.getElementById('localCount');
  if (el) {
    const c = countLocal(formId);
    el.textContent = '💾 ' + c + ' تسجيل محلي';
    if (c > 0) el.style.color = 'var(--accent)';
  }
}

var currentFormId, currentFormLabel, currentFields, currentHeaders;

function initOffline(formId, formLabel, fields, headers) {
  currentFormId = formId;
  currentFormLabel = formLabel;
  currentFields = fields;
  currentHeaders = headers;

  const main = document.querySelector('.main');
  if (main) {
    const toolbar = buildToolbar(formLabel, 'index.html');
    main.insertBefore(toolbar, main.firstChild);
  }

  updateLocalCount(formId);
}

function saveCurrentForm() {
  if (typeof collectFormData === 'function') {
    const data = collectFormData();
    if (data && Object.keys(data).length > 0) {
      const id = saveLocal(currentFormId, data);
      updateLocalCount(currentFormId);
      showTooltip('✅ تم حفظ البيانات محلياً بنجاح (رقم: ' + id.slice(-6) + ')');
    } else {
      showTooltip('⚠️ لم يتم إدخال أي بيانات للحفظ', true);
    }
  } else {
    showTooltip('⚠️ وظيفة جمع البيانات غير متوفرة', true);
  }
}

function focusFirstEmpty(els) {
  const list = els || [];
  for (let i = 0; i < list.length; i++) {
    const el = list[i];
    if (!el) continue;
    const v = (el.value === null || el.value === undefined) ? '' : String(el.value);
    if (!v.trim()) {
      try { el.focus({ preventScroll: true }); } catch (err) { try { el.focus(); } catch (err2) {} }
      if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    }
  }
  return false;
}

function focusFirstError() {
  const errs = document.querySelectorAll('.field-error');
  let first = null;
  for (let i = 0; i < errs.length; i++) {
    if (errs[i].style.display !== 'none') { first = errs[i]; break; }
  }
  if (!first) return false;
  let input = null;
  if (first.id && first.id.indexOf('e_') === 0) {
    input = document.getElementById(first.id.slice(2));
  }
  if (!input || typeof input.focus !== 'function') {
    const field = first.closest ? first.closest('.field') : null;
    if (field) input = field.querySelector('input,select,textarea');
  }
  const target = (input && typeof input.focus === 'function') ? input : first;
  try { target.focus({ preventScroll: true }); } catch (err) { try { target.focus(); } catch (err2) {} }
  if (typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return true;
}

function showTooltip(msg, isErr) {
  const el = document.getElementById('statusMsg') || document.querySelector('.status-msg');
  if (el) {
    el.textContent = msg;
    el.className = 'status-msg ' + (isErr ? 'err' : 'info');
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  } else {
    alert(msg);
  }
}

function showImportProgress(msg, pct) {
  const wrap = document.getElementById('importProgressWrap');
  const bar = document.getElementById('importProgressBar');
  const pctEl = document.getElementById('importProgressPct');
  const msgEl = document.getElementById('importProgressMsg');
  if (wrap) wrap.style.display = 'block';
  if (bar) bar.style.width = (pct || 0) + '%';
  if (pctEl) pctEl.textContent = (pct || 0) + '%';
  if (msgEl) msgEl.textContent = msg || '';
}
function hideImportProgress() {
  const wrap = document.getElementById('importProgressWrap');
  if (wrap) wrap.style.display = 'none';
}

function loadXLSXLib() {
  return new Promise((resolve, reject) => {
    if (typeof XLSX !== 'undefined') { resolve(XLSX); return; }
    const script = document.createElement('script');
    script.src = 'xlsx.full.min.js';
    script.onload = () => { if (typeof XLSX !== 'undefined') resolve(XLSX); else reject(new Error('فشل تحميل مكتبة Excel')); };
    script.onerror = () => {
      const s2 = document.createElement('script');
      s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s2.onload = () => { if (typeof XLSX !== 'undefined') resolve(XLSX); else reject(new Error('فشل تحميل مكتبة Excel')); };
      s2.onerror = () => reject(new Error('مكتبة قراءة Excel غير متوفرة (تحقق من الاتصال بالإنترنت)'));
      document.head.appendChild(s2);
    };
    document.head.appendChild(script);
  });
}

function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) { reject(new Error('الملف لا يحتوي على أوراق عمل')); return; }
        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
        if (!aoa.length) { reject(new Error('الملف لا يحتوي على بيانات')); return; }
        const headers = (aoa[0] || []).map(h => String(h == null ? '' : h).trim());
        const rows = [];
        for (let i = 1; i < aoa.length; i++) {
          const vals = aoa[i];
          if (vals && vals.some(v => String(v).trim())) {
            rows.push(vals.map(v => (v == null ? '' : String(v)).trim()));
          }
        }
        resolve({ headers, rows });
      } catch (err) {
        reject(new Error('تعذر قراءة ملف Excel: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsArrayBuffer(file);
  });
}

function _normHeader(h) {
  return String(h == null ? '' : h).toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[^\u0600-\u06FF\u0041-\u005A\u0061-\u007A\u0030-\u0039]+/g, '');
}

function matchHeaders(excelHeaders) {
  var target = (typeof window !== 'undefined' && window.CSV_HEADERS && window.CSV_HEADERS.length) ? window.CSV_HEADERS : null;
  if (!target) return { headers: excelHeaders, matched: 0 };
  var used = new Array(target.length).fill(false);
  var mapped = excelHeaders.slice();
  var matchedCount = 0;
  excelHeaders.forEach(function(h, i) {
    var n = _normHeader(h);
    if (!n) return;
    for (var t = 0; t < target.length; t++) {
      if (!used[t] && n === _normHeader(target[t])) { mapped[i] = target[t]; used[t] = true; matchedCount++; return; }
    }
  });
  excelHeaders.forEach(function(h, i) {
    if (mapped[i] !== h) return;
    var n = _normHeader(h);
    if (!n) return;
    var best = -1, bestLen = 0;
    for (var t = 0; t < target.length; t++) {
      if (used[t]) continue;
      var nt = _normHeader(target[t]);
      if (!nt) continue;
      if (n.indexOf(nt) >= 0 && nt.length > bestLen) { best = t; bestLen = nt.length; }
      else if (nt.indexOf(n) >= 0 && n.length > bestLen) { best = t; bestLen = n.length; }
    }
    if (best >= 0) { mapped[i] = target[best]; used[best] = true; matchedCount++; }
  });
  return { headers: mapped, matched: matchedCount };
}

function handleFileImport(input) {
  const file = input.files[0];
  if (!file) return;
  const isExcel = /\.(xlsx|xls)$/i.test(file.name || '');
  const doImport = (headers, rows) => {
    if (!rows.length) { hideImportProgress(); showTooltip('⚠️ الملف لا يحتوي على صفوف بيانات', true); input.value = ''; return; }
    const res = matchHeaders(headers);
    showImportProgress('تجهيز الصفوف (' + rows.length + ' سطر)', 55);
    setTimeout(function() {
      if (typeof importCSVData === 'function') {
        if (res.matched < 2) {
          hideImportProgress();
          showTooltip('❌ أعمدة الملف غير متطابقة: مطلوب أعمدة مثل: ' + (window.CSV_HEADERS || []).slice(0, 6).join('، ') + '...', true);
        } else {
          importCSVData(res.headers, rows);
          showImportProgress('تم استيراد ' + rows.length + ' سجل', 100);
          setTimeout(hideImportProgress, 1600);
        }
      } else {
        hideImportProgress();
        showTooltip('⚠️ وظيفة الاستيراد غير متوفرة لهذه الاستمارة', true);
      }
      input.value = '';
    }, 80);
  };
  const fail = err => {
    hideImportProgress();
    showTooltip('❌ فشل الاستيراد: ' + (err && err.message ? err.message : err), true);
    input.value = '';
  };
  if (isExcel) {
    showImportProgress('تحميل مكتبة قراءة Excel...', 12);
    loadXLSXLib().then(function() {
      showImportProgress('قراءة ملف Excel...', 30);
      readExcelFile(file).then(function(r) { doImport(r.headers, r.rows); }).catch(fail);
    }).catch(fail);
  } else {
    showImportProgress('قراءة ملف CSV...', 20);
    readCSVFile(file).then(function(r) { doImport(r.headers, r.rows); }).catch(fail);
  }
}

function openSavedRecords() {
  const data = getLocalData(currentFormId);
  if (!data.length) {
    showTooltip('⚠️ لا توجد بيانات محفوظة', true);
    return;
  }
  let html = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px" onclick="this.remove()">';
  html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;max-width:600px;width:100%;max-height:80vh;overflow:auto;padding:24px;direction:rtl" onclick="event.stopPropagation()">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">';
  html += '<h2 style="font-size:1.1rem;color:#fff;font-weight:900">📋 السجلات المحفوظة (' + data.length + ')</h2>';
  html += '<button onclick="this.closest(\'div\').closest(\'div\').remove()" style="background:var(--danger-bg);border:1px solid rgba(239,68,68,0.2);color:var(--danger);padding:4px 12px;border-radius:8px;cursor:pointer;font-family:\'Cairo\',sans-serif;font-size:0.8rem;font-weight:700">✕ إغلاق</button>';
  html += '</div>';
  data.forEach((row, i) => {
    html += '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;font-size:0.8rem;color:var(--text2)">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:6px">';
    html += '<span style="color:var(--primary);font-weight:700">#' + (i + 1) + '</span>';
    html += '<span style="color:var(--text3);font-size:0.75rem">' + (row._savedAt ? new Date(row._savedAt).toLocaleString('ar-EG') : '') + '</span>';
    html += '</div>';
    currentFields.forEach(f => {
      if (f.startsWith('_')) return;
      const idx = currentFields.indexOf(f);
      const label = currentHeaders[idx] || f;
      let val = row[f];
      if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
      if (val !== undefined && val !== null && val !== '') {
        html += '<div><span style="color:var(--text3)">' + label + ':</span> ' + val + '</div>';
      }
    });
    html += '<div style="margin-top:8px;display:flex;gap:6px">';
    html += '<button onclick="loadSavedRecord(' + i + ')" style="flex:1;padding:6px 12px;border-radius:6px;background:rgba(15,118,110,0.1);border:1px solid rgba(15,118,110,0.2);color:var(--primary);cursor:pointer;font-family:\'Cairo\',sans-serif;font-size:0.75rem;font-weight:700;transition:all 0.2s">📥 تحميل إلى الاستمارة</button>';
    html += '<button onclick="deleteSavedRecord(' + i + ',\'' + row._id + '\')" style="padding:6px 10px;border-radius:6px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:var(--danger);cursor:pointer;font-family:\'Cairo\',sans-serif;font-size:0.75rem;font-weight:700;transition:all 0.2s">🗑️ حذف</button>';
    html += '</div>';
    html += '</div>';
  });
  html += '</div></div>';
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div);
}

function loadSavedRecord(index) {
  const records = getLocalData(currentFormId);
  if (index >= 0 && index < records.length && typeof fillFormFromLocal === 'function') {
    fillFormFromLocal(records[index]);
    const modal = document.querySelector('[onclick="this.remove()"]');
    if (modal) modal.remove();
  } else if (typeof fillFormFromLocal !== 'function') {
    showTooltip('⚠️ وظيفة تحميل البيانات غير متوفرة لهذه الاستمارة', true);
  }
}

function deleteSavedRecord(index, id) {
  if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
  deleteLocalRecord(currentFormId, id);
  updateLocalCount(currentFormId);
  const modal = document.querySelector('[onclick="this.remove()"]');
  if (modal) modal.remove();
  openSavedRecords();
}

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
    " onmouseover="this.style.background='rgba(139,92,246,0.2)'" onmouseout="this.style.background='rgba(139,92,246,0.1)'">📤 استيراد CSV</button>
    <input type="file" id="csvImportInput" accept=".csv" style="display:none" onchange="handleCSVImport(this)">
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

function handleCSVImport(input) {
  const file = input.files[0];
  if (!file) return;
  readCSVFile(file).then(({ headers, rows }) => {
    if (typeof importCSVData === 'function') {
      importCSVData(headers, rows);
    } else {
      showTooltip('⚠️ وظيفة استيراد CSV غير متوفرة لهذه الاستمارة', true);
    }
    input.value = '';
  }).catch(err => {
    showTooltip('❌ فشل قراءة الملف: ' + err.message, true);
    input.value = '';
  });
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

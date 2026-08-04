/**
 * Google Apps Script — الملف الطبي | صناع الحياة المنوفية
 * توحيد 9 استمارات في شيت واحد + توزيع لحظي لمجلدات المراكز
 */

const SHEET_ID = '13nnScC6w3e0AxdreNmXCfDW2gz6c0I1-2zzBCnjwig8';
const ROOT_FOLDER_ID = '1uot-zEvwR8tI_4COhGz0dM3SxPEkZu8E';
const DATA_ROOT_FOLDER_ID = '1opDIaRsM4BJ8oqTVDP6PshcaI5xq3HUY';
const BUILD = 'perf-v1';
var DBG_IMG_MS = 0;
const CENTERS = ['أشمون','الباجور','السادات','الشهداء','بركة السبع','تلا','شبين الكوم','قويسنا','منوف'];

const TAB_FOLDER_MAP = [
  { tab: 'المساعدات الطبية',  folderId: null,              folderName: 'المساعدات الطبية',       centerCol: 6  },
  { tab: 'التحويلات الطبية',   folderId: '1sndJnD3NVpFX5bdiXKu3YvY3XAcQ-t1e', folderName: 'التحويلات الطبية', centerCol: 8  },
  { tab: 'حصر الأدوية',        folderId: null,              folderName: 'حصر الأدوية',            centerCol: 4  },
  { tab: 'أدوية القوافل',      folderId: '1KNq1YaAIbdNZb7ZTLxXZFozNYNuQtFRK', folderName: 'قوافل_الملف الطبي', centerCol: 4  },
  { tab: 'صرف أدوية القوافل',  folderId: '1DRq3ymx7stiA7zbU_neReyf0dDm1OWrR', folderName: 'صرف أدوية قوافل الملف الطبي', centerCol: 3  },
  { tab: 'نتائج القوافل',      folderId: '1KNq1YaAIbdNZb7ZTLxXZFozNYNuQtFRK', folderName: 'قوافل_الملف الطبي', centerCol: 3  },
  { tab: 'التعاقدات الطبية',   folderId: '1FTrzh1aVBtU2A_iFyyWAwZ30KYpE4Nat', folderName: 'التعاقدات العامة',  centerCol: 14 },
  { tab: 'مصروفات الحالات',    folderId: '17Y3bQ5UASjlbMUHhdQtbQZFoxofxnWkW', folderName: 'تقارير مصروفات الحالات للملف الطبي', centerCol: 6  },
  { tab: 'نواقص الصرف الشهري', folderId: null,              folderName: 'نواقص الصرف الشهري',     centerCol: 9  },
];

const FORMS = {
  submit: {
    tab: 'المساعدات الطبية',
    headers: ['معرف','تاريخ التسجيل','اسم الحالة','الرقم القومي','الهاتف','المركز','اسم الدواء','شريط/علبة','التركيز','النوع','تاريخ الانتهاء','الكمية','صورة الروشتة','صورة البطاقة'],
    fields: ['_id','_timestamp','patient_name','national_id','phone_number','center','med_name','med_form','med_conc','med_type','med_exp','med_qty','prescription_photo_url','id_photo_url'],
    hasImages: true,
    imageFields: ['prescription_photo','id_photo'],
    subfolder: 'المساعدات الطبية'
  },
  referral: {
    tab: 'التحويلات الطبية',
    headers: ['معرف','تاريخ التسجيل','اسم المريض','السن','الجنس','الهاتف','الرقم القومي','المركز','العنوان','تاريخ التحويل','جهة التحويل','اسم الدكتور/الجهة','التفاصيل','صورة التحويل','ملاحظات','الموظف'],
    fields: ['_id','_timestamp','patient_name','patient_age','patient_gender','patient_phone','national_id','patient_center','patient_address','referral_date','referral_type','referral_target','referral_details','referral_image_url','notes','staff_name'],
    hasImages: true,
    imageFields: ['referral_image'],
    subfolder: 'التحويلات الطبية'
  },
  hser_edwia: {
    tab: 'حصر الأدوية',
    headers: ['معرف','تاريخ التسجيل','التاريخ','المركز','اسم الدواء','التركيز','المادة الفعالة','النوع','شريط/علبة','الكمية','تاريخ الانتهاء','التخصص'],
    fields: ['_id','_timestamp','date','sec','med_name','med_focus','med_ava','med_typ','med_do','med_quan','med_date','med_takhassos'],
    hasImages: false,
    subfolder: 'حصر الأدوية'
  },
  adwyt_alqawafel: {
    tab: 'أدوية القوافل',
    headers: ['معرف','تاريخ التسجيل','التاريخ','المركز','اسم الدواء','التركيز','تاريخ الانتهاء','المادة الفعالة','النوع','شريط/علبة','الكمية','التخصص'],
    fields: ['_id','_timestamp','date','center','name','conc','exp','active','type','unit','qty','spec'],
    hasImages: false,
    subfolder: 'أدوية القوافل'
  },
  sarf_alqawafel: {
    tab: 'صرف أدوية القوافل',
    headers: ['معرف','تاريخ التسجيل','المركز','تاريخ القافلة','الدكتور','التخصص','اسم الدواء','شريط/علبة','التركيز','النوع','تاريخ الانتهاء','الكمية','صورة الروشتة'],
    fields: ['_id','_timestamp','center','caravan_date','doctor_name','doctor_specialty','med_name','med_form','med_conc','med_type','med_exp','med_qty','prescription_photo_url'],
    hasImages: true,
    imageFields: ['prescription_photo'],
    subfolder: 'صرف أدوية القوافل'
  },
  nata2_alqawafel: {
    tab: 'نتائج القوافل',
    headers: ['معرف','تاريخ التسجيل','المركز','إجمالي الكشوفات','عدد التحاليل','تدخلات أخرى','عدد التدخلات','التخصصات'],
    fields: ['_id','_timestamp','center','total_checkups','total_labs','other_interventions','other_interventions_count','specialties'],
    hasImages: false,
    subfolder: 'نتائج القوافل'
  },
  taaqodat: {
    tab: 'التعاقدات الطبية',
    headers: ['معرف','تاريخ التسجيل','نوع الجهة','اسم المكان','نص التعاقد','صورة التعاقد','المتطوع','رقم المتطوع','ممثل المكان','الصفة','الهاتف','العنوان','الموقع','المركز','ملاحظات'],
    fields: ['_id','_timestamp','entity_type','facility_name','contract_text','contract_photo_url','contractor_name','volunteer_number','name_contractor','job_title','facility_phone','detailed_address','location','center','notes'],
    hasImages: true,
    imageFields: ['contract_photo'],
    subfolder: 'التعاقدات الطبية'
  },
  masroufat: {
    tab: 'مصروفات الحالات',
    headers: ['معرف','تاريخ التسجيل','اسم الحالة','الرقم القومي','المبلغ','المركز','اسم الدواء','شريط/علبة','التركيز','النوع','تاريخ الانتهاء','الكمية','مصدر الدواء','المركز المانح','صورة الروشتة'],
    fields: ['_id','_timestamp','patient_name','national_id','amount','center','med_name','med_form','med_conc','med_type','med_exp','med_qty','med_source','donor_center','prescription_photo_url'],
    hasImages: true,
    imageFields: ['prescription_photo'],
    subfolder: 'مصروفات الحالات'
  },
  nawa2es_serf: {
    tab: 'نواقص الصرف الشهري',
    headers: ['معرف','تاريخ التسجيل','اسم الدواء','شكل الجرعة','التركيز','الكمية','السعر للوحدة','العينة','المركز'],
    fields: ['_id','_timestamp','name','form','conc','qty','price','sample','center'],
    hasImages: false,
    subfolder: 'نواقص الصرف الشهري'
  }
};

// ─── doGet ───
function doGet(e) {
  const action = e?.parameter?.action || '';
  if (action === 'checkNID') return handleCheckNID(e.parameter.nid);
  if (action === 'getDrugSummary') return handleGetDrugSummary(e.parameter.center);
  if (action === 'getAllDrugSummary') return handleGetAllDrugSummary();
  return respondJson({ status: 'error', message: 'إجراء غير معروف' });
}

function handleCheckNID(nid) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('المساعدات الطبية');
    if (!sheet) return respondJson({ exists: false });
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return respondJson({ exists: false });
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][3]).trim() === String(nid).trim()) return respondJson({ exists: true });
    }
    return respondJson({ exists: false });
  } catch (e) {
    return respondJson({ exists: false, error: e.toString() });
  }
}

function handleGetDrugSummary(center) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('ملخص حصر');
    if (!sheet) return respondJson({ status: 'error', message: 'تاب ملخص حصر غير موجود' });
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return respondJson({ status: 'error', message: 'لا توجد بيانات', data: [] });
    // النطاق N:T = عمود 14 إلى 20 (7 أعمدة)
    const data = sheet.getRange(1, 14, lastRow, 7).getValues();

    const h = data[0];
    const ci = 0; // N = المركز
    const ni = 1; // O = اسم الدواء
    const fi = 2; // P = شريط/علبة
    const co = 3; // Q = التركيز
    const ti = 4; // R = النوع
    const ei = 5; // S = تاريخ الانتهاء
    const qi = 6; // T = الكمية

    const h0 = (h[0]||'').toString().trim();
    const h1 = (h[1]||'').toString().trim();
    if (h0 !== 'المركز' || h1 !== 'اسم الدواء')
      return respondJson({ status: 'error', message: 'تنسيق الأعمدة N:T غير متطابق', data: [] });

    const rows = data.slice(1);
    const filtered = rows
      .filter(r => (r[ci] || '').toString().trim() === center)
      .map(r => ({
        center: r[ci], name: r[ni], form: r[fi]||'',
        conc: r[co]||'', type: r[ti]||'',
        exp: r[ei]||'', qty: r[qi]||''
      }));

    return respondJson({ status: 'success', data: filtered });
  } catch (e) {
    return respondJson({ status: 'error', message: e.toString(), data: [] });
  }
}

function handleGetAllDrugSummary() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('ملخص حصر');
    if (!sheet) return respondJson({ status: 'error', message: 'تاب ملخص حصر غير موجود', data: [] });
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return respondJson({ status: 'error', message: 'لا توجد بيانات', data: [] });
    const data = sheet.getRange(1, 14, lastRow, 7).getValues();
    const rows = data.slice(1).map(function(r) { return {
      center: r[0]||'', name: r[1]||'', form: r[2]||'',
      conc: r[3]||'', type: r[4]||'',
      exp: r[5]||'', qty: r[6]||''
    }; }).filter(function(r) { return r.name.toString().trim(); });
    return respondJson({ status: 'success', data: rows });
  } catch (e) {
    return respondJson({ status: 'error', message: e.toString(), data: [] });
  }
}

// ─── doPost ───
function doPost(e) {
  var T = { t0: Date.now(), parse: 0, handler: 0, dist: 0, rows: 0 };
  DBG_IMG_MS = 0;
  try {
    let data;
    const ct = e?.postData?.type || '';
    if (ct.includes('application/json') || ct.includes('text/plain')) {
      data = JSON.parse(e.postData.contents);
    } else if (ct.includes('x-www-form-urlencoded')) {
      data = {};
      for (const k in e.parameter) data[k] = e.parameter[k];
    } else {
      data = JSON.parse(e.postData.contents);
    }
    T.parse = Date.now() - T.t0;

    const action = data.action || '';
    const formConfig = FORMS[action];
    if (!formConfig) return respondJson({ status: 'error', message: 'إجراء غير معروف: ' + action });

    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(formConfig.tab);
    if (!sheet) {
      sheet = ss.insertSheet(formConfig.tab);
      sheet.appendRow(formConfig.headers);
      sheet.getRange(1, 1, 1, formConfig.headers.length).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
    }

    const timestamp = new Date().toISOString();
    const recordId = Utilities.getUuid().slice(0, 8);

    let imagesFolder;
    if (formConfig.hasImages) imagesFolder = getOrCreateFormFolder(formConfig.subfolder);

    var tH = Date.now();
    let result;
    if (action === 'submit') result = handleSubmit(data, sheet, formConfig, recordId, timestamp, imagesFolder);
    else if (action === 'referral') result = handleReferral(data, sheet, formConfig, recordId, timestamp, imagesFolder);
    else if (action === 'hser_edwia') result = handleHserEdwia(data, sheet, formConfig, recordId, timestamp);
    else if (action === 'adwyt_alqawafel') result = handleAdwytAlqawafel(data, sheet, formConfig, recordId, timestamp);
    else if (action === 'sarf_alqawafel') result = handleSarfAlqawafel(data, sheet, formConfig, recordId, timestamp, imagesFolder);
    else if (action === 'nata2_alqawafel') result = handleNata2Alqawafel(data, sheet, formConfig, recordId, timestamp);
    else if (action === 'taaqodat') result = handleTaaqodat(data, sheet, formConfig, recordId, timestamp, imagesFolder);
    else if (action === 'masroufat') result = handleMasroufat(data, sheet, formConfig, recordId, timestamp, imagesFolder);
    else if (action === 'nawa2es_serf') result = handleNawa2esSerf(data, sheet, formConfig, recordId, timestamp);
    else return respondJson({ status: 'error', message: 'لم يتم معالجة الإجراء' });
    T.handler = Date.now() - tH;
    T.rows = (result.rows || []).length;

    // توزيع لحظي بعد الحفظ الناجح
    var tD = Date.now();
    try { distributeSingleRow(formConfig, result.rows || []); } catch (e) { console.error('Distribute error: ' + e); }
    T.dist = Date.now() - tD;

    console.log('[PERF] ' + JSON.stringify({
      build: BUILD, action: action, rows: T.rows,
      total_ms: Date.now() - T.t0,
      parse_ms: T.parse, handler_ms: T.handler, img_ms: DBG_IMG_MS,
      distribute_ms: T.dist
    }));

    return result.json;
  } catch (e) {
    return respondJson({ status: 'error', message: e.toString() });
  }
}

// ─── المساعدات الطبية ───
function handleSubmit(data, sheet, config, recordId, timestamp, folder) {
  const prescUrl = data.prescription_photo ? saveBase64Image(data.prescription_photo, 'روشتة_' + recordId, folder) : '';
  const idUrl = data.id_photo ? saveBase64Image(data.id_photo, 'بطاقة_' + recordId, folder) : '';
  var meds = [];
  try { meds = typeof data.medicines === 'string' ? JSON.parse(data.medicines) : (data.medicines || []); } catch(e) { meds = []; }
  var rows = [];
  if (meds.length === 0) {
    rows.push([recordId, timestamp, data.patient_name||'', data.national_id||'', data.phone_number||'', data.center||'', '', '', '', '', '', '', prescUrl, idUrl]);
  } else {
    meds.forEach(function(m, i) {
      rows.push([recordId + '-' + (i + 1), timestamp, data.patient_name||'', data.national_id||'', data.phone_number||'', data.center||'', m.med_name||m.name||'', m.med_form||'', m.med_conc||'', m.med_type||'', m.med_exp||'', (m.med_qty||m.qty||''), prescUrl, idUrl]);
    });
  }
  appendRows(sheet, rows);
  return { json: respondJson({ status: 'success', message: 'تم تسجيل ' + meds.length + ' دواء', id: recordId, count: meds.length }), rows: rows };
}

// ─── التحويلات الطبية ───
function handleReferral(data, sheet, config, recordId, timestamp, folder) {
  const imgUrl = data.referral_image ? saveBase64Image(data.referral_image, 'تحويل_' + recordId, folder) : '';
  let target = '', details = '';
  const type = data.referral_type || '';
  if (type === 'دكتور') {
    target = data.doctor_name || '';
    details = JSON.stringify({ specialty: data.doctor_specialty||'', specialty_other: data.doctor_specialty_other||'', partnership_type: data.partnership_type||'', partnership_benefits: data.partnership_benefits||'', doctor_phone: data.doctor_phone||'', doctor_address: data.doctor_address||'' });
  } else if (type === 'معمل') {
    target = data.lab_name || '';
    details = JSON.stringify({ tests: data.lab_tests||'', address: data.lab_address||'' });
  } else if (type === 'أشعة') {
    target = data.radiology_center || '';
    details = JSON.stringify({ type: data.radiology_type||'', address: data.radiology_address||'' });
  } else if (type === 'نظارات') {
    target = data.glasses_center || '';
    details = JSON.stringify({ prescription: data.glasses_prescription||'', address: data.glasses_address||'' });
  } else if (type === 'علاج طبيعي') {
    target = data.physio_center || '';
    details = JSON.stringify({ sessions: data.physio_sessions||'', address: data.physio_address||'' });
  } else if (type === 'تخاطب') {
    target = data.speech_center || '';
    details = JSON.stringify({ address: data.speech_address||'' });
  }
  var row = [recordId, timestamp, data.patient_name||'', data.patient_age||'', data.patient_gender||'', data.patient_phone||'', data.national_id||'', data.patient_center||'', data.patient_address||'', data.referral_date||'', type, target, details, imgUrl, data.notes||'', data.staff_name||''];
  sheet.appendRow(row);
  return { json: respondJson({ status: 'success', message: 'تم تسجيل التحويل بنجاح', id: recordId }), rows: [row] };
}

// ─── حصر الأدوية ───
function handleHserEdwia(data, sheet, config, recordId, timestamp) {
  let tab;
  try { tab = JSON.parse(data.tab || '[]'); } catch(e) { tab = []; }
  const date = data.date || '';
  const sec = data.sec || '';
  var rows = [];
  if (tab.length === 0) {
    rows.push([recordId, timestamp, date, sec, '', '', '', '', '', '', '', '']);
  } else {
    tab.forEach((item, i) => {
      rows.push([recordId + '-' + (i + 1), timestamp, date, sec,
        item.name||'', item.focus||'', item.ava||'', item.typ||'',
        (item.do || item['do']||''), item.quan||'',
        (item.date_kw6pm91||''), item.takhassos||''
      ]);
    });
  }
  appendRows(sheet, rows);
  return { json: respondJson({ status: 'success', message: 'تم تسجيل ' + tab.length + ' دواء', count: tab.length }), rows: rows };
}

// ─── أدوية القوافل ───
function handleAdwytAlqawafel(data, sheet, config, recordId, timestamp) {
  let tab;
  try { tab = JSON.parse(data.tab || '[]'); } catch(e) { tab = []; }
  const date = data.date || '';
  const center = data.center || '';
  var rows = [];
  if (tab.length === 0) {
    rows.push([recordId, timestamp, date, center, '', '', '', '', '', '', '', '']);
  } else {
    tab.forEach((item, i) => {
      rows.push([recordId + '-' + (i + 1), timestamp, date, center,
        item._||'', item.__001||'', item.__002||'', item.__003||'',
        item.__004||'', item.__005||'', item.__006||'', item.__007||''
      ]);
    });
  }
  appendRows(sheet, rows);
  return { json: respondJson({ status: 'success', message: 'تم تسجيل ' + tab.length + ' دواء', count: tab.length }), rows: rows };
}

// ─── صرف أدوية القوافل ───
function handleSarfAlqawafel(data, sheet, config, recordId, timestamp, folder) {
  const prescriptions = data.prescription_group || [];
  var rows = [];
  if (prescriptions.length === 0) {
    rows.push([recordId, timestamp, data.center||'', data.caravan_date||'', '', '', '', '', '', '', '', '', '']);
    appendRows(sheet, rows);
    return { json: respondJson({ status: 'success', message: 'تم التسجيل (بدون أدوية)' }), rows: rows };
  }
  var rowIdx = 0;
  prescriptions.forEach(function(p) {
    var imgUrl = p.prescription_photo ? saveBase64Image(p.prescription_photo, 'صرف_' + recordId + '-' + (rowIdx + 1), folder) : '';
    var meds = p.medicine_group || [];
    if (meds.length === 0) {
      rowIdx++;
      rows.push([recordId + '-' + rowIdx, timestamp, data.center||'', data.caravan_date||'', p.doctor_name||'', p.doctor_specialty||'', '', '', '', '', '', '', imgUrl]);
    } else {
      meds.forEach(function(m) {
        rowIdx++;
        rows.push([recordId + '-' + rowIdx, timestamp, data.center||'', data.caravan_date||'', p.doctor_name||'', p.doctor_specialty||'', m.medicine_name||'', m.med_form||'', m.med_conc||'', m.med_type||'', m.med_exp||'', (m.quantity||m.qty||''), imgUrl]);
      });
    }
  });
  appendRows(sheet, rows);
  return { json: respondJson({ status: 'success', message: 'تم تسجيل ' + rowIdx + ' دواء', count: rowIdx }), rows: rows };
}

// ─── نتائج القوافل ───
function handleNata2Alqawafel(data, sheet, config, recordId, timestamp) {
  var row = [recordId, timestamp, data.center||'', data.total_checkups||'', data.total_labs||'', data.other_interventions||'', data.other_interventions_count||'', JSON.stringify(data.specialties||[])];
  sheet.appendRow(row);
  return { json: respondJson({ status: 'success', message: 'تم تسجيل نتائج القافلة بنجاح' }), rows: [row] };
}

// ─── التعاقدات الطبية ───
function handleTaaqodat(data, sheet, config, recordId, timestamp, folder) {
  const imgUrl = data.contract_photo ? saveBase64Image(data.contract_photo, 'تعاقد_' + recordId, folder) : '';
  var row = [recordId, timestamp, data.entity_type||'', data.facility_name||'', data.contract_text||'', imgUrl, data.contractor_name||'', data.volunteer_number||'', data.name_contractor||'', data.job_title||'', data.facility_phone||'', data.detailed_address||'', data.location||'', data.center||'', data.notes||''];
  sheet.appendRow(row);
  return { json: respondJson({ status: 'success', message: 'تم تسجيل التعاقد بنجاح' }), rows: [row] };
}

// ─── مصروفات الحالات ───
function handleMasroufat(data, sheet, config, recordId, timestamp, folder) {
  const imgUrl = data.prescription_photo ? saveBase64Image(data.prescription_photo, 'مصروفات_' + recordId, folder) : '';
  const meds = data.medications_group || [];
  var rows = [];
  if (meds.length === 0) {
    rows.push([recordId, timestamp, data.patient_name||'', data.national_id||'', data.integer_wa4xt75||'', data.center||'', '', '', '', '', '', '', '', '', imgUrl]);
  } else {
    meds.forEach(function(m, i) {
      rows.push([recordId + '-' + (i + 1), timestamp, data.patient_name||'', data.national_id||'', data.integer_wa4xt75||'', data.center||'', m.med_name||'', m.med_form||'', m.med_conc||'', m.med_type||'', m.med_exp||'', (m.med_qty||m.qty||''), m.med_source||'', m.donor_center||'', imgUrl]);
    });
  }
  appendRows(sheet, rows);
  return { json: respondJson({ status: 'success', message: 'تم تسجيل ' + meds.length + ' دواء', count: meds.length }), rows: rows };
}

// ─── نواقص الصرف الشهري ───
function handleNawa2esSerf(data, sheet, config, recordId, timestamp) {
  let tab;
  try { tab = JSON.parse(data.tab || '[]'); } catch(e) { tab = []; }
  var rows = [];
  if (tab.length === 0) {
    rows.push([recordId, timestamp, '', '', '', '', '', '', '']);
  } else {
    tab.forEach((item, i) => {
      rows.push([recordId + '-' + (i + 1), timestamp, item.name||'', item.form||'', item.conc||'', item.qty||'', item.price||'', item.sample||'', item.center||'']);
    });
  }
  appendRows(sheet, rows);
  return { json: respondJson({ status: 'success', message: 'تم تسجيل ' + tab.length + ' دواء', count: tab.length }), rows: rows };
}

// ─── كتابة مجمعة سريعة ───
function appendRows(sheet, rows) {
  if (!rows || !rows.length) return;
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

// ─── الصور ───
function saveBase64Image(base64Str, fileName, parentFolder) {
  if (!base64Str) return '';
  var t0 = Date.now();
  try {
    let data = base64Str;
    let mimeType = 'image/jpeg';
    let ext = '.jpg';
    if (data.includes(',')) {
      const header = data.split(',')[0];
      data = data.split(',')[1];
      if (header.includes('application/pdf')) { mimeType = 'application/pdf'; ext = '.pdf'; }
      else if (header.includes('image/png')) { mimeType = 'image/png'; ext = '.png'; }
      else if (header.includes('image/gif')) { mimeType = 'image/gif'; ext = '.gif'; }
      else if (header.includes('image/webp')) { mimeType = 'image/webp'; ext = '.webp'; }
    }
    const bytes = Utilities.base64Decode(data);
    const blob = Utilities.newBlob(bytes, mimeType, fileName + ext);
    const file = parentFolder.createFile(blob);
    DBG_IMG_MS += Date.now() - t0;
    return file.getUrl();
  } catch (e) {
    DBG_IMG_MS += Date.now() - t0;
    console.error('فشل حفظ الصورة ' + fileName + ': ' + e.toString());
    return '';
  }
}

function getOrCreateFormFolder(subfolderName) {
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const folders = root.getFoldersByName(subfolderName);
  return folders.hasNext() ? folders.next() : root.createFolder(subfolderName);
}

// ─── التوزيع على مجلدات المراكز ───
function setupFolders() {
  const root = DriveApp.getFolderById(DATA_ROOT_FOLDER_ID);
  TAB_FOLDER_MAP.forEach(function(cfg) {
    if (cfg.folderId) {
      try { DriveApp.getFolderById(cfg.folderId); } catch(e) { Logger.log('خطأ: ' + cfg.folderName + ' - ' + e); }
      return;
    }
    var folder = getFolderByName(root, cfg.folderName);
    if (!folder) folder = root.createFolder(cfg.folderName);
    CENTERS.forEach(function(c) {
      var subName = cfg.folderName + '_' + c;
      if (!getFolderByName(folder, subName)) folder.createFolder(subName);
    });
  });
}

function distributeAllData() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var root = DriveApp.getFolderById(DATA_ROOT_FOLDER_ID);
  TAB_FOLDER_MAP.forEach(function(cfg) {
    var sheet = ss.getSheetByName(cfg.tab);
    if (!sheet) return;
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return;
    var headers = data[0];
    var rows = data.slice(1);
    var ci = cfg.centerCol - 1;
    var formFolder = cfg.folderId ? DriveApp.getFolderById(cfg.folderId) : getFolderByName(root, cfg.folderName);
    if (!formFolder) return;
    var centerData = {};
    rows.forEach(function(row) {
      var center = (row[ci] || '').toString().trim();
      if (!center) return;
      if (!centerData[center]) centerData[center] = [];
      centerData[center].push(row);
    });
    CENTERS.forEach(function(c) {
      var rows2 = centerData[c] || [];
      if (!rows2.length) return;
      var subName = cfg.folderName + '_' + c;
      var centerFolder = getFolderByName(formFolder, subName);
      if (!centerFolder) return;
      var sh = getSheetInFolder(centerFolder, c);
      if (!sh) {
        sh = SpreadsheetApp.create(cfg.tab + ' - ' + c);
        var file = DriveApp.getFileById(sh.getId());
        centerFolder.addFile(file);
        DriveApp.getRootFolder().removeFile(file);
        sh.getActiveSheet().appendRow(headers);
        sh.getActiveSheet().getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
      }
      rows2.forEach(function(r) { sh.getActiveSheet().appendRow(r); });
    });
  });
}

function distributeSingleRow(formConfig, rows) {
  if (!rows || !rows.length) return;
  var cfg = null;
  for (var idx = 0; idx < TAB_FOLDER_MAP.length; idx++) {
    if (TAB_FOLDER_MAP[idx].tab === formConfig.tab) { cfg = TAB_FOLDER_MAP[idx]; break; }
  }
  if (!cfg) return;
  var ci = cfg.centerCol - 1;
  var headers = formConfig.headers;
  var root = DriveApp.getFolderById(DATA_ROOT_FOLDER_ID);
  var formFolder = cfg.folderId ? DriveApp.getFolderById(cfg.folderId) : getFolderByName(root, cfg.folderName);
  if (!formFolder) return;
  var byCenter = {};
  rows.forEach(function(row) {
    var center = (row[ci] || '').toString().trim();
    if (!center) return;
    if (!byCenter[center]) byCenter[center] = [];
    byCenter[center].push(row);
  });
  Object.keys(byCenter).forEach(function(center) {
    var centerRows = byCenter[center];
    var subName = cfg.folderName + '_' + center;
    var centerFolder = getFolderByName(formFolder, subName);
    if (!centerFolder) return;
    var sh = getSheetInFolder(centerFolder, center);
    if (!sh) {
      sh = SpreadsheetApp.create(formConfig.tab + ' - ' + center);
      var file = DriveApp.getFileById(sh.getId());
      centerFolder.addFile(file);
      DriveApp.getRootFolder().removeFile(file);
      sh.getActiveSheet().appendRow(headers);
      sh.getActiveSheet().getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#0f766e').setFontColor('#ffffff');
    }
    var sh2 = sh.getActiveSheet();
    if (centerRows.length === 1) sh2.appendRow(centerRows[0]);
    else sh2.getRange(sh2.getLastRow() + 1, 1, centerRows.length, centerRows[0].length).setValues(centerRows);
  });
}

function getFolderByName(parentFolder, name) {
  var folders = parentFolder.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : null;
}

function getSheetInFolder(folder, nameHint) {
  var files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  var arr = [];
  while (files.hasNext()) { arr.push(files.next()); }
  if (arr.length === 0) return null;
  if (arr.length === 1) return SpreadsheetApp.openById(arr[0].getId());
  var best = arr.filter(function(f) { return f.getName().indexOf(nameHint) > -1; });
  return best.length > 0 ? SpreadsheetApp.openById(best[0].getId()) : SpreadsheetApp.openById(arr[0].getId());
}

function respondJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}


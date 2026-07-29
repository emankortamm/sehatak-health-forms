"""
Google Colab — إنشاء Shortcuts ناقصة في مجلد "مراكز"
─────────────────────────────────────────────────────
البنية:
  بنود/          ← فولدرات الاستمارات (المساعدات الطبية، ...)
    ├── المساعدات الطبية/
    │     ├── المساعدات الطبية_أشمون/  (فولدر مركز ← فيه شيت)
    │     └── ...
    └── ...
  مراكز/         ← فولدرات المراكز (أشمون، ...)
    ├── أشمون/         ← لازم يكون فيه شورت كت لكل شيت في المساعدات الطبية_أشمون إلخ
    └── ...

الخطوات:
  1. تصفّح بنود واجمع كل { center: sheet_file_id }
  2. تصفّح مراكز/center واجمع الـ shortcut target IDs
  3. اللي ناقص ← أنشئه
"""

BONOUD_ID = '1opDIaRsM4BJ8oqTVDP6PshcaI5xq3HUY'
MARKEZ_ID = '18E9UZDxJ6BGGbUyhEXpTjQJlupUmG-uG'
CENTERS = ['أشمون','الباجور','السادات','الشهداء','بركة السبع','تلا','شبين الكوم','قويسنا','منوف']

from google.colab import auth
auth.authenticate_user()
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import io, json

DRIVE = build('drive', 'v3')

def list_folders(parent_id):
    """رجع لستة { 'id','name' } لكل فولدر جوه parent_id"""
    items = []
    page = None
    while True:
        q = f"'{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
        r = DRIVE.files().list(q=q, fields='nextPageToken,files(id,name)', pageToken=page).execute()
        items.extend(r.get('files', []))
        page = r.get('nextPageToken')
        if not page: break
    return items

def find_sheet_in_folder(folder_id):
    """دور على أول Google Sheet جوه الفولدر (مفروض فيه شيت واحد)"""
    q = f"'{folder_id}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
    r = DRIVE.files().list(q=q, fields='files(id,name)').execute()
    files = r.get('files', [])
    return files[0] if files else None

def list_shortcut_targets(folder_id):
    """جيب لستة targetId لكل shortcut في الفولدر"""
    targets = []
    page = None
    while True:
        q = f"'{folder_id}' in parents and mimeType='application/vnd.google-apps.shortcut' and trashed=false"
        r = DRIVE.files().list(q=q, fields='nextPageToken,files(id,name,shortcutDetails)', pageToken=page).execute()
        for f in r.get('files', []):
            if 'shortcutDetails' in f:
                targets.append(f['shortcutDetails']['targetId'])
        page = r.get('nextPageToken')
        if not page: break
    return targets

def create_shortcut(name, target_id, parent_id):
    body = {
        'name': name,
        'shortcutDetails': {'targetId': target_id, 'targetMimeType': 'application/vnd.google-apps.spreadsheet'},
        'parents': [parent_id]
    }
    r = DRIVE.files().create(body=body, fields='id,name').execute()
    return r['id']

# ────────── 1. اجمع كل الشيتات من بنود ──────────
print('جارٍ تصفّح بنود...')
form_folders = list_folders(BONOUD_ID)
print(f'  عدد الاستمارات: {len(form_folders)}')

center_sheets = {}  # { center_name: [{ file_id, file_name, form_name }] }
for ff in form_folders:
    subfolders = list_folders(ff['id'])
    for sf in subfolders:
        # اسم الفولدر مثلاً: "المساعدات الطبية_أشمون"
        center = None
        for c in CENTERS:
            if sf['name'].endswith('_' + c):
                center = c
                break
        if not center: continue

        sheet = find_sheet_in_folder(sf['id'])
        if not sheet: continue

        if center not in center_sheets:
            center_sheets[center] = []
        center_sheets[center].append({
            'file_id': sheet['id'],
            'file_name': sheet['name'],
            'form_name': ff['name']
        })

print(f'  تم العثور على {sum(len(v) for v in center_sheets.values())} شيت موزعة على {len(center_sheets)} مركز')

# ────────── 2. افحص مراكز وشوف الناقص ──────────
print('\nجارٍ فحص المراكز...')
created = 0
skipped = 0
errors = 0

mrakz_folders = list_folders(MARKEZ_ID)
mrakz_map = {}  # { center_name: folder_id }
for mf in mrakz_folders:
    for c in CENTERS:
        if mf['name'] == c:
            mrakz_map[c] = mf['id']
            break

for center in CENTERS:
    if center not in mrakz_map:
        print(f'  ⚠️ مجلد {center} مش موجود في مراكز')
        continue

    target_ids = list_shortcut_targets(mrakz_map[center])
    sheets = center_sheets.get(center, [])
    print(f'\n  📍 {center}: {len(sheets)} شيت، {len(target_ids)} شورت كت موجود')

    for s in sheets:
        if s['file_id'] in target_ids:
            skipped += 1
            continue
        try:
            new_id = create_shortcut(s['file_name'], s['file_id'], mrakz_map[center])
            created += 1
            print(f'    ✅ {s["form_name"]} ← {s["file_name"]}')
        except Exception as e:
            errors += 1
            print(f'    ❌ {s["form_name"]}: {e}')

print(f'\n{"="*50}')
print('📊 التقرير النهائي')
print(f'{"="*50}')
print(f'✅ تم إنشاء {created} Shortcut جديد')
print(f'⏭️  موجود مسبقاً (لم يتم المساس به): {skipped}')
print(f'❌ أخطاء: {errors}')
if errors:
    print('⚠️  راجع الأخطاء أعلاه')
if created == 0 and skipped == sum(len(v) for v in center_sheets.values()):
    print('\n🎉 كل الشورت كتس موجودة مسبقاً — لا حاجة لأي إضافة')

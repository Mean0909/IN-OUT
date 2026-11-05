# មគ្គុទ្ទេសក៍ SISD-IN V3.0 (Offline + Cloud)

## អ្វីដែលមានក្នុងកញ្ចប់នេះ
- រក្សាមុខងារ SISD-IN ចាស់ និង IndexedDB ដដែល។
- Backup JSON រួមបញ្ចូល Documents, Company Information, DDG និង Saved Subjects។
- ភ្ជាប់ Supabase Auth និង Database តាម Cloud Sync នៅ Settings។
- មានជម្រើស Upload ដំបូង, Download ដំបូង និង Two-way Sync។
- មានការត្រួតពិនិត្យ Conflict ដើម្បីមិនសរសេរជាន់ទិន្នន័យដោយស្វ័យប្រវត្តិ។

## ១. ការពារទិន្នន័យចាស់
1. បើក SISD-IN លើ Computer ដែលមានទិន្នន័យចាស់ ដោយប្រើ Browser Profile ដដែល។
2. ចូល Settings → Backup Data ហើយរក្សាទុក JSON Backup។
3. រក្សា Backup មួយច្បាប់ទៀតនៅ USB/ទីតាំងសុវត្ថិភាព។
4. កុំ Clear Browser Data និងកុំលុប IndexedDB។

## ២. រៀបចំ Supabase
1. បង្កើត Supabase Project ក្នុង Account និង Region ដែលអង្គភាពអនុម័ត។
2. ចូល SQL Editor ហើយ Run ឯកសារ `supabase-schema.sql` ទាំងមូល។
3. ចូល Project Settings → API ហើយចម្លង Project URL និង Publishable Key ឬ anon key។
4. រៀបចំ Authentication និង Email Confirmation។ សម្រាប់ប្រព័ន្ធអង្គភាព គួរឱ្យ Admin គ្រប់គ្រងការបង្កើត Account ជំនួសឱ្យបើក Sign-up សាធារណៈ។
5. ពិនិត្យថា RLS និង Policies ត្រូវបានបើក។

## ៣. ដាក់កូដលើ GitHub Pages
- Upload ឯកសារទាំងអស់ក្នុង Folder នេះ ដោយរក្សា Folder `img` និងឈ្មោះឯកសារដដែល។
- Deploy លើ HTTPS។
- Cloud Sync ត្រូវការ Internet និង Supabase SDK CDN។ មុខងារ Local នៅតែប្រើ IndexedDB។

## ៤. កំណត់ Cloud
1. បើក SISD-IN → Settings → Cloud Sync / Supabase។
2. បញ្ចូល Project URL និង Publishable/anon key។
3. ចុច Save Cloud Settings។
4. បញ្ចូល Email និង Password រួចចុច Sign in / Create account។

**កុំដាក់ Service Role Key ក្នុង Browser ឬ GitHub។** ប្រើតែ Publishable/anon key និង RLS។

## ៥. ជ្រើសរើសការផ្ទេរទិន្នន័យដំបូង
- បើ Computer នេះមានទិន្នន័យដែលត្រូវរក្សាជាគោល ហើយ Cloud ទទេ៖ ចុច **Upload this computer's data to Cloud**។
- បើ Cloud មានទិន្នន័យត្រឹមត្រូវរួច ហើយចង់យកមក Computer នេះ៖ ចុច **Download Cloud data to this computer**។ វានឹងជំនួស Dataset ក្នុង Local ដូច្នេះត្រូវ Backup ជាមុន។
- កុំចុចទាំងពីរដោយសាកល្បង។ ត្រូវសម្រេចថាទិន្នន័យណាជាច្បាប់ដើម។

## ៦. ការប្រើប្រាស់ធម្មតា
- Computer នីមួយៗ Sign in ដោយ Account ដូចគ្នា។
- ក្រោយកែទិន្នន័យ ចុច Two-way Sync ដោយដៃ។
- បើ Dataset ដូចគ្នាត្រូវបានកែទាំងពីរខាង ចាប់តាំងពី Sync ចុងក្រោយ ប្រព័ន្ធនឹងបញ្ឈប់ និងបង្ហាញ Conflict។ ត្រូវ Backup ទាំងពីរ និងសម្រេចទិន្នន័យដោយដៃ។
- កុំកែ Dataset ដូចគ្នាពេលតែមួយលើ Computer ច្រើន រហូតដល់មានមុខងារ Record-level Merge និង Audit Log។

## ការកំណត់សុវត្ថិភាព
កញ្ចប់នេះជាកំណែ Starter Integration សម្រាប់សាកល្បង មិនទាន់ជាប្រព័ន្ធ Production សម្រាប់ទិន្នន័យសម្ងាត់របស់អង្គភាពទេ។ មុនប្រើប្រាស់ពិត ត្រូវឱ្យ IT/Security/Privacy របស់អង្គភាពពិនិត្យ Hosting Region, User Roles, Access Control, Backup, Audit Log, Data Retention និងច្បាប់ពាក់ព័ន្ធ។

Cloud version បច្ចុប្បន្ន Sync តែ Documents, Company Information, DDG និង Saved Subjects។ ការភ្ជាប់ឯកសារភ្ជាប់ទៅ Supabase Storage និងការគ្រប់គ្រង Role តាមអង្គភាព ត្រូវការអភិវឌ្ឍបន្ថែម។

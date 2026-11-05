/* SISD-IN V3 Cloud Sync
 * Supabase JS v2. The local IndexedDB database remains authoritative offline.
 * Never use a service_role key in this browser application.
 */
(() => {
  "use strict";
  const CONFIG_KEY = "sisd_in_cloud_config_v1";
  const BASELINE_KEY = "sisd_in_cloud_baseline_v1";
  const DATA_KEYS = ["sisd_in_documents", "sisd_company_information", "sisd_to_ddg_documents", "sisd_document_subjects"];
  let client = null;
  const $ = id => document.getElementById(id);
  const say = (id, message, error=false) => { const el=$(id); if(el){el.textContent=message;el.style.color=error?"#b42318":"";} };
  const config = () => { try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||"{}");}catch{return {};} };
  const baseline = () => { try{return JSON.parse(localStorage.getItem(BASELINE_KEY)||"{}");}catch{return {};} };
  const saveBaseline = x => localStorage.setItem(BASELINE_KEY, JSON.stringify(x));
  function readConfigForm(){return {url:$('supabaseUrl').value.trim().replace(/\/$/,''),key:$('supabaseAnonKey').value.trim()};}
  function loadConfig(){const c=config();$('supabaseUrl').value=c.url||'';$('supabaseAnonKey').value=c.key||'';}
  function getClient(){
    const c=config();
    if(!c.url||!c.key) throw new Error('សូមបញ្ចូល Supabase URL និង Publishable/anon key ជាមុន។');
    if(!window.supabase?.createClient) throw new Error('មិនអាចផ្ទុក Supabase SDK បានទេ។ សូមភ្ជាប់ Internet ហើយ Refresh។');
    if(!client) client=window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }
  async function currentUser(){const {data,error}=await getClient().auth.getUser();if(error)throw error;if(!data.user)throw new Error('សូម Sign in ជាមុន។');return data.user;}
  async function readLocal(){
    if(!window.sisdDb) throw new Error('IndexedDB មិនទាន់រួចរាល់។ សូម Refresh ហើយសាកម្ដងទៀត។');
    const rows=await new Promise((resolve,reject)=>{const tx=sisdDb.transaction('appData','readonly');const r=tx.objectStore('appData').getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});
    const map=new Map(rows.map(r=>[r.key,r.value]));
    for(const k of DATA_KEYS){if(!map.has(k)){try{const raw=localStorage.getItem(k);if(raw!==null)map.set(k,JSON.parse(raw));}catch{}}}
    const result={}; for(const k of DATA_KEYS) result[k]=map.has(k)?map.get(k):(k==='sisd_document_subjects'?[]:[]);
    return result;
  }
  async function writeLocal(payload){
    if(typeof sisdDb==='undefined' || !sisdDb) throw new Error('IndexedDB មិនទាន់រួចរាល់។');
    await new Promise((resolve,reject)=>{const tx=sisdDb.transaction('appData','readwrite');const store=tx.objectStore('appData');for(const k of DATA_KEYS)store.put({key:k,value:payload[k]??[]});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Local transaction aborted'));});
    for(const k of DATA_KEYS){storageCache.set(k,payload[k]??[]);try{localStorage.setItem(k,JSON.stringify(payload[k]??[]));}catch{}}
    if(typeof loadDocuments==='function')loadDocuments();
    if(typeof loadExtendedData==='function')loadExtendedData();
    ['renderDashboard','renderTable','populateDropdowns','populateCompanyLists','renderCompanyInfoTable','renderDdgTable','renderHistory','renderReports'].forEach(fn=>{try{if(typeof window[fn]==='function')window[fn]();}catch(e){console.warn(fn,e);}});
  }
  async function fetchRemote(userId){
    const {data,error}=await getClient().from('sisd_app_data').select('dataset_key,payload,updated_at').eq('user_id',userId);
    if(error)throw error;const out={};for(const row of data||[])out[row.dataset_key]=row.payload;return out;
  }
  async function writeRemote(userId,payload){
    const rows=DATA_KEYS.map(k=>({user_id:userId,dataset_key:k,payload:payload[k]??[],updated_at:new Date().toISOString()}));
    const {error}=await getClient().from('sisd_app_data').upsert(rows,{onConflict:'user_id,dataset_key'});if(error)throw error;
  }
  function snapshot(v){return JSON.stringify(v??[]);}
  async function signIn(){
    const email=$('cloudEmail').value.trim(),password=$('cloudPassword').value;
    if(!email||!password)throw new Error('សូមបញ្ចូល Email និង Password។');
    const c=getClient();let result=await c.auth.signInWithPassword({email,password});
    if(result.error && /invalid login credentials/i.test(result.error.message)){
      const create=confirm('មិនអាច Sign in បានទេ។ តើចង់សាកបង្កើត Account ថ្មីដោយ Email នេះទេ?');
      if(create)result=await c.auth.signUp({email,password});
    }
    if(result.error)throw result.error;
    if(result.data?.user && !result.data.session) say('cloudAuthStatus','Account បានបង្កើត។ សូមពិនិត្យ Email ដើម្បី Confirm មុន Sign in។');
    else say('cloudAuthStatus','បាន Sign in ជោគជ័យ។');
  }
  async function firstPush(){
    if(!confirm('UPLOAD LOCAL → CLOUD\n\nទិន្នន័យនៅ Computer នេះនឹងត្រូវផ្ញើទៅ Cloud ហើយអាចសរសេរជាន់ Dataset របស់ Account នេះ។ បន្តតែបើ Cloud Project ថ្មី/ទទេ ឬអ្នកប្រាកដថាចង់ជំនួសទិន្នន័យ Cloud។'))return;
    const user=await currentUser(),local=await readLocal();await writeRemote(user.id,local);saveBaseline(Object.fromEntries(DATA_KEYS.map(k=>[k,snapshot(local[k])])));say('cloudSyncStatus','Upload ដំបូងបានជោគជ័យ។ ទិន្នន័យ Local នៅតែរក្សាទុក។');
  }
  async function firstPull(){
    if(!confirm('DOWNLOAD CLOUD → LOCAL\n\nទិន្នន័យ Local បច្ចុប្បន្ននឹងត្រូវជំនួសដោយទិន្នន័យ Cloud។ សូម Backup Local ជាមុន។ បន្តឬទេ?'))return;
    const user=await currentUser(),remote=await fetchRemote(user.id);if(!DATA_KEYS.some(k=>Object.hasOwn(remote,k)))throw new Error('Cloud មិនទាន់មានទិន្នន័យសម្រាប់ Account នេះទេ។');
    const payload={};for(const k of DATA_KEYS)payload[k]=remote[k]??[];await writeLocal(payload);saveBaseline(Object.fromEntries(DATA_KEYS.map(k=>[k,snapshot(payload[k])])));say('cloudSyncStatus','Download ដំបូងបានជោគជ័យ។');
  }
  async function twoWay(){
    const user=await currentUser(),local=await readLocal(),remote=await fetchRemote(user.id),base=baseline();
    if(!DATA_KEYS.some(k=>Object.hasOwn(remote,k)))throw new Error('មិនទាន់មាន Cloud baseline ទេ។ សូមប្រើ Upload ឬ Download ដំបូង។');
    const next={};const conflicts=[];
    for(const k of DATA_KEYS){const l=snapshot(local[k]),r=snapshot(remote[k]),b=base[k];
      if(b===undefined){if(l!==r)conflicts.push(k);else next[k]=local[k];}
      else {const lc=l!==b,rc=r!==b;if(lc&&rc&&l!==r)conflicts.push(k);else next[k]=lc?local[k]:remote[k];}
    }
    if(conflicts.length)throw new Error('មាន Conflict ក្នុង Dataset: '+conflicts.join(', ')+'. មិនបានសរសេរជាន់ទិន្នន័យណាមួយទេ។ សូម Backup ហើយពិនិត្យដោយដៃ។');
    await writeRemote(user.id,next);await writeLocal(next);saveBaseline(Object.fromEntries(DATA_KEYS.map(k=>[k,snapshot(next[k])])));say('cloudSyncStatus','Two-way Sync បានជោគជ័យ។ '+new Date().toLocaleString());
  }
  function reportError(id,e){console.error(e);say(id,e?.message||String(e),true);}
  document.addEventListener('DOMContentLoaded',()=>{
    loadConfig();
    $('cloudSaveConfigBtn')?.addEventListener('click',()=>{try{const c=readConfigForm();if(!/^https:\/\//.test(c.url)||!c.key)throw new Error('URL ត្រូវចាប់ផ្ដើមដោយ https:// និងត្រូវមាន key។');localStorage.setItem(CONFIG_KEY,JSON.stringify(c));client=null;getClient();say('cloudAuthStatus','Cloud Settings បានរក្សាទុក។');}catch(e){reportError('cloudAuthStatus',e);}});
    $('cloudSignInBtn')?.addEventListener('click',async()=>{try{await signIn();}catch(e){reportError('cloudAuthStatus',e);}});
    $('cloudSignOutBtn')?.addEventListener('click',async()=>{try{const {error}=await getClient().auth.signOut();if(error)throw error;say('cloudAuthStatus','បាន Sign out។');}catch(e){reportError('cloudAuthStatus',e);}});
    $('cloudFirstPushBtn')?.addEventListener('click',async()=>{say('cloudSyncStatus','កំពុង Upload...');try{await firstPush();}catch(e){reportError('cloudSyncStatus',e);}});
    $('cloudFirstPullBtn')?.addEventListener('click',async()=>{say('cloudSyncStatus','កំពុង Download...');try{await firstPull();}catch(e){reportError('cloudSyncStatus',e);}});
    $('cloudTwoWaySyncBtn')?.addEventListener('click',async()=>{say('cloudSyncStatus','កំពុង Sync...');try{await twoWay();}catch(e){reportError('cloudSyncStatus',e);}});
    try{const c=config();if(c.url&&c.key)getClient().auth.getSession().then(({data})=>say('cloudAuthStatus',data.session?'មាន Session ចូលប្រើ Cloud។':'Cloud configured; សូម Sign in។')).catch(()=>{});}catch(e){say('cloudAuthStatus',e.message,true);}
  });
})();

// *** URL Web App ***
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyQIbm1vl8AmYxGe5qBV0erTS15WpLiO2VxEUt9OBqiInmsMH-pEW7GwVkNZy_plFVu/exec';

const diseaseData = {
  "Non-Cancer": {
    "Neurological Disease": ["Ischemic stroke", "Hemorrhagic stroke", "Parkinson", "Alzheimer’s disease", "Epilepsy", "อื่นๆ ระบุ"],
    "Chronic kidney disease": ["Stage 3", "Stage 4", "ESRD on CAPD", "ESRD on HD", "ESRD no RRT"],
    "Pulmonary and Heart Disease": ["COPD", "Asthma", "Other chronic lung disease", "CHF", "IHD", "อื่นๆ ระบุ"],
    "Infection Disease HIV/AIDS": ["HIV infection", "TB infection", "Septicemia", "CNS", "HEENT", "Respiratory tract", "Gastrointestinal tract", "Genitourinary tract", "Gynecologic tract", "Soft tissue and skin", "อื่นๆ ระบุ"],
    "อื่นๆ": ["DM", "HT", "DLP", "Hypothyroid", "Hyperthyroid", "Cirrhosis", "Aplastic anemia", "Thalassemia", "IDA", "อื่นๆ ระบุ"],
    "Multiple Trauma Patient": [], "Pediatric": [], "Aging/Dementia": []
  },
  "Cancer": {
    "Primary": ["Brain", "Nasopharynx", "Tongue", "Lung", "Breast", "Stomach", "Colon", "Liver", "Cholangiocarcinoma", "Squamous cell carcinoma", "Cervix", "Endometrium", "Uterus", "Kidney", "Prostate", "Gall bladder", "Urinary bladder", "Pancreas", "Bone", "Lymphoma", "Leukemia", "Multiple myeloma", "Peritonium", "Sarcoma", "Unknown primary", "Ovary"],
    "Metastasis": ["None", "Brain", "Lung", "Pleural", "Bone", "Lymph node", "Liver", "Peritoneal", "Skin", "อื่นๆ ระบุ"]
  }
};
Object.keys(diseaseData["Non-Cancer"]).forEach(key => { diseaseData["Non-Cancer"][key].sort((a, b) => a.localeCompare(b, 'th')); });
diseaseData["Cancer"]["Primary"].sort((a, b) => a.localeCompare(b, 'th'));
diseaseData["Cancer"]["Metastasis"].sort((a, b) => a.localeCompare(b, 'th'));

const medList = [ "Atropine eye drop 1%", "Baclofen (5 mg)", "Celebrex", "Diazepam (2 mg)", "Diazepam (5 mg)", "Diclofenac (25 mg)", "Domperidone (10 mg)", "Etoricoxib", "Fentanyl inj (50 mcg/mL)", "Fentanyl patch (12 mcg/hr)", "Gabapentin (100 mg)", "Gabapentin (300 mg)", "Haloperidol", "Hyoscine Butylbromide (20 mg/mL)", "Kapanol (20)", "Lactulose", "Lorazepam (0.5 mg)", "Metoclopramide (10 mg)", "Midazolam (5 mg/mL)", "Morphine inj (10 mg/1 mL)", "Morphine IR (10 mg)", "Morphine syr (10 mg/5 mL)", "MST (10 mg)", "MST (30 mg)", "Naproxen (250 mg)", "Paracetamol (500 mg)", "Senna (มะขามแขก)", "Tramadol (50 mg)" ].sort((a, b) => a.localeCompare(b, 'th'));
const acpTopics = ["ET tube", "CPR", "Inotrope", "Hemodialysis", "NG tube", "Morphine", "Home death", "Hospital death"];
const esasTopics = ["Pain (ปวด)", "Fatigue (เหนื่อย)", "Nausea (คลื่นไส้)", "Depression (ซึมเศร้า)", "Anxiety (วิตกกังวล)", "Drowsiness (ง่วงซึม)", "Appetite (เบื่ออาหาร)", "Well-being (สบายกายใจ)", "Shortness of breath (เหนื่อยหอบ)"];

let allPatients = [], currentPhones = [], currentDiseases = [], currentMeds = [];
let editingPatient = null, currentHistoryData = [];

document.addEventListener('DOMContentLoaded', () => {
  renderPPS(); renderESAS(); renderACP(); renderMedOptions(); renderDiseaseType(); 
  addPhoneField(); loadData(); showPage('menu'); initThaiDatepicker();
});

function initThaiDatepicker() {
  flatpickr(".thai-datepicker", {
    wrap: true, allowInput: true, locale: "th", dateFormat: "d/m/Y", disableMobile: "true",
    onReady: function(s, d, i) { if(i.currentYearElement) i.currentYearElement.value = parseInt(i.currentYearElement.value) + 543; },
    onYearChange: function(s, d, i) { setTimeout(() => { i.currentYearElement.value = parseInt(i.currentYearElement.value) + 543; }, 10); },
    onValueUpdate: function(s, d, i) { if(s[0]) { const day=String(s[0].getDate()).padStart(2,'0'), mon=String(s[0].getMonth()+1).padStart(2,'0'), yr=s[0].getFullYear()+543; i.input.value=`${day}/${mon}/${yr}`; if(i.input.id==='dob') calculateAge(); } },
    parseDate: (d) => { if(!d) return null; const p=d.split('/'); return p.length===3 ? new Date(`${p[2]-543}-${p[1]}-${p[0]}`) : new Date(); }
  });
}

function loadData() { fetch(SCRIPT_URL + '?op=getAll').then(r=>r.json()).then(d=>{ allPatients=d; renderActivePatients(); renderSummary(); }).catch(e=>console.error(e)); }
function formatDateInput(i) { let v=i.value.replace(/\D/g,'').slice(0,8); if(v.length>=5) i.value=`${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4)}`; else if(v.length>=3) i.value=`${v.slice(0,2)}/${v.slice(2)}`; else i.value=v; }
function dateThToGregorian(s) { if(!s||s.length!==10) return ''; const p=s.split('/'); return `${p[2]-543}-${p[1]}-${p[0]}`; }
function gregorianToDateTh(s) { if(!s) return ''; const d=new Date(s); if(isNaN(d)) return ''; return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()+543}`; }
function calculateAge() { const d=document.getElementById('dob').value; if(!d||d.length!==10){document.getElementById('age_display').value='-';return;} const diff=Date.now()-new Date(dateThToGregorian(d)).getTime(); document.getElementById('age_display').value = Math.abs(new Date(diff).getUTCFullYear()-1970)+" ปี"; }

function toggleDeathPlace() {
    const status = document.querySelector('input[name="pt_status"]:checked').value;
    const container = document.getElementById('deathDetails');
    if (status === 'Death') {
        container.classList.remove('d-none');
    } else { 
        container.classList.add('d-none'); 
        document.getElementById('death_place').value = ''; 
        document.getElementById('withdraw_et').checked = false; 
        const dd = document.getElementById('discharge_date');
        dd.value = '';
        if(dd._flatpickr) dd._flatpickr.clear();
    }
}

function revertToAlive() {
    document.getElementById('status_alive').checked = true;
    toggleDeathPlace(); 
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'เปลี่ยนสถานะเป็น คงพยาบาล (Alive)', showConfirmButton: false, timer: 2000 });
}

function toggleLWDate() {
    const isChecked = document.getElementById('lw_checkbox').checked;
    const dateContainer = document.getElementById('lw_date_container');
    if(isChecked) dateContainer.classList.remove('d-none');
    else { dateContainer.classList.add('d-none'); document.getElementById('lw_date').value = ''; }
}

function updateEditHeader() {
    if(!editingPatient) return;
    document.getElementById('editInfoName').innerText = document.getElementById('fullname').value;
    document.getElementById('editInfoCurrentType').innerText = "Now: " + document.getElementById('admitType').value;
}

function handleFormSubmit(e) {
  e.preventDefault();
  const hnVal = document.getElementById('hn').value;
  if(hnVal.length < 1) { Swal.fire('Error', 'HN Required', 'warning'); return; }

  const editTimestamp = document.getElementById('edit_history_timestamp').value;
  const isHistoryEdit = !!editTimestamp;

  const phones=[]; document.querySelectorAll('.phone-input').forEach(el=>{ if(el.value) phones.push({number:el.value, label:el.nextElementSibling.value}); });
  const esas={}; document.querySelectorAll('.esas-range').forEach(el=>esas[el.dataset.topic]=el.value);
  const acp={}; acpTopics.forEach(t=>{ const c=document.querySelector(`input[name="acp_${t}"]:checked`); acp[t]=c?c.value:'Undecided'; });
  acp['maker'] = document.getElementById('acp_maker').value;
  acp['date'] = dateThToGregorian(document.getElementById('acp_date').value); 
  
  const hasLW = document.getElementById('lw_checkbox').checked;
  const livingWill = { status: hasLW ? 'Made' : 'NotMade', date: hasLW ? dateThToGregorian(document.getElementById('lw_date').value) : '' };

  const ptStatus = document.querySelector('input[name="pt_status"]:checked').value;

  const formData = {
    isHistoryEdit: isHistoryEdit, originalTimestamp: editTimestamp,
    hn: hnVal, name: document.getElementById('fullname').value, gender: document.getElementById('gender').value,
    dob: dateThToGregorian(document.getElementById('dob').value), admitType: document.getElementById('admitType').value,
    phones: phones,
    address: { house:document.getElementById('addr_house').value, moo:document.getElementById('addr_moo').value, road:document.getElementById('addr_road').value, sub:document.getElementById('addr_tumbon').value, dist:document.getElementById('addr_amphoe').value, prov:document.getElementById('addr_province').value },
    gps: { lat:document.getElementById('lat').value, long:document.getElementById('long').value },
    diseases: currentDiseases, meds: currentMeds, livingWill: livingWill,
    exam: { pps:document.getElementById('pps_score').value, gcs:document.getElementById('gcs_score').value, vitals:{ bp:document.getElementById('vs_bp').value, pr:document.getElementById('vs_pr').value, rr:document.getElementById('vs_rr').value, o2:document.getElementById('vs_o2').value, bt:parseFloat(document.getElementById('vs_bt').value || 0).toFixed(1) }, esas:esas },
    plan: document.getElementById('nursing_plan').value, acp: acp,
    nextVisitDate: dateThToGregorian(document.getElementById('next_visit_date').value),
    nextVisitType: document.getElementById('next_visit_type').value,
    lab: { cr:document.getElementById('lab_cr').value, egfr:document.getElementById('lab_egfr').value, date: dateThToGregorian(document.getElementById('lab_date').value) },
    
    status: ptStatus,
    dischargeDate: ptStatus === 'Death' ? dateThToGregorian(document.getElementById('discharge_date').value) : '',
    deathPlace: ptStatus === 'Death' ? document.getElementById('death_place').value : '',
    withdrawET: (ptStatus === 'Death' && document.getElementById('withdraw_et').checked) ? 'Yes' : 'No'
  };

  Swal.fire({ title: isHistoryEdit ? 'แก้ไขประวัติ?' : 'บันทึก?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ตกลง' }).then((r) => {
      if (r.isConfirmed) {
          Swal.fire({title:'Saving...', didOpen:()=>Swal.showLoading()});
          fetch(SCRIPT_URL, { method:'POST', body:JSON.stringify(formData) }).then(r=>r.json()).then(res=>{
             if(res.success){ Swal.fire({title:'Success', icon:'success', timer:1500, showConfirmButton:false}); resetForm(); loadData(); showPage('menu'); } 
             else Swal.fire('Error',res.message,'error');
          });
      }
  });
}

function confirmDeletePatient() {
    const hn = document.getElementById('hn').value;
    if (!hn) return;
    Swal.fire({
        title: 'ยืนยันการลบผู้ป่วย?', text: `ต้องการลบข้อมูล HN: ${hn} ใช่หรือไม่? (ลบถาวร)`, icon: 'error',
        showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'ลบข้อมูล', cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({title:'กำลังลบ...', didOpen:()=>Swal.showLoading()});
            fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'delete', hn: hn }) })
            .then(r => r.json()).then(res => {
                if(res.success) { Swal.fire({title:'ลบสำเร็จ', icon:'success', timer:1500, showConfirmButton:false}); resetForm(); loadData(); showPage('menu'); } 
                else { Swal.fire('Error', res.message, 'error'); }
            });
        }
    });
}

function openNewRegistration() {
  resetForm(); editingPatient = null;
  document.getElementById('editInfoBar').classList.add('d-none');
  document.getElementById('formTitle').innerHTML = '<i class="fas fa-user-plus"></i> ลงทะเบียนรายใหม่';
  document.getElementById('btnViewHistory').classList.add('d-none');
  document.getElementById('btnDeletePatient').classList.add('d-none'); 
  document.getElementById('hn').readOnly = false;
  showPage('register');
}

function openEditRegistration(hn) {
  const p = allPatients.find(x => String(x.hn) === String(hn));
  if(!p) return;
  resetForm(); editingPatient = p;
  
  document.getElementById('editInfoBar').classList.remove('d-none');
  document.getElementById('editInfoName').innerText = p.name;
  document.getElementById('editInfoFirstType').innerText = "First: " + (p.type_admit || '-');
  document.getElementById('editInfoCurrentType').innerText = "Now: " + (p.visit_type || 'OPD');
  document.getElementById('formTitle').innerHTML = `<i class="fas fa-edit"></i> แก้ไขข้อมูล`;
  document.getElementById('btnViewHistory').classList.remove('d-none');
  document.getElementById('btnDeletePatient').classList.remove('d-none'); 
  
  const linkMap = document.getElementById('linkMap');
  if(p.gps && p.gps.lat) { linkMap.classList.remove('d-none'); linkMap.onclick = () => window.open(`http://maps.google.com/?q=$${p.gps.lat},${p.gps.long}`, '_blank'); updateMapBtnStatus(true); }
  
  document.getElementById('hn').value = p.hn; document.getElementById('hn').readOnly = true;
  document.getElementById('fullname').value = p.name; document.getElementById('gender').value = p.gender;
  document.getElementById('dob').value = gregorianToDateTh(p.dob); calculateAge();
  document.getElementById('admitType').value = p.type_admit; 
  
  if(p.address) {
     ['house','moo','road','tumbon','amphoe','province'].forEach(k=>{
        const key = (k==='tumbon')?'sub':(k==='amphoe')?'dist':(k==='province')?'prov':k;
        if(document.getElementById('addr_'+k)) document.getElementById('addr_'+k).value = p.address[key]||'';
     });
  }
  if(p.gps) { document.getElementById('lat').value = p.gps.lat || ''; document.getElementById('long').value = p.gps.long || ''; }
  
  document.getElementById('phoneContainer').innerHTML=''; (p.phones||[]).forEach(ph=>addPhoneField(ph.number, ph.label)); if(!(p.phones||[]).length) addPhoneField();
  currentDiseases = p.diseases||[]; renderDiseaseBadges(); currentMeds = p.meds||[]; renderMedsList();
  
  if(p.livingWill) {
      const isMade = p.livingWill.status === 'Made';
      document.getElementById('lw_checkbox').checked = isMade; toggleLWDate();
      if(isMade) document.getElementById('lw_date').value = gregorianToDateTh(p.livingWill.date);
  }
  if(p.acp) {
    Object.keys(p.acp).forEach(k=>{ 
      if(k === 'maker') document.getElementById('acp_maker').value = p.acp[k];
      else if(k === 'date') document.getElementById('acp_date').value = gregorianToDateTh(p.acp[k]);
      else { const r=document.getElementsByName('acp_'+k); r.forEach(el=>{ if(el.value===p.acp[k]) el.checked=true; }); }
    });
  }
  
  document.getElementsByName('pt_status').forEach(el=>{ if(el.value===p.status) el.checked=true; });
  if(p.status === 'Death') {
      toggleDeathPlace(); 
      document.getElementById('death_place').value = p.death_place || '';
      document.getElementById('withdraw_et').checked = (p.withdraw_et === 'Yes');
  }
  
  document.getElementById('next_visit_date').value = gregorianToDateTh(p.next_visit_date);
  document.getElementById('discharge_date').value = gregorianToDateTh(p.discharge_date);
  if(p.lab) document.getElementById('lab_date').value = gregorianToDateTh(p.lab.date);

  showPage('register'); updateEditHeader();
}

function resetForm() {
  document.getElementById('mainForm').reset();
  document.getElementById('edit_history_timestamp').value = '';
  document.getElementById('formTitle').innerHTML = '<i class="fas fa-clipboard-check"></i> บันทึกข้อมูล';
  document.getElementById('formHeader').classList.replace('bg-warning-subtle', 'bg-light');
  
  currentMeds=[]; currentDiseases=[]; renderMedsList(); renderDiseaseBadges();
  document.getElementById('phoneContainer').innerHTML=''; addPhoneField();
  updateMapBtnStatus(false);
  document.getElementById('status_alive').checked = true;
  document.querySelectorAll('input[type=checkbox], input[type=radio]').forEach(el => {
      if(el.name !== 'pt_status') el.checked = false; 
  });
  toggleLWDate(); toggleDeathPlace(); 
  document.getElementById('age_display').value = '-';
  document.querySelectorAll('.esas-range').forEach(el => { el.value = 0; }); renderESAS(); 
  updateDiseaseUI(); document.querySelectorAll('.thai-datepicker').forEach(el => { if(el._flatpickr) el._flatpickr.clear(); });
}

function showHistoryModal() {
  const hn = document.getElementById('hn').value; const name = document.getElementById('fullname').value;
  if(!hn) { Swal.fire('แจ้งเตือน', 'กรุณากรอก HN', 'warning'); return; }
  const modal = new bootstrap.Modal(document.getElementById('historyModal'));
  document.getElementById('historyPatientName').innerText = name;
  document.getElementById('historyLoading').classList.remove('d-none'); document.getElementById('historyContent').classList.add('d-none');
  modal.show();
  const lat=document.getElementById('lat').value, long=document.getElementById('long').value, btnMap=document.getElementById('btnMapHistory');
  if(lat&&long) { btnMap.classList.remove('d-none'); btnMap.onclick=()=>window.open(`http://maps.google.com/?q=$${lat},${long}`,'_blank'); } else { btnMap.classList.add('d-none'); }
  fetch(SCRIPT_URL + '?op=getHistory&hn=' + hn).then(r=>r.json()).then(d=>{ renderHistoryItems(d); document.getElementById('historyLoading').classList.add('d-none'); document.getElementById('historyContent').classList.remove('d-none'); });
}

function renderHistoryItems(list) {
  currentHistoryData = list; const c = document.getElementById('historyContent');
  if(!list.length) { c.innerHTML='<div class="alert alert-warning">ไม่พบประวัติ</div>'; return; }
  c.innerHTML = list.map((h, index) => {
     const d = formatDateTH(h.date); const ppsDisplay = (h.pps!==''&&h.pps!==null&&h.pps!==undefined)?`${h.pps}%`:'ไม่ระบุ';
     let labHtml = ''; if(h.lab_cr||h.lab_egfr) { const ld = h.lab_date ? `<br><span class="text-muted small">วันที่ Lab: ${formatDateTH(h.lab_date)}</span>` : ''; labHtml = `<div class="alert alert-light border p-2 mb-2 small"><i class="fas fa-flask text-danger"></i> <b>Lab:</b> Cr:${h.lab_cr||'-'} eGFR:${h.lab_egfr||'-'} ${ld}</div>`; }
     let medHtml = (h.meds && h.meds.length) ? '<ul class="mb-0 ps-3 small" style="list-style-type: circle;">' + h.meds.map(m => `<li class="mb-1"><span class="fw-bold text-dark">${m.name}</span> <span class="text-secondary ms-1">(${m.dose || '-'})</span></li>`).join('') + '</ul>' : '-';
     let acpHtml = '';
     if(h.livingWill && h.livingWill.status === 'Made') { acpHtml += `<div class="mb-1 small text-success"><i class="fas fa-check-square"></i> <b>Living Will:</b> มี (${formatDateTH(h.livingWill.date)})</div>`; }
     else { acpHtml += `<div class="mb-1 small text-muted"><i class="far fa-square"></i> <b>Living Will:</b> ไม่มี</div>`; }
     if(h.acp && (Object.keys(h.acp).length > 2 || h.acp.maker)) { acpHtml += `<div class="small bg-light p-2 rounded border mt-1"><i class="fas fa-file-signature"></i> <b>ACP:</b> มีข้อมูล</div>`; }
     let deathHtml = ''; if(h.withdraw_et === 'Yes') { deathHtml = `<div class="mt-2 p-2 bg-danger-subtle text-danger border border-danger rounded small fw-bold"><i class="fas fa-procedures"></i> Withdraw ET-tube</div>`; }
     let esasHtml = ''; if(h.esas) Object.entries(h.esas).forEach(([k,v])=>{if(v>0)esasHtml+=`<span class="badge bg-warning text-dark me-1 border">${k}:${v}</span>`;});
     const v = h.vitals||{};
     return `<div class="card mb-3 shadow-sm history-card"><div class="card-header bg-white d-flex justify-content-between align-items-center"><div><span class="history-date fw-bold">${d}</span> <span class="badge bg-light text-dark border ms-2">PPS: ${ppsDisplay}</span></div><button class="btn btn-sm btn-outline-warning" onclick="loadHistoryToEdit(${index})"><i class="fas fa-edit"></i> แก้ไข</button></div><div class="card-body">${labHtml}<div class="mb-2">${esasHtml}</div><div class="row"><div class="col-6 border-end"><p class="mb-1 small"><b>Vitals:</b> BP:${v.bp||'-'} P:${v.pr||'-'} RR:${v.rr||'-'} O2:${v.o2||'-'} T:${v.bt||'-'}</p><p class="mb-1 small"><b>GCS:</b> ${h.gcs||'-'}</p><p class="mb-1 small"><b>Plan:</b> ${h.plan||'-'}</p></div><div class="col-6"><p class="mb-1 small fw-bold text-success">ยา:</p>${medHtml}</div><div class="col-12 mt-2 border-top pt-2">${acpHtml}${deathHtml}</div></div></div>`;
  }).join('');
}

function loadHistoryToEdit(index) {
    const h = currentHistoryData[index]; if(!h) return;
    bootstrap.Modal.getInstance(document.getElementById('historyModal')).hide();
    resetForm();
    document.getElementById('hn').value = document.getElementById('hn').value; document.getElementById('hn').readOnly = true;
    document.getElementById('edit_history_timestamp').value = h.original_timestamp;
    document.getElementById('formTitle').innerHTML = `<i class="fas fa-clock text-warning"></i> แก้ไขประวัติ: ${formatDateTH(h.date)}`;
    document.getElementById('formHeader').classList.replace('bg-light', 'bg-warning-subtle');
    
    document.getElementById('admitType').value = h.type || 'OPD';
    if(h.vitals) { document.getElementById('vs_bp').value = h.vitals.bp || ''; document.getElementById('vs_pr').value = h.vitals.pr || ''; document.getElementById('vs_rr').value = h.vitals.rr || ''; document.getElementById('vs_o2').value = h.vitals.o2 || ''; document.getElementById('vs_bt').value = h.vitals.bt || ''; }
    document.getElementById('gcs_score').value = h.gcs || ''; document.getElementById('pps_score').value = h.pps || '0'; document.getElementById('nursing_plan').value = h.plan || '';
    currentMeds = h.meds || []; renderMedsList();
    if(h.esas) { Object.entries(h.esas).forEach(([topic, val]) => { const el = document.querySelector(`.esas-range[data-topic="${topic}"]`); if(el) { el.value = val; updateESASScore(el, esasTopics.indexOf(topic)); } }); }
    document.getElementById('lab_cr').value = h.lab_cr || ''; document.getElementById('lab_egfr').value = h.lab_egfr || ''; document.getElementById('lab_date').value = gregorianToDateTh(h.lab_date);
    
    if(h.livingWill) {
        const isMade = h.livingWill.status === 'Made';
        document.getElementById('lw_checkbox').checked = isMade; toggleLWDate();
        if(isMade) document.getElementById('lw_date').value = gregorianToDateTh(h.livingWill.date);
    }
    if(h.acp) { Object.keys(h.acp).forEach(k=>{ if(k === 'maker') document.getElementById('acp_maker').value = h.acp[k]; else if(k === 'date') document.getElementById('acp_date').value = gregorianToDateTh(h.acp[k]); else { const r=document.getElementsByName('acp_'+k); r.forEach(el=>{ if(el.value===h.acp[k]) el.checked=true; }); } }); }
    if(h.withdraw_et === 'Yes') { const deathRadio = document.querySelector('input[name="pt_status"][value="Death"]'); deathRadio.checked = true; toggleDeathPlace(); document.getElementById('withdraw_et').checked = true; }
    showPage('register'); Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'กำลังแก้ไขประวัติย้อนหลัง', showConfirmButton: false, timer: 3000 });
}

function showPage(pid) { document.querySelectorAll('.page-section').forEach(e=>e.classList.add('d-none')); document.getElementById('page-'+pid).classList.remove('d-none'); document.querySelectorAll('.nav-link').forEach(e=>e.classList.remove('active')); const links = document.querySelectorAll('.nav-link'); links.forEach(l => { if(l.getAttribute('onclick').includes(`'${pid}'`)) l.classList.add('active'); }); if(pid==='appoint') initSlider(); }
function updateMapBtnStatus(has) { const b=document.getElementById('btnGeo'); if(has){b.className='btn btn-sm btn-success text-white ms-2'; b.innerHTML='<i class="fas fa-check-circle"></i> พิกัดถูกบันทึกแล้ว';}else{b.className='btn btn-sm btn-info text-white ms-2'; b.innerHTML='<i class="fas fa-map-marker-alt"></i> ปักหมุดพิกัด';} }
function getLocation() { if(navigator.geolocation){ Swal.fire({title:'กำลังระบุพิกัด...',didOpen:()=>Swal.showLoading()}); navigator.geolocation.getCurrentPosition(p=>{ document.getElementById('lat').value=p.coords.latitude; document.getElementById('long').value=p.coords.longitude; updateMapBtnStatus(true); Swal.fire({icon:'success', title:'บันทึกพิกัดสำเร็จ', text:`${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`, timer:1500, showConfirmButton:false}); }, err=>{ Swal.fire('Error','ไม่สามารถระบุตำแหน่งได้','error'); }); } else { Swal.fire('Error','Browser ไม่รองรับ GPS','error'); } }
function addPhoneField(v='',l=''){ const d=document.createElement('div'); d.className='input-group mb-2'; d.innerHTML=`<input type="tel" class="form-control phone-input" placeholder="เบอร์โทร" value="${v}" maxlength="10"><select class="form-select" style="max-width:130px"><option value="">ความสัมพันธ์</option><option value="คนไข้" ${l==='คนไข้'?'selected':''}>คนไข้</option><option value="คู่สมรส" ${l==='คู่สมรส'?'selected':''}>คู่สมรส</option><option value="พ่อ" ${l==='พ่อ'?'selected':''}>พ่อ</option><option value="แม่" ${l==='แม่'?'selected':''}>แม่</option><option value="ลูก" ${l==='ลูก'?'selected':''}>ลูก</option><option value="ผู้ดูแล" ${l==='ผู้ดูแล'?'selected':''}>ผู้ดูแล</option><option value="ญาติ" ${l==='ญาติ'?'selected':''}>ญาติ</option></select><button class="btn btn-outline-danger" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>`; document.getElementById('phoneContainer').appendChild(d); }
function validateLabInput(el, type) { if (el.value === '') return; const val = parseFloat(el.value); if (type === 'cr' && val >= 100) el.value = el.value.slice(0, -1); if (type === 'egfr' && val >= 1000) el.value = el.value.slice(0, -1); }
function formatLabFinal(el) { if (el.value === '') return; const val = parseFloat(el.value); if (!isNaN(val)) el.value = val.toFixed(2); }
function renderPPS(){const s=document.getElementById('pps_score');s.innerHTML='';s.add(new Option('ไม่ระบุ',''));for(let i=0;i<=100;i+=10)s.add(new Option(i+'%',i));}
function renderACP(){const b=document.getElementById('acpTableBody');acpTopics.forEach(t=>b.innerHTML+=`<tr><td>${t}</td><td class="text-center"><input type="radio" name="acp_${t}" value="Want"></td><td class="text-center"><input type="radio" name="acp_${t}" value="Dont"></td><td class="text-center"><input type="radio" name="acp_${t}" value="Undecided" checked></td></tr>`);}
function renderMedOptions(){const s=document.getElementById('med_name');s.add(new Option('--Drug--',''));medList.forEach(m=>s.add(new Option(m,m)));}
function addMed(){const n=document.getElementById('med_name').value,d=document.getElementById('med_dose').value;if(n){currentMeds.push({name:n,dose:d});renderMedsList();document.getElementById('med_dose').value='';}}
function renderMedsList(){document.getElementById('medList').innerHTML=currentMeds.map((m,i)=>`<li class="list-group-item d-flex justify-content-between p-2 small">${m.name} (${m.dose}) <button class="btn btn-sm btn-outline-danger border-0" onclick="currentMeds.splice(${i},1);renderMedsList()"><i class="fas fa-times"></i></button></li>`).join('');}
function renderActivePatients(){const t=document.getElementById('searchActive').value.toLowerCase();const f=allPatients.filter(p=>p.status==='Alive'&&(p.name.includes(t)||p.hn.includes(t)));document.getElementById('activePatientList').innerHTML=f.length?f.map(p=>{const c=getTypeClass(p.type_admit);const icon=p.gender==='Male'?'<i class="fas fa-mars text-primary"></i>':(p.gender==='Female'?'<i class="fas fa-venus text-danger"></i>':'');return`<div class="col-md-4 col-sm-6"><div class="card p-3 shadow-sm patient-card ${c}" onclick="openEditRegistration('${p.hn}')"><div class="d-flex justify-content-between"><div><h5 class="mb-1 fw-bold text-dark">${icon} ${p.name}</h5><p class="mb-0 text-secondary small">HN: ${p.hn}</p></div><span class="status-badge">${p.type_admit}</span></div><hr class="my-2" style="opacity:0.1"><small class="text-muted"><i class="far fa-calendar-check"></i> นัด: ${formatDateTH(p.next_visit_date)}</small></div></div>`;}).join(''):'<div class="col-12 text-center text-muted mt-5">ไม่พบข้อมูล</div>';}
function renderApptList(s){const l=document.getElementById('appointList');const p=allPatients.filter(x=>x.next_visit_date&&x.next_visit_date.substring(0,10)===s);l.innerHTML=p.length?p.map(x=>{const c=getTypeClass(x.visit_type);const icon=x.gender==='Male'?'<i class="fas fa-mars text-primary"></i>':(x.gender==='Female'?'<i class="fas fa-venus text-danger"></i>':'');return`<div class="col-md-6"><div class="card p-3 shadow-sm ${c}" onclick="openEditRegistration('${x.hn}')" style="cursor:pointer; border-left-width:8px;"><div class="d-flex justify-content-between"><h5 class="mb-1 fw-bold">${icon} ${x.name}</h5><span class="badge bg-white text-dark border">${x.visit_type}</span></div><small class="text-secondary">HN: ${x.hn}</small></div></div>`;}).join(''):'<div class="col-12 text-center text-muted py-5">ไม่มีนัด</div>';}
function renderSummary(){ document.getElementById('summaryContainer').innerHTML=`<div class="col-6 col-md-3"><div class="card p-3 bg-primary text-white"><h3>${allPatients.length}</h3>Total</div></div><div class="col-6 col-md-3"><div class="card p-3 bg-success text-white"><h3>${allPatients.filter(p=>p.status==='Alive').length}</h3>Active</div></div><div class="col-6 col-md-3"><div class="card p-3 bg-dark text-white" style="cursor:pointer;" onclick="showPage('death'); renderDeceasedPatients();"><h3>${allPatients.filter(p=>p.status!=='Alive').length}</h3>Death (คลิกเพื่อดู)</div></div>`; }
function renderDeceasedPatients() { const list = allPatients.filter(p => p.status !== 'Alive'); const container = document.getElementById('deathPatientList'); if (list.length === 0) { container.innerHTML = '<div class="col-12 text-center text-muted mt-5">ไม่มีข้อมูลผู้เสียชีวิต</div>'; return; } container.innerHTML = list.map(p => { const icon = p.gender === 'Male' ? '<i class="fas fa-mars"></i>' : (p.gender === 'Female' ? '<i class="fas fa-venus"></i>' : ''); const dischargeDate = p.discharge_date ? formatDateTH(p.discharge_date) : '-'; const deathPlace = p.death_place ? `<br>สถานที่: ${p.death_place}` : ''; const withdraw = p.withdraw_et==='Yes'?'<span class="badge bg-danger ms-1">Withdraw ET</span>':''; return `<div class="col-md-4 col-sm-6"><div class="card p-3 shadow-sm border-start border-5 border-secondary bg-light" onclick="openEditRegistration('${p.hn}')" style="cursor:pointer;"><div class="d-flex justify-content-between"><div><h5 class="mb-1 fw-bold text-secondary">${icon} ${p.name}</h5><p class="mb-0 text-secondary small">HN: ${p.hn}</p></div><span class="badge bg-danger">Death</span></div><hr class="my-2" style="opacity:0.1"><small class="text-muted"><i class="fas fa-calendar-times"></i> เสียชีวิต: ${dischargeDate} ${deathPlace} ${withdraw}</small></div></div>`; }).join(''); }
function initSlider(){const c=document.getElementById('dateSlider');c.innerHTML='';const d=new Date();const th=['อา','จ','อ','พ','พฤ','ศ','ส'];for(let i=0;i<14;i++){const t=new Date(d);t.setDate(d.getDate()+i);const y=t.getFullYear(),m=String(t.getMonth()+1).padStart(2,'0'),day=String(t.getDate()).padStart(2,'0'),s=`${y}-${m}-${day}`;c.innerHTML+=`<div class="date-card ${i===0?'active':''}" onclick="document.querySelectorAll('.date-card').forEach(e=>e.classList.remove('active'));this.classList.add('active');renderApptList('${s}')"><div class="date-day">${th[t.getDay()]}</div><div class="date-num">${t.getDate()}</div></div>`;}const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');renderApptList(`${y}-${m}-${day}`);}
function renderDiseaseType() { const sel = document.getElementById('disease_type'); sel.innerHTML = '<option value="">-- เลือกประเภท --</option>'; Object.keys(diseaseData).forEach(k => sel.add(new Option(k, k))); }
function updateDiseaseUI() { const type = document.getElementById('disease_type').value; const groupSel = document.getElementById('disease_group'); const subSel = document.getElementById('disease_sub'); const otherInput = document.getElementById('disease_other_container'); groupSel.innerHTML = '<option value="">-- เลือกกลุ่ม/ตำแหน่ง --</option>'; subSel.innerHTML = '<option value="">-- เลือกโรค/การแพร่กระจาย --</option>'; subSel.parentElement.classList.add('d-none'); otherInput.classList.add('d-none'); if (!type) return; if (type === 'Non-Cancer') { document.getElementById('disease_group_label').innerText = 'กลุ่มโรค'; Object.keys(diseaseData['Non-Cancer']).forEach(k => groupSel.add(new Option(k, k))); } else { document.getElementById('disease_group_label').innerText = 'ตำแหน่งมะเร็ง (Primary)'; diseaseData['Cancer']['Primary'].forEach(k => groupSel.add(new Option(k, k))); document.getElementById('disease_sub_label').innerText = 'การแพร่กระจาย (Metastasis)'; subSel.parentElement.classList.remove('d-none'); diseaseData['Cancer']['Metastasis'].forEach(k => subSel.add(new Option(k, k))); } }
function updateDiseaseSub() { const type = document.getElementById('disease_type').value; const group = document.getElementById('disease_group').value; const subSel = document.getElementById('disease_sub'); const otherInput = document.getElementById('disease_other_container'); if (type === 'Non-Cancer') { const subOptions = diseaseData['Non-Cancer'][group]; if (subOptions && subOptions.length > 0) { subSel.parentElement.classList.remove('d-none'); subSel.innerHTML = '<option value="">-- เลือกโรค --</option>'; document.getElementById('disease_sub_label').innerText = 'ระบุโรค'; subOptions.forEach(k => subSel.add(new Option(k, k))); otherInput.classList.add('d-none'); } else { subSel.parentElement.classList.add('d-none'); otherInput.classList.remove('d-none'); document.getElementById('disease_specific').focus(); } } }
function checkDiseaseOther() { const sub = document.getElementById('disease_sub').value; const otherInput = document.getElementById('disease_other_container'); if (sub.includes('ระบุ')) { otherInput.classList.remove('d-none'); document.getElementById('disease_specific').focus(); } else { otherInput.classList.add('d-none'); } }
function addDisease() { const type = document.getElementById('disease_type').value; const group = document.getElementById('disease_group').value; const sub = document.getElementById('disease_sub').value; const other = document.getElementById('disease_specific').value; if (!type || !group) return; let txt = ''; if (type === 'Non-Cancer') { if (!document.getElementById('disease_sub').parentElement.classList.contains('d-none')) { if (!sub) return; txt = `${group}: ${sub}`; if (sub.includes('ระบุ') && other) txt += ` (${other})`; } else { txt = `${group}`; if (other) txt += ` (${other})`; } } else { if (!sub) return; txt = `CA ${group}`; if (sub !== 'None') { txt += ` (Meta: ${sub}`; if (sub.includes('ระบุ') && other) txt += ` - ${other}`; txt += `)`; } } currentDiseases.push(txt); renderDiseaseBadges(); document.getElementById('disease_group').value = ''; document.getElementById('disease_sub').value = ''; document.getElementById('disease_specific').value = ''; document.getElementById('disease_sub').parentElement.classList.add('d-none'); document.getElementById('disease_other_container').classList.add('d-none'); }
function renderDiseaseBadges(){document.getElementById('diseaseList').innerHTML=currentDiseases.map((d,i)=>`<span class="badge bg-secondary m-1 text-wrap text-start" style="line-height:1.4;">${d} <i class="fas fa-times ms-2" style="cursor:pointer;" onclick="currentDiseases.splice(${i},1);renderDiseaseBadges()"></i></span>`).join('');}
function renderESAS() { const container = document.getElementById('esasContainer'); container.className = 'row g-3'; container.innerHTML = ''; esasTopics.forEach((topic, index) => { const col = document.createElement('div'); col.className = 'col-md-6 col-12'; col.innerHTML = `<div class="esas-card p-3 shadow-sm h-100"><div class="d-flex justify-content-between align-items-center mb-2"><div><h6 class="fw-bold text-dark mb-0" style="font-size: 0.95rem;">${topic}</h6><small class="text-muted" id="text-mood-${index}">ไม่มีอาการ</small></div><div class="score-badge-box bg-success shadow-sm" id="badge-${index}">0</div></div><div class="d-flex align-items-center"><span class="small text-muted me-2">0</span><input type="range" class="form-range esas-range" min="0" max="10" value="0" data-topic="${topic}" oninput="updateESASScore(this, ${index})"><span class="small text-muted ms-2">10</span></div></div>`; container.appendChild(col); }); }
function updateESASScore(el, index) { const val = parseInt(el.value); const badge = document.getElementById(`badge-${index}`); const textMood = document.getElementById(`text-mood-${index}`); badge.innerText = val; if (val === 0) { badge.className = 'score-badge-box bg-success shadow-sm'; textMood.innerText = 'ไม่มีอาการ 😃'; textMood.className = 'text-success small'; } else if (val >= 1 && val <= 3) { badge.className = 'score-badge-box bg-success shadow-sm'; badge.style.backgroundColor = '#2ECC71'; textMood.innerText = 'เล็กน้อย 🙂'; textMood.className = 'text-success small'; } else if (val >= 4 && val <= 6) { badge.className = 'score-badge-box shadow-sm'; badge.style.backgroundColor = '#F1C40F'; badge.style.color = '#333'; textMood.innerText = 'ปานกลาง 😐'; textMood.className = 'text-warning small fw-bold'; } else if (val >= 7 && val <= 9) { badge.className = 'score-badge-box text-white shadow-sm'; badge.style.backgroundColor = '#E67E22'; textMood.innerText = 'รุนแรง 😣'; textMood.className = 'text-danger small fw-bold'; } else { badge.className = 'score-badge-box bg-danger text-white shadow-sm'; textMood.innerText = 'รุนแรงที่สุด 😫'; textMood.className = 'text-danger small fw-bold'; } }
function formatDateTH(dateStr) { if(!dateStr) return '-'; const isoDate = dateStr.substring(0, 10); const parts = isoDate.split('-'); if (parts.length !== 3) return '-'; const y = parseInt(parts[0]) + 543; return `${parts[2]}/${parts[1]}/${y}`; }
function getTypeClass(type) { if (!type) return ''; const t = type.toLowerCase(); if (t.includes('opd')) return 'card-opd'; if (t.includes('home')) return 'card-home'; if (t.includes('tele')) return 'card-telemed'; if (t.includes('ipd')) return 'card-ipd'; return ''; }

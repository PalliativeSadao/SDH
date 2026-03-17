// *** วาง URL ของ Web App Google Script ของคุณตรงนี้ ***
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
function calculateAge() { const d=document.getElementById('dob'); if(!d || !d.value || d.value.length!==10) { const ad = document.getElementById('age_display'); if(ad) ad.value='-'; return; } const diff=Date.now()-new Date(dateThToGregorian(d.value)).getTime(); const ad = document.getElementById('age_display'); if(ad) ad.value = Math.abs(new Date(diff).getUTCFullYear()-1970)+" ปี"; }

function toggleDeathPlace() {
    const statusEl = document.querySelector('input[name="pt_status"]:checked');
    if(!statusEl) return;
    const container = document.getElementById('deathDetails');
    if(container) {
        if (statusEl.value === 'Death') {
            container.classList.remove('d-none');
        } else { 
            container.classList.add('d-none'); 
            const dp = document.getElementById('death_place'); if(dp) dp.value = ''; 
            const we = document.getElementById('withdraw_et'); if(we) we.checked = false; 
            const dd = document.getElementById('discharge_date'); if(dd) { dd.value = ''; if(dd._flatpickr) dd._flatpickr.clear(); }
        }
    }
}

function revertToAlive() { 
    const aliveEl = document.getElementById('status_alive');
    if(aliveEl) {
        aliveEl.checked = true; 
        toggleDeathPlace(); 
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'เปลี่ยนสถานะเป็น คงพยาบาล', showConfirmButton: false, timer: 2000 }); 
    }
}

function toggleLWDate() { 
    const cb = document.getElementById('lw_checkbox');
    const container = document.getElementById('lw_date_container');
    if(!cb || !container) return;
    if(cb.checked) container.classList.remove('d-none'); 
    else { container.classList.add('d-none'); const ld = document.getElementById('lw_date'); if(ld) ld.value = ''; } 
}

function updateEditHeader() { 
    if(!editingPatient) return; 
    const nm = document.getElementById('fullname'); const at = document.getElementById('admitType');
    if(nm && at) {
        const eName = document.getElementById('editInfoName'); if(eName) eName.innerText = nm.value; 
        const eType = document.getElementById('editInfoCurrentType'); if(eType) eType.innerText = "Now: " + at.value; 
    }
}

function handleFormSubmit(e) {
  e.preventDefault();
  
  const hnEl = document.getElementById('hn');
  const nameEl = document.getElementById('fullname');
  const hnVal = hnEl ? hnEl.value.trim() : '';
  const nameVal = nameEl ? nameEl.value.trim() : '';

  if(!hnVal) { Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกเลข HN', 'warning'); if(hnEl) hnEl.focus(); return; }
  if(!nameVal) { Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อ - สกุล', 'warning'); if(nameEl) nameEl.focus(); return; }

  const editTs = document.getElementById('edit_history_timestamp');
  const editTimestamp = editTs ? editTs.value : '';
  const isHistoryEdit = !!editTimestamp;

  const phones=[]; document.querySelectorAll('.phone-input').forEach(el=>{ if(el.value) phones.push({number:el.value, label:el.nextElementSibling.value}); });
  const esas={}; document.querySelectorAll('.esas-range').forEach(el=>esas[el.dataset.topic]=el.value);
  const acp={}; acpTopics.forEach(t=>{ const c=document.querySelector(`input[name="acp_${t}"]:checked`); acp[t]=c?c.value:'Undecided'; });
  
  const acpMaker = document.getElementById('acp_maker'); if(acpMaker) acp['maker'] = acpMaker.value; 
  const acpDate = document.getElementById('acp_date'); if(acpDate) acp['date'] = dateThToGregorian(acpDate.value); 
  
  const lwCb = document.getElementById('lw_checkbox');
  const hasLW = lwCb ? lwCb.checked : false;
  const lwDate = document.getElementById('lw_date');
  const livingWill = { status: hasLW ? 'Made' : 'NotMade', date: (hasLW && lwDate) ? dateThToGregorian(lwDate.value) : '' };

  const ptStatusEl = document.querySelector('input[name="pt_status"]:checked');
  const ptStatus = ptStatusEl ? ptStatusEl.value : 'Alive';
  
  const gcsEl = document.getElementById('gcs_score');
  const ppsEl = document.getElementById('pps_score');
  const bpEl = document.getElementById('vs_bp');
  const prEl = document.getElementById('vs_pr');
  const rrEl = document.getElementById('vs_rr');
  const o2El = document.getElementById('vs_o2');
  const btEl = document.getElementById('vs_bt');
  const npEl = document.getElementById('nursing_plan');
  const nvdEl = document.getElementById('next_visit_date');
  const nvtEl = document.getElementById('next_visit_type');
  const lcrEl = document.getElementById('lab_cr');
  const legEl = document.getElementById('lab_egfr');
  const ldtEl = document.getElementById('lab_date');
  const ddEl = document.getElementById('discharge_date');
  const dpEl = document.getElementById('death_place');
  const weEl = document.getElementById('withdraw_et');

  const formData = {
    isHistoryEdit: isHistoryEdit, originalTimestamp: editTimestamp,
    hn: hnVal, name: nameVal, gender: document.getElementById('gender') ? document.getElementById('gender').value : '',
    dob: dateThToGregorian(document.getElementById('dob') ? document.getElementById('dob').value : ''), 
    admitType: document.getElementById('admitType') ? document.getElementById('admitType').value : '',
    phones: phones,
    address: { 
        house: document.getElementById('addr_house') ? document.getElementById('addr_house').value : '', 
        moo: document.getElementById('addr_moo') ? document.getElementById('addr_moo').value : '', 
        road: document.getElementById('addr_road') ? document.getElementById('addr_road').value : '', 
        sub: document.getElementById('addr_tumbon') ? document.getElementById('addr_tumbon').value : '', 
        dist: document.getElementById('addr_amphoe') ? document.getElementById('addr_amphoe').value : '', 
        prov: document.getElementById('addr_province') ? document.getElementById('addr_province').value : '' 
    },
    gps: { 
        lat: document.getElementById('lat') ? document.getElementById('lat').value : '', 
        long: document.getElementById('long') ? document.getElementById('long').value : '' 
    },
    diseases: currentDiseases, meds: currentMeds, livingWill: livingWill,
    exam: { 
        pps: ppsEl ? ppsEl.value : '', 
        gcs: gcsEl ? gcsEl.value : '', 
        vitals: { 
            bp: bpEl ? bpEl.value : '', 
            pr: prEl ? prEl.value : '', 
            rr: rrEl ? rrEl.value : '', 
            o2: o2El ? o2El.value : '', 
            bt: btEl && btEl.value ? parseFloat(btEl.value).toFixed(1) : '' 
        }, 
        esas: esas 
    },
    plan: npEl ? npEl.value : '', acp: acp,
    nextVisitDate: nvdEl ? dateThToGregorian(nvdEl.value) : '', nextVisitType: nvtEl ? nvtEl.value : '',
    lab: { 
        cr: lcrEl ? lcrEl.value : '', 
        egfr: legEl ? legEl.value : '', 
        date: ldtEl ? dateThToGregorian(ldtEl.value) : '' 
    },
    status: ptStatus,
    dischargeDate: (ptStatus === 'Death' && ddEl) ? dateThToGregorian(ddEl.value) : '',
    deathPlace: (ptStatus === 'Death' && dpEl) ? dpEl.value : '',
    withdrawET: (ptStatus === 'Death' && weEl && weEl.checked) ? 'Yes' : 'No'
  };

  Swal.fire({ title: isHistoryEdit ? 'แก้ไขประวัติ?' : 'บันทึก?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ตกลง' }).then((r) => {
      if (r.isConfirmed) {
          Swal.fire({title:'Saving...', didOpen:()=>Swal.showLoading()});
          fetch(SCRIPT_URL, { method:'POST', body:JSON.stringify(formData) }).then(r=>r.json()).then(res=>{
             if(res.success){ Swal.fire({title:'Success', icon:'success', timer:1500, showConfirmButton:false}); resetForm(); loadData(); showPage('menu'); } 
             else Swal.fire('Error',res.message,'error');
          }).catch(err => {
             Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ', 'error');
          });
      }
  });
}

function confirmDeletePatient() {
    const hnEl = document.getElementById('hn');
    const hn = hnEl ? hnEl.value : '';
    if (!hn) return;
    Swal.fire({ title: 'ยืนยันการลบผู้ป่วย?', text: `ต้องการลบข้อมูล HN: ${hn} ใช่หรือไม่? (ลบถาวร)`, icon: 'error', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'ลบข้อมูล', cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({title:'กำลังลบ...', didOpen:()=>Swal.showLoading()});
            fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'delete', hn: hn }) })
            .then(r => r.json()).then(res => {
                if(res.success) { Swal.fire({title:'ลบสำเร็จ', icon:'success', timer:1500, showConfirmButton:false}); resetForm(); loadData(); showPage('menu'); } 
                else { Swal.fire('Error', res.message, 'error'); }
            }).catch(err => Swal.fire('Error', 'เกิดข้อผิดพลาดในการลบ', 'error'));
        }
    });
}

function openNewRegistration() {
  resetForm(); editingPatient = null;
  const bar = document.getElementById('editInfoBar'); if(bar) bar.classList.add('d-none');
  const title = document.getElementById('formTitle'); if(title) title.innerHTML = '<i class="fas fa-user-plus"></i> ลงทะเบียนรายใหม่';
  const bh = document.getElementById('btnViewHistory'); if(bh) bh.classList.add('d-none'); 
  const bd = document.getElementById('btnDeletePatient'); if(bd) bd.classList.add('d-none'); 
  const hn = document.getElementById('hn'); if(hn) hn.readOnly = false; 
  showPage('register');
}

function openEditRegistration(hn) {
  const p = allPatients.find(x => String(x.hn) === String(hn)); if(!p) return;
  resetForm(); editingPatient = p;
  
  const bar = document.getElementById('editInfoBar'); if(bar) bar.classList.remove('d-none');
  const ename = document.getElementById('editInfoName'); if(ename) ename.innerText = p.name; 
  const eft = document.getElementById('editInfoFirstType'); if(eft) eft.innerText = "First: " + (p.type_admit || '-'); 
  const ect = document.getElementById('editInfoCurrentType'); if(ect) ect.innerText = "Now: " + (p.visit_type || 'OPD');
  const ft = document.getElementById('formTitle'); if(ft) ft.innerHTML = `<i class="fas fa-edit"></i> แก้ไขข้อมูล`;
  const bh = document.getElementById('btnViewHistory'); if(bh) bh.classList.remove('d-none'); 
  const bd = document.getElementById('btnDeletePatient'); if(bd) bd.classList.remove('d-none'); 
  
  const linkMap = document.getElementById('linkMap');
  if(linkMap) {
    if(p.gps && p.gps.lat) { linkMap.classList.remove('d-none'); linkMap.onclick = () => window.open(`http://maps.google.com/?q=$$${p.gps.lat},${p.gps.long}`, '_blank'); updateMapBtnStatus(true); }
    else { linkMap.classList.add('d-none'); }
  }
  
  const hnel = document.getElementById('hn'); if(hnel) { hnel.value = p.hn; hnel.readOnly = true; }
  const fn = document.getElementById('fullname'); if(fn) fn.value = p.name; 
  const g = document.getElementById('gender'); if(g) g.value = p.gender;
  const d = document.getElementById('dob'); if(d) { d.value = gregorianToDateTh(p.dob); calculateAge(); }
  const at = document.getElementById('admitType'); if(at) at.value = p.type_admit; 
  
  if(p.address) { ['house','moo','road','tumbon','amphoe','province'].forEach(k=>{ const key = (k==='tumbon')?'sub':(k==='amphoe')?'dist':(k==='province')?'prov':k; const el = document.getElementById('addr_'+k); if(el) el.value = p.address[key]||''; }); }
  if(p.gps) { const lat = document.getElementById('lat'); if(lat) lat.value = p.gps.lat || ''; const lon = document.getElementById('long'); if(lon) lon.value = p.gps.long || ''; }
  
  const pc = document.getElementById('phoneContainer'); if(pc) pc.innerHTML=''; (p.phones||[]).forEach(ph=>addPhoneField(ph.number, ph.label)); if(!(p.phones||[]).length) addPhoneField();
  currentDiseases = p.diseases||[]; renderDiseaseBadges(); currentMeds = p.meds||[]; renderMedsList();
  
  if(p.livingWill) { const isMade = p.livingWill.status === 'Made'; const lwc = document.getElementById('lw_checkbox'); if(lwc) { lwc.checked = isMade; toggleLWDate(); if(isMade) { const lwd = document.getElementById('lw_date'); if(lwd) lwd.value = gregorianToDateTh(p.livingWill.date); } } }
  if(p.acp) { Object.keys(p.acp).forEach(k=>{ if(k === 'maker') { const am = document.getElementById('acp_maker'); if(am) am.value = p.acp[k]; } else if(k === 'date') { const ad = document.getElementById('acp_date'); if(ad) ad.value = gregorianToDateTh(p.acp[k]); } else { const r=document.getElementsByName('acp_'+k); r.forEach(el=>{ if(el.value===p.acp[k]) el.checked=true; }); } }); }
  
  document.getElementsByName('pt_status').forEach(el=>{ if(el.value===p.status) el.checked=true; });
  if(p.status === 'Death') { toggleDeathPlace(); const dp = document.getElementById('death_place'); if(dp) dp.value = p.death_place || ''; const we = document.getElementById('withdraw_et'); if(we) we.checked = (p.withdraw_et === 'Yes'); }
  
  const nvd = document.getElementById('next_visit_date'); if(nvd) nvd.value = gregorianToDateTh(p.next_visit_date);
  const dd = document.getElementById('discharge_date'); if(dd) dd.value = gregorianToDateTh(p.discharge_date);
  const ld = document.getElementById('lab_date'); if(p.lab && ld) ld.value = gregorianToDateTh(p.lab.date);
  
  showPage('register'); updateEditHeader();
}

// --- โค้ดดักจับปุ่มและค่าสถานะที่เสถียรที่สุด 100% ---
function resetForm() {
  const form = document.getElementById('mainForm');
  if(form) form.reset();

  const editTs = document.getElementById('edit_history_timestamp');
  if(editTs) editTs.value = '';

  const fTitle = document.getElementById('formTitle');
  if(fTitle) fTitle.innerHTML = '<i class="fas fa-clipboard-check"></i> บันทึกข้อมูล';

  const fHeader = document.getElementById('formHeader');
  if(fHeader) fHeader.classList.replace('bg-warning-subtle', 'bg-light');
  
  currentMeds=[]; currentDiseases=[]; 
  if(typeof renderMedsList === 'function') renderMedsList(); 
  if(typeof renderDiseaseBadges === 'function') renderDiseaseBadges();
  
  const pCont = document.getElementById('phoneContainer');
  if(pCont) pCont.innerHTML=''; 
  if(typeof addPhoneField === 'function') addPhoneField();
  if(typeof updateMapBtnStatus === 'function') updateMapBtnStatus(false);
  
  // ตั้งค่ากลับเป็น Alive ป้องกันบัค
  const aliveRadio = document.getElementById('status_alive') || document.querySelector('input[name="pt_status"][value="Alive"]');
  if(aliveRadio) {
      aliveRadio.checked = true;
  }
  
  document.querySelectorAll('input[type=checkbox], input[type=radio]').forEach(el => { 
      if(el.name !== 'pt_status') el.checked = false; 
  });

  if(typeof toggleLWDate === 'function') toggleLWDate(); 
  if(typeof toggleDeathPlace === 'function') toggleDeathPlace(); 
  
  const aDisp = document.getElementById('age_display');
  if(aDisp) aDisp.value = '-';
  
  document.querySelectorAll('.esas-range').forEach(el => { el.value = 0; }); 
  if(typeof renderESAS === 'function') renderESAS(); 
  if(typeof updateDiseaseUI === 'function') updateDiseaseUI(); 
  
  document.querySelectorAll('.thai-datepicker').forEach(el => { 
      if(el._flatpickr) el._flatpickr.clear(); 
  });
}

function showHistoryModal() {
  const hnEl = document.getElementById('hn');
  const nameEl = document.getElementById('fullname');
  const hn = hnEl ? hnEl.value : null; 
  const name = nameEl ? nameEl.value : null;
  if(!hn) { Swal.fire('แจ้งเตือน', 'กรุณากรอก HN', 'warning'); return; }
  
  const hModal = document.getElementById('historyModal');
  if(hModal) {
      const modal = new bootstrap.Modal(hModal);
      const hName = document.getElementById('historyPatientName'); if(hName) hName.innerText = name;
      const hLoad = document.getElementById('historyLoading'); if(hLoad) hLoad.classList.remove('d-none'); 
      const hCont = document.getElementById('historyContent'); if(hCont) hCont.classList.add('d-none');
      modal.show();
  }
  
  const latEl = document.getElementById('lat'), longEl = document.getElementById('long'), btnMap = document.getElementById('btnMapHistory');
  if(btnMap) {
      if(latEl && longEl && latEl.value && longEl.value) { btnMap.classList.remove('d-none'); btnMap.onclick=()=>window.open(`http://maps.google.com/?q=$$${latEl.value},${longEl.value}`,'_blank'); } 
      else { btnMap.classList.add('d-none'); }
  }
  
  fetch(SCRIPT_URL + '?op=getHistory&hn=' + hn).then(r=>r.json()).then(d=>{ 
      renderHistoryItems(d); 
      const hLoad = document.getElementById('historyLoading'); if(hLoad) hLoad.classList.add('d-none'); 
      const hCont = document.getElementById('historyContent'); if(hCont) hCont.classList.remove('d-none'); 
  }).catch(err => {
      const hLoad = document.getElementById('historyLoading'); if(hLoad) hLoad.innerHTML = '<span class="text-danger">เกิดข้อผิดพลาด</span>';
  });
}

function renderHistoryItems(list) {
  currentHistoryData = list; const c = document.getElementById('historyContent');
  if(!c) return;
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
     return `<div class="card mb-3 shadow-sm history-card"><div class="card-header bg-white d-flex justify-content-between align-items-center"><div><span class="history-date fw-bold">${d}</span> <span class="badge bg-light text-dark border ms-2">PPS: ${ppsDisplay}</span></div><button type="button" class="btn btn-sm btn-outline-warning" onclick="loadHistoryToEdit(${index})"><i class="fas fa-edit"></i> แก้ไข</button></div><div class="card-body">${labHtml}<div class="mb-2">${esasHtml}</div><div class="row"><div class="col-6 border-end"><p class="mb-1 small"><b>Vitals:</b> BP:${v.bp||'-'} P:${v.pr||'-'} RR:${v.rr||'-'} O2:${v.o2||'-'} T:${v.bt||'-'}</p><p class="mb-1 small"><b>GCS:</b> ${h.gcs||'-'}</p><p class="mb-1 small"><b>Plan:</b> ${h.plan||'-'}</p></div><div class="col-6"><p class="mb-1 small fw-bold text-success">ยา:</p>${medHtml}</div><div class="col-12 mt-2 border-top pt-2">${acpHtml}${deathHtml}</div></div></div>`;
  }).join('');
}

function loadHistoryToEdit(index) {
    const h = currentHistoryData[index]; if(!h) return;
    const hModal = document.getElementById('historyModal');
    if(hModal) { const modal = bootstrap.Modal.getInstance(hModal); if(modal) modal.hide(); }
    
    resetForm();
    
    const hnEl = document.getElementById('hn'); if(hnEl) { hnEl.value = hnEl.value; hnEl.readOnly = true; }
    const editTs = document.getElementById('edit_history_timestamp'); if(editTs) editTs.value = h.original_timestamp;
    const fTitle = document.getElementById('formTitle'); if(fTitle) fTitle.innerHTML = `<i class="fas fa-clock text-warning"></i> แก้ไขประวัติ: ${formatDateTH(h.date)}`;
    const fHeader = document.getElementById('formHeader'); if(fHeader) fHeader.classList.replace('bg-light', 'bg-warning-subtle');
    
    const at = document.getElementById('admitType'); if(at) at.value = h.type || 'OPD';
    if(h.vitals) { const vbp = document.getElementById('vs_bp'); if(vbp) vbp.value = h.vitals.bp || ''; const vpr = document.getElementById('vs_pr'); if(vpr) vpr.value = h.vitals.pr || ''; const vrr = document.getElementById('vs_rr'); if(vrr) vrr.value = h.vitals.rr || ''; const vo2 = document.getElementById('vs_o2'); if(vo2) vo2.value = h.vitals.o2 || ''; const vbt = document.getElementById('vs_bt'); if(vbt) vbt.value = h.vitals.bt || ''; }
    const gcs = document.getElementById('gcs_score'); if(gcs) gcs.value = h.gcs || ''; const pps = document.getElementById('pps_score'); if(pps) pps.value = h.pps || '0'; const np = document.getElementById('nursing_plan'); if(np) np.value = h.plan || '';
    
    currentMeds = h.meds || []; if(typeof renderMedsList === 'function') renderMedsList();
    if(h.esas) { Object.entries(h.esas).forEach(([topic, val]) => { const el = document.querySelector(`.esas-range[data-topic="${topic}"]`); if(el) { el.value = val; updateESASScore(el, esasTopics.indexOf(topic)); } }); }
    
    const lcr = document.getElementById('lab_cr'); if(lcr) lcr.value = h.lab_cr || ''; const leg = document.getElementById('lab_egfr'); if(leg) leg.value = h.lab_egfr || ''; const ldt = document.getElementById('lab_date'); if(ldt) ldt.value = gregorianToDateTh(h.lab_date);
    
    if(h.livingWill) { const isMade = h.livingWill.status === 'Made'; const lwc = document.getElementById('lw_checkbox'); if(lwc) { lwc.checked = isMade; toggleLWDate(); if(isMade) { const lwd = document.getElementById('lw_date'); if(lwd) lwd.value = gregorianToDateTh(h.livingWill.date); } } }
    if(h.acp) { Object.keys(h.acp).forEach(k=>{ if(k === 'maker') { const am = document.getElementById('acp_maker'); if(am) am.value = h.acp[k]; } else if(k === 'date') { const ad = document.getElementById('acp_date'); if(ad) ad.value = gregorianToDateTh(h.acp[k]); } else { const r=document.getElementsByName('acp_'+k); r.forEach(el=>{ if(el.value===h.acp[k]) el.checked=true; }); } }); }
    
    if(h.withdraw_et === 'Yes') { const deathRadio = document.querySelector('input[name="pt_status"][value="Death"]'); if(deathRadio) { deathRadio.checked = true; toggleDeathPlace(); const we = document.getElementById('withdraw_et'); if(we) we.checked = true; } }
    
    showPage('register'); Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'กำลังแก้ไขประวัติย้อนหลัง', showConfirmButton: false, timer: 3000 });
}

function showPage(pid) { document.querySelectorAll('.page-section').forEach(e=>e.classList.add('d-none')); const p = document.getElementById('page-'+pid); if(p) p.classList.remove('d-none'); document.querySelectorAll('.nav-link').forEach(e=>e.classList.remove('active')); const links = document.querySelectorAll('.nav-link'); links.forEach(l => { if(l.getAttribute('onclick') && l.getAttribute('onclick').includes(`'${pid}'`)) l.classList.add('active'); }); if(pid==='appoint') initSlider(); }
function updateMapBtnStatus(has) { const b=document.getElementById('btnGeo'); if(!b) return; if(has){b.className='btn btn-sm btn-success text-white ms-2'; b.innerHTML='<i class="fas fa-check-circle"></i> พิกัดถูกบันทึกแล้ว';}else{b.className='btn btn-sm btn-info text-white ms-2'; b.innerHTML='<i class="fas fa-map-marker-alt"></i> ปักหมุดพิกัด';} }
function getLocation() { if(navigator.geolocation){ Swal.fire({title:'กำลังระบุพิกัด...',didOpen:()=>Swal.showLoading()}); navigator.geolocation.getCurrentPosition(p=>{ const lat = document.getElementById('lat'); if(lat) lat.value=p.coords.latitude; const lon = document.getElementById('long'); if(lon) lon.value=p.coords.longitude; updateMapBtnStatus(true); Swal.fire({icon:'success', title:'บันทึกพิกัดสำเร็จ', text:`${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`, timer:1500, showConfirmButton:false}); }, err=>{ Swal.fire('Error','ไม่สามารถระบุตำแหน่งได้','error'); }); } else { Swal.fire('Error','Browser ไม่รองรับ GPS','error'); } }
function addPhoneField(v='',l=''){ const d=document.createElement('div'); d.className='input-group mb-2'; d.innerHTML=`<input type="tel" class="form-control phone-input" placeholder="เบอร์โทร" value="${v}" maxlength="10"><select class="form-select" style="max-width:130px"><option value="">ความสัมพันธ์</option><option value="คนไข้" ${l==='คนไข้'?'selected':''}>คนไข้</option><option value="คู่สมรส" ${l==='คู่สมรส'?'selected':''}>คู่สมรส</option><option value="พ่อ" ${l==='พ่อ'?'selected':''}>พ่อ</option><option value="แม่" ${l==='แม่'?'selected':''}>แม่</option><option value="ลูก" ${l==='ลูก'?'selected':''}>ลูก</option><option value="ผู้ดูแล" ${l==='ผู้ดูแล'?'selected':''}>ผู้ดูแล</option><option value="ญาติ" ${l==='ญาติ'?'selected':''}>ญาติ</option></select><button type="button" class="btn btn-outline-danger" onclick="this.parentElement.remove()"><i class="fas fa-trash"></i></button>`; const pc = document.getElementById('phoneContainer'); if(pc) pc.appendChild(d); }
function validateLabInput(el, type) { if (el.value === '') return; const val = parseFloat(el.value); if (type === 'cr' && val >= 100) el.value = el.value.slice(0, -1); if (type === 'egfr' && val >= 1000) el.value = el.value.slice(0, -1); }
function formatLabFinal(el) { if (el.value === '') return; const val = parseFloat(el.value); if (!isNaN(val)) el.value = val.toFixed(2); }
function renderPPS(){const s=document.getElementById('pps_score'); if(!s) return; s.innerHTML='';s.add(new Option('ไม่ระบุ',''));for(let i=0;i<=100;i+=10)s.add(new Option(i+'%',i));}
function renderACP(){const b=document.getElementById('acpTableBody'); if(!b) return; acpTopics.forEach(t=>b.innerHTML+=`<tr><td>${t}</td><td class="text-center"><input type="radio" name="acp_${t}" value="Want"></td><td class="text-center"><input type="radio" name="acp_${t}" value="Dont"></td><td class="text-center"><input type="radio" name="acp_${t}" value="Undecided" checked></td></tr>`);}
function renderMedOptions(){const s=document.getElementById('med_name'); if(!s) return; s.add(new Option('--Drug--',''));medList.forEach(m=>s.add(new Option(m,m)));}
function addMed(){const nEl = document.getElementById('med_name'); const dEl = document.getElementById('med_dose'); if(!nEl || !dEl) return; const n=nEl.value, d=dEl.value; if(n){currentMeds.push({name:n,dose:d});renderMedsList();dEl.value='';}}
function renderMedsList(){const ml = document.getElementById('medList'); if(!ml) return; ml.innerHTML=currentMeds.map((m,i)=>`<li class="list-group-item d-flex justify-content-between p-2 small">${m.name} (${m.dose}) <button type="button" class="btn btn-sm btn-outline-danger border-0" onclick="currentMeds.splice(${i},1);renderMedsList()"><i class="fas fa-times"></i></button></li>`).join('');}
function renderActivePatients(){const tEl = document.getElementById('searchActive'); if(!tEl) return; const t=tEl.value.toLowerCase();const f=allPatients.filter(p=>p.status==='Alive'&&(p.name.includes(t)||p.hn.includes(t))); const ap = document.getElementById('activePatientList'); if(!ap) return; ap.innerHTML=f.length?f.map(p=>{const c=getTypeClass(p.type_admit);const icon=p.gender==='Male'?'<i class="fas fa-mars text-primary"></i>':(p.gender==='Female'?'<i class="fas fa-venus text-danger"></i>':'');return`<div class="col-md-4 col-sm-6"><div class="card p-3 shadow-sm patient-card ${c}" onclick="openEditRegistration('${p.hn}')"><div class="d-flex justify-content-between"><div><h5 class="mb-1 fw-bold text-dark">${icon} ${p.name}</h5><p class="mb-0 text-secondary small">HN: ${p.hn}</p></div><span class="status-badge">${p.type_admit}</span></div><hr class="my-2" style="opacity:0.1"><small class="text-muted"><i class="far fa-calendar-check"></i> นัด: ${formatDateTH(p.next_visit_date)}</small></div></div>`;}).join(''):'<div class="col-12 text-center text-muted mt-5">ไม่พบข้อมูล</div>';}
function renderApptList(s){const l=document.getElementById('appointList'); if(!l) return; const p=allPatients.filter(x=>x.next_visit_date&&x.next_visit_date.substring(0,10)===s);l.innerHTML=p.length?p.map(x=>{const c=getTypeClass(x.visit_type);const icon=x.gender==='Male'?'<i class="fas fa-mars text-primary"></i>':(x.gender==='Female'?'<i class="fas fa-venus text-danger"></i>':'');return`<div class="col-md-6"><div class="card p-3 shadow-sm ${c}" onclick="openEditRegistration('${x.hn}')" style="cursor:pointer; border-left-width:8px;"><div class="d-flex justify-content-between"><h5 class="mb-1 fw-bold">${icon} ${x.name}</h5><span class="badge bg-white text-dark border">${x.visit_type}</span></div><small class="text-secondary">HN: ${x.hn}</small></div></div>`;}).join(''):'<div class="col-12 text-center text-muted py-5">ไม่มีนัด</div>';}
function renderSummary(){ const sc = document.getElementById('summaryContainer'); if(!sc) return; sc.innerHTML=`<div class="col-6 col-md-3"><div class="card p-3 bg-primary text-white"><h3>${allPatients.length}</h3>Total</div></div><div class="col-6 col-md-3"><div class="card p-3 bg-success text-white"><h3>${allPatients.filter(p=>p.status==='Alive').length}</h3>Active</div></div><div class="col-6 col-md-3"><div class="card p-3 bg-dark text-white" style="cursor:pointer;" onclick="showPage('death'); renderDeceasedPatients();"><h3>${allPatients.filter(p=>p.status!=='Alive').length}</h3>Death (คลิกเพื่อดู)</div></div>`; }
function renderDeceasedPatients() { const list = allPatients.filter(p => p.status !== 'Alive'); const container = document.getElementById('deathPatientList'); if(!container) return; if (list.length === 0) { container.innerHTML = '<div class="col-12 text-center text-muted mt-5">ไม่มีข้อมูลผู้เสียชีวิต</div>'; return; } container.innerHTML = list.map(p => { const icon = p.gender === 'Male' ? '<i class="fas fa-mars"></i>' : (p.gender === 'Female' ? '<i class="fas fa-venus"></i>' : ''); const dischargeDate = p.discharge_date ? formatDateTH(p.discharge_date) : '-'; const deathPlace = p.death_place ? `<br>สถานที่: ${p.death_place}` : ''; const withdraw = p.withdraw_et==='Yes'?'<span class="badge bg-danger ms-1">Withdraw ET</span>':''; return `<div class="col-md-4 col-sm-6"><div class="card p-3 shadow-sm border-start border-5 border-secondary bg-light" onclick="openEditRegistration('${p.hn}')" style="cursor:pointer;"><div class="d-flex justify-content-between"><div><h5 class="mb-1 fw-bold text-secondary">${icon} ${p.name}</h5><p class="mb-0 text-secondary small">HN: ${p.hn}</p></div><span class="badge bg-danger">Death</span></div><hr class="my-2" style="opacity:0.1"><small class="text-muted"><i class="fas fa-calendar-times"></i> เสียชีวิต: ${dischargeDate} ${deathPlace} ${withdraw}</small></div></div>`; }).join(''); }
function initSlider(){const c=document.getElementById('dateSlider'); if(!c) return; c.innerHTML='';const d=new Date();const th=['อา','จ','อ','พ','พฤ','ศ','ส'];for(let i=0;i<14;i++){const t=new Date(d);t.setDate(d.getDate()+i);const y=t.getFullYear(),m=String(t.getMonth()+1).padStart(2,'0'),day=String(t.getDate()).padStart(2,'0'),s=`${y}-${m}-${day}`;c.innerHTML+=`<div class="date-card ${i===0?'active':''}" onclick="document.querySelectorAll('.date-card').forEach(e=>e.classList.remove('active'));this.classList.add('active');renderApptList('${s}')"><div class="date-day">${th[t.getDay()]}</div><div class="date-num">${t.getDate()}</div></div>`;}const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');renderApptList(`${y}-${m}-${day}`);}
function renderDiseaseType() { const sel = document.getElementById('disease_type'); if(!sel) return; sel.innerHTML = '<option value="">-- เลือกประเภท --</option>'; Object.keys(diseaseData).forEach(k => sel.add(new Option(k, k))); }
function updateDiseaseUI() { const typeEl = document.getElementById('disease_type'); const groupSel = document.getElementById('disease_group'); const subSel = document.getElementById('disease_sub'); const otherInput = document.getElementById('disease_other_container'); if(!typeEl || !groupSel || !subSel || !otherInput) return; const type = typeEl.value; groupSel.innerHTML = '<option value="">-- เลือกกลุ่ม/ตำแหน่ง --</option>'; subSel.innerHTML = '<option value="">-- เลือกโรค/การแพร่กระจาย --</option>'; subSel.parentElement.classList.add('d-none'); otherInput.classList.add('d-none'); if (!type) return; if (type === 'Non-Cancer') { document.getElementById('disease_group_label').innerText = 'กลุ่มโรค'; Object.keys(diseaseData['Non-Cancer']).forEach(k => groupSel.add(new Option(k, k))); } else { document.getElementById('disease_group_label').innerText = 'ตำแหน่งมะเร็ง (Primary)'; diseaseData['Cancer']['Primary'].forEach(k => groupSel.add(new Option(k, k))); document.getElementById('disease_sub_label').innerText = 'การแพร่กระจาย (Metastasis)'; subSel.parentElement.classList.remove('d-none'); diseaseData['Cancer']['Metastasis'].forEach(k => subSel.add(new Option(k, k))); } }
function updateDiseaseSub() { const typeEl = document.getElementById('disease_type'); const groupEl = document.getElementById('disease_group'); const subSel = document.getElementById('disease_sub'); const otherInput = document.getElementById('disease_other_container'); if(!typeEl || !groupEl || !subSel || !otherInput) return; const type = typeEl.value, group = groupEl.value; if (type === 'Non-Cancer') { const subOptions = diseaseData['Non-Cancer'][group]; if (subOptions && subOptions.length > 0) { subSel.parentElement.classList.remove('d-none'); subSel.innerHTML = '<option value="">-- เลือกโรค --</option>'; document.getElementById('disease_sub_label').innerText = 'ระบุโรค'; subOptions.forEach(k => subSel.add(new Option(k, k))); otherInput.classList.add('d-none'); } else { subSel.parentElement.classList.add('d-none'); otherInput.classList.remove('d-none'); document.getElementById('disease_specific').focus(); } } }
function checkDiseaseOther() { const subEl = document.getElementById('disease_sub'); const otherInput = document.getElementById('disease_other_container'); if(!subEl || !otherInput) return; const sub = subEl.value; if (sub.includes('ระบุ')) { otherInput.classList.remove('d-none'); document.getElementById('disease_specific').focus(); } else { otherInput.classList.add('d-none'); } }
function addDisease() { const typeEl = document.getElementById('disease_type'); const groupEl = document.getElementById('disease_group'); const subEl = document.getElementById('disease_sub'); const otherEl = document.getElementById('disease_specific'); if(!typeEl || !groupEl || !subEl || !otherEl) return; const type=typeEl.value, group=groupEl.value, sub=subEl.value, other=otherEl.value; if (!type || !group) return; let txt = ''; if (type === 'Non-Cancer') { if (!document.getElementById('disease_sub').parentElement.classList.contains('d-none')) { if (!sub) return; txt = `${group}: ${sub}`; if (sub.includes('ระบุ') && other) txt += ` (${other})`; } else { txt = `${group}`; if (other) txt += ` (${other})`; } } else { if (!sub) return; txt = `CA ${group}`; if (sub !== 'None') { txt += ` (Meta: ${sub}`; if (sub.includes('ระบุ') && other) txt += ` - ${other}`; txt += `)`; } } currentDiseases.push(txt); renderDiseaseBadges(); document.getElementById('disease_group').value = ''; document.getElementById('disease_sub').value = ''; document.getElementById('disease_specific').value = ''; document.getElementById('disease_sub').parentElement.classList.add('d-none'); document.getElementById('disease_other_container').classList.add('d-none'); }
function renderDiseaseBadges(){const dl = document.getElementById('diseaseList'); if(!dl) return; dl.innerHTML=currentDiseases.map((d,i)=>`<span class="badge bg-secondary m-1 text-wrap text-start" style="line-height:1.4;">${d} <i class="fas fa-times ms-2" style="cursor:pointer;" onclick="currentDiseases.splice(${i},1);renderDiseaseBadges()"></i></span>`).join('');}
function renderESAS() { const container = document.getElementById('esasContainer'); if(!container) return; container.className = 'row g-3'; container.innerHTML = ''; esasTopics.forEach((topic, index) => { const col = document.createElement('div'); col.className = 'col-md-6 col-12'; col.innerHTML = `<div class="esas-card p-3 shadow-sm h-100"><div class="d-flex justify-content-between align-items-center mb-2"><div><h6 class="fw-bold text-dark mb-0" style="font-size: 0.95rem;">${topic}</h6><small class="text-muted" id="text-mood-${index}">ไม่มีอาการ</small></div><div class="score-badge-box bg-success shadow-sm" id="badge-${index}">0</div></div><div class="d-flex align-items-center"><span class="small text-muted me-2">0</span><input type="range" class="form-range esas-range" min="0" max="10" value="0" data-topic="${topic}" oninput="updateESASScore(this, ${index})"><span class="small text-muted ms-2">10</span></div></div>`; container.appendChild(col); }); }
function updateESASScore(el, index) { const val = parseInt(el.value); const badge = document.getElementById(`badge-${index}`); const textMood = document.getElementById(`text-mood-${index}`); if(!badge || !textMood) return; badge.innerText = val; if (val === 0) { badge.className = 'score-badge-box bg-success shadow-sm'; textMood.innerText = 'ไม่มีอาการ 😃'; textMood.className = 'text-success small'; } else if (val >= 1 && val <= 3) { badge.className = 'score-badge-box bg-success shadow-sm'; badge.style.backgroundColor = '#2ECC71'; textMood.innerText = 'เล็กน้อย 🙂'; textMood.className = 'text-success small'; } else if (val >= 4 && val <= 6) { badge.className = 'score-badge-box shadow-sm'; badge.style.backgroundColor = '#F1C40F'; badge.style.color = '#333'; textMood.innerText = 'ปานกลาง 😐'; textMood.className = 'text-warning small fw-bold'; } else if (val >= 7 && val <= 9) { badge.className = 'score-badge-box text-white shadow-sm'; badge.style.backgroundColor = '#E67E22'; textMood.innerText = 'รุนแรง 😣'; textMood.className = 'text-danger small fw-bold'; } else { badge.className = 'score-badge-box bg-danger text-white shadow-sm'; textMood.innerText = 'รุนแรงที่สุด 😫'; textMood.className = 'text-danger small fw-bold'; } }
function formatDateTH(dateStr) { if(!dateStr) return '-'; const isoDate = dateStr.substring(0, 10); const parts = isoDate.split('-'); if (parts.length !== 3) return '-'; const y = parseInt(parts[0]) + 543; return `${parts[2]}/${parts[1]}/${y}`; }
function getTypeClass(type) { if (!type) return ''; const t = type.toLowerCase(); if (t.includes('opd')) return 'card-opd'; if (t.includes('home')) return 'card-home'; if (t.includes('tele')) return 'card-telemed'; if (t.includes('ipd')) return 'card-ipd'; return ''; }

// *** อย่าลืมเอา URL ใหม่จากการ Deploy มาใส่ตรงนี้ ***
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
    "Primary": ["Brain", "Nasopharynx", "Tongue", "Lung", "Breast", "Stomach", "Colon", "Liver", "Cholangiocarcinoma", "Squamous cell carcinoma", "Cervix", "Endometrium", "Uterus", "Kidney", "Prostate", "Gall bladder", "Urinary bladder", "Pancreas", "Bone", "Lymphoma", "Leukemia", "Multiple myeloma", "Peritonium", "Sarcoma", "Unknown primary"],
    "Metastasis": ["None", "Brain", "Lung", "Pleural", "Bone", "Lymph node", "Liver", "Peritoneal", "Skin", "อื่นๆ ระบุ"]
  }
};

// Sort Diseases
Object.keys(diseaseData["Non-Cancer"]).forEach(key => { diseaseData["Non-Cancer"][key].sort((a, b) => a.localeCompare(b, 'th')); });
diseaseData["Cancer"]["Primary"].sort((a, b) => a.localeCompare(b, 'th'));
diseaseData["Cancer"]["Metastasis"].sort((a, b) => a.localeCompare(b, 'th'));

const medList = [
  "Atropine eye drop 1%", "Baclofen (5 mg)", "Celebrex", "Diazepam (2 mg)", "Diazepam (5 mg)", 
  "Diclofenac (25 mg)", "Domperidone (10 mg)", "Etoricoxib", "Fentanyl inj (50 mcg/mL)", 
  "Fentanyl patch (12 mcg/hr)", "Gabapentin (100 mg)", "Gabapentin (300 mg)", "Haloperidol", 
  "Hyoscine Butylbromide (20 mg/mL)", "Kapanol (20)", "Lactulose", "Lorazepam (0.5 mg)", 
  "Metoclopramide (10 mg)", "Midazolam (5 mg/mL)", "Morphine inj (10 mg/5 mL)", 
  "Morphine IR (10 mg)", "Morphine syr (10 mg/5 mL)", "MST (10 mg)", "MST (30 mg)", 
  "Naproxen (250 mg)", "Paracetamol (500 mg)", "Senna (มะขามแขก)", "Tramadol (50 mg)"
].sort((a, b) => a.localeCompare(b, 'th'));

const acpTopics = ["ET tube", "CPR", "Inotrope", "Hemodialysis", "NG tube", "Morphine", "Home death", "Hospital death"];
const esasTopics = ["Pain (ปวด)", "Fatigue (เหนื่อย)", "Nausea (คลื่นไส้)", "Depression (ซึมเศร้า)", "Anxiety (วิตกกังวล)", "Drowsiness (ง่วงซึม)", "Appetite (เบื่ออาหาร)", "Well-being (สบายกายใจ)", "Shortness of breath (เหนื่อยหอบ)"];

let allPatients = [], currentPhones = [], currentDiseases = [], currentMeds = [];
let editingPatient = null; 

document.addEventListener('DOMContentLoaded', () => {
  renderPPS(); renderESAS(); renderACP(); renderMedOptions(); renderDiseaseType(); 
  addPhoneField(); loadData(); showPage('menu');
  
  // *** เรียกใช้ปฏิทินภาษาไทย ***
  initThaiDatepicker();
});

// --- ฟังก์ชันปฏิทินไทย (Flatpickr) ---
function initThaiDatepicker() {
  flatpickr(".date-pk", {
    locale: "th",
    dateFormat: "d/m/Y",
    disableMobile: "true",
    onReady: function(selectedDates, dateStr, instance) {
      const yearInput = instance.currentYearElement;
      if (yearInput) { yearInput.value = parseInt(yearInput.value) + 543; }
    },
    onYearChange: function(selectedDates, dateStr, instance) {
       const yearInput = instance.currentYearElement;
       setTimeout(() => { yearInput.value = parseInt(yearInput.value) + 543; }, 10);
    },
    onValueUpdate: function(selectedDates, dateStr, instance) {
        if(selectedDates[0]) {
            const d = selectedDates[0];
            const day = String(d.getDate()).padStart(2,'0');
            const month = String(d.getMonth()+1).padStart(2,'0');
            const yearBE = d.getFullYear() + 543;
            instance.input.value = `${day}/${month}/${yearBE}`;
            if(instance.input.id === 'dob') calculateAge();
        }
    },
    parseDate: (datestr, format) => {
      if(!datestr) return null;
      const parts = datestr.split('/');
      if(parts.length===3) {
          return new Date(`${parseInt(parts[2])-543}-${parts[1]}-${parts[0]}`);
      }
      return new Date();
    }
  });
}

function loadData() {
  fetch(SCRIPT_URL + '?op=getAll').then(r=>r.json()).then(d=>{ allPatients=d; renderActivePatients(); renderSummary(); }).catch(e=>console.error(e));
}

function calculateAge() {
    const thDate = document.getElementById('dob').value;
    if (!thDate || thDate.length !== 10) { document.getElementById('age_display').value = '-'; return; }
    const parts = thDate.split('/');
    const dob = new Date(`${parseInt(parts[2])-543}-${parts[1]}-${parts[0]}`);
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff); 
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    document.getElementById('age_display').value = age + " ปี";
}

function toggleDeathPlace() {
    const status = document.querySelector('input[name="pt_status"]:checked').value;
    const container = document.getElementById('deathPlaceContainer');
    if (status === 'Death') container.classList.remove('d-none');
    else { container.classList.add('d-none'); document.getElementById('death_place').value = ''; }
}

function updateEditHeader() {
    if(!editingPatient) return;
    document.getElementById('editInfoName').innerText = document.getElementById('fullname').value;
    document.getElementById('editInfoCurrentType').innerText = "Now: " + document.getElementById('admitType').value;
}

// --- Helper แปลงวันที่สำหรับส่ง Google Sheet ---
function dateThToGregorian(thDateStr) {
    if(!thDateStr || thDateStr.length !== 10) return '';
    const parts = thDateStr.split('/');
    if(parts.length !== 3) return '';
    const day = parts[0];
    const month = parts[1];
    const yearAD = parseInt(parts[2]) - 543; 
    return `${yearAD}-${month}-${day}`;
}

function gregorianToDateTh(isoDateStr) {
    if(!isoDateStr) return '';
    const d = new Date(isoDateStr);
    if(isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const yearBE = d.getFullYear() + 543;
    return `${day}/${month}/${yearBE}`;
}

function handleFormSubmit(e) {
  e.preventDefault();
  const hnVal = document.getElementById('hn').value;
  if(hnVal.length < 1) { Swal.fire('Error', 'HN Required', 'warning'); return; }

  const phones=[]; document.querySelectorAll('.phone-input').forEach(el=>{ if(el.value) phones.push({number:el.value, label:el.nextElementSibling.value}); });
  const esas={}; document.querySelectorAll('.esas-range').forEach(el=>esas[el.dataset.topic]=el.value);
  const acp={}; acpTopics.forEach(t=>{ const c=document.querySelector(`input[name="acp_${t}"]:checked`); acp[t]=c?c.value:'Undecided'; });
  acp['maker'] = document.getElementById('acp_maker').value;
  acp['date'] = dateThToGregorian(document.getElementById('acp_date').value); 

  const livingWill = {
      status: document.querySelector('input[name="lw_status"]:checked').value,
      date: dateThToGregorian(document.getElementById('lw_date').value)
  };

  const formData = {
    hn: hnVal,
    name: document.getElementById('fullname').value,
    gender: document.getElementById('gender').value,
    dob: dateThToGregorian(document.getElementById('dob').value),
    admitType: document.getElementById('admitType').value,
    phones: phones,
    address: { 
      house:document.getElementById('addr_house').value, moo:document.getElementById('addr_moo').value, 
      sub:document.getElementById('addr_tumbon').value, dist:document.getElementById('addr_amphoe').value, 
      prov:document.getElementById('addr_province').value, lat:document.getElementById('lat').value, long:document.getElementById('long').value 
    },
    diseases: currentDiseases, meds: currentMeds,
    livingWill: livingWill,
    exam: { 
      pps:document.getElementById('pps_score').value, gcs:document.getElementById('gcs_score').value, 
      vitals:{ bp:document.getElementById('vs_bp').value, pr:document.getElementById('vs_pr').value, rr:document.getElementById('vs_rr').value, o2:document.getElementById('vs_o2').value, bt:parseFloat(document.getElementById('vs_bt').value || 0).toFixed(1) }, 
      esas:esas 
    },
    plan: document.getElementById('nursing_plan').value, acp: acp,
    nextVisitDate: dateThToGregorian(document.getElementById('next_visit_date').value),
    nextVisitType: document.getElementById('next_visit_type').value,
    lab: { 
        cr:document.getElementById('lab_cr').value, 
        egfr:document.getElementById('lab_egfr').value, 
        date: dateThToGregorian(document.getElementById('lab_date').value)
    },
    status: document.querySelector('input[name="pt_status"]:checked').value,
    dischargeDate: dateThToGregorian(document.getElementById('discharge_date').value),
    deathPlace: document.getElementById('death_place').value
  };

  Swal.fire({title:'กำลังบันทึก...', didOpen:()=>Swal.showLoading()});
  fetch(SCRIPT_URL, { method:'POST', body:JSON.stringify(formData) }).then(r=>r.json()).then(res=>{
     if(res.success){ 
       Swal.fire({title:'บันทึกสำเร็จ', icon:'success', timer:1500, showConfirmButton:false});
       resetForm(); loadData(); showPage('menu');
     } else Swal.fire('Error',res.message,'error');
  });
}

function openNewRegistration() {
  resetForm(); 
  editingPatient = null;
  document.getElementById('editInfoBar').classList.add('d-none');
  document.getElementById('formTitle').innerHTML = '<i class="fas fa-user-plus"></i> ลงทะเบียนรายใหม่';
  document.getElementById('btnViewHistory').classList.add('d-none');
  document.getElementById('hn').readOnly = false;
  showPage('register');
}

function openEditRegistration(hn) {
  const p = allPatients.find(x => String(x.hn) === String(hn));
  if(!p) return;
  resetForm(); 
  editingPatient = p;
  
  document.getElementById('editInfoBar').classList.remove('d-none');
  document.getElementById('editInfoName').innerText = p.name;
  document.getElementById('editInfoFirstType').innerText = "First: " + (p.type_admit || '-');
  document.getElementById('editInfoCurrentType').innerText = "Now: " + (p.visit_type || 'OPD');

  document.getElementById('formTitle').innerHTML = `<i class="fas fa-edit"></i> แก้ไขข้อมูล`;
  document.getElementById('btnViewHistory').classList.remove('d-none');
  
  const linkMap = document.getElementById('linkMap');
  if(p.address && p.address.lat) { linkMap.classList.remove('d-none'); linkMap.onclick = () => window.open(`http://maps.google.com/?q=${p.address.lat},${p.address.long}`, '_blank'); updateMapBtnStatus(true); }
  
  document.getElementById('hn').value = p.hn; document.getElementById('hn').readOnly = true;
  document.getElementById('fullname').value = p.name;
  document.getElementById('gender').value = p.gender;
  
  // แปลง ISO Date -> Thai Date สำหรับแสดงผล
  document.getElementById('dob').value = gregorianToDateTh(p.dob); calculateAge();
  
  document.getElementById('admitType').value = p.type_admit; 
  if(p.address) {
     ['house','moo','tumbon','amphoe','province','lat','long'].forEach(k=>{
        const key = (k==='tumbon')?'sub':(k==='amphoe')?'dist':(k==='province')?'prov':k;
        if(document.getElementById('addr_'+k)) document.getElementById('addr_'+k).value = p.address[key]||'';
        else document.getElementById(k).value = p.address[key]||'';
     });
  }
  document.getElementById('phoneContainer').innerHTML=''; (p.phones||[]).forEach(ph=>addPhoneField(ph.number, ph.label)); if(!(p.phones||[]).length) addPhoneField();
  currentDiseases = p.diseases||[]; renderDiseaseBadges();
  currentMeds = p.meds||[]; renderMedsList();
  
  if(p.livingWill) {
      if(p.livingWill.status === 'Made') document.getElementById('lw_made').checked = true;
      else document.getElementById('lw_not').checked = true;
      document.getElementById('lw_date').value = gregorianToDateTh(p.livingWill.date);
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
      document.getElementById('deathPlaceContainer').classList.remove('d-none');
      document.getElementById('death_place').value = p.death_place || '';
  }
  
  document.getElementById('next_visit_date').value = gregorianToDateTh(p.next_visit_date);
  document.getElementById('discharge_date').value = gregorianToDateTh(p.discharge_date);
  if(p.lab) document.getElementById('lab_date').value = gregorianToDateTh(p.lab.date);

  showPage('register');
  updateEditHeader();
}

// *** แก้ไขฟังก์ชันดูประวัติ (ให้ Modal ทำงานถูกต้อง) ***
function showHistoryModal() {
  const hn = document.getElementById('hn').value;
  const name = document.getElementById('fullname').value;
  
  if(!hn) { Swal.fire('แจ้งเตือน', 'กรุณากรอก HN หรือเลือกผู้ป่วยก่อนดูประวัติ', 'warning'); return; }

  const historyModalEl = document.getElementById('historyModal');
  const modal = new bootstrap.Modal(historyModalEl);
  
  document.getElementById('historyPatientName').innerText = name;
  document.getElementById('historyLoading').classList.remove('d-none');
  document.getElementById('historyContent').classList.add('d-none');
  
  modal.show(); // แสดง Modal

  const lat=document.getElementById('lat').value, long=document.getElementById('long').value, btnMap=document.getElementById('btnMapHistory');
  if(lat&&long) { 
      btnMap.classList.remove('d-none'); 
      btnMap.onclick=()=>window.open(`http://maps.google.com/?q=${lat},${long}`,'_blank'); 
  } else {
      btnMap.classList.add('d-none');
  }

  fetch(SCRIPT_URL + '?op=getHistory&hn=' + hn)
    .then(r=>r.json())
    .then(d=>{ 
         renderHistoryItems(d); 
         document.getElementById('historyLoading').classList.add('d-none'); 
         document.getElementById('historyContent').classList.remove('d-none'); 
    })
    .catch(err => {
        document.getElementById('historyLoading').innerHTML = '<span class="text-danger">เกิดข้อผิดพลาดในการดึงข้อมูล</span>';
    });
}

function resetForm() {
  document.getElementById('mainForm').reset();
  currentMeds=[]; currentDiseases=[]; renderMedsList(); renderDiseaseBadges();
  document.getElementById('phoneContainer').innerHTML=''; addPhoneField();
  updateMapBtnStatus(false);
  document.querySelectorAll('input[type=checkbox], input[type=radio]').forEach(el => el.checked = false);
  document.querySelector('input[name="pt_status"][value="Alive"]').checked = true;
  document.getElementById('lw_not').checked = true; 
  toggleDeathPlace(); 
  document.getElementById('age_display').value = '-';
  document.querySelectorAll('.esas-range').forEach(el => { el.value = 0; }); renderESAS(); 
  updateDiseaseUI();
  
  // ล้างค่าวันที่ใน Flatpickr ด้วย
  document.querySelectorAll('.date-pk').forEach(el => {
      if(el._flatpickr) el._flatpickr.clear();
  });
}

function renderHistoryItems(list) {
  const c = document.getElementById('historyContent');
  if(!list.length) { c.innerHTML='<div class="alert alert-warning">ไม่พบประวัติ</div>'; return; }
  c.innerHTML = list.map(h => {
     const d = formatDateTH(h.date);
     const ppsDisplay = (h.pps!==''&&h.pps!==null&&h.pps!==undefined)?`${h.pps}%`:'ไม่ระบุ';
     let labHtml = ''; if(h.lab_cr||h.lab_egfr) { const ld = h.lab_date ? `<br><span class="text-muted small">วันที่ Lab: ${formatDateTH(h.lab_date)}</span>` : ''; labHtml = `<div class="alert alert-light border p-2 mb-2 small"><i class="fas fa-flask text-danger"></i> <b>Lab:</b> Cr:${h.lab_cr||'-'} eGFR:${h.lab_egfr||'-'} ${ld}</div>`; }
     let medHtml = (h.meds&&h.meds.length) ? '<ul class="mb-0 ps-3 small text-muted">'+h.meds.map(m=>`<li>${m.name}</li>`).join('')+'</ul>' : '-';
     let acpHtml = '';
     if(h.livingWill && h.livingWill.status === 'Made') {
         acpHtml += `<div class="mb-1 small text-success"><i class="fas fa-file-contract"></i> <b>Living Will:</b> ทำแล้ว (${formatDateTH(h.livingWill.date)})</div>`;
     }
     if(h.acp && (Object.keys(h.acp).length > 2 || h.acp.maker)) { 
         acpHtml += `<div class="small bg-light p-2 rounded border"><i class="fas fa-file-signature"></i> <b>ACP:</b> `; 
         if(h.acp.maker) acpHtml += `<div>ผู้ทำ: ${h.acp.maker} (${formatDateTH(h.acp.date)})</div>`; 
         Object.entries(h.acp).forEach(([k,v])=>{ if(k!=='maker' && k!=='date' && v!=='Undecided') acpHtml += `<span class="me-2 d-inline-block">• ${k}: <u>${v}</u></span>`; }); 
         acpHtml += `</div>`; 
     }
     let esasHtml = ''; if(h.esas) Object.entries(h.esas).forEach(([k,v])=>{if(v>0)esasHtml+=`<span class="badge bg-warning text-dark me-1 border">${k}:${v}</span>`;});
     const v = h.vitals||{};
     return `<div class="card mb-3 shadow-sm history-card"><div class="card-header bg-white d-flex justify-content-between"><span class="history-date fw-bold">${d}</span><span class="badge bg-light text-dark border">PPS: ${ppsDisplay}</span></div><div class="card-body">${labHtml}<div class="mb-2">${esasHtml}</div><div class="row"><div class="col-6 border-end"><p class="mb-1 small"><b>Vitals:</b> BP:${v.bp||'-'} P:${v.pr||'-'} RR:${v.rr||'-'} O2:${v.o2||'-'} T:${v.bt||'-'}</p><p class="mb-1 small"><b>GCS:</b> ${h.gcs||'-'}</p><p class="mb-1 small"><b>Plan:</b> ${h.plan||'-'}</p></div><div class="col-6"><p class="mb-1 small fw-bold text-success">ยา:</p>${medHtml}</div><div class="col-12 mt-2 border-top pt-2">${acpHtml}</div></div></div></div>`;
  }).join('');
}

function showPage(pid) { document.querySelectorAll('.page-section').forEach(e=>e.classList.add('d-none')); document.getElementById('page-'+pid).classList.remove('d-none'); document.querySelectorAll('.nav-link').forEach(e=>e.classList.remove('active')); const links = document.querySelectorAll('.nav-link'); links.forEach(l => { if(l.getAttribute('onclick').includes(`'${pid}'`)) l.classList.add('active'); }); if(pid==='appoint') initSlider(); }
function updateMapBtnStatus(has) { const b=document.getElementById('btnGeo'); if(has){b.className='btn btn-sm btn-success text-white ms-2'; b.innerHTML='<i class="fas fa-check-circle"></i> บันทึกแล้ว';}else{b.className='btn btn-sm btn-info text-white ms-2'; b.innerHTML='<i class="fas fa-map-marker-alt"></i> ปักหมุดปัจจุบัน';} }
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
function renderDeceasedPatients() { const list = allPatients.filter(p => p.status !== 'Alive'); const container = document.getElementById('deathPatientList'); if (list.length === 0) { container.innerHTML = '<div class="col-12 text-center text-muted mt-5">ไม่มีข้อมูลผู้เสียชีวิต</div>'; return; } container.innerHTML = list.map(p => { const icon = p.gender === 'Male' ? '<i class="fas fa-mars"></i>' : (p.gender === 'Female' ? '<i class="fas fa-venus"></i>' : ''); const dischargeDate = p.discharge_date ? formatDateTH(p.discharge_date) : '-'; const deathPlace = p.death_place ? `<br>สถานที่: ${p.death_place}` : ''; return `<div class="col-md-4 col-sm-6"><div class="card p-3 shadow-sm border-start border-5 border-secondary bg-light" onclick="openEditRegistration('${p.hn}')" style="cursor:pointer;"><div class="d-flex justify-content-between"><div><h5 class="mb-1 fw-bold text-secondary">${icon} ${p.name}</h5><p class="mb-0 text-secondary small">HN: ${p.hn}</p></div><span class="badge bg-danger">Death</span></div><hr class="my-2" style="opacity:0.1"><small class="text-muted"><i class="fas fa-calendar-times"></i> เสียชีวิต: ${dischargeDate} ${deathPlace}</small></div></div>`; }).join(''); }
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

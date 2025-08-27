
// Work-timer v8 UI: colorful friendly UX, no edit feature, filtered premiums
let entries = JSON.parse(localStorage.getItem('entries') || '[]');
let hourlyRate = parseFloat(localStorage.getItem('hourlyRate') || '0');
let onAccount = parseFloat(localStorage.getItem('onAccount') || '0');

// current month shown (value as "YYYY-MM")
let now = new Date();
let currentMonthVal = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

window.addEventListener('load', () => {
  populateTimeOptions();
  document.getElementById('date').valueAsDate = new Date();
  document.getElementById('rate').value = hourlyRate || '';
  document.getElementById('toAccount').value = onAccount || '';
  updateMonthSelect();
  render();
});

function populateTimeOptions(){
  let start = document.getElementById('start');
  let end = document.getElementById('end');
  start.innerHTML=''; end.innerHTML='';
  for(let h=0;h<24;h++){
    for(let m of [0,30]){
      let v = `${String(h).padStart(2,'0')}:${m===0?'00':'30'}`;
      let o1 = document.createElement('option'); o1.value=v; o1.text=v; start.appendChild(o1);
      let o2 = document.createElement('option'); o2.value=v; o2.text=v; end.appendChild(o2);
    }
  }
  document.getElementById('start').value = '07:00';
  // default end = nearest half hour forward
  let d = new Date();
  let mins = d.getMinutes();
  let rounded = mins < 30 ? 30 : 0;
  let hour = mins < 30 ? d.getHours() : d.getHours()+1;
  if(hour === 24) hour = 23, rounded = 30;
  document.getElementById('end').value = `${String(hour).padStart(2,'0')}:${rounded===0?'00':'30'}`;
}

function saveSettings(){
  hourlyRate = parseFloat(document.getElementById('rate').value) || 0;
  onAccount = parseFloat(document.getElementById('toAccount').value) || 0;
  localStorage.setItem('hourlyRate', hourlyRate);
  localStorage.setItem('onAccount', onAccount);
  render();
  toast('Zapisano ustawienia');
}

function updateMonthSelect(){
  const sel = document.getElementById('monthSelect');
  const months = new Set(entries.map(e => e.date.slice(0,7)));
  months.add(currentMonthVal);
  let arr = Array.from(months).sort((a,b)=> b.localeCompare(a));
  sel.innerHTML = '';
  arr.forEach(m => {
    let opt = document.createElement('option');
    opt.value = m;
    let [y,mon] = m.split('-').map(Number);
    let label = new Date(y, mon-1, 1).toLocaleDateString('pl-PL', {month:'long', year:'numeric'});
    opt.text = label;
    sel.appendChild(opt);
  });
  let currentSel = localStorage.getItem('selectedMonth') || currentMonthVal;
  if(!arr.includes(currentSel)) currentSel = arr[0];
  sel.value = currentSel;
  localStorage.setItem('selectedMonth', sel.value);
}

function onMonthChange(){
  const sel = document.getElementById('monthSelect');
  localStorage.setItem('selectedMonth', sel.value);
  render();
}

function addEntry(){
  const date = document.getElementById('date').value;
  const start = document.getElementById('start').value;
  const end = document.getElementById('end').value;
  const note = document.getElementById('note').value;
  const bonus = parseFloat(document.getElementById('bonus').value) || 0;
  if(!date || !start || !end){ toast('Uzupełnij datę i godziny'); return; }
  const hours = calculateHours(start,end);
  entries.push({
    id: Date.now() + Math.floor(Math.random()*1000),
    date, start, end, note, bonus, hours
  });
  localStorage.setItem('entries', JSON.stringify(entries));
  updateMonthSelect();
  render();
  resetForm();
  toast('Dodano wpis');
}

function calculateHours(start,end){
  let [sh,sm] = start.split(':').map(Number);
  let [eh,em] = end.split(':').map(Number);
  let startM = sh*60+sm;
  let endM = eh*60+em;
  if(endM < startM) endM += 24*60;
  return +( (endM-startM) / 60 ).toFixed(2);
}

function deleteEntry(id){
  if(!confirm('Usuń wpis?')) return;
  entries = entries.filter(en => en.id !== id);
  localStorage.setItem('entries', JSON.stringify(entries));
  updateMonthSelect();
  render();
  toast('Usunięto wpis');
}

function resetForm(){
  document.getElementById('date').valueAsDate = new Date();
  document.getElementById('start').value = '07:00';
  let d = new Date();
  let mins = d.getMinutes();
  let rounded = mins < 30 ? 30 : 0;
  let hour = mins < 30 ? d.getHours() : d.getHours()+1;
  if(hour === 24) hour = 23, rounded = 30;
  document.getElementById('end').value = `${String(hour).padStart(2,'0')}:${rounded===0?'00':'30'}`;
  document.getElementById('note').value = '';
  document.getElementById('bonus').value = '';
}

function render(){
  const sel = document.getElementById('monthSelect');
  if(sel.options.length === 0) updateMonthSelect();
  const selected = sel.value || localStorage.getItem('selectedMonth') || currentMonthVal;
  localStorage.setItem('selectedMonth', selected);

  const [sy, sm] = selected.split('-').map(Number);
  const monthLabel = new Date(sy, sm-1, 1).toLocaleDateString('pl-PL', {month:'long', year:'numeric'});
  document.getElementById('monthTitle').textContent = `Podsumowanie: ${monthLabel}`;

  const monthEntries = entries.filter(e => e.date.slice(0,7) === selected)
                             .sort((a,b) => new Date(a.date) - new Date(b.date));

  const tbody = document.querySelector('#entriesTable tbody');
  tbody.innerHTML = '';
  monthEntries.forEach(e => {
    const tr = document.createElement('tr');
    const d = new Date(e.date);
    const dayLabel = d.toLocaleDateString('pl-PL', {weekday:'short', day:'numeric'});
    tr.innerHTML = `
      <td>${dayLabel}</td>
      <td>${e.start} - ${e.end}</td>
      <td>${e.hours.toFixed(2)}</td>
      <td>${e.note || ''}</td>
      <td>${(e.bonus||0).toFixed(2)}</td>
      <td class="row-actions">
        <button title="Usuń" onclick="deleteEntry(${e.id})">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  });

  const totalHours = monthEntries.reduce((s,e)=>s+e.hours,0);
  const totalBonus = monthEntries.reduce((s,e)=>s+(e.bonus||0),0);

  const workDays = getWorkingDays(sy, sm-1);
  const nominalHours = workDays * 8 + 10;
  const overtime = Math.max(0, totalHours - nominalHours);
  const baseHours = Math.min(totalHours, nominalHours);
  const basePay = baseHours * (hourlyRate || 0);
  const overtimePay = overtime * (hourlyRate || 0) * 1.5;
  const totalPay = basePay + overtimePay + totalBonus;
  const payout = totalPay - (onAccount || 0);

  document.getElementById('nominalInfo').textContent = `${workDays} dni roboczych • nominalnie ${nominalHours} h`;

  // show only non-zero premiums in the details
  const bonusItems = monthEntries.filter(x => x.bonus && x.bonus > 0);
  let bonusHtml = '';
  if(bonusItems.length > 0){
    bonusHtml = `<details style="margin-top:8px;"><summary>Premie: ${totalBonus.toFixed(2)} PLN</summary><ul>${bonusItems.map(e=>`<li>${(e.note||'-')}: ${(e.bonus||0).toFixed(2)} PLN</li>`).join('')}</ul></details>`;
  } else {
    bonusHtml = `<div style="margin-top:8px;">Premie: 0.00 PLN</div>`;
  }

  document.getElementById('summary').innerHTML = `
    <div class="summary-item"><span>Przepracowane godziny</span><strong>${totalHours.toFixed(2)} h</strong></div>
    <div class="summary-item"><span>Godziny w podstawie</span><strong>${baseHours.toFixed(2)} h</strong></div>
    <div class="summary-item"><span>Nadgodziny</span><strong>${overtime.toFixed(2)} h</strong></div>
    <div class="summary-item"><span>Kwota za podstawę</span><strong>${basePay.toFixed(2)} PLN</strong></div>
    <div class="summary-item"><span>Kwota za nadgodziny</span><strong>${overtimePay.toFixed(2)} PLN</strong></div>
    ${bonusHtml}
    <div class="summary-item"><span>Na konto</span><strong>${(onAccount||0).toFixed(2)} PLN</strong></div>
    <div class="summary-total">Razem do wypłaty: <span style="float:right">${payout.toFixed(2)} PLN</span></div>`;
}

function getWorkingDays(year, monthIndex){
  let d = new Date(year, monthIndex, 1);
  let count = 0;
  while(d.getMonth() === monthIndex){
    let day = d.getDay();
    if(day !== 0 && day !== 6) count++;
    d.setDate(d.getDate()+1);
  }
  return count;
}

// simple helpers
function toggleTheme(){ toast('Motyw zmieniony (placeholder)'); }
function toast(msg){ const el = document.createElement('div'); el.textContent = msg; el.style.position='fixed'; el.style.bottom='18px'; el.style.left='50%'; el.style.transform='translateX(-50%)'; el.style.background='rgba(0,0,0,0.6)'; el.style.color='white'; el.style.padding='10px 14px'; el.style.borderRadius='10px'; document.body.appendChild(el); setTimeout(()=>el.remove(),1800); }
function exportCSV(){
  let rows = [['date','start','end','hours','note','bonus']];
  entries.forEach(e=> rows.push([e.date,e.start,e.end,e.hours,e.note,(e.bonus||0).toFixed(2)]));
  const csv = rows.map(r=> r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='work-timer.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function clearAll(){ if(confirm('Wyczyścić wszystkie wpisy?')){ entries=[]; localStorage.removeItem('entries'); updateMonthSelect(); render(); } }

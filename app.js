
let entries = JSON.parse(localStorage.getItem('entries') || '[]');
let hourlyRate = parseFloat(localStorage.getItem('hourlyRate') || '0');
let onAccount = parseFloat(localStorage.getItem('onAccount') || '0');
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
      start.appendChild(new Option(v,v));
      end.appendChild(new Option(v,v));
    }
  }
  document.getElementById('start').value='07:00';
  let d=new Date(), mins=d.getMinutes(), rounded=mins<30?30:0, hour=mins<30?d.getHours():d.getHours()+1;
  if(hour===24) hour=23, rounded=30;
  document.getElementById('end').value=`${String(hour).padStart(2,'0')}:${rounded===0?'00':'30'}`;
}

function saveSettings(){
  hourlyRate=parseFloat(document.getElementById('rate').value)||0;
  onAccount=parseFloat(document.getElementById('toAccount').value)||0;
  localStorage.setItem('hourlyRate',hourlyRate);
  localStorage.setItem('onAccount',onAccount);
  render();
}

function updateMonthSelect(){
  const sel=document.getElementById('monthSelect');
  const months=new Set(entries.map(e=>e.date.slice(0,7)));
  months.add(currentMonthVal);
  let arr=Array.from(months).sort((a,b)=> b.localeCompare(a));
  sel.innerHTML='';
  arr.forEach(m=>{
    let opt=document.createElement('option');
    opt.value=m;
    let [y,mon]=m.split('-').map(Number);
    opt.text=new Date(y,mon-1,1).toLocaleDateString('pl-PL',{month:'long',year:'numeric'});
    sel.appendChild(opt);
  });
  let currentSel=localStorage.getItem('selectedMonth')||currentMonthVal;
  if(!arr.includes(currentSel)) currentSel=arr[0];
  sel.value=currentSel;
  localStorage.setItem('selectedMonth',sel.value);
}

function onMonthChange(){ localStorage.setItem('selectedMonth',document.getElementById('monthSelect').value); render(); }

function addEntry(){
  const date=document.getElementById('date').value;
  const start=document.getElementById('start').value;
  const end=document.getElementById('end').value;
  const note=document.getElementById('note').value;
  const bonus=parseFloat(document.getElementById('bonus').value)||0;
  if(!date||!start||!end) return;
  const hours=calculateHours(start,end);
  entries.push({id:Date.now()+Math.floor(Math.random()*1000), date, start, end, note, bonus, hours});
  localStorage.setItem('entries',JSON.stringify(entries));
  updateMonthSelect();
  render();
  resetForm();
}

function calculateHours(start,end){
  let [sh,sm]=start.split(':').map(Number);
  let [eh,em]=end.split(':').map(Number);
  let startM=sh*60+sm, endM=eh*60+em;
  if(endM<startM) endM+=24*60;
  return +((endM-startM)/60).toFixed(2);
}

function deleteEntry(id){ if(!confirm('Usuń wpis?'))return; entries=entries.filter(e=>e.id!==id); localStorage.setItem('entries',JSON.stringify(entries)); updateMonthSelect(); render(); }

function resetForm(){
  document.getElementById('date').valueAsDate=new Date();
  document.getElementById('start').value='07:00';
  let d=new Date(), mins=d.getMinutes(), rounded=mins<30?30:0, hour=mins<30?d.getHours():d.getHours()+1;
  if(hour===24) hour=23, rounded=30;
  document.getElementById('end').value=`${String(hour).padStart(2,'0')}:${rounded===0?'00':'30'}`;
  document.getElementById('note').value='';
  document.getElementById('bonus').value='';
}

function render(){
  const sel=document.getElementById('monthSelect');
  if(sel.options.length===0) updateMonthSelect();
  const selected=sel.value||localStorage.getItem('selectedMonth')||currentMonthVal;
  localStorage.setItem('selectedMonth',selected);
  const [sy,sm]=selected.split('-').map(Number);
  document.getElementById('monthTitle').textContent=`Podsumowanie: ${new Date(sy,sm-1,1).toLocaleDateString('pl-PL',{month:'long',year:'numeric'})}`;

  const monthEntries=entries.filter(e=>e.date.slice(0,7)===selected).sort((a,b)=>new Date(a.date)-new Date(b.date));

  const tbody=document.querySelector('#entriesTable tbody');
  tbody.innerHTML='';
  monthEntries.forEach(e=>{
    const tr=document.createElement('tr');
    const d=new Date(e.date);
    const dayLabel=d.toLocaleDateString('pl-PL',{weekday:'short',day:'numeric'});
    tr.innerHTML=`
      <td>${dayLabel}</td>
      <td>${e.start} - ${e.end}</td>
      <td>${e.hours.toFixed(2)}</td>
      <td>${e.note||''}</td>
      <td>${e.bonus>0?e.bonus.toFixed(2):''}</td>
      <td class="row-actions">
        <button title="Usuń" onclick="deleteEntry(${e.id})">❌</button>
      </td>`;
    tbody.appendChild(tr);
  });

  const totalHours=monthEntries.reduce((s,e)=>s+e.hours,0);
  const totalBonus=monthEntries.reduce((s,e)=>s+(e.bonus||0),0);
  const workDays=getWorkingDays(sy,sm-1);
  const nominalHours=workDays*8+10;
  const overtime=Math.max(0,totalHours-nominalHours);
  const baseHours=Math.min(totalHours,nominalHours);
  const basePay=baseHours*(hourlyRate||0);
  const overtimePay=overtime*(hourlyRate||0)*1.5;
  const totalPay=basePay+overtimePay+totalBonus;
  const payout=totalPay-(onAccount||0);
  document.getElementById('nominalInfo').textContent=`${workDays} dni roboczych • nominalnie ${nominalHours} h`;

  const bonusItems=monthEntries.filter(x=>x.bonus>0);
  let bonusHtml='';
  if(bonusItems.length>0){
    bonusHtml=`<details style="margin-top:8px;"><summary>Premie: ${totalBonus.toFixed(2)} PLN</summary><ul>${bonusItems.map(e=>`<li>${(e.note||'-')}: ${(e.bonus||0).toFixed(2)} PLN</li>`).join('')}</ul></details>`;
  } else { bonusHtml=`<div style="margin-top:8px;">Premie: 0.00 PLN</div>`; }

  document.getElementById('summary').innerHTML=`
    <div style="margin-top:8px; display:flex; justify-content:space-between"><span>Przepracowane godziny</span><strong>${totalHours.toFixed(2)} h</strong></div>
    <div style="display:flex; justify-content:space-between"><span>Godziny w podstawie</span><strong>${baseHours.toFixed(2)} h</strong></div>
    <div style="display:flex; justify-content:space-between"><span>Nadgodziny</span><strong>${overtime.toFixed(2)} h</strong></div>
    <div style="display:flex; justify-content:space-between"><span>Kwota za podstawę</span><strong>${basePay.toFixed(2)} PLN</strong></div>
    <div style="display:flex; justify-content:space-between"><span>Kwota za nadgodziny</span><strong>${overtimePay.toFixed(2)} PLN</strong></div>
    ${bonusHtml}
    <div style="display:flex; justify-content:space-between"><span>Na konto</span><strong>${(onAccount||0).toFixed(2)} PLN</strong></div>
    <div style="margin-top:6px; font-weight:700; font-size:18px; display:flex; justify-content:space-between">Razem do wypłaty: <span>${payout.toFixed(2)} PLN</span></div>`;
}

function getWorkingDays(year,monthIndex){let d=new Date(year,monthIndex,1),count=0;while(d.getMonth()===monthIndex){let day=d.getDay();if(day!==0&&day!==6)count++;d.setDate(d.getDate()+1);}return count;}

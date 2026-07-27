
let DATA=null;
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const state={selectedDay:0};
const favorites=()=>JSON.parse(localStorage.getItem("favorites")||"[]");
const saveFavorites=x=>{localStorage.setItem("favorites",JSON.stringify(x));DriveSync.scheduleSave();};
const mapsLink=q=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q);


const expenses=()=>JSON.parse(localStorage.getItem("expenses")||"[]");
const saveExpenses=x=>{localStorage.setItem("expenses",JSON.stringify(x));DriveSync.scheduleSave();};
const normalizeCurrency=c=>c==="ILS"?"ILS":"EUR";
const money=(n,currency="EUR")=>new Intl.NumberFormat("he-IL",{style:"currency",currency:normalizeCurrency(currency)}).format(Number(n||0));
function safeText(s){const d=document.createElement("div");d.textContent=s||"";return d.innerHTML}
function renderExpenses(){
  const list=expenses()
    .map(x=>({...x,currency:normalizeCurrency(x.currency)}))
    .sort((a,b)=>b.date.localeCompare(a.date));

  const totals={EUR:0,ILS:0};
  list.forEach(x=>totals[x.currency]+=Number(x.amount||0));
  $("#expenseTotalEUR").textContent=money(totals.EUR,"EUR");
  $("#expenseTotalILS").textContent=money(totals.ILS,"ILS");

  const grouped={};
  list.forEach(x=>{
    const key=`${x.category}|${x.currency}`;
    grouped[key]=(grouped[key]||0)+Number(x.amount||0);
  });
  $("#expenseByCategory").innerHTML=Object.entries(grouped)
    .sort((a,b)=>b[1]-a[1])
    .map(([key,sum])=>{
      const [cat,currency]=key.split("|");
      return `<span class="category-chip">${safeText(cat)}: ${money(sum,currency)}</span>`;
    }).join("")||'<span class="muted">עדיין לא נרשמו הוצאות</span>';

  $("#expensesList").innerHTML=list.length?list.map(x=>`
    <article class="expense-row">
      <div>
        <h4>${safeText(x.category)}${x.note?` · ${safeText(x.note)}`:""}</h4>
        <div class="expense-meta">${formatDate(x.date)} · ${x.currency==="ILS"?"שקל":"אירו"}</div>
        <div class="expense-actions"><button class="delete-expense" onclick="deleteExpense('${x.id}')">מחק</button></div>
      </div>
      <div class="expense-amount">${money(x.amount,x.currency)}</div>
    </article>`).join(""):'<div class="empty">עדיין לא הוספתם הוצאות</div>';
}
window.deleteExpense=id=>{saveExpenses(expenses().filter(x=>x.id!==id));renderExpenses()}
function setupExpenses(){
  $("#expenseDate").value=new Date().toISOString().slice(0,10);
  $("#expenseForm").onsubmit=e=>{
    e.preventDefault();
    const item={
      id:String(Date.now()),
      amount:Number($("#expenseAmount").value),
      currency:normalizeCurrency($("#expenseCurrency").value),
      category:$("#expenseCategory").value,
      date:$("#expenseDate").value,
      note:$("#expenseNote").value.trim()
    };
    const selectedCurrency=item.currency;
    const list=expenses();
    list.push(item);
    saveExpenses(list);
    e.target.reset();
    $("#expenseDate").value=new Date().toISOString().slice(0,10);
    $("#expenseCurrency").value=selectedCurrency;
    renderExpenses();
  };
  $("#clearExpenses").onclick=()=>{if(confirm("למחוק את כל ההוצאות שנרשמו?")){localStorage.removeItem("expenses");renderExpenses();DriveSync.scheduleSave();}};
}


const tasks=()=>JSON.parse(localStorage.getItem("tripTasks")||"[]");
const saveTasks=x=>{localStorage.setItem("tripTasks",JSON.stringify(x));DriveSync.scheduleSave();};
let taskFilter="all";
function renderTasks(){
  const all=tasks().map(t=>({...t,done:Boolean(t.done)}));
  const done=all.filter(t=>t.done).length;
  if($("#tasksProgress")) $("#tasksProgress").textContent=`${done}/${all.length}`;
  const visible=all.filter(t=>taskFilter==="all"||(taskFilter==="done"?t.done:!t.done)).sort((a,b)=>Number(a.done)-Number(b.done)||(a.dueDate||"9999").localeCompare(b.dueDate||"9999"));
  $("#tasksList").innerHTML=visible.length?visible.map(t=>`<article class="task-row ${t.done?"done":""}"><label class="task-check"><input type="checkbox" ${t.done?"checked":""} onchange="toggleTask('${t.id}',this.checked)"><span>✓</span></label><div class="task-content"><h4>${safeText(t.title)}</h4><div class="task-meta">${t.dueDate?`📅 ${formatDate(t.dueDate)}`:""}${t.owner?` · 👤 ${safeText(t.owner)}`:""}</div>${t.note?`<p>${safeText(t.note)}</p>`:""}</div><button class="task-delete" onclick="deleteTask('${t.id}')">🗑️</button></article>`).join(""):'<div class="empty">אין משימות להצגה</div>';
}
window.toggleTask=(id,done)=>{saveTasks(tasks().map(t=>t.id===id?{...t,done}:t));renderTasks();};
window.deleteTask=id=>{saveTasks(tasks().filter(t=>t.id!==id));renderTasks();};
function setupTasks(){
  $("#taskForm").onsubmit=e=>{e.preventDefault();const item={id:String(Date.now()),title:$("#taskTitle").value.trim(),dueDate:$("#taskDueDate").value,owner:$("#taskOwner").value.trim(),note:$("#taskNote").value.trim(),done:false};if(!item.title)return;const l=tasks();l.push(item);saveTasks(l);e.target.reset();renderTasks();};
  $$(".task-filter").forEach(b=>b.onclick=()=>{$$(".task-filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");taskFilter=b.dataset.taskFilter;renderTasks();});
  $("#clearCompletedTasks").onclick=()=>{if(confirm("למחוק את כל המשימות שהושלמו?")){saveTasks(tasks().filter(t=>!t.done));renderTasks();}};
}

async function init(){
  DATA=await fetch("data.json").then(r=>r.json());
  renderHome(); renderDays(); renderHotels(); renderFood(); renderChecklist(); renderEmergency(); renderFavorites(); renderExpenses(); renderTasks();
  bindNav();
  if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
  $("#themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("dark",document.body.classList.contains("dark"))};
  if(localStorage.getItem("dark")==="true") document.body.classList.add("dark");
  setupExpenses();
  setupTasks();
  DriveSync.init();
}
function showView(id){
  $$(".view").forEach(v=>v.classList.remove("active")); $("#"+id).classList.add("active");
  $$(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===id));
  window.scrollTo(0,0);
}
function bindNav(){
  $$("[data-view]").forEach(b=>b.onclick=()=>showView(b.dataset.view));
  $$(".back").forEach(b=>b.onclick=()=>showView("homeView"));
  $("#openToday").onclick=()=>openDay(currentDayIndex());
}
function currentDayIndex(){
  const today=new Date().toISOString().slice(0,10);
  let i=DATA.days.findIndex(d=>d.date===today);
  if(i<0){ i=today<DATA.days[0].date?0:DATA.days.length-1; }
  return i;
}
function renderHome(){
  const idx=currentDayIndex(), d=DATA.days[idx];
  $("#todayTitle").textContent=d.day+" · "+formatDate(d.date);
  $("#todayPreview").innerHTML=d.events.slice(0,3).map(e=>`<p><b>${e.time}</b> · ${e.title}</p>`).join("");
  const now=new Date(), start=new Date(DATA.days[0].date+"T00:00:00"), end=new Date(DATA.days.at(-1).date+"T23:59:00");
  let msg="";
  if(now<start) msg=`עוד ${Math.ceil((start-now)/86400000)} ימים לטיול`;
  else if(now<=end) msg=`יום ${idx+1} מתוך ${DATA.days.length}`;
  else msg="הטיול הסתיים – הזיכרונות נשארים";
  $("#countdown").textContent=msg;
}

function stars(n=0){return "★".repeat(Math.max(0,Math.min(5,n)))+"☆".repeat(Math.max(0,5-Math.min(5,n)))}
function ratingRows(r={}){
  return `<div class="rating-grid">
    <div><span>שווה להשקיע</span><b>${stars(r.worth||0)}</b></div>
    <div><span>פוטוגני</span><b>${stars(r.photo||0)}</b></div>
    <div><span>מתאים למשפחה</span><b>${stars(r.family||0)}</b></div>
  </div>`;
}
function chips(items=[]){return items.map(x=>`<span class="day-chip">${safeText(x)}</span>`).join("")}
function listBlock(title,items=[],icon="•"){
  if(!items?.length) return "";
  return `<details class="detail-panel"><summary>${title}</summary><ul>${items.map(x=>`<li>${icon} ${safeText(x)}</li>`).join("")}</ul></details>`;
}
function renderDays(){
  $("#daysList").innerHTML=DATA.days.map((d,i)=>`<article class="card day-card overview-day" onclick="openDay(${i})">
    <div class="date-row">
      <div>
        <span class="muted">${d.day} · ${formatDate(d.date)}</span>
        <h3>${d.title}</h3>
        <div class="region">${d.region}</div>
      </div>
      <span class="day-arrow">←</span>
    </div>
    <p class="day-summary">${safeText(d.summary||"")}</p>
    <div class="day-chips">${chips((d.badges||[]).slice(0,3))}</div>
    <div class="mini-priority"><span>עדיפות היום</span><b>${stars(d.ratings?.worth||0)}</b></div>
  </article>`).join("");
}
window.openDay=function(i){
  state.selectedDay=i; const d=DATA.days[i];
  $("#dayViewTitle").textContent=d.day+" · "+formatDate(d.date);
  const stats=d.stats||{};
  let html=`<section class="day-hero card">
    <span class="muted">${safeText(d.region)}</span>
    <h2>${safeText(d.title)}</h2>
    <p>${safeText(d.summary||"")}</p>
    <div class="day-chips">${chips(d.badges||[])}</div>
    ${ratingRows(d.ratings||{})}
    <div class="day-stats">
      <div><span>🚗 נסיעה</span><b>${safeText(stats.driving||"—")}</b></div>
      <div><span>🚶 הליכה</span><b>${safeText(stats.walking||"—")}</b></div>
      <div><span>⚡ עומס</span><b>${safeText(stats.intensity||"—")}</b></div>
      <div><span>🌦️ מזג אוויר</span><b>${safeText(stats.weather||"—")}</b></div>
    </div>
    <p class="hotel-line">🏨 ${safeText(d.hotel)}</p>
  </section>`;

  if(d.mustSee?.length) html+=`<section class="must-see card">
    <div class="section-title"><div><span class="muted">כשאין זמן להכול</span><h2>מה אסור לפספס</h2></div><span>⭐</span></div>
    <ol>${d.mustSee.map(x=>`<li>${safeText(x)}</li>`).join("")}</ol>
  </section>`;

  html+=`<section><div class="section-title day-section-title"><div><span class="muted">המבט המלא</span><h2>מסלול היום</h2></div><span>${d.events.length} תחנות</span></div><div class="timeline">`;
  html+=d.events.map((e,j)=>eventHtml(d,e,j)).join("")+"</div></section>";

  if(d.bookings?.length) html+=`<section><h2 class="section-heading">הזמנות וכרטיסים</h2><div class="booking-list">${d.bookings.map(b=>`<div class="booking-row"><b>${safeText(b.name)}</b><span>${safeText(b.status)}</span></div>`).join("")}</div></section>`;
  html+=listBlock("🎒 לפני שיוצאים",d.prep||[],"✓");
  html+=listBlock("🔁 תוכניות חלופיות וקיצורים",d.alternatives||[],"↳");
  if(d.food?.length) html+=`<section><h2 class="section-heading">אוכל מומלץ</h2>${d.food.map(x=>foodCard(x,d.region)).join("")}</section>`;
  if(d.contacts?.length) html+=`<section><h2 class="section-heading">אנשי קשר</h2>${d.contacts.map(c=>`<div class="card"><b>${c.name}</b><div class="actions"><a href="tel:${c.phone}">📞 חיוג</a></div></div>`).join("")}</section>`;
  if(d.links?.length) html+=`<section><h2 class="section-heading">קישורים</h2><div class="card actions">${d.links.map(l=>`<a href="${l.url}" target="_blank" rel="noopener">🌐 ${l.label}</a>`).join("")}</div></section>`;
  $("#dayContent").innerHTML=html; showView("dayView");
}
function eventHtml(d,e,j){
  const id=d.date+"-"+j, active=favorites().some(x=>x.id===id);
  const extra=`
    ${e.priority?`<span class="priority-badge">${safeText(e.priority)}</span>`:""}
    ${e.rating?ratingRows(e.rating):""}
    ${e.parking?`<div class="info-line"><b>🚗 חניה:</b> ${safeText(e.parking)}</div>`:""}
    ${e.route?.length?`<div class="route-box"><b>מסלול מומלץ</b><ol>${e.route.map(x=>`<li>${safeText(x)}</li>`).join("")}</ol></div>`:""}
    ${e.dontMiss?.length?`<div class="dont-miss"><b>⭐ אל תפספסו</b><ul>${e.dontMiss.map(x=>`<li>${safeText(x)}</li>`).join("")}</ul></div>`:""}`;
  return `<article class="event">
    <div class="event-top">
      <div><h3>${safeText(e.title)}</h3><div class="muted">${safeText(e.details||"")}</div></div>
      <span class="time">${safeText(e.time)}</span>
    </div>
    <details class="event-details"><summary>פתח פרטים</summary>${extra}</details>
    <div class="actions">${e.maps?`<a target="_blank" rel="noopener" href="${mapsLink(e.maps)}">📍 ניווט</a>`:""}
    <button class="fav-btn ${active?"active":""}" onclick='toggleFavorite(${JSON.stringify(JSON.stringify({id,title:e.title,subtitle:d.title,maps:e.maps||""}))},this)'>❤️</button></div>
  </article>`;
}

window.toggleFavorite=function(payload,btn){
  const item=JSON.parse(payload), f=favorites(), i=f.findIndex(x=>x.id===item.id);
  if(i>=0) f.splice(i,1); else f.push(item);
  saveFavorites(f); btn?.classList.toggle("active",i<0); renderFavorites();
}
function renderHotels(){
  $("#hotelsList").innerHTML=DATA.hotels.map(h=>`<div class="hotel"><b>${h.name}</b><p class="muted">${h.area}</p><div class="actions"><a target="_blank" href="${mapsLink(h.name)}">📍 ניווט</a></div></div>`).join("");
}
function foodCard(name,area){return `<div class="food-item"><b>${name}</b><p class="muted">${area}</p><div class="actions"><a target="_blank" href="${mapsLink(name)}">📍 חיפוש במפה</a></div></div>`}
function renderFood(filter=""){
  const all=[]; DATA.days.forEach(d=>(d.food||[]).forEach(x=>all.push({name:x,area:d.region})));
  const q=filter.trim().toLowerCase();
  $("#foodList").innerHTML=all.filter(x=>(x.name+" "+x.area).toLowerCase().includes(q)).map(x=>foodCard(x.name,x.area)).join("")||`<div class="empty">לא נמצאו תוצאות</div>`;
  $("#foodSearch").oninput=e=>renderFood(e.target.value);
}
function renderChecklist(){
  const checked=JSON.parse(localStorage.getItem("checklist")||"{}");
  $("#checklist").innerHTML=DATA.checklist.map((x,i)=>`<label class="check-item"><input type="checkbox" ${checked[i]?"checked":""} onchange="saveCheck(${i},this.checked)"><span>${x}</span></label>`).join("");
}
window.saveCheck=function(i,v){const c=JSON.parse(localStorage.getItem("checklist")||"{}");c[i]=v;localStorage.setItem("checklist",JSON.stringify(c));DriveSync.scheduleSave()}
function renderEmergency(){
  $("#emergencyList").innerHTML=DATA.emergency.map(e=>`<div class="emergency"><b>${e.name}</b>${e.area?`<p class="muted">${e.area}</p>`:""}<div class="actions">${e.phone?`<a href="tel:${e.phone}">📞 ${e.phone}</a>`:`<a target="_blank" href="${mapsLink(e.name)}">📍 ניווט</a>`}</div></div>`).join("");
}
function renderFavorites(){
  const f=favorites();
  $("#favoritesList").innerHTML=f.length?f.map(x=>`<div class="card"><b>${x.title}</b><p class="muted">${x.subtitle}</p><div class="actions">${x.maps?`<a target="_blank" href="${mapsLink(x.maps)}">📍 ניווט</a>`:""}<button class="fav-btn active" onclick='toggleFavorite(${JSON.stringify(JSON.stringify(x))},this)'>הסר ❤️</button></div></div>`).join(""):`<div class="empty">עדיין לא נשמרו מועדפים</div>`;
}
function formatDate(s){const [y,m,d]=s.split("-");return `${d}.${m}.${y}`}
init();

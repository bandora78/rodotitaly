
let DATA=null;
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const state={selectedDay:0};
const favorites=()=>JSON.parse(localStorage.getItem("favorites")||"[]");
const saveFavorites=x=>{localStorage.setItem("favorites",JSON.stringify(x));DriveSync.scheduleSave();};
const mapsLink=q=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q);


const expenses=()=>JSON.parse(localStorage.getItem("expenses")||"[]");
const saveExpenses=x=>{localStorage.setItem("expenses",JSON.stringify(x));DriveSync.scheduleSave();};
const money=n=>new Intl.NumberFormat("he-IL",{style:"currency",currency:"EUR"}).format(Number(n||0));
function safeText(s){const d=document.createElement("div");d.textContent=s||"";return d.innerHTML}
function renderExpenses(){
  const list=expenses().sort((a,b)=>b.date.localeCompare(a.date));
  $("#expenseTotal").textContent=money(list.reduce((s,x)=>s+Number(x.amount||0),0));
  const grouped={}; list.forEach(x=>grouped[x.category]=(grouped[x.category]||0)+Number(x.amount||0));
  $("#expenseByCategory").innerHTML=Object.entries(grouped).sort((a,b)=>b[1]-a[1])
    .map(([cat,sum])=>`<span class="category-chip">${cat}: ${money(sum)}</span>`).join("")||'<span class="muted">עדיין לא נרשמו הוצאות</span>';
  $("#expensesList").innerHTML=list.length?list.map(x=>`<article class="expense-row"><div><h4>${safeText(x.category)}${x.note?` · ${safeText(x.note)}`:""}</h4><div class="expense-meta">${formatDate(x.date)}</div><div class="expense-actions"><button class="delete-expense" onclick="deleteExpense('${x.id}')">מחק</button></div></div><div class="expense-amount">${money(x.amount)}</div></article>`).join(""):'<div class="empty">עדיין לא הוספתם הוצאות</div>';
}
window.deleteExpense=id=>{saveExpenses(expenses().filter(x=>x.id!==id));renderExpenses()}
function setupExpenses(){
  $("#expenseDate").value=new Date().toISOString().slice(0,10);
  $("#expenseForm").onsubmit=e=>{
    e.preventDefault();
    const item={id:String(Date.now()),amount:Number($("#expenseAmount").value),category:$("#expenseCategory").value,date:$("#expenseDate").value,note:$("#expenseNote").value.trim()};
    const list=expenses(); list.push(item); saveExpenses(list); e.target.reset(); $("#expenseDate").value=new Date().toISOString().slice(0,10); renderExpenses();
  };
  $("#clearExpenses").onclick=()=>{if(confirm("למחוק את כל ההוצאות שנרשמו?")){localStorage.removeItem("expenses");renderExpenses();DriveSync.scheduleSave();}};
}

async function init(){
  DATA=await fetch("data.json").then(r=>r.json());
  renderHome(); renderDays(); renderHotels(); renderFood(); renderChecklist(); renderEmergency(); renderFavorites(); renderExpenses();
  bindNav();
  if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
  $("#themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("dark",document.body.classList.contains("dark"))};
  if(localStorage.getItem("dark")==="true") document.body.classList.add("dark");
  setupExpenses();
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
function renderDays(){
  $("#daysList").innerHTML=DATA.days.map((d,i)=>`<article class="card day-card" onclick="openDay(${i})">
    <div class="date-row"><div><span class="muted">${d.day} · ${formatDate(d.date)}</span><h3>${d.title}</h3><div class="region">${d.region}</div></div><span>←</span></div>
  </article>`).join("");
}
window.openDay=function(i){
  state.selectedDay=i; const d=DATA.days[i];
  $("#dayViewTitle").textContent=d.day+" · "+formatDate(d.date);
  let html=`<section class="card"><span class="muted">${d.region}</span><h2>${d.title}</h2><p>🏨 ${d.hotel}</p></section><div class="timeline">`;
  html+=d.events.map((e,j)=>eventHtml(d,e,j)).join("")+"</div>";
  if(d.food?.length) html+=`<section><h2 class="section-heading">אוכל מומלץ</h2>${d.food.map(x=>foodCard(x,d.region)).join("")}</section>`;
  if(d.contacts?.length) html+=`<section><h2 class="section-heading">אנשי קשר</h2>${d.contacts.map(c=>`<div class="card"><b>${c.name}</b><div class="actions"><a href="tel:${c.phone}">📞 חיוג</a></div></div>`).join("")}</section>`;
  if(d.links?.length) html+=`<section><h2 class="section-heading">קישורים</h2><div class="card actions">${d.links.map(l=>`<a href="${l.url}" target="_blank" rel="noopener">🌐 ${l.label}</a>`).join("")}</div></section>`;
  $("#dayContent").innerHTML=html; showView("dayView");
}
function eventHtml(d,e,j){
  const id=d.date+"-"+j, active=favorites().some(x=>x.id===id);
  return `<article class="event"><div class="event-top"><div><h3>${e.title}</h3><div class="muted">${e.details||""}</div></div><span class="time">${e.time}</span></div>
  <div class="actions">${e.maps?`<a target="_blank" rel="noopener" href="${mapsLink(e.maps)}">📍 ניווט</a>`:""}
  <button class="fav-btn ${active?"active":""}" onclick='toggleFavorite(${JSON.stringify(JSON.stringify({id,title:e.title,subtitle:d.title,maps:e.maps||""}))},this)'>❤️</button></div></article>`;
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

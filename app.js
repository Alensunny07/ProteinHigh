import { firebaseConfig } from './firebase-config.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const today=()=>new Date().toLocaleDateString('en-CA');
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36);
const fmt=n=>Math.round(Number(n)||0).toLocaleString('en-IN');
const money=n=>'₹'+(Number(n)||0).toLocaleString('en-IN',{maximumFractionDigits:2});
const colors={calories:'#f5c35b',protein:'#48b8ff',carbs:'#4ce5ad',fat:'#b48aff',fiber:'#ff9c71'};
const starterFoods=[
['Rice, cooked',130,2.7,28,0.3,0.4,5,'🍚'],['Roti, plain',297,9,46,7,6,4,'🫓'],['Egg, whole',143,13,0.7,9.5,0,8,'🥚'],['Chicken breast, cooked',165,31,0,3.6,0,60,'🍗'],['Banana',89,1.1,22.8,0.3,2.6,6,'🍌'],['Milk, whole',61,3.2,4.8,3.3,0,7,'🥛'],['Oats, dry',389,16.9,66.3,6.9,10.6,15,'🥣'],['Peanut butter',588,25,20,50,6,15,'🥜'],['Dal, cooked',116,9,20,0.4,7.9,12,'🍲'],['Paneer',265,18.3,1.2,20.8,0,35,'🧀'],['Apple',52,0.3,13.8,0.2,2.4,10,'🍎'],['Potato, boiled',87,1.9,20.1,0.1,1.8,5,'🥔'],['Curd, plain',61,3.5,4.7,3.3,0,8,'🥣'],['Soy chunks, dry',345,52,33,0.5,13,20,'🫘'],['Almonds',579,21.2,21.6,49.9,12.5,25,'🌰'],['Whey protein powder',400,80,8,5,0,75,'🥤'],['Mixed vegetables, cooked',65,2.5,12,0.5,4,10,'🥦'],['Fish, cooked',180,25,0,8,0,70,'🐟']
].map((f,i)=>({id:'base'+i,name:f[0],calories:f[1],protein:f[2],carbs:f[3],fat:f[4],fiber:f[5],price:f[6],emoji:f[7],type:'Built-in'}));
const defaults={goals:{calories:2600,protein:160,carbs:300,fat:75,fiber:30,budget:200},profile:{name:'',age:'',height:178,fitnessGoal:'Muscle gain + lean'},foods:[],logs:[],measurements:[]};
let data=loadLocal(), selectedFood=null, period='week', currentUser=null, cloud=null, auth=null, db=null, isCloudReady=false, toastTimer;
function loadLocal(){try{return {...structuredClone(defaults),...JSON.parse(localStorage.getItem('fittrack-v1')||'{}')};}catch{return structuredClone(defaults)}}
function persistLocal(){localStorage.setItem('fittrack-v1',JSON.stringify(data));}
function saveData(message='Saved'){persistLocal();if(currentUser&&db) saveCloud();renderAll();if(message)notify(message);}
function notify(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600)}
function foods(){return [...starterFoods,...data.foods]}
function nval(food,key,qty){return (Number(food?.[key])||0)*(Number(qty)||0)/100}
function sums(logs){return logs.reduce((a,l)=>{for(const k of ['calories','protein','carbs','fat','fiber','cost'])a[k]+=(Number(l[k])||0);return a},{calories:0,protein:0,carbs:0,fat:0,fiber:0,cost:0})}
function selectedDate(){return $('#selectedDate').value||today()}
function logsFor(date=selectedDate()){return data.logs.filter(l=>l.date===date)}
function latestBody(){return [...data.measurements].sort((a,b)=>b.date.localeCompare(a.date))[0]}
function statCard(name,value,target,unit,color,icon){const pct=Math.min(100,target>0?value/target*100:0);return `<div class="stat-card"><div class="stat-top"><span>${name}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${fmt(value)}<span style="font-size:12px;color:var(--muted);font-weight:500"> ${unit}</span></div><div class="progress"><span style="width:${pct}%;background:${color}"></span></div><div class="stat-sub">${fmt(Math.max(0,target-value))} ${unit} remaining · Goal ${fmt(target)}</div></div>`}
function renderDashboard(){const s=sums(logsFor());$('#macroCards').innerHTML=statCard('Calories',s.calories,data.goals.calories,'kcal',colors.calories,'🔥')+statCard('Protein',s.protein,data.goals.protein,'g',colors.protein,'↗')+statCard('Carbs',s.carbs,data.goals.carbs,'g',colors.carbs,'◈')+statCard('Fat',s.fat,data.goals.fat,'g',colors.fat,'◉')+statCard('Fiber',s.fiber,data.goals.fiber,'g',colors.fiber,'❋');$('#mealCount').textContent=logsFor().length+' entries';$('#donutCalories').textContent=fmt(s.calories);$('#calorieDonut').style.background=`conic-gradient(${colors.calories} ${Math.min(100,s.calories/Math.max(1,data.goals.calories)*100)*3.6}deg,#1a3449 0deg)`;$('#todaySpend').textContent=money(s.cost);$('#remainingCalories').textContent=fmt(Math.max(0,data.goals.calories-s.calories))+' kcal';$('#macroLegend').innerHTML=[['Protein',s.protein,'g',colors.protein],['Carbs',s.carbs,'g',colors.carbs],['Fat',s.fat,'g',colors.fat],['Fiber',s.fiber,'g',colors.fiber]].map(x=>`<div class="legend-item"><span class="legend-label"><i class="legend-dot" style="background:${x[3]}"></i>${x[0]}</span><b>${fmt(x[1])}${x[2]}</b></div>`).join('');renderMealGroups($('#dashboardMeals'),logsFor(),true);renderMealGroups($('#foodlogMeals'),logsFor(),false);$('#foodlogTotal').textContent=fmt(s.calories)+' kcal';$('#foodlogSpend').textContent=money(s.cost);$('#dailyInsight').textContent=insightFor(s);renderWeekChart($('#weekChart'));renderBodySummary();}
function renderMealGroups(el,logs,compact){const meals=['Breakfast','Lunch','Dinner','Snacks'];if(!logs.length){el.innerHTML='<div class="empty-state"><b>No food logged yet</b>Add your first food to start tracking nutrition and spending.</div>';return}el.innerHTML=meals.map(m=>{const ls=logs.filter(l=>l.meal===m);if(!ls.length)return '';const total=sums(ls);return `<div class="meal-group"><div class="meal-group-head"><span class="meal-name">${({Breakfast:'🌅',Lunch:'☀️',Dinner:'🌙',Snacks:'🍌'})[m]} ${m}</span><span class="meal-kcal">${fmt(total.calories)} kcal</span></div>${ls.map(l=>`<div class="food-line"><span class="food-emoji">${l.emoji||'🍽️'}</span><div class="food-line-main"><b>${esc(l.name)} · ${fmt(l.qty)} g</b><small>P ${fmt(l.protein)}g · C ${fmt(l.carbs)}g · F ${fmt(l.fat)}g · Fiber ${fmt(l.fiber)}g</small></div><div class="food-line-side"><b>${money(l.cost)}</b><br><small>${l.time||''}</small></div><button class="delete-btn" data-delete-log="${l.id}" title="Delete entry">×</button></div>`).join('')}</div>`}).join('');}
function insightFor(s){const issues=[];if(!logsFor().length)return 'Log your first meal to start getting useful insights. Your dashboard will compare intake with your goals.';if(s.protein<data.goals.protein*.75)issues.push('Protein is below three-quarters of your target so far. Consider adding a protein-rich food to a later meal.');if(s.fiber<data.goals.fiber*.5)issues.push('Fiber is still low today. Fruit, vegetables, beans or oats can help.');if(s.calories>data.goals.calories*1.1)issues.push('Calories are above your target. Check portion sizes and your goal before making big changes.');if(s.cost>data.goals.budget)issues.push('You are over today’s food budget. Review the logged prices and your weekly average.');if(!issues.length)issues.push('Good tracking today. Keep logging consistently; one day is less important than your weekly pattern.');return issues.slice(0,2).join(' ')}
function renderWeekChart(el){const dates=Array.from({length:7},(_,i)=>{const d=new Date(selectedDate()+'T12:00:00');d.setDate(d.getDate()-6+i);return d.toLocaleDateString('en-CA')});const vals=dates.map(d=>({d,s:sums(data.logs.filter(l=>l.date===d))}));const max=Math.max(data.goals.calories,...vals.map(x=>x.s.calories),1);el.innerHTML=vals.map(x=>`<div class="chart-column"><span class="chart-number">${x.s.calories?fmt(x.s.calories):''}</span><div class="bar-stack"><div class="bar" title="${fmt(x.s.calories)} kcal" style="height:${Math.max(2,x.s.calories/max*100)}%"></div></div><span class="chart-label">${new Date(x.d+'T12:00:00').toLocaleDateString('en',{weekday:'short'})}</span></div>`).join('')}
function renderBodySummary(){const b=latestBody();$('#bodySummary').innerHTML=b?`<div><span>Weight</span><b>${b.weight} kg</b><small>${b.date}</small></div><div><span>Height</span><b>${b.height||data.profile.height||'—'} cm</b><small>Latest recorded</small></div><div><span>Waist</span><b>${b.waist?b.waist+' cm':'—'}</b><small>Latest recorded</small></div><div><span>BMI (rough)</span><b>${b.height&&b.weight?(b.weight/((b.height/100)**2)).toFixed(1):'—'}</b><small>Screening measure</small></div>`:'<div class="empty-state" style="grid-column:1/-1">Add a body check-in to start tracking your measurements.</div>';$('#bodyMetrics').innerHTML=$('#bodySummary').innerHTML;$('#bodyHistory').innerHTML=[...data.measurements].sort((a,b)=>b.date.localeCompare(a.date)).map(b=>`<tr><td>${b.date}</td><td>${b.weight} kg</td><td>${b.waist?b.waist+' cm':'—'}</td><td>${b.bodyFat?b.bodyFat+'%':'—'}</td><td>${esc(b.notes||'')}</td><td><button class="delete-btn" data-delete-body="${b.id}">×</button></td></tr>`).join('')||'<tr><td colspan="6" class="muted">No measurements saved yet.</td></tr>'}
function setSelectedFood(f){selectedFood=f;$('#foodId').value=f?.id||'';$('#selectedFoodLabel').textContent=f?`${f.emoji||'🍽️'} ${f.name} · ${f.calories} kcal / 100 g`:'Choose a food above, or create a manual entry.';$('#foodCost').value=f?Number(f.price||0):0;previewFood()}
function previewFood(){const f=selectedFood,q=Number($('#foodQty').value)||0;const keys=[['Calories','calories','kcal'],['Protein','protein','g'],['Carbs','carbs','g'],['Fat','fat','g'],['Fiber','fiber','g']];$('#nutritionPreview').innerHTML=f?keys.map(([n,k,u])=>`<div><b>${fmt(nval(f,k,q))} <small>${u}</small></b><span>${n}</span></div>`).join(''):'<div class="muted">Choose a food to preview its nutrition.</div>'}
function renderFoodResults(){const q=$('#foodSearch').value.trim().toLowerCase();const list=foods().filter(f=>f.name.toLowerCase().includes(q)).slice(0,35);$('#foodResults').innerHTML=list.map(f=>`<button class="food-result ${selectedFood?.id===f.id?'selected':''}" data-select-food="${f.id}"><span class="food-emoji">${f.emoji||'🍽️'}</span><span class="result-copy"><b>${esc(f.name)}</b><small>${fmt(f.calories)} kcal · P ${fmt(f.protein)}g · C ${fmt(f.carbs)}g · ${f.type==='Built-in'?'Built-in':'My food'}</small></span><span class="plus">＋</span></button>`).join('')||'<div class="empty-state">No matching foods. Add a custom food below.</div>'}
function renderFoodDatabase(){const q=($('#databaseSearch')?.value||'').toLowerCase();$('#foodDatabaseRows').innerHTML=foods().filter(f=>f.name.toLowerCase().includes(q)).map(f=>`<tr><td>${f.emoji||'🍽️'} ${esc(f.name)}</td><td>${fmt(f.calories)}</td><td>${fmt(f.protein)} g</td><td>${fmt(f.carbs)} g</td><td>${fmt(f.fat)} g</td><td>${fmt(f.fiber)} g</td><td>${money(f.price)}</td><td>${f.type==='Built-in'?'<span class="pill">Built-in</span>':'<span class="pill">Custom</span>'}</td></tr>`).join('')}
function rangeFor(p){const d=new Date(selectedDate()+'T12:00:00'),start=new Date(d),end=new Date(d);if(p==='week')start.setDate(d.getDate()-6);if(p==='month')start.setDate(1);if(p==='year'){start.setMonth(0,1)}return {start:start.toLocaleDateString('en-CA'),end:end.toLocaleDateString('en-CA')}}
function renderAnalytics(){const {start,end}=rangeFor(period),logs=data.logs.filter(l=>l.date>=start&&l.date<=end),s=sums(logs),days=period==='day'?1:period==='week'?7:period==='month'?new Date(new Date(end+'T12:00:00').getFullYear(),new Date(end+'T12:00:00').getMonth()+1,0).getDate():365;const daily=s.calories/(period==='day'?1:Math.max(1,new Set(logs.map(l=>l.date)).size));$('#analyticsCards').innerHTML=statCard('Calories',s.calories,period==='day'?data.goals.calories:data.goals.calories*days,'kcal',colors.calories,'🔥')+statCard('Protein',s.protein,period==='day'?data.goals.protein:data.goals.protein*days,'g',colors.protein,'↗')+statCard('Fiber',s.fiber,period==='day'?data.goals.fiber:data.goals.fiber*days,'g',colors.fiber,'❋')+statCard('Food spend',s.cost,data.goals.budget*days,'₹',colors.yellow,'₹')+statCard('Logged days',new Set(logs.map(l=>l.date)).size,days,'days',colors.carbs,'▦');$('#periodCaption').textContent=start===end?start:`${start} — ${end}`;$('#periodSpend').textContent=money(s.cost);$('#spendCaption').textContent=`${logs.length} food entries across ${new Set(logs.map(l=>l.date)).size} logged day(s)`;const byMeal=['Breakfast','Lunch','Dinner','Snacks'].map(m=>({m,c:sums(logs.filter(l=>l.meal===m)).cost}));$('#spendBreakdown').innerHTML=byMeal.map(x=>`<div class="simple-row"><span>${x.m}</span><b>${money(x.c)}</b></div>`).join('');let dates=[];if(period==='day')dates=[end];else if(period==='week'){for(let i=6;i>=0;i--){const x=new Date(end+'T12:00:00');x.setDate(x.getDate()-i);dates.push(x.toLocaleDateString('en-CA'))}}else if(period==='month'){for(let i=1;i<=new Date(new Date(end+'T12:00:00').getFullYear(),new Date(end+'T12:00:00').getMonth()+1,0).getDate();i++){dates.push(end.slice(0,8)+String(i).padStart(2,'0'))}}else{for(let i=0;i<12;i++)dates.push(`${end.slice(0,4)}-${String(i+1).padStart(2,'0')}`)}const vals=dates.map(d=>{const ls=data.logs.filter(l=>period==='year'?l.date.startsWith(d):l.date===d);return {d,s:sums(ls),label:period==='year'?new Date(d+'-01T12:00:00').toLocaleDateString('en',{month:'short'}):period==='month'?d.slice(-2):new Date(d+'T12:00:00').toLocaleDateString('en',{weekday:'short'})}});const max=Math.max(1,...vals.map(x=>x.s.calories),data.goals.calories);$('#analyticsChart').innerHTML=vals.map(x=>`<div class="chart-column"><span class="chart-number">${x.s.calories?fmt(x.s.calories):''}</span><div class="bar-stack"><div class="bar" title="${x.label}: ${fmt(x.s.calories)} kcal" style="height:${Math.max(x.s.calories?2:0,x.s.calories/max*100)}%"></div><div class="bar protein" title="${fmt(x.s.protein)} g protein" style="height:${Math.max(x.s.protein?2:0,x.s.protein/Math.max(1,...vals.map(y=>y.s.protein))*100)}%"></div></div><span class="chart-label">${x.label}</span></div>`).join('');const notes=[];const activeDays=new Set(logs.map(l=>l.date)).size;if(!activeDays)notes.push(['Start with one honest log','Add meals consistently so your trends become meaningful.']);else{notes.push(['Consistency','You logged food on '+activeDays+' day(s) in this period.']);if(s.protein/Math.max(1,activeDays)<data.goals.protein*.8)notes.push(['Protein trend','Your average logged protein is below 80% of the daily target. Consider spreading protein across meals.']);if(s.fiber/Math.max(1,activeDays)<data.goals.fiber*.8)notes.push(['Fiber trend','Your average fiber is below 80% of the daily target. Add fruit, vegetables, legumes or whole grains.']);if(s.cost/Math.max(1,activeDays)>data.goals.budget)notes.push(['Spending','Average logged food spending is above your daily budget. Check your meal costs and portions.']);if(s.calories/Math.max(1,activeDays)>data.goals.calories*1.1)notes.push(['Calorie trend','Your average logged calories are above target. Confirm your goal is appropriate before changing intake.']);if(notes.length===1)notes.push(['Keep going','Review several weeks of data before judging body-composition changes.']);}$('#insightsList').innerHTML=notes.map(n=>`<div class="insight-row"><span class="insight-check">✓</span><div><b>${n[0]}</b><p>${n[1]}</p></div></div>`).join('')}
function renderAll(){renderDashboard();renderFoodResults();renderFoodDatabase();renderAnalytics();$('#goalCalories').value=data.goals.calories;$('#goalProtein').value=data.goals.protein;$('#goalCarbs').value=data.goals.carbs;$('#goalFat').value=data.goals.fat;$('#goalFiber').value=data.goals.fiber;$('#goalBudget').value=data.goals.budget;$('#profileName').value=data.profile.name||'';$('#profileAge').value=data.profile.age||'';$('#profileHeight').value=data.profile.height||'';$('#fitnessGoal').value=data.profile.fitnessGoal||'Muscle gain + lean';}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function goPage(name){$$('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+name));$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===name));const meta={dashboard:['Dashboard','A clearer picture of your nutrition and progress.'],foodlog:['Food log','Add food, calculate nutrition and record cost.'],analytics:['Analytics','Find patterns across days, weeks, months and years.'],body:['Weight & body','Track measurements consistently over time.'],foods:['Food database','Your built-in and custom food library.'],goals:['Goals & settings','Set your targets and manage your profile.']};$('#pageTitle').innerHTML=meta[name][0]+' <span class="wave">✦</span>';$('#pageSubtitle').textContent=meta[name][1];if(name==='foodlog')renderFoodResults();window.scrollTo({top:0,behavior:'smooth'})}
$$('.nav-item').forEach(b=>b.addEventListener('click',()=>goPage(b.dataset.page)));$$('[data-go]').forEach(b=>b.addEventListener('click',()=>goPage(b.dataset.go)));$('#selectedDate').value=today();$('#bodyDate').value=today();$('#foodTime').value=new Date().toTimeString().slice(0,5);$('#todayLabel').textContent=new Date().toLocaleDateString('en-IN',{weekday:'long',month:'long',day:'numeric'}).toUpperCase();
$('#selectedDate').addEventListener('change',()=>renderAll());$('#foodSearch').addEventListener('input',renderFoodResults);$('#databaseSearch').addEventListener('input',renderFoodDatabase);$('#foodQty').addEventListener('input',previewFood);$('#foodCost').addEventListener('input',()=>{});$('#periodTabs').addEventListener('click',e=>{const b=e.target.closest('[data-period]');if(!b)return;period=b.dataset.period;$$('#periodTabs button').forEach(x=>x.classList.toggle('active',x===b));renderAnalytics()});
document.addEventListener('click',e=>{const sel=e.target.closest('[data-select-food]');if(sel){setSelectedFood(foods().find(f=>f.id===sel.dataset.selectFood));renderFoodResults()}const del=e.target.closest('[data-delete-log]');if(del){data.logs=data.logs.filter(l=>l.id!==del.dataset.deleteLog);saveData('Food entry deleted')}const bd=e.target.closest('[data-delete-body]');if(bd){data.measurements=data.measurements.filter(x=>x.id!==bd.dataset.deleteBody);saveData('Measurement deleted')}});
$('#logFoodForm').addEventListener('submit',e=>{e.preventDefault();if(!selectedFood){notify('Choose a food first.');return}const q=Number($('#foodQty').value);if(q<=0){notify('Enter a valid quantity.');return}const cost=Number($('#foodCost').value)||0;const log={id:uid(),date:selectedDate(),meal:$('#mealType').value,time:$('#foodTime').value,name:selectedFood.name,emoji:selectedFood.emoji||'🍽️',foodId:selectedFood.id,qty:q,cost,calories:nval(selectedFood,'calories',q),protein:nval(selectedFood,'protein',q),carbs:nval(selectedFood,'carbs',q),fat:nval(selectedFood,'fat',q),fiber:nval(selectedFood,'fiber',q)};data.logs.push(log);saveData('Food logged successfully');goPage('foodlog')});
$('#customFoodForm').addEventListener('submit',e=>{e.preventDefault();const f={id:'custom'+uid(),name:$('#customName').value.trim(),calories:+$('#customCalories').value,protein:+$('#customProtein').value||0,carbs:+$('#customCarbs').value||0,fat:+$('#customFat').value||0,fiber:+$('#customFiber').value||0,price:+$('#customPrice').value||0,emoji:'🍽️',type:'Custom'};data.foods.push(f);saveData('Custom food saved');setSelectedFood(f);$('#foodSearch').value=f.name;renderFoodResults();renderFoodDatabase();$('#customFoodForm').reset()});
$('#bodyForm').addEventListener('submit',e=>{e.preventDefault();const b={id:uid(),date:$('#bodyDate').value,weight:+$('#bodyWeight').value,height:+$('#bodyHeight').value||+data.profile.height||0,waist:+$('#bodyWaist').value||0,bodyFat:+$('#bodyFat').value||0,biceps:+$('#bodyBiceps').value||0,notes:$('#bodyNotes').value.trim()};data.measurements=data.measurements.filter(x=>x.date!==b.date);data.measurements.push(b);if(b.height)data.profile.height=b.height;saveData('Body check-in saved');$('#bodyForm').reset();$('#bodyDate').value=today()});
$('#goalsForm').addEventListener('submit',e=>{e.preventDefault();data.goals={calories:+$('#goalCalories').value,protein:+$('#goalProtein').value,carbs:+$('#goalCarbs').value,fat:+$('#goalFat').value,fiber:+$('#goalFiber').value,budget:+$('#goalBudget').value};saveData('Goals updated')});$('#profileForm').addEventListener('submit',e=>{e.preventDefault();data.profile={...data.profile,name:$('#profileName').value.trim(),age:$('#profileAge').value,height:+$('#profileHeight').value||data.profile.height,fitnessGoal:$('#fitnessGoal').value};saveData('Profile saved')});$('#exportData').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='fittrack-backup-'+today()+'.json';a.click();URL.revokeObjectURL(url);notify('Backup exported')});

function firebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

async function initFirebase() {
  if (!firebaseConfigured()) {
    $('#syncStatus').textContent = 'Firebase configuration missing';
    return;
  }

  try {
    const appmod = await import(
      'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
    );

    auth = await import(
      'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
    );

    cloud = await import(
      'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
    );

    const app = appmod.initializeApp(firebaseConfig);
    const authInstance = auth.getAuth(app);
    db = cloud.getFirestore(app);
    isCloudReady = true;

    $('#syncStatus').textContent = 'Firebase ready · sign in to sync';
    $('#syncDot').style.background = 'var(--green)';

    auth.onAuthStateChanged(authInstance, async user => {
      currentUser = user;

      if (!user) {
        $('#syncStatus').textContent = 'Firebase ready · not signed in';
        $('#signOut').classList.add('hidden');
        return;
      }

      $('#syncStatus').textContent = 'Loading cloud data...';
      $('#profileButton').textContent =
        (data.profile.name || user.email || 'U')
          .slice(0, 2)
          .toUpperCase();

      $('#signOut').classList.remove('hidden');

      try {
        const ref = cloud.doc(
          db, 'users', user.uid, 'fittrack', 'data'
        );

        const snap = await cloud.getDoc(ref);

        if (snap.exists()) {
          data = { ...structuredClone(defaults), ...snap.data() };
          persistLocal();
          renderAll();
        } else {
          await saveCloud();
        }

        $('#syncStatus').textContent = 'Cloud sync · ' + user.email;
        notify('Signed in. Cloud sync is active.');
      } catch (err) {
        console.error('Cloud load error:', err);
        notify('Cloud data could not load. Check Firestore rules.');
      }
    });
  } catch (err) {
    console.error('Firebase initialization error:', err);
    $('#syncStatus').textContent = 'Firebase setup error';
    notify('Firebase failed to initialize. Check the console.');
  }
}

async function saveCloud() {
  if (!currentUser || !db || !cloud) return;

  try {
    const ref = cloud.doc(
      db, 'users', currentUser.uid, 'fittrack', 'data'
    );

    await cloud.setDoc(ref, data);

    $('#syncStatus').textContent =
      'Cloud synced · ' +
      new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
  } catch (err) {
    console.error('Cloud save error:', err);
    notify('Cloud save failed. Your browser copy is still saved.');
  }
}

$('#authOpen').addEventListener('click', () =>
  $('#authDialog').showModal()
);

$('#settingsAuth').addEventListener('click', () =>
  $('#authDialog').showModal()
);

$('#profileButton').addEventListener('click', () =>
  $('#authDialog').showModal()
);

$('#createAccount').addEventListener('click', async () => {
  if (!auth || !isCloudReady) {
    notify('Firebase is not ready. Check your internet connection.');
    return;
  }

  const email = $('#authEmail').value.trim();
  const password = $('#authPassword').value;

  if (!email || !password) {
    notify('Enter your email and password.');
    return;
  }

  try {
    await auth.createUserWithEmailAndPassword(
      auth.getAuth(), email, password
    );

    $('#authDialog').close();
    notify('Account created successfully.');
  } catch (err) {
    console.error('Account creation error:', err);
    notify(err.message);
  }
});

$('#authForm').addEventListener('submit', async e => {
  e.preventDefault();

  if (!auth || !isCloudReady) {
    notify('Firebase is not ready. Check your internet connection.');
    return;
  }

  const email = $('#authEmail').value.trim();
  const password = $('#authPassword').value;

  try {
    await auth.signInWithEmailAndPassword(
      auth.getAuth(), email, password
    );

    $('#authDialog').close();
    notify('Login successful.');
  } catch (err) {
    console.error('Login error:', err);
    notify(err.message);
  }
});

$('#signOut').addEventListener('click', async () => {
  if (!auth) return;

  try {
    await auth.signOut(auth.getAuth());
    notify('Signed out successfully.');
  } catch (err) {
    console.error('Sign-out error:', err);
    notify(err.message);
  }
});

renderAll();
initFirebase();

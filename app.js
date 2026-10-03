(() => {
  const KEY = 'recall-topics-v1';
  const SETTINGS_KEY = 'recall-settings-v1';
  const intervals = [1, 3, 7, 14, 30];
  const $ = (id) => document.getElementById(id);
  const list = $('topicList');
  let topics = read(KEY, []);
  let settings = read(SETTINGS_KEY, { reminder: false, time: '19:00' });
  let activeFilter = 'all';
  let installPrompt = null;
  const today = dateKey(new Date());
  const dateFmt = new Intl.DateTimeFormat(undefined, { weekday:'long', month:'long', day:'numeric' });
  $('todayLabel').textContent = dateFmt.format(new Date());

  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function save() { localStorage.setItem(KEY, JSON.stringify(topics)); localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function addDays(date, n) { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate()+n); return dateKey(d); }
  function prettyDate(key) { const d = new Date(`${key}T12:00:00`); if (key===today) return 'Today'; if (key===addDays(today,1)) return 'Tomorrow'; return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(d); }
  function safe(text) { const e=document.createElement('span'); e.textContent=text; return e.innerHTML; }
  function counts() { return { due:topics.filter(t=>t.next<=today).length, done:topics.filter(t=>t.last===today).length }; }

  function render() {
    const {due,done}=counts();
    $('dueCount').textContent=due; $('topicCount').textContent=topics.length; $('doneCount').textContent=done;
    $('allCount').textContent=topics.length; $('filterDueCount').textContent=due;
    const filtered=topics.filter(t=>activeFilter==='all'||(activeFilter==='due'?t.next<=today:t.next>today)).sort((a,b)=>a.next.localeCompare(b.next));
    list.innerHTML='';
    if (!filtered.length) {
      const empty=document.createElement('div'); empty.className='empty-state';
      const isEmpty=topics.length===0;
      empty.innerHTML=`<div class="empty-icon">${isEmpty?'✳':'☀'}</div><h3>${isEmpty?'A fresh start':'You’re all caught up'}</h3><p>${isEmpty?'Add your first topic and choose when you want to see it again.':'Nothing to review in this view. Enjoy the breathing room.'}</p>${isEmpty?'<button class="primary-button" id="emptyAdd">Add your first topic</button>':''}`;
      list.append(empty); const add=$('emptyAdd'); if(add)add.onclick=openTopic; return;
    }
    for (const t of filtered) {
      const overdue=t.next<today, isDue=t.next<=today;
      const card=document.createElement('article'); card.className='topic-card';
      card.innerHTML=`<div class="topic-symbol">${safe((t.subject||t.name).trim().charAt(0).toUpperCase()||'•')}</div><div class="topic-main"><div class="topic-title">${safe(t.name)}</div><div class="topic-subject">${safe(t.subject||'Personal study')}</div></div><div class="topic-meta"><div class="due-label ${overdue?'late':isDue?'':'future'}">${overdue?'Overdue':isDue?'Due today':`Next · ${prettyDate(t.next)}`}</div><small>${t.reviews?`${t.reviews} ${t.reviews===1?'review':'reviews'} so far`:`Added ${prettyDate(t.created)}`}</small><div>${isDue?`<button class="review-button" data-review="${t.id}">Mark reviewed ✓</button>`:''}<button class="more-button" data-delete="${t.id}" aria-label="Delete ${safe(t.name)}" title="Delete topic">···</button></div></div>`;
      list.append(card);
    }
  }
  function openTopic() { $('topicForm').reset(); $('firstInterval').value='1'; $('topicDialog').showModal(); setTimeout(()=>$('topicName').focus(),50); }
  $('addButton').addEventListener('click',openTopic);
  $('topicForm').addEventListener('submit',e=>{
    e.preventDefault(); const name=$('topicName').value.trim(); if(!name)return;
    const days=Number($('firstInterval').value)||1;
    topics.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),name,subject:$('topicSubject').value.trim(),created:today,next:addDays(today,days),stage:0,reviews:0,last:null});
    save(); $('topicDialog').close(); render(); toast('Topic added to your plan');
  });
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{ activeFilter=b.dataset.filter; document.querySelectorAll('.filter').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-selected',String(on));});render(); }));
  list.addEventListener('click',e=>{
    const rev=e.target.closest('[data-review]');
    if(rev){const t=topics.find(x=>x.id===rev.dataset.review);if(!t)return;t.reviews++;t.last=today;t.stage=Math.min((t.stage||0)+1,intervals.length-1);t.next=addDays(today,intervals[t.stage]);save();render();toast(`Next review · ${prettyDate(t.next)}`);return;}
    const del=e.target.closest('[data-delete]'); if(del){const t=topics.find(x=>x.id===del.dataset.delete);if(t&&confirm(`Delete “${t.name}” from your plan?`)){topics=topics.filter(x=>x.id!==t.id);save();render();toast('Topic deleted');}}
  });
  $('settingsButton').addEventListener('click',()=>{ $('reminderToggle').checked=settings.reminder; $('reminderTime').value=settings.time; $('settingsDialog').showModal(); });
  $('saveSettings').addEventListener('click',async()=>{
    const want=$('reminderToggle').checked;
    if(want&&'Notification'in window){const permission=await Notification.requestPermission(); if(permission!=='granted'){settings.reminder=false;toast('Notifications are blocked in browser settings');}else{settings.reminder=true;toast('Reminder preference saved');}}
    else if(want){settings.reminder=false;toast('This browser does not support notifications');}
    else settings.reminder=false;
    settings.time=$('reminderTime').value||'19:00';save();$('settingsDialog').close();
  });
  $('exportButton').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({topics,settings},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='recall-study-plan.json';a.click();URL.revokeObjectURL(a.href);});
  function toast(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2400);}
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installButton').hidden=false;});
  $('installButton').addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installButton').hidden=true;});
  if('serviceWorker'in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  render();
})();

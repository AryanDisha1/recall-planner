import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

(() => {
  const KEY = 'recall-topics-v1';
  const SETTINGS_KEY = 'recall-settings-v1';
  const DEFAULT_INTERVALS = [1, 3, 7, 15, 30, 60, 90, 120, 180, 365];
  const $ = (id) => document.getElementById(id);
  const IS_ANDROID = Capacitor.getPlatform() === 'android';
  if(IS_ANDROID)$('reminderHelp').textContent='The Android app schedules each upcoming review on your device, even when closed. Allow notifications and exact alarms for reminders at the selected time.';
  const list = $('topicList');
  let topics = read(KEY, []);
  let settings = { reminder: false, time: '19:00', subjects: [], intervals: DEFAULT_INTERVALS, ...read(SETTINGS_KEY, {}) };
  settings.intervals = parseIntervals(settings.intervals) || DEFAULT_INTERVALS;
  settings.theme = settings.theme === 'dark' ? 'dark' : 'light';
  function applyTheme() { document.documentElement.dataset.theme=settings.theme; const button=$('themeButton'); if(button){button.textContent=settings.theme==='dark'?'Light mode':'Dark mode';button.setAttribute('aria-pressed',String(settings.theme==='dark'));} }
  settings.subjects = Array.isArray(settings.subjects) ? settings.subjects : [];
  let activeFilter = 'all';
  let activeSubject = '';
  let editingTopicId = null;
  let installPrompt = null;
  let reminderDispatching = false;
  const today = dateKey(new Date());
  applyTheme();
  $('todayLabel').textContent = new Intl.DateTimeFormat(undefined, { weekday:'long', month:'long', day:'numeric' }).format(new Date());

  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function save() { localStorage.setItem(KEY, JSON.stringify(topics)); localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function addDays(date, n) { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate()+n); return dateKey(d); }
  function prettyDate(key) { const d = new Date(`${key}T12:00:00`); if (key===today) return 'Today'; if (key===addDays(today,1)) return 'Tomorrow'; return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(d); }
  function fullDate(key) { return new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric'}).format(new Date(`${key}T12:00:00`)); }
  function daysFromToday(key) { const a=new Date(`${today}T12:00:00`),b=new Date(`${key}T12:00:00`);return Math.round((b-a)/86400000); }
  function safe(text) { const e=document.createElement('span'); e.textContent=text; return e.innerHTML; }
  function parseIntervals(value) {
    const values = Array.isArray(value) ? value : String(value).split(',');
    const clean = [...new Set(values.map(x=>Number(String(x).trim())).filter(x=>Number.isInteger(x)&&x>0&&x<=3650))];
    return clean.length ? clean : null;
  }
  function subjectNames() {
    return [...new Set([...settings.subjects, ...topics.map(t=>t.subject).filter(Boolean)])].sort((a,b)=>a.localeCompare(b));
  }
  function refreshSubjectSelect(selected='') {
    const select=$('topicSubject');
    select.innerHTML='<option value="">No subject</option>'+subjectNames().map(s=>`<option value="${safe(s)}">${safe(s)}</option>`).join('');
    select.value=selected;
  }
  function refreshIntervalSelect(selected) {
    const select=$('firstInterval');
    select.innerHTML=settings.intervals.map(days=>`<option value="${days}">Day ${days} after adding</option>`).join('');
    select.value=String(settings.intervals.includes(selected)?selected:settings.intervals[0]);
  }
  function counts() { return { due:topics.filter(t=>!t.completed&&t.next<=today).length, done:topics.filter(t=>t.last===today).length }; }

  function renderSubjects() {
    const host=$('subjectList');
    const names=subjectNames();
    if (!names.length) {
      host.innerHTML='<div class="subject-empty">Add a subject such as Biology or History, then put its topics together in one plan.</div>';
      return;
    }
    host.innerHTML=names.map(name=>{
      const items=topics.filter(t=>t.subject===name);
      const due=items.filter(t=>!t.completed&&t.next<=today).length;
      return `<div class="subject-card ${activeSubject===name?'selected':''}"><button class="subject-open" type="button" data-subject="${safe(name)}"><span class="subject-symbol">${safe(name.trim().charAt(0).toUpperCase())}</span><span class="subject-copy"><strong>${safe(name)}</strong><small>${items.length} ${items.length===1?'topic':'topics'}  -  ${due} due</small></span><span class="subject-arrow">&#8250;</span></button></div>`;
    }).join('');
  }
  function render() {
    const {due,done}=counts();
    $('dueCount').textContent=due; $('topicCount').textContent=topics.length; $('doneCount').textContent=done;
    $('allCount').textContent=topics.length; $('filterDueCount').textContent=due;
    renderSubjects();
    const selectedTopics=topics.filter(t=>!activeSubject||t.subject===activeSubject);
    const filtered=selectedTopics.filter(t=>activeFilter==='all'||(activeFilter==='due'?(!t.completed&&t.next<=today):(!t.completed&&t.next>today))).sort((a,b)=>(a.next||'9999-12-31').localeCompare(b.next||'9999-12-31'));
    list.innerHTML='';
    if (!filtered.length) {
      const empty=document.createElement('div'); empty.className='empty-state';
      const isEmpty=topics.length===0;
      empty.innerHTML=`<div class="empty-icon">${isEmpty?'&#10022;':'&#9728;'}</div><h3>${isEmpty?'A fresh start':"You are all caught up"}</h3><p>${isEmpty?'Add your first topic and choose when you want to see it again.':'Nothing to review in this view. Enjoy the breathing room.'}</p>${isEmpty?'<button class="primary-button" id="emptyAdd">Add your first topic</button>':''}`;
      list.append(empty); const add=$('emptyAdd'); if(add)add.onclick=openTopic; return;
    }
    const groups=activeSubject?[[activeSubject,filtered]]:[...new Set(filtered.map(t=>t.subject||''))].sort((a,b)=>a.localeCompare(b)).map(subject=>[subject,filtered.filter(t=>(t.subject||'')===subject)]);
    for(const [subject,items] of groups){
      const group=document.createElement('div');group.className='topic-group';
      group.innerHTML=`<div class="topic-group-head"><h3>${safe(subject||'No subject')}</h3><span>${items.length} ${items.length===1?'topic':'topics'}</span></div>`;
      const cards=document.createElement('div');cards.className='topic-group-cards';
      for(const t of items) cards.append(createTopicCard(t));
      group.append(cards);list.append(group);
    }
  }
  function createTopicCard(t){
    const overdue=!t.completed&&t.next<today,isDue=!t.completed&&t.next<=today;
    const card=document.createElement('article');card.className='topic-card';
    const progress=t.completed?`Completed all ${settings.intervals.length} reviews`:`${t.reviews?`${t.reviews} ${t.reviews===1?'review':'reviews'}  -  `:''}Review ${Math.min((t.stage||0)+1,settings.intervals.length)} of ${settings.intervals.length}`;
    const history=t.history&&typeof t.history==='object'?t.history:{};
    const timeline=settings.intervals.map((days,index)=>({days,index})).filter(({days})=>days>=(t.firstInterval||settings.intervals[0])||(t.history&&t.history[addDays(t.created,days)])).map(({days,index})=>{
      const scheduled=addDays(t.created,days),target=!t.completed&&index===(t.stage||0)&&t.next?t.next:scheduled,done=history[target]||history[scheduled],legacyDone=!done&&index<(t.stage||0),delta=daysFromToday(target);
      const state=done||legacyDone?'completed':target<today?'missed':target===today?'today':'upcoming';
      const label=done?'Completed '+fullDate(done):legacyDone?'Completed (date not recorded)':state==='missed'?'Missed '+fullDate(target):state==='today'?'Due today':'In '+delta+' '+(delta===1?'day':'days')+' - '+fullDate(target);
      return '<li class="revision-'+state+'"><span>Day '+days+' - '+fullDate(target)+'</span><small>'+label+'</small></li>';
    }).join('');
    card.innerHTML=`<div class="topic-symbol">${safe((t.subject||t.name).trim().charAt(0).toUpperCase())}</div><div class="topic-main"><div class="topic-title">${safe(t.name)}</div><div class="topic-subject">${safe(t.subject||'Personal study')}</div></div><div class="topic-meta"><div class="due-label ${t.completed?'future':overdue?'late':isDue?'':'future'}">${t.completed?'Plan complete':overdue?'Overdue':isDue?'Due today':`Next - ${prettyDate(t.next)}`}</div><small>${progress}</small><div class="topic-actions">${isDue?`<button class="review-button" data-review="${t.id}">Mark reviewed</button>`:''}<button class="edit-button" data-edit="${t.id}" type="button">Edit</button><button class="more-button" data-delete="${t.id}" aria-label="Delete ${safe(t.name)}" title="Delete topic">Delete</button></div></div><details class="revision-timeline"><summary>Revision dates and history</summary><ul>${timeline}</ul></details>`;

    return card;
  }
  function openTopic() {
    editingTopicId=null;
    $('topicForm').reset();
    $('dialogTitle').textContent='Add a topic';$('topicSubmitButton').textContent='Add to my plan';
    $('topicStartDate').max=today;$('topicStartDate').value=today;
    $('topicStartWrap').hidden=false;$('firstIntervalWrap').hidden=false;$('nextReviewWrap').hidden=true;
    refreshSubjectSelect(activeSubject);
    refreshIntervalSelect(settings.intervals[0]);
    $('topicDialog').showModal();
    setTimeout(()=>$('topicName').focus(),50);
  }
  function openEditTopic(id){
    const t=topics.find(item=>item.id===id);if(!t)return;
    editingTopicId=id;$('topicName').value=t.name;
    refreshSubjectSelect(t.subject||'');refreshIntervalSelect(settings.intervals[0]);
    $('nextReviewDate').value=t.next;$('dialogTitle').textContent='Edit topic';
    $('topicSubmitButton').textContent='Save changes';$('topicStartWrap').hidden=true;$('firstIntervalWrap').hidden=true;$('nextReviewWrap').hidden=false;
    $('topicDialog').showModal();setTimeout(()=>$('topicName').focus(),50);
  }
  $('themeButton').addEventListener('click',()=>{settings.theme=settings.theme==='dark'?'light':'dark';applyTheme();save();});
  $('addButton').addEventListener('click',openTopic);
  $('addSubjectButton').addEventListener('click',()=>{$('subjectForm').reset();$('subjectDialog').showModal();setTimeout(()=>$('subjectName').focus(),50);});
  $('subjectForm').addEventListener('submit',e=>{
    e.preventDefault();
    const name=$('subjectName').value.trim();
    if(!name)return;
    if(subjectNames().some(s=>s.toLowerCase()===name.toLowerCase())){toast('That subject already exists');return;}
    settings.subjects.push(name);save();$('subjectDialog').close();render();toast('Subject added');
  });
  $('topicForm').addEventListener('submit',e=>{
    e.preventDefault(); const name=$('topicName').value.trim(); if(!name)return;
    if(editingTopicId){
      const t=topics.find(item=>item.id===editingTopicId);if(!t)return;
      const next=$('nextReviewDate').value;
      if(!next){toast('Choose the next review date');return;}
      t.name=name;t.subject=$('topicSubject').value;t.next=next;t.completed=false;
      editingTopicId=null;save();$('topicDialog').close();render();toast('Plan updated');syncNativeReminders();return;
    }
    const start=$('topicStartDate').value||today;
    if(start>today){toast('Choose today or an earlier start date');return;}
    const days=Number($('firstInterval').value)||settings.intervals[0];
    const stage=Math.max(0,settings.intervals.indexOf(days));
    topics.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),name,subject:$('topicSubject').value,created:start,next:addDays(start,days),firstInterval:days,stage,reviews:0,last:null,completed:false});
    save(); $('topicDialog').close(); render(); toast('Topic added to your plan');syncNativeReminders();
  });
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  document.querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{ activeFilter=b.dataset.filter; document.querySelectorAll('.filter').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-selected',String(on));});render(); }));
  $('subjectList').addEventListener('click',e=>{
    const card=e.target.closest('[data-subject]');if(!card)return;
    activeSubject=activeSubject===card.dataset.subject?'':card.dataset.subject;
    render();$('topicList').scrollIntoView({behavior:'smooth',block:'start'});
  });
  list.addEventListener('click',e=>{
    const edit=e.target.closest('[data-edit]');
    if(edit){openEditTopic(edit.dataset.edit);return;}
    const rev=e.target.closest('[data-review]');
    if(rev){
      const t=topics.find(x=>x.id===rev.dataset.review);if(!t)return;
      t.history=t.history&&typeof t.history==='object'?t.history:{};if(t.next)t.history[t.next]=today;
      t.reviews++;t.last=today;
      const intervals=settings.intervals;
      let nextStage=Math.min(Math.max(0,Number.isInteger(t.stage)?t.stage:0)+1,intervals.length);
      while(nextStage<intervals.length&&addDays(t.created,intervals[nextStage])<=today)nextStage++;
      if(nextStage>=intervals.length){t.stage=intervals.length-1;t.completed=true;t.next='';}
      else{t.stage=nextStage;t.next=addDays(t.created,intervals[nextStage]);}
      save();render();toast(t.completed?'You completed this revision plan':`Next review  -  day ${intervals[t.stage]} after starting`);syncNativeReminders();return;
    }
    const del=e.target.closest('[data-delete]'); if(del){const t=topics.find(x=>x.id===del.dataset.delete);if(t&&confirm(`Delete "${t.name}"? This cannot be undone.`)){topics=topics.filter(x=>x.id!==t.id);save();render();toast('Topic deleted');syncNativeReminders();}}
  });
  $('settingsButton').addEventListener('click',()=>{
    $('reminderToggle').checked=settings.reminder;
    $('reminderTime').value=settings.time;
    $('intervalSettings').value=settings.intervals.join(', ');
    $('settingsDialog').showModal();
  });
  $('saveSettings').addEventListener('click',async()=>{
    const chosenIntervals=parseIntervals($('intervalSettings').value);
    if(!chosenIntervals){toast('Enter at least one positive day interval');return;}
    settings.intervals=chosenIntervals;
    const want=$('reminderToggle').checked;
    if(want&&IS_ANDROID){
      try{const permission=await LocalNotifications.requestPermissions();settings.reminder=permission.display==='granted';toast(settings.reminder?'Android notifications enabled':'Allow notifications in Android settings');}
      catch{settings.reminder=false;toast('Android notification permission was not granted');}
    }else if(want&&'Notification'in window){const permission=await Notification.requestPermission(); if(permission!=='granted'){settings.reminder=false;toast('Notifications are blocked in browser settings');}else{settings.reminder=true;toast('Reminder preference saved');}}
    else if(want){settings.reminder=false;toast('This browser does not support notifications');}
    else settings.reminder=false;
    settings.time=$('reminderTime').value||'19:00';save();$('settingsDialog').close();render();
    if(IS_ANDROID)syncNativeReminders();else checkDailyReminder();
  });
  $('exportButton').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({topics,settings},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='recall-study-plan.json';a.click();URL.revokeObjectURL(a.href);});
  $('importButton').addEventListener('click',()=>$('importInput').click());
  $('importInput').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    try{
      const backup=JSON.parse(await file.text());
      if(!Array.isArray(backup.topics)||!backup.settings||typeof backup.settings!=='object')throw new Error('Invalid backup');
      if(!confirm('Import this backup and replace the topics currently saved on this device?'))return;
      topics=backup.topics;settings={reminder:false,time:'19:00',subjects:[],intervals:DEFAULT_INTERVALS,...backup.settings};
      settings.reminder=false;settings.intervals=parseIntervals(settings.intervals)||DEFAULT_INTERVALS;settings.subjects=Array.isArray(settings.subjects)?settings.subjects:[];settings.theme=settings.theme==='dark'?'dark':'light';applyTheme();
      save();refreshSubjectSelect();refreshIntervalSelect(settings.intervals[0]);render();
      if(IS_ANDROID)syncNativeReminders();
      toast('Backup imported. Enable reminders on this device in Settings.');
    }catch{toast('That file is not a valid Recall backup');}
    finally{e.target.value='';}
  });
  function toast(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2400);}
  async function checkDailyReminder(){
    if(IS_ANDROID)return;
    if(reminderDispatching||!settings.reminder||!('Notification'in window)||Notification.permission!=='granted')return;
    const now=new Date(),day=dateKey(now);
    if(settings.reminderSentDate===day)return;
    const due=topics.filter(t=>!t.completed&&t.next<=day).length;
    if(!due)return;
    const [hour,minute]=(settings.time||'19:00').split(':').map(Number);
    if(now.getHours()*60+now.getMinutes()<hour*60+minute)return;
    reminderDispatching=true;
    const title=`Recall  -  ${due} ${due===1?'topic':'topics'} due`;
    const options={body:'Open Recall to review your study plan.',icon:'./icon.svg',badge:'./icon.svg',tag:'recall-daily-review',renotify:false};
    try{
      if('serviceWorker'in navigator){const registration=await navigator.serviceWorker.ready;await registration.showNotification(title,options);}
      else new Notification(title,options);
      settings.reminderSentDate=day;save();
    }catch(error){console.warn('Could not show the Recall reminder.',error);}
    finally{reminderDispatching=false;}
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkDailyReminder();});
  setInterval(checkDailyReminder,30*1000);
  function notificationId(value){let hash=2166136261;for(const char of String(value))hash=Math.imul(hash^char.charCodeAt(0),16777619);return(hash>>>0)&0x7fffffff||1;}
  async function syncNativeReminders(){
    if(!IS_ANDROID)return;
    try{
      await LocalNotifications.cancelAll();
      if(!settings.reminder)return;
      const permission=await LocalNotifications.checkPermissions();
      if(permission.display!=='granted')return;
      await LocalNotifications.createChannel({id:'review-reminders',name:'Study reminders',importance:5,vibration:true});
      const [hour,minute]=(settings.time||'19:00').split(':').map(Number);
      const now=new Date(),todayKey=dateKey(now),byDate=new Map();
      for(const t of topics.filter(item=>!item.completed&&item.next)){
        const stage=Math.max(0,Number.isInteger(t.stage)?t.stage:0);
        const dates=[t.next];
        for(let index=stage+1;index<settings.intervals.length;index++){
          const target=addDays(t.created,settings.intervals[index]);
          if(target>t.next)dates.push(target);
        }
        for(const targetDate of new Set(dates)){
          let trigger=new Date(`${targetDate}T00:00:00`);trigger.setHours(hour,minute,0,0);
          if(trigger<=now){trigger=new Date(`${todayKey}T00:00:00`);trigger.setHours(hour,minute,0,0);if(trigger<=now)trigger.setDate(trigger.getDate()+1);}
          const key=dateKey(trigger);
          if(!byDate.has(key))byDate.set(key,{trigger,topics:new Map()});
          byDate.get(key).topics.set(t.id,t.name);
        }
      }
      const notifications=[...byDate.entries()].map(([date,group])=>{
        const names=[...group.topics.values()];
        const summary=names.slice(0,3).join(', ')+(names.length>3?` + ${names.length-3} more`:'');
        return{id:notificationId(`recall-${date}`),title:`Recall  -  ${names.length} ${names.length===1?'topic':'topics'} to review`,body:summary,channelId:'review-reminders',schedule:{at:group.trigger,allowWhileIdle:true},isExactNotification:true};
      });
      if(notifications.length){
        const result=await LocalNotifications.schedule({notifications});
        if(result.warning)toast('Allow exact alarms in Android settings for reminders at the selected time');
      }
    }catch(error){console.error('Could not schedule Android reminders.',error);}
  }
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installButton').hidden=false;});
  $('installButton').addEventListener('click',async()=>{if(!installPrompt){toast('In Chrome, open the three-dot menu and choose Install app or Add to Home screen.');return;}installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installButton').hidden=true;});
  if(!IS_ANDROID)$('installButton').hidden=false;
  if(!IS_ANDROID&&'serviceWorker'in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').then(()=>checkDailyReminder()).catch(()=>{});
  if(IS_ANDROID)syncNativeReminders();else checkDailyReminder();
  refreshSubjectSelect();refreshIntervalSelect(settings.intervals[0]);render();
})();



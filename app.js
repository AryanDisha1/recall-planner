(() => {
  const KEY = 'recall-topics-v1';
  const SETTINGS_KEY = 'recall-settings-v1';
  const DEFAULT_INTERVALS = [1, 3, 7, 15, 30, 60, 90, 120, 180, 365];
  const $ = (id) => document.getElementById(id);
  const list = $('topicList');
  let topics = read(KEY, []);
  let settings = { reminder: false, time: '19:00', subjects: [], intervals: DEFAULT_INTERVALS, ...read(SETTINGS_KEY, {}) };
  settings.intervals = parseIntervals(settings.intervals) || DEFAULT_INTERVALS;
  settings.subjects = Array.isArray(settings.subjects) ? settings.subjects : [];
  let activeFilter = 'all';
  let activeSubject = '';
  let editingTopicId = null;
  let installPrompt = null;
  const today = dateKey(new Date());
  $('todayLabel').textContent = new Intl.DateTimeFormat(undefined, { weekday:'long', month:'long', day:'numeric' }).format(new Date());

  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function save() { localStorage.setItem(KEY, JSON.stringify(topics)); localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
  function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function addDays(date, n) { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate()+n); return dateKey(d); }
  function prettyDate(key) { const d = new Date(`${key}T12:00:00`); if (key===today) return 'Today'; if (key===addDays(today,1)) return 'Tomorrow'; return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(d); }
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
      return `<div class="subject-card ${activeSubject===name?'selected':''}"><button class="subject-open" type="button" data-subject="${safe(name)}"><span class="subject-symbol">${safe(name.trim().charAt(0).toUpperCase())}</span><span class="subject-copy"><strong>${safe(name)}</strong><small>${items.length} ${items.length===1?'topic':'topics'} · ${due} due</small></span><span class="subject-arrow">›</span></button></div>`;
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
      empty.innerHTML=`<div class="empty-icon">${isEmpty?'✳':'☀'}</div><h3>${isEmpty?'A fresh start':'You’re all caught up'}</h3><p>${isEmpty?'Add your first topic and choose when you want to see it again.':'Nothing to review in this view. Enjoy the breathing room.'}</p>${isEmpty?'<button class="primary-button" id="emptyAdd">Add your first topic</button>':''}`;
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
    const progress=t.completed?`Completed all ${settings.intervals.length} reviews`:`${t.reviews?`${t.reviews} ${t.reviews===1?'review':'reviews'} · `:''}Review ${Math.min((t.stage||0)+1,settings.intervals.length)} of ${settings.intervals.length}`;
    card.innerHTML=`<div class="topic-symbol">${safe((t.subject||t.name).trim().charAt(0).toUpperCase()||'•')}</div><div class="topic-main"><div class="topic-title">${safe(t.name)}</div><div class="topic-subject">${safe(t.subject||'Personal study')}</div></div><div class="topic-meta"><div class="due-label ${t.completed?'future':overdue?'late':isDue?'':'future'}">${t.completed?'Plan complete':overdue?'Overdue':isDue?'Due today':`Next · ${prettyDate(t.next)}`}</div><small>${progress}</small><div class="topic-actions">${isDue?`<button class="review-button" data-review="${t.id}">Mark reviewed ✓</button>`:''}<button class="edit-button" data-edit="${t.id}" type="button">Edit</button><button class="more-button" data-delete="${t.id}" aria-label="Delete ${safe(t.name)}" title="Delete topic">···</button></div></div>`;
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
      editingTopicId=null;save();$('topicDialog').close();render();toast('Plan updated');return;
    }
    const start=$('topicStartDate').value||today;
    if(start>today){toast('Choose today or an earlier start date');return;}
    const days=Number($('firstInterval').value)||settings.intervals[0];
    const stage=Math.max(0,settings.intervals.indexOf(days));
    topics.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),name,subject:$('topicSubject').value,created:start,next:addDays(start,days),stage,reviews:0,last:null,completed:false});
    save(); $('topicDialog').close(); render(); toast('Topic added to your plan');
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
      t.reviews++;t.last=today;
      const intervals=settings.intervals;
      let nextStage=Math.min(Math.max(0,Number.isInteger(t.stage)?t.stage:0)+1,intervals.length);
      while(nextStage<intervals.length&&addDays(t.created,intervals[nextStage])<=today)nextStage++;
      if(nextStage>=intervals.length){t.stage=intervals.length-1;t.completed=true;t.next='';}
      else{t.stage=nextStage;t.next=addDays(t.created,intervals[nextStage]);}
      save();render();toast(t.completed?'You completed this revision plan':`Next review · day ${intervals[t.stage]} after starting`);return;
    }
    const del=e.target.closest('[data-delete]'); if(del){const t=topics.find(x=>x.id===del.dataset.delete);if(t&&confirm(`Delete “${t.name}” from your plan?`)){topics=topics.filter(x=>x.id!==t.id);save();render();toast('Topic deleted');}}
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
    if(want&&'Notification'in window){const permission=await Notification.requestPermission(); if(permission!=='granted'){settings.reminder=false;toast('Notifications are blocked in browser settings');}else{settings.reminder=true;toast('Reminder preference saved');}}
    else if(want){settings.reminder=false;toast('This browser does not support notifications');}
    else settings.reminder=false;
    settings.time=$('reminderTime').value||'19:00';save();$('settingsDialog').close();render();
  });
  $('exportButton').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({topics,settings},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='recall-study-plan.json';a.click();URL.revokeObjectURL(a.href);});
  function toast(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2400);}
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installButton').hidden=false;});
  $('installButton').addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installButton').hidden=true;});
  if('serviceWorker'in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  refreshSubjectSelect();refreshIntervalSelect(settings.intervals[0]);render();
})();

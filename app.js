
(function(){
'use strict';
var CQ=window.CQ;
var doc=null;
var $=function(s){return document.querySelector(s)};
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var shuffle=CQ.shuffle;
var pick=CQ.pick;

/* ---------- persistent progress ---------- */
var store={xp:0,badges:{},docs:0,games:0,best:0,sound:true,name:'',avatar:'#ffd93d'};
try{var raw=localStorage.getItem('chapterquest');if(raw)Object.assign(store,JSON.parse(raw))}catch(e){}
function save(){try{localStorage.setItem('chapterquest',JSON.stringify(store))}catch(e){}}

var BADGES=[
  {id:'first',name:'First Steps',desc:'Finish your first quiz',ic:'1'},
  {id:'perfect',name:'Perfect Page',desc:'Get every answer right',ic:'100'},
  {id:'fire',name:'On Fire',desc:'Reach a streak of 5',ic:'x5'},
  {id:'speed',name:'Quick Draw',desc:'Answer 3 questions in under 5 seconds',ic:'3s'},
  {id:'worm',name:'Bookworm',desc:'Open 3 different chapters',ic:'3'},
  {id:'back',name:'Comeback Kid',desc:'Clear every mistake in practice',ic:'+'},
  {id:'lvl3',name:'Level 3',desc:'Reach level 3',ic:'L3'}
];

/* ---------- audio, speech, toast, confetti ---------- */
var actx;
function beep(f,d,t){if(!store.sound)return;try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();var o=actx.createOscillator(),g=actx.createGain();o.type=t||'sine';o.frequency.value=f;g.gain.value=.06;o.connect(g);g.connect(actx.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+(d||.12));o.stop(actx.currentTime+(d||.12))}catch(e){}}
function good(){beep(660,.1);setTimeout(function(){beep(880,.14)},90)}
function bad(){beep(180,.25,'sawtooth')}
function speak(t){try{speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(t.replace(/_{3,}/g,'blank')))}catch(e){}}
var tt;function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('on')},2600)}
function confetti(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var c=$('#confetti'),x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;
  var cols=['#ffd93d','#e5484d','#3a6df0','#1f9d63','#ff8a3d'];
  var ps=[];for(var i=0;i<140;i++)ps.push({x:Math.random()*c.width,y:-20-Math.random()*c.height*.5,vx:(Math.random()-.5)*4,vy:2+Math.random()*4,s:5+Math.random()*7,r:Math.random()*6,vr:(Math.random()-.5)*.3,c:pick(cols)});
  var f=0;(function tick(){x.clearRect(0,0,c.width,c.height);ps.forEach(function(p){p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);x.restore()});f++;if(f<200)requestAnimationFrame(tick);else x.clearRect(0,0,c.width,c.height)})();
}

/* ---------- views ---------- */
var VIEWS=['home','load','setup','quiz','result','cards','profile'];
var lastView='home',curView='home';
function show(v){if(v!=='profile')lastView=v;curView=v;VIEWS.forEach(function(n){$('#v-'+n).hidden=n!==v});window.scrollTo(0,0)}
function err(m){var e=$('#err');e.textContent=m;e.hidden=!m}

var RANKS=['Rookie','Explorer','Scholar','Champion','Genius'];
var COLORS=['#ffd93d','#ff8a65','#4dd0a1','#64b5f6','#ba8cf0','#f48fb1'];
function initial(){return (store.name||'S').trim().charAt(0).toUpperCase()||'S'}
function paintProfileBits(L){
  ['#pav','#pav2'].forEach(function(id){var e=$(id);e.textContent=initial();e.style.background=store.avatar})
  $('#pnm').textContent=store.name?store.name.split(' ')[0]:'Profile';
}
function renderProfile(){
  var L=1+Math.floor(store.xp/600),got=BADGES.filter(function(b){return store.badges[b.id]});
  paintProfileBits();
  $('#pname').value=store.name||'';
  $('#prank').textContent=RANKS[Math.min(RANKS.length-1,Math.floor((L-1)/2))]+', level '+L;
  $('#pstats').innerHTML=[[store.xp,'total XP'],[store.games,'quizzes played'],[store.best,'best round (XP)'],[got.length+' / '+BADGES.length,'badges']]
    .map(function(a){return '<div class="stat"><b>'+a[0]+'</b>'+a[1]+'</div>'}).join('');
  $('#pbadges').innerHTML=got.length?got.map(function(b){return '<div class="badge on"><div class="ic">'+b.ic+'</div><div><b>'+b.name+'</b><small>'+b.desc+'</small></div></div>'}).join(''):'<p class="muted" style="margin:0">No badges yet. Finish a quiz to earn your first one.</p>';
  $('#swatches').innerHTML=COLORS.map(function(c){return '<label><input type="radio" name="av" value="'+c+'" aria-label="Colour '+c+'"'+(c===store.avatar?' checked':'')+'><span style="background:'+c+'"></span></label>'}).join('');
  [].forEach.call(document.querySelectorAll('input[name="av"]'),function(r){r.onchange=function(){store.avatar=r.value;save();paintProfileBits()}});
  var b=$('#preset');b.textContent='Reset progress';b.dataset.armed='';
}
function updateMe(){
  var L=1+Math.floor(store.xp/600),p=(store.xp%600)/600;
  $('#lvl').textContent=L;$('#xpfill').style.width=(p*100)+'%';$('#xptxt').textContent=store.xp+' XP';
  $('#xpbar').setAttribute('aria-valuenow',Math.round(p*100));
  paintProfileBits();
  $('#snd').textContent=store.sound?'Sound on':'Sound off';$('#snd').setAttribute('aria-pressed',String(store.sound));
  return L;
}
function renderBadges(){
  $('#badges').innerHTML=BADGES.map(function(b){var on=store.badges[b.id];
    return '<div class="badge'+(on?' on':'')+'"><div class="ic">'+b.ic+'</div><div><b>'+b.name+'</b><small>'+b.desc+(on?'':' (locked)')+'</small></div></div>'}).join('');
}

/* ---------- reading the PDF ---------- */
async function readPdf(f){
  if(!window.pdfjsLib)throw new Error('The PDF reader did not load. Check your connection, or paste your text instead.');
  try{pdfjsLib.GlobalWorkerOptions.workerSrc='lib/pdf.worker.js'}catch(e){}
  var buf=await f.arrayBuffer();
  var pdf=await pdfjsLib.getDocument({data:buf}).promise;
  var total=Math.min(pdf.numPages,80),pages=[],chars=0;
  for(var i=1;i<=total;i++){
    $('#loadmsg').textContent='Reading page '+i+' of '+total;
    var pg=await pdf.getPage(i),tc=await pg.getTextContent(),t='',prev=null;
    for(var k=0;k<tc.items.length;k++){
      var it=tc.items[k];if(typeof it.str!=='string')continue;
      if(prev){var dy=Math.abs(it.transform[5]-prev.transform[5]);
        if(dy>2||(it.transform[4]-(prev.transform[4]+prev.width))>1.5)t+=' ';}
      t+=it.str;prev=it;
    }
    chars+=t.length;pages.push({n:i,text:t});
  }
  if(chars<300)throw new Error('This PDF has almost no readable text. It may be a scan. Try a text-based PDF or paste the text.');
  return pages;
}

/* ---------- analysing text ---------- */
/* ---------- document setup ---------- */
function loadRecents(){try{return JSON.parse(localStorage.getItem('cq-recent')||'[]')}catch(e){return []}}
function saveRecent(name,pages,unit){
  var list=loadRecents().filter(function(r){return r.name!==name});
  list.unshift({name:name,unit:unit,pages:pages,at:Date.now()});
  while(list.length){try{localStorage.setItem('cq-recent',JSON.stringify(list.slice(0,5)));break}catch(e){list.pop()}}
  renderRecents();
}
function renderRecents(){
  var l=loadRecents(),box=$('#recents');box.hidden=!l.length;if(!l.length)return;
  $('#reclist').innerHTML=l.map(function(r,i){var n=r.pages.length;return '<button class="badge on recbtn" data-i="'+i+'" type="button"><div class="ic">'+n+'</div><div><b>'+esc(r.name)+'</b><small>'+n+' '+(r.unit==='Page'?'pages':'parts')+'. Tap to reopen.</small></div></button>'}).join('');
  [].forEach.call(document.querySelectorAll('.recbtn'),function(b){b.onclick=function(){var r=loadRecents()[+b.dataset.i];if(r)prepare(r.name,r.pages,r.unit,true)}});
}
function download(name,text){
  if(window.CQAndroid){try{window.CQAndroid.shareText(name,text);return}catch(e){}}
  try{var u=URL.createObjectURL(new Blob([text],{type:'text/plain'})),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},1500);toast('Worksheet saved')}
  catch(e){try{navigator.clipboard.writeText(text);toast('Copied the worksheet. Paste it into a document.')}catch(x){toast('Could not save the worksheet here')}}
}
function prepare(name,pages,unit,fromRecent){
  var an;try{an=CQ.analyze(pages)}catch(e){show('home');err(e.message);return}
  doc={name:name,pages:pages,unit:unit,an:an};
  store.docs++;save();if(!fromRecent||true)saveRecent(name,pages,unit);
  $('#docname').textContent=name;
  $('#stats').innerHTML=[[pages.length,unit==='Page'?'pages read':'parts read'],[an.sents.length,'usable sentences'],[Math.min(an.sents.length,20),'questions possible'],[an.pool.length,'key terms']]
    .map(function(a){return '<div class="stat"><b>'+a[0]+'</b>'+a[1]+'</div>'}).join('');
  $('#terms').innerHTML=an.pool.slice(0,14).map(function(k){return '<span class="chip">'+esc(k.term)+'</span>'}).join('');
  show('setup');
}
function seg(id,name,items,def){
  $(id).innerHTML=items.map(function(it){return '<label><input type="radio" name="'+name+'" value="'+it[0]+'"'+(String(it[0])===String(def)?' checked':'')+'><span>'+it[1]+'</span></label>'}).join('');
}
var PACE={relaxed:{lim:0,hearts:false,help:'No timer. Take your time.'},standard:{lim:25,hearts:false,help:'25 seconds a question. Faster answers earn bonus XP.'},speed:{lim:12,hearts:true,help:'12 seconds a question and 3 lives. Lose them all and the round ends.'}};
function opt(name){var r=document.querySelector('input[name="'+name+'"]:checked');return r?r.value:null}
function pacehelp(){$('#pacehelp').textContent=PACE[opt('pace')].help}

async function handleFile(f){
  if(!f)return;err('');
  if(!/\.pdf$/i.test(f.name)&&f.type!=='application/pdf'){err('Please choose a PDF file.');return}
  if(f.size>30*1024*1024){err('That PDF is over 30 MB. Try a smaller chapter.');return}
  show('load');$('#loadmsg').textContent='Opening file';
  try{var pages=await readPdf(f);prepare(f.name.replace(/\.pdf$/i,''),pages,'Page')}
  catch(e){show('home');err(e.message||'Could not read that PDF.')}
}
var SAMPLE=[
 "Photosynthesis is the process by which green plants, algae, and some bacteria convert light energy into chemical energy stored in glucose. Chloroplasts are the organelles inside plant cells where photosynthesis takes place. Chlorophyll is the green pigment in chloroplasts that absorbs sunlight, mostly in the red and blue wavelengths. Plants take in carbon dioxide from the air through tiny pores on their leaves called stomata. Roots absorb water from the soil, and the xylem carries that water up to the leaves. During the light-dependent reactions, sunlight splits water molecules and releases oxygen as a by-product. The energy captured from sunlight is stored temporarily in molecules called ATP and NADPH.",
 "The Calvin cycle uses ATP and NADPH to build glucose from carbon dioxide in the stroma of the chloroplast. Glucose produced during photosynthesis can be used immediately for energy or stored as starch for later use. The overall reaction needs six molecules of carbon dioxide and six molecules of water to make one molecule of glucose. Most plants perform photosynthesis best at temperatures between 15 and 35 degrees Celsius, and the rate slows down outside this range. Light intensity, carbon dioxide concentration, and temperature are the three main factors that limit the rate of photosynthesis. Respiration is the opposite process, releasing energy from glucose by using oxygen inside the mitochondria of cells. Without photosynthesis, almost all food chains on Earth would collapse because producers form the base of every food chain. Leaves are usually thin and flat so that they can capture as much sunlight as possible while allowing gases to move easily."
];

/* ---------- quiz engine ---------- */
var game=null;
function hearts(){
  var g=game;$('#hearts').hidden=!g.useHearts;if(!g.useHearts)return;
  var h='';for(var i=0;i<3;i++)h+='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z" fill="'+(i<g.hearts?'var(--pen)':'none')+'" stroke="var(--ink)" stroke-width="2"/></svg>';
  $('#hearts').innerHTML=h;
}
function hud(bump){
  var g=game;$('#gxp').textContent=g.xp+' XP';
  $('#streak').textContent=g.streak>1?'Streak x'+g.streak:'Streak 0';
  if(bump){var e=$('#gxp');e.classList.remove('bump');void e.offsetWidth;e.classList.add('bump')}
  hearts();
}
function startGame(qs,practice){
  var p=PACE[doc.opts.pace];
  game={qs:qs,i:0,xp:0,streak:0,best:0,hearts:3,useHearts:p.hearts,limit:p.lim,correct:0,wrong:[],hintsLeft:2,fast:0,t0:Date.now(),answered:false,hinted:false,practice:!!practice,tid:null,qStart:0};
  show('quiz');renderQ();
}
function stopTimer(){clearInterval(game&&game.tid)}
function startTimer(){
  stopTimer();var g=game;g.qStart=performance.now();$('#timerw').hidden=!g.limit;if(!g.limit)return;
  var f=$('#tfill');f.style.width='100%';f.classList.remove('low');
  g.tid=setInterval(function(){
    var left=Math.max(0,1-(performance.now()-g.qStart)/(g.limit*1000));
    f.style.width=(left*100)+'%';f.classList.toggle('low',left<.25);
    if(left<=0)answer(null);
  },100);
}
function renderQ(){
  var g=game,q=g.qs[g.i];g.answered=false;g.hinted=false;
  $('#qnum').textContent=(g.i+1)+' / '+g.qs.length;$('#pfill').style.width=(g.i/g.qs.length*100)+'%';
  $('#qtype').textContent={mcq:'Fill in the blank',tf:'True or false',scr:'Unscramble'}[q.type];
  $('#qpage').textContent=doc.unit+' '+q.page;
  $('#qprompt').textContent=q.prompt;
  var body=$('#qbody');body.innerHTML='';
  if(q.type==='scr'){
    body.innerHTML='<div class="tiles" aria-label="Scrambled letters">'+q.scr.split('').map(function(c){return '<span>'+esc(c)+'</span>'}).join('')+'</div><form id="sf" class="sform"><input id="sin" aria-label="Your answer" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="'+(q.answer.length+3)+'" placeholder="Type the word"><button class="btn primary" type="submit">Check</button></form>';
    $('#sf').onsubmit=function(e){e.preventDefault();var v=$('#sin').value.trim();if(v)answer(v)};
    setTimeout(function(){var i=$('#sin');if(i)i.focus()},60);
  }else{
    var wrap=document.createElement('div');wrap.className='opts';
    q.options.forEach(function(o,i){
      var b=document.createElement('button');b.className='opt';b.type='button';
      b.innerHTML='<kbd>'+(q.type==='tf'?(i?'F':'T'):i+1)+'</kbd><span>'+esc(o)+'</span>';
      b.onclick=function(){answer(i)};wrap.appendChild(b);
    });
    body.appendChild(wrap);
  }
  $('#hinttext').hidden=true;$('#fb').hidden=true;
  var h=$('#hint');h.disabled=g.hintsLeft<=0;h.textContent='Hint ('+g.hintsLeft+' left)';
  $('#listen').onclick=function(){speak(q.type==='tf'?'True or false. '+q.prompt:q.prompt)};
  hud();startTimer();
}
function useHint(){
  var g=game;if(!g||g.answered||g.hinted||g.hintsLeft<=0)return;
  var q=g.qs[g.i];g.hintsLeft--;g.hinted=true;
  var t=$('#hinttext');t.hidden=false;
  if(q.type==='mcq'){
    var btns=[].slice.call(document.querySelectorAll('#qbody .opt')),wrong=shuffle(btns.map(function(b,i){return i}).filter(function(i){return i!==q.correct})).slice(0,2);
    wrong.forEach(function(i){btns[i].classList.add('gone')});t.textContent='Two wrong answers removed.';
  }else if(q.type==='tf')t.textContent='Look closely at the key words. The answer is in '+doc.unit.toLowerCase()+' '+q.page+'.';
  else t.textContent='The word starts with "'+q.answer[0].toUpperCase()+'" and has '+q.answer.length+' letters.';
  $('#hint').disabled=g.hintsLeft<=0;$('#hint').textContent='Hint ('+g.hintsLeft+' left)';
}
function answer(val){
  var g=game;if(!g||g.answered)return;g.answered=true;stopTimer();
  var q=g.qs[g.i],ok,elapsed=(performance.now()-g.qStart)/1000;
  if(val===null)ok=false;else if(q.type==='scr')ok=String(val).toLowerCase()===q.answer.toLowerCase();else ok=val===q.correct;
  var correctText=q.type==='scr'?q.answer:q.options[q.correct],userText=val===null?'No answer (time ran out)':(q.type==='scr'?val:q.options[val]);
  if(q.type==='scr'){var i=$('#sin');i.disabled=true;i.classList.add(ok?'ok':'bad');[].forEach.call(document.querySelectorAll('#sf button'),function(b){b.disabled=true})}
  else{var btns=document.querySelectorAll('#qbody .opt');[].forEach.call(btns,function(b){b.disabled=true});btns[q.correct].classList.add('ok');if(!ok&&val!==null)btns[val].classList.add('bad')}
  var pts=0;
  if(ok){
    g.streak++;g.best=Math.max(g.best,g.streak);g.correct++;
    pts=100+Math.min(g.streak-1,5)*10+(g.limit?Math.round(50*Math.max(0,1-elapsed/g.limit)):0);
    if(g.hinted)pts=Math.max(50,pts-40);
    if(elapsed<5)g.fast++;
    g.xp+=pts;good();
  }else{
    g.streak=0;if(g.useHearts)g.hearts--;bad();
    g.wrong.push({q:q,ua:userText,ca:correctText});
  }
  var n=$('#fbnote');
  n.className='note'+(ok?' good':'');
  n.textContent=ok?pick(['Spot on!','Nice work!','Exactly right.','You nailed it!'])+' +'+pts+' XP':(val===null?'Time is up. ':'Not quite. ')+'The answer is '+correctText+'.';
  $('#fbsrc').textContent='From '+doc.unit.toLowerCase()+' '+q.page+': “'+q.src+'”';
  var last=g.i+1>=g.qs.length||(g.useHearts&&g.hearts<=0);
  $('#next').textContent=last?'See results':'Next';
  $('#fb').hidden=false;hud(ok);$('#next').focus({preventScroll:false});
}
function next(){
  var g=game;if(!g||!g.answered)return;
  g.i++;
  if(g.i>=g.qs.length||(g.useHearts&&g.hearts<=0))finish();else renderQ();
}

/* ---------- results ---------- */
var STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.2 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z" fill="FILL" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round"/></svg>';
function finish(){
  stopTimer();var g=game,total=g.qs.length,done=g.correct+g.wrong.length,acc=done?Math.round(g.correct/done*100):0;
  var stars=acc>=90?3:acc>=70?2:acc>=40?1:0,secs=Math.round((Date.now()-g.t0)/1000);
  var before=1+Math.floor(store.xp/600);
  store.xp+=g.xp;store.games++;store.best=Math.max(store.best,g.xp);
  var earned=[];
  function award(id,cond){if(cond&&!store.badges[id]){store.badges[id]=1;earned.push(BADGES.filter(function(b){return b.id===id})[0])}}
  award('first',true);award('perfect',acc===100&&done===total&&total>=5);award('fire',g.best>=5);award('speed',g.fast>=3);
  award('worm',store.docs>=3);award('back',g.practice&&g.wrong.length===0&&done===total);
  var after=updateMe();award('lvl3',after>=3);save();renderBadges();
  var msg=stars===3?'Brilliant work!':stars===2?'Great job!':stars===1?'Good start. Try the mistakes again.':'Every expert started here. Practise and retry.';
  var miss=g.wrong.map(function(w){return '<div class="miss"><p><b>'+esc(w.q.prompt)+'</b></p><p class="wrong">You said: '+esc(w.ua)+'</p><p class="right">Answer: '+esc(w.ca)+'</p><p class="muted">'+doc.unit+' '+w.q.page+'</p></div>'}).join('');
  $('#v-result').innerHTML=
   '<div class="card" style="text-align:center"><h2>'+(g.useHearts&&g.hearts<=0?'Out of lives':'Chapter complete')+'</h2>'+
   '<div class="stars" role="img" aria-label="'+stars+' out of 3 stars" style="margin:14px 0">'+[0,1,2].map(function(i){return STAR.replace('FILL',i<stars?'var(--hl)':'none')}).join('')+'</div>'+
   '<div class="score mono">+'+g.xp+' XP</div><p class="note good" style="transform:none;margin:10px 0 0">'+msg+'</p>'+
   (after>before?'<p><span class="newb">Level up! You are level '+after+'</span></p>':'')+
   (earned.length?'<p>'+earned.map(function(b){return '<span class="newb">Badge: '+b.name+'</span>'}).join('')+'</p>':'')+'</div>'+
   '<div class="stats"><div class="stat"><b>'+acc+'%</b>accuracy ('+g.correct+' of '+done+')</div><div class="stat"><b>x'+g.best+'</b>best streak</div><div class="stat"><b>'+secs+'s</b>total time</div></div>'+
   (g.wrong.length?'<details class="mist card" open><summary>Review your mistakes ('+g.wrong.length+')</summary>'+miss+'</details>':'')+
   '<div class="row" style="justify-content:center">'+
   (g.wrong.length?'<button class="btn primary" id="r-prac">Practise mistakes</button>':'')+
   '<button class="btn'+(g.wrong.length?'':' primary')+'" id="r-again">New questions</button><button class="btn" id="r-cards">Flashcards</button><button class="btn" id="r-new">New PDF</button></div>';
  show('result');
  if(acc>=60){confetti();beep(523,.12);setTimeout(function(){beep(659,.12)},120);setTimeout(function(){beep(784,.2)},240)}
  if(earned.length)toast('Badge unlocked: '+earned[0].name);
  var gw=g.wrong;
  if($('#r-prac'))$('#r-prac').onclick=function(){
    var order=['mcq','scr','tf'];
    var qs=shuffle(gw).map(function(w){var types=order.filter(function(t){return t!==w.q.type});var q;for(var i=0;i<types.length&&!q;i++){var cand=CQ.makeQ(types[i],w.q.s,doc.an);if(cand.type===types[i])q=cand}return q||CQ.makeQ('mcq',w.q.s,doc.an)});
    startGame(qs,true);
  };
  $('#r-again').onclick=function(){startGame(CQ.buildQuiz(doc.an,Math.min(doc.opts.n,doc.an.sents.length)))};
  $('#r-cards').onclick=startCards;
  $('#r-new').onclick=function(){show('home')};
}

/* ---------- flashcards ---------- */
var cards=[],ci=0,flipped=false;
function startCards(){
  var seen=new Set();cards=[];
  doc.an.sents.slice().sort(function(a,b){return b.cands[0].score-a.cands[0].score}).forEach(function(s){
    var c=s.cands[0];if(seen.has(c.lower)||cards.length>=12)return;seen.add(c.lower);
    cards.push({term:c.term,blank:s.text.slice(0,c.idx)+'_____'+s.text.slice(c.idx+c.len),full:s.text,page:s.page});
  });
  ci=0;flipped=false;show('cards');drawCard();
}
function drawCard(){
  var c=cards[ci];$('#cnum').textContent=(ci+1)+' / '+cards.length;
  $('#face').innerHTML=flipped?'<div class="term">'+esc(c.term)+'</div><div style="font-weight:600">'+esc(c.full)+'</div><div class="muted" style="font-size:.9rem">'+doc.unit+' '+c.page+'</div>':'<div class="muted" style="font-size:.9rem">What word fits the blank?</div><div>'+esc(c.blank)+'</div>';
}
function flip(){flipped=!flipped;drawCard()}
function step(d){ci=(ci+d+cards.length)%cards.length;flipped=false;drawCard()}

/* ---------- wiring ---------- */
function init(){
  updateMe();renderBadges();renderRecents();
  seg('#seg-n','n',[[5,'5'],[10,'10'],[15,'15'],[20,'20']],10);
  seg('#seg-pace','pace',[['relaxed','Relaxed'],['standard','Standard'],['speed','Speed round']],'standard');
  seg('#seg-mode','mode',[['quiz','Quiz'],['cards','Flashcards']],'quiz');
  pacehelp();
  $('#seg-pace').addEventListener('change',pacehelp);
  $('#file').addEventListener('change',function(e){handleFile(e.target.files[0]);e.target.value=''});
  var drop=$('#drop');
  ['dragenter','dragover'].forEach(function(n){drop.addEventListener(n,function(e){e.preventDefault();drop.classList.add('over')})});
  ['dragleave','drop'].forEach(function(n){drop.addEventListener(n,function(e){e.preventDefault();drop.classList.remove('over')})});
  drop.addEventListener('drop',function(e){handleFile(e.dataTransfer.files[0])});
  $('#sample').onclick=function(){err('');prepare('Photosynthesis (sample chapter)',SAMPLE.map(function(t,i){return {n:i+1,text:t}}),'Page')};
  $('#pastego').onclick=function(){var t=$('#pastetxt').value.trim();if(t.length<300){err('Paste at least a few paragraphs (300 characters or more).');return}err('');prepare('Pasted notes',CQ.chunk(t),'Part')};
  $('#back1').onclick=function(){show('home')};
  $('#start').onclick=function(){
    doc.opts={n:+opt('n'),pace:opt('pace'),mode:opt('mode')};
    if(doc.opts.mode==='cards')startCards();
    else{var n=Math.min(doc.opts.n,doc.an.sents.length);if(n<doc.opts.n)toast('Only '+n+' questions fit this text');startGame(CQ.buildQuiz(doc.an,n))}
  };
  $('#export').onclick=function(){var n=Math.min(+opt('n'),doc.an.sents.length),qs=CQ.buildQuiz(doc.an,n);download(doc.name.replace(/[^\w\- ]+/g,'').trim().replace(/\s+/g,'-')+'-worksheet.txt',CQ.worksheet(doc.name,qs,doc.unit))};
  $('#next').onclick=next;$('#hint').onclick=useHint;
  $('#quit').onclick=function(){if(game){stopTimer();game.qs.splice(game.i+(game.answered?1:0));if(game.i+(game.answered?1:0)<=0||(!game.correct&&!game.wrong.length)){show('setup');return}if(!game.answered)game.qs.length=game.i;finish()}};
  $('#cbak').onclick=function(){show('setup')};$('#cprev').onclick=function(){step(-1)};$('#cnext').onclick=function(){step(1)};$('#cflip').onclick=flip;$('#face').onclick=flip;
  $('#prof').onclick=function(){
    if(curView==='quiz'){toast('Finish or quit the quiz first');return}
    if(curView==='profile'){show(lastView);return}
    renderProfile();show('profile');
  };
  $('#pback').onclick=function(){show(lastView==='load'||lastView==='quiz'?'home':lastView)};
  $('#pname').addEventListener('input',function(e){store.name=e.target.value.replace(/\s+/g,' ').slice(0,24);save();paintProfileBits()});
  $('#preset').onclick=function(){
    var b=$('#preset');
    if(!b.dataset.armed){b.dataset.armed='1';b.textContent='Tap again to confirm';return}
    store.xp=0;store.badges={};store.docs=0;store.games=0;store.best=0;save();updateMe();renderBadges();renderProfile();toast('Progress reset');
  };
  $('#snd').onclick=function(){store.sound=!store.sound;save();updateMe();if(store.sound)good()};
  [].forEach.call(document.querySelectorAll('#demoopts .opt'),function(b){b.onclick=function(){
    [].forEach.call(document.querySelectorAll('#demoopts .opt'),function(x){x.disabled=true;if(x.dataset.ok==='1')x.classList.add('ok')});
    if(b.dataset.ok!=='1')b.classList.add('bad');$('#demonote').hidden=false;$('#demonote').textContent=b.dataset.ok==='1'?'Spot on! +120 XP':'Not quite. It is Chlorophyll.';(b.dataset.ok==='1'?good:bad)();
  }});
  document.addEventListener('keydown',function(e){
    if(e.metaKey||e.ctrlKey||e.altKey)return;
    if(!$('#v-cards').hidden){if(e.key==='ArrowRight')step(1);else if(e.key==='ArrowLeft')step(-1);else if(e.key===' '&&e.target.id!=='cflip'&&e.target.tagName!=='BUTTON'){e.preventDefault();flip()}return}
    if($('#v-quiz').hidden||!game)return;
    var typing=e.target.tagName==='INPUT';
    if(game.answered){if(e.key==='Enter'&&e.target.id!=='next'){e.preventDefault();next()}return}
    if(typing)return;
    var q=game.qs[game.i];
    if(q.type==='mcq'&&/^[1-4]$/.test(e.key)&&+e.key<=q.options.length)answer(+e.key-1);
    else if(q.type==='tf'&&(e.key==='t'||e.key==='T'))answer(0);
    else if(q.type==='tf'&&(e.key==='f'||e.key==='F'))answer(1);
  });
}
init();
try{if('serviceWorker' in navigator&&/^https?:/.test(location.protocol))navigator.serviceWorker.register('sw.js')}catch(e){}
})();

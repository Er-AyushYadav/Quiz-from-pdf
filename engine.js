/* Chapter Quest engine: turns text into questions. No DOM, runs in browser or Node. */
(function(root){
'use strict';
var shuffle=function(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.random()*(i+1)|0;var t=a[i];a[i]=a[j];a[j]=t}return a};
var pick=function(a){return a[Math.random()*a.length|0]};
var SUF=/(ly|ed|ing|ible|able|ous|ive|ful|less|ical)$/;
var STOP=new Set('inside convert contain contains include includes become becomes allow allows provide provides possible main immediately outside range later instead process produced captured stored based different important certain several specific given large small major common similar various whole early along across rather quite mostly likely general specific amount number type types part parts form forms level levels result results about above after again against all also although always among and another any are around because been before being below between both but can could did does doing down during each either else even every few for from further had has have having her here hers him his how however into its itself just like made make many may more most much must neither nor not now off once only other our out over own same she should since some such than that the their theirs them then there these they this those through thus too under until upon very was were what when where whether which while who whom whose why will with within without would yet you your often called known used using use uses one two three said says first second new usually most almost'.split(' '));
function analyze(pages){
  var sents=[];
  pages.forEach(function(p){
    var t=p.text.replace(/\s+/g,' ').trim();
    t.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/).forEach(function(s){
      s=s.trim();var w=s.split(' ').length,letters=(s.match(/[A-Za-z]/g)||[]).length;
      if(s.length<45||s.length>230||w<8||w>35)return;
      if(letters/s.length<.75)return;
      if(/https?:|www\.|©|@/.test(s))return;
      if(!/[.!?]$/.test(s)||!/^[A-Z"“(]/.test(s))return;
      sents.push({text:s,page:p.n});
    });
  });
  var df=new Map(),info=new Map(),re=/[A-Za-z][A-Za-z-]{3,}/g;
  sents.forEach(function(o){
    o.words=[];var m;re.lastIndex=0;
    while((m=re.exec(o.text)))o.words.push({w:m[0],idx:m.index});
    var seen=new Set();
    o.words.forEach(function(x){
      var l=x.w.toLowerCase();
      if(STOP.has(l)||l.length<5||l.indexOf('-')>=0||SUF.test(l))return;
      if(!seen.has(l)){seen.add(l);df.set(l,(df.get(l)||0)+1)}
      var mid=x.idx>0,e=info.get(l),isN=/\b(the|an?|its|their|this|these|those|each|of|some|many|such|our|your)\s+(?:[A-Za-z-]+\s+)?$/i.test(o.text.slice(Math.max(0,x.idx-16),x.idx));
      if(!e)info.set(l,{term:x.w,mid:mid,noun:isN});
      else{if(mid&&!e.mid){e.term=x.w;e.mid=true}if(isN)e.noun=true}
    });
  });
  var sc=function(l,term){return Math.log2(1+df.get(l))*1.2+Math.min(l.length,12)/12+(/^[A-Z]/.test(term)?1:0)+(info.get(l).noun?1.5:-1)};
  var pool=[];info.forEach(function(e,l){pool.push({lower:l,term:e.term,cap:/^[A-Z]/.test(e.term),score:sc(l,e.term)})});
  pool.sort(function(a,b){return b.score-a.score});
  var nouns=pool.filter(function(k){return info.get(k.lower).noun});
  pool=(nouns.length>=12?nouns:pool).slice(0,80);
  var keep=[];
  sents.forEach(function(o){
    var counts={};o.words.forEach(function(x){var l=x.w.toLowerCase();counts[l]=(counts[l]||0)+1});
    o.cands=[];
    o.words.forEach(function(x){
      var l=x.w.toLowerCase();
      if(!info.has(l)||counts[l]!==1||x.idx===0)return;
      o.cands.push({term:x.w,lower:l,idx:x.idx,len:x.w.length,score:sc(l,info.get(l).term)});
    });
    o.cands.sort(function(a,b){return b.score-a.score});
    if(o.cands.length)keep.push(o);
  });
  if(keep.length<5||pool.length<8)throw new Error('There is not enough text to make a good quiz. Try a longer chapter.');
  return {sents:keep,pool:pool};
}


function scramble(w){var a=w.split(''),r=a.join('');for(var n=0;n<12&&r===w;n++){a=shuffle(a);r=a.join('')}return r}
function plural(l){return /[^su]s$/.test(l)}
function distract(c,s,an,n){
  var sl=s.text.toLowerCase(),cap=/^[A-Z]/.test(c.term);
  return an.pool.filter(function(k){return k.lower!==c.lower&&sl.indexOf(k.lower)<0})
    .map(function(k){return {k:k,w:(k.cap===cap?2:0)+(plural(k.lower)===plural(c.lower)?1.5:0)-Math.abs(k.term.length-c.term.length)/5+k.score*.25+Math.random()*1.5}})
    .sort(function(a,b){return b.w-a.w}).slice(0,n).map(function(x){return x.k.term});
}
function makeQ(type,s,an,used){
  used=used||new Map();
  var c=s.cands.find(function(c){return (used.get(c.lower)||0)<2})||s.cands[0];
  used.set(c.lower,(used.get(c.lower)||0)+1);
  var base={type:type,s:s,page:s.page,src:s.text},blank=s.text.slice(0,c.idx)+'_____'+s.text.slice(c.idx+c.len);
  if(type==='scr'&&c.term.length>=5&&c.term.length<=12)return Object.assign(base,{prompt:blank,answer:c.term,scr:scramble(c.term)});
  if(type==='tf'){
    var truth=Math.random()<.5,st=s.text;
    if(!truth){
      var nm=s.text.match(/\b\d+(?:\.\d+)?\b/);
      if(nm&&Math.random()<.6){var v=parseFloat(nm[0]),alts=[v+5,v*2,Math.max(1,v-3),v+10].filter(function(a){return a!==v});st=s.text.slice(0,nm.index)+String(Math.round(pick(alts)*10)/10)+s.text.slice(nm.index+nm[0].length)}
      else{var d=distract(c,s,an,1)[0]||'nothing';st=s.text.slice(0,c.idx)+d+s.text.slice(c.idx+c.len)}
    }
    return Object.assign(base,{type:'tf',prompt:st,options:['True','False'],correct:truth?0:1});
  }
  var opts=shuffle([c.term].concat(distract(c,s,an,3)));
  return Object.assign(base,{type:'mcq',prompt:blank,options:opts,correct:opts.indexOf(c.term)});
}
function buildQuiz(an,n){
  var used=new Map(),pat=['mcq','tf','mcq','scr','tf','mcq'];
  return shuffle(an.sents).slice(0,n).map(function(s,i){return makeQ(pat[i%6],s,an,used)});
}


function chunk(text){
  var words=text.replace(/\s+/g,' ').trim().split(' '),pages=[],cur='';
  words.forEach(function(w){cur+=(cur?' ':'')+w;if(cur.length>1400){pages.push({n:pages.length+1,text:cur});cur=''}});
  if(cur)pages.push({n:pages.length+1,text:cur});return pages;
}
function worksheet(title,qs,unit){
  var out=[title,'Worksheet made with Chapter Quest','','Name: ____________________   Date: ____________','',''],key=['','ANSWER KEY',''];
  qs.forEach(function(q,i){
    var n=i+1;
    if(q.type==='mcq'){out.push(n+'. Fill in the blank ('+unit+' '+q.page+')',q.prompt);q.options.forEach(function(o,k){out.push('   '+'ABCD'[k]+') '+o)});key.push(n+'. '+'ABCD'[q.correct]+') '+q.options[q.correct])}
    else if(q.type==='tf'){out.push(n+'. True or false ('+unit+' '+q.page+')',q.prompt,'   True / False');key.push(n+'. '+q.options[q.correct])}
    else{out.push(n+'. Unscramble the letters to fill the blank ('+unit+' '+q.page+')',q.prompt,'   Letters: '+q.scr.toUpperCase(),'   Answer: ______________');key.push(n+'. '+q.answer)}
    out.push('');
  });
  return out.concat(key).join('\n');
}
root.CQ={analyze:analyze,makeQ:makeQ,buildQuiz:buildQuiz,shuffle:shuffle,pick:pick,chunk:chunk,worksheet:worksheet};
if(typeof module!=='undefined'&&module.exports)module.exports=root.CQ;
})(typeof window!=='undefined'?window:globalThis);

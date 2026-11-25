const urlInput=document.querySelector('#ytUrl'), videoWrap=document.querySelector('#videoWrap');
const captions=document.querySelector('#captions'), wordInfo=document.querySelector('#wordInfo');
function videoId(raw){
  try{const u=new URL(raw);if(u.hostname.includes('youtu.be'))return u.pathname.slice(1);if(u.hostname.includes('youtube.com'))return u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).pop();}catch(e){}
  return null;
}
document.querySelector('#loadVideo').addEventListener('click',()=>{
  const id=videoId(urlInput.value.trim());
  if(!id||!/^[\w-]{11}$/.test(id)){videoWrap.innerHTML='<div class="placeholder">that link does not look like a YouTube video URL.</div>';return;}
  videoWrap.innerHTML=`<iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
});
const demo=[
 {time:'00:04',words:[['今日','きょう','today'],['は','は','topic particle'],['いい','いい','good'],['天気','てんき','weather'],['だ','だ','casual sentence ending']]},
 {time:'00:08',words:[['そう','そう','yeah / that’s right'],['だ','だ','casual sentence ending'],['ね','ね','right? / isn’t it?']]},
 {time:'00:12',words:[['早く','はやく','quickly / early'],['行こう','いこう','let’s go']]}
];
document.querySelector('#demoBtn').addEventListener('click',()=>{
 document.querySelector('#status').textContent='DEMO LOADED';captions.innerHTML='';
 demo.forEach((line,i)=>{
  const row=document.createElement('div');row.className='caption';
  const time=document.createElement('span');time.className='time';time.textContent=line.time;
  const jp=document.createElement('div');jp.className='jp';
  line.words.forEach(w=>{
   const b=document.createElement('button');b.className='token';b.type='button';b.textContent=w[0];b.setAttribute('aria-label',w[0]);
   b.addEventListener('click',()=>showWord(w,b));jp.appendChild(b);
  });
  row.append(time,jp);captions.append(row);
 });
});
function showWord(w,el){
 document.querySelectorAll('.token.selected').forEach(x=>x.classList.remove('selected'));el.classList.add('selected');
 const [kanji,reading,meaning]=w;
 wordInfo.innerHTML=`<div class="word">${kanji}</div><div class="reading">${reading}</div><div class="meaning">${meaning}<br>tap below for a fuller dictionary entry.</div><a class="dict-link" target="_blank" rel="noopener" href="https://jisho.org/search/${encodeURIComponent(kanji)}">OPEN JAPANESE DICTIONARY ↗</a>`;
}
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}

(() => {
  const client = window.client || window.supabaseClient || window.sb;
  let uid = null, profile = null, lastCoins = null;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const missions = [
    ['play10','🎰 10 GAMES',10,50],
    ['work5','💼 COMPLETE 5 WORKS',5,50],
    ['win5','🏆 WIN 5 GAMES',5,100],
    ['earn1000','💰 EARN 1,000 COINS',1000,100]
  ];
  const achs = [
    ['first_game','🎮 FIRST GAME'],['first_work','💼 FIRST WORK'],['rich100k','💰 100K COINS'],['level10','⭐ LEVEL 10'],['daily7','🔥 7 DAY STREAK']
  ];
  function toast(t){ const e=$('message'); if(e)e.textContent=t; }
  function ensureUI(){
    const nav=document.querySelector('.nav'); if(!nav || document.getElementById('progressTab')) return;
    const b=document.createElement('button'); b.id='progressTab'; b.textContent='⭐ DASHBOARD'; b.dataset.g='progress'; nav.appendChild(b);
    const s=document.createElement('section'); s.id='progress'; s.className='game';
    s.innerHTML=`<h2>⭐ PLAYER DASHBOARD</h2><div class="small">DAILY BONUS // MISSIONS // LEVEL // ACHIEVEMENTS // RANKING</div>
      <div class="bank-balance" style="margin-top:15px"><div class="balance-box"><div class="small">LEVEL</div><div id="pLevel" class="balance-value">1</div><div class="progress"><i id="xpBar"></i></div><div id="xpText" class="small">0 / 100 XP</div></div><div class="balance-box"><div class="small">DAILY STREAK</div><div id="streak" class="score">0 🔥</div><button id="dailyClaim" class="action" style="margin-top:10px">CLAIM DAILY BONUS</button></div></div>
      <div class="bank-section"><h3>🎯 MISSIONS</h3><div id="missionList" class="history">LOADING...</div></div>
      <div class="bank-section"><h3>🏆 ACHIEVEMENTS</h3><div id="achievementList" class="history">LOADING...</div></div>
      <div class="bank-section"><h3>🏅 RANKING</h3><div id="rankingList" class="history">LOADING...</div></div>`;
    document.getElementById('account').appendChild(s);
    b.addEventListener('click',()=>switchGame('progress'));
    $('dailyClaim').addEventListener('click',claimDaily);
  }
  function switchGame(id){ document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.g===id)); document.querySelectorAll('.game').forEach(x=>x.classList.toggle('active',x.id===id)); if(id==='progress') refresh(); }
  async function getUser(){ if(!client?.auth) return null; const {data}=await client.auth.getUser(); return data?.user||null; }
  async function load(){ uid=(await getUser())?.id; if(!uid) return; const {data}=await client.from('profiles').select('id,username,coins,xp,level,daily_streak,daily_last_claim,total_games,total_earned,work_completed').eq('id',uid).single(); if(!data)return; profile=data; lastCoins=Number(data.coins)||0; await ensureMissions(); await refresh(); }
  async function ensureMissions(){ for(const [key] of missions) await client.from('missions').upsert({user_id:uid,mission_key:key},{onConflict:'user_id,mission_key',ignoreDuplicates:true}); }
  async function addXP(amount){ if(!profile)return; let xp=(profile.xp||0)+amount, level=profile.level||1; while(xp>=level*100){xp-=level*100;level++;} const {data}=await client.from('profiles').update({xp,level}).eq('id',uid).select('xp,level').single(); if(data){profile.xp=data.xp;profile.level=data.level;} }
  async function addMission(key, amount=1){ if(!uid)return; const {data}=await client.from('missions').select('*').eq('user_id',uid).eq('mission_key',key).single(); if(!data||data.completed)return; const def=missions.find(x=>x[0]===key); const p=Math.min(def[2],data.progress+amount), done=p>=def[2]; await client.from('missions').update({progress:p,completed:done}).eq('id',data.id); if(done) toast('MISSION COMPLETE // '+def[1]); }
  async function unlock(key){ if(!uid)return; await client.from('achievements').upsert({user_id:uid,achievement_key:key},{onConflict:'user_id,achievement_key',ignoreDuplicates:true}); }
  async function claimDaily(){ if(!profile)return; const today=new Date().toISOString().slice(0,10); if(profile.daily_last_claim===today){toast('DAILY BONUS // ALREADY CLAIMED');return;} let streak=profile.daily_streak||0; const prev=profile.daily_last_claim; const d=prev?Math.round((Date.parse(today)-Date.parse(prev))/86400000):999; streak=d===1?streak+1:1; const reward=100+Math.min(streak,7)*50; const next=(Number(profile.coins)||0)+reward; const {data,error}=await client.from('profiles').update({coins:next,daily_streak:streak,daily_last_claim:today,total_earned:(Number(profile.total_earned)||0)+reward}).eq('id',uid).select('*').single(); if(error){toast('DAILY BONUS // ERROR');return;} profile=data; if(typeof window.setCoins==='function')window.setCoins(data.coins); if(streak>=7)await unlock('daily7'); toast('DAILY BONUS // +'+reward+' COINS'); refresh(); }
  async function refresh(){ if(!profile)return; const {data:p}=await client.from('profiles').select('username,coins,xp,level,daily_streak,daily_last_claim').eq('id',uid).single(); if(p)profile={...profile,...p}; if($('pLevel'))$('pLevel').textContent='LV.'+profile.level; const need=(profile.level||1)*100, xp=profile.xp||0; if($('xpText'))$('xpText').textContent=xp+' / '+need+' XP'; if($('xpBar'))$('xpBar').style.width=Math.min(100,xp/need*100)+'%'; if($('streak'))$('streak').textContent=(profile.daily_streak||0)+' 🔥'; const {data:ms}=await client.from('missions').select('*').eq('user_id',uid).order('id'); if($('missionList'))$('missionList').innerHTML=(ms||[]).map(m=>{const d=missions.find(x=>x[0]===m.mission_key);return `<div class="history-item"><span>${d[1]}<br><span class="small">${m.progress}/${d[2]}</span></span><span>${m.completed?'✅ +'+d[3]+' COINS':'⏳'}</span></div>`}).join(''); const {data:as}=await client.from('achievements').select('achievement_key,unlocked_at').eq('user_id',uid); if($('achievementList'))$('achievementList').innerHTML=achs.map(a=>{const x=(as||[]).find(v=>v.achievement_key===a[0]);return `<div class="history-item"><span>${a[1]}</span><span>${x?'🏆 UNLOCKED':'🔒 LOCKED'}</span></div>`}).join(''); const {data:rank}=await client.from('profiles').select('username,level,xp,coins,total_earned').order('coins',{ascending:false}).limit(10); if($('rankingList'))$('rankingList').innerHTML=(rank||[]).map((r,i)=>`<div class="history-item"><span>#${i+1} ${esc(r.username)}</span><span>LV.${r.level||1} // ${(Number(r.coins)||0).toLocaleString()} COINS</span></div>`).join(''); }
  async function observe(){ if(!uid)return; const c=Number($('coins')?.textContent?.replace(/,/g,'')); if(!Number.isFinite(c)||lastCoins===null){lastCoins=c;return;} if(c!==lastCoins){ const delta=c-lastCoins; if(delta>0){ await addXP(Math.min(100,Math.max(1,Math.floor(delta/50)))); await addMission('earn1000',delta); } lastCoins=c; const games=profile.total_games||0; if(games<100000){ await client.from('profiles').update({total_games:games+1}).eq('id',uid); profile.total_games=games+1; await addMission('play10',1); } refresh(); } }
  function hooks(){ document.addEventListener('click',async e=>{ const t=e.target.closest('button'); if(!t||!uid)return; if(t.id==='clickWork'||t.id==='codeSubmit'||t.id==='numberWork'){await addMission('work5',1);await unlock('first_work');await addXP(5);} if(t.id==='spin'||t.id==='deal'||t.id==='draw'||t.id==='startMine'){await unlock('first_game');await addXP(3);} }); }
  const boot=setInterval(async()=>{ ensureUI(); const u=await getUser(); if(u && (!uid||u.id!==uid)) await load(); if(!u)uid=null; await observe(); },2000); hooks();
})();

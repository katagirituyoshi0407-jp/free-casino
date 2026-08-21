(() => {
  const css = `
  .bank-account-panel{margin:0 0 18px;padding:18px;border:1px solid #00eaff44;border-radius:14px;background:linear-gradient(135deg,#081221,#101a31)}
  .bank-account-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}
  .bank-account-title{font-size:18px;font-weight:700;letter-spacing:1px}
  .bank-card-visual{padding:18px;border-radius:16px;border:1px solid #00eaff66;background:linear-gradient(135deg,#07101e,#132b42);box-shadow:0 0 24px #00eaff12;margin-bottom:14px}
  .bank-card-chip{font-size:25px;margin-bottom:16px}.bank-card-number{font-size:20px;letter-spacing:3px;font-family:monospace}.bank-card-meta{display:flex;justify-content:space-between;margin-top:16px;color:#91a9c2;font-size:11px}.bank-account-number{font-size:22px;color:#00eaff;font-family:monospace;letter-spacing:2px}.bank-mini-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.bank-mini-box{padding:12px;border:1px solid #00eaff22;border-radius:10px;background:#050b15}.bank-pin-box{margin-top:12px;padding:14px;border:1px solid #8b5cff44;border-radius:10px;background:#0d0a1d}.bank-account-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.bank-security-result{min-height:20px;margin-top:10px;text-align:center;color:#7befff;font-size:12px}.bank-copy{width:auto!important}.bank-status-active{color:#63ffb1}.bank-status-blocked{color:#ff789e}@media(max-width:700px){.bank-mini-grid,.bank-account-actions{grid-template-columns:1fr}.bank-card-number{font-size:16px;letter-spacing:2px}}
  `;
  const style=document.createElement('style'); style.textContent=css; document.head.appendChild(style);

  function $(id){return document.getElementById(id)}
  function msg(t){ if(typeof message==='function') message(t); }
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function inject(){
    const bank=$('bank');
    if(!bank || $('bankAccountPanel')) return;
    const panel=document.createElement('div');
    panel.id='bankAccountPanel';
    panel.className='bank-account-panel';
    panel.innerHTML=`
      <div class="bank-account-head">
        <div><div class="small">DIGITAL BANK ACCOUNT</div><div class="bank-account-title">🏦 FREE BANK CARD</div></div>
        <div id="bankCardStatus" class="bank-status-active">● ACTIVE</div>
      </div>
      <div class="bank-card-visual">
        <div class="bank-card-chip">▣</div>
        <div id="bankCardNumber" class="bank-card-number">•••• •••• •••• ••••</div>
        <div class="bank-card-meta"><span>FREE BANK</span><span id="bankCardExpiry">EXP --/--</span></div>
      </div>
      <div class="bank-mini-grid">
        <div class="bank-mini-box"><div class="small">ACCOUNT NUMBER</div><div id="bankAccountNumber" class="bank-account-number">----------</div></div>
        <div class="bank-mini-box"><div class="small">CARD HOLDER</div><div id="bankCardHolder" class="user">-</div></div>
      </div>
      <div class="bank-account-actions">
        <button id="copyBankAccount" class="action bank-copy">COPY ACCOUNT NUMBER</button>
        <button id="revealBankCard" class="action">VIEW CARD</button>
      </div>
      <div class="bank-pin-box">
        <div class="small">🔐 BANK SECURITY PIN // 4 DIGITS</div>
        <div id="pinState" class="small" style="margin:7px 0">CHECKING...</div>
        <div class="bank-account-actions">
          <button id="setBankPin" class="action">SET / CHANGE PIN</button>
          <button id="toggleBankCard" class="action danger">BLOCK CARD</button>
        </div>
        <div id="bankSecurityResult" class="bank-security-result"></div>
      </div>`;
    bank.insertBefore(panel,bank.children[2]||bank.firstChild);

    $('copyBankAccount').onclick=async()=>{
      const n=$('bankAccountNumber').dataset.value;
      if(!n)return;
      try{await navigator.clipboard.writeText(n);$('bankSecurityResult').textContent='ACCOUNT NUMBER COPIED';}
      catch{$('bankSecurityResult').textContent=n;}
    };
    $('revealBankCard').onclick=showCard;
    $('setBankPin').onclick=setOrChangePin;
    $('toggleBankCard').onclick=toggleCard;
  }

  async function loadBankAccount(){
    inject();
    if(typeof user==='undefined' || !user) return;
    const {data,error}=await client.from('profiles').select('username,bank_account_number,bank_card_number,bank_card_expiry,bank_card_status').eq('id',user.id).single();
    if(error || !data){$('bankAccountNumber').textContent='ACCOUNT ERROR';return;}
    $('bankAccountNumber').textContent=data.bank_account_number||'----------';
    $('bankAccountNumber').dataset.value=data.bank_account_number||'';
    $('bankCardHolder').textContent=data.username||'UNKNOWN';
    $('bankCardNumber').textContent='•••• •••• •••• ••••';
    if(data.bank_card_expiry){const d=new Date(data.bank_card_expiry+'T00:00:00');$('bankCardExpiry').textContent='EXP '+String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getFullYear()).slice(-2);}
    const blocked=data.bank_card_status==='blocked';
    $('bankCardStatus').textContent=blocked?'● BLOCKED':'● ACTIVE';
    $('bankCardStatus').className=blocked?'bank-status-blocked':'bank-status-active';
    $('toggleBankCard').textContent=blocked?'UNBLOCK CARD':'BLOCK CARD';
    const pin=await client.rpc('has_bank_pin');
    $('pinState').textContent=pin.error?'PIN STATUS UNAVAILABLE':(pin.data?'PIN IS SET':'PIN NOT SET // SET A 4-DIGIT PIN');
  }

  async function showCard(){
    if(typeof user==='undefined' || !user)return;
    const pin=prompt('BANK PINを入力してください（4桁）');
    if(pin===null)return;
    const {data,error}=await client.rpc('verify_bank_pin',{p_pin:pin});
    if(error || data!==true){$('bankSecurityResult').textContent='PIN ERROR // CARD DETAILS LOCKED';return;}
    const {data:p,error:e}=await client.from('profiles').select('bank_card_number,bank_card_expiry,bank_card_status').eq('id',user.id).single();
    if(e||!p)return;
    if(p.bank_card_status==='blocked'){ $('bankSecurityResult').textContent='CARD IS BLOCKED'; return; }
    const n=p.bank_card_number||'';
    $('bankCardNumber').textContent=n.replace(/(.{4})/g,'$1 ').trim();
    $('bankSecurityResult').textContent='CARD DETAILS UNLOCKED';
    setTimeout(()=>{if($('bankCardNumber'))$('bankCardNumber').textContent='•••• •••• •••• ••••';},15000);
  }

  async function setOrChangePin(){
    if(typeof user==='undefined' || !user)return;
    const state=await client.rpc('has_bank_pin');
    if(state.data===true){
      const oldPin=prompt('現在のBANK PIN（4桁）');
      if(oldPin===null)return;
      const v=await client.rpc('verify_bank_pin',{p_pin:oldPin});
      if(v.error||v.data!==true){$('bankSecurityResult').textContent='CURRENT PIN INCORRECT';return;}
    }
    const next=prompt('新しいBANK PINを4桁で入力');
    if(next===null)return;
    const confirmPin=prompt('新しいBANK PINをもう一度入力');
    if(next!==confirmPin){$('bankSecurityResult').textContent='PIN MISMATCH';return;}
    const {error}=await client.rpc('set_bank_pin',{p_pin:next});
    $('bankSecurityResult').textContent=error?'PIN UPDATE FAILED':'PIN UPDATED // SECURITY ENABLED';
    loadBankAccount();
  }

  async function toggleCard(){
    if(typeof user==='undefined' || !user)return;
    const state=await client.from('profiles').select('bank_card_status').eq('id',user.id).single();
    if(state.error)return;
    const next=state.data.bank_card_status==='blocked'?'active':'blocked';
    const pin=prompt('BANK PINを入力してください（4桁）');
    if(pin===null)return;
    const v=await client.rpc('verify_bank_pin',{p_pin:pin});
    if(v.error||v.data!==true){$('bankSecurityResult').textContent='PIN ERROR';return;}
    const {error}=await client.rpc('set_bank_card_status',{p_status:next});
    if(error){$('bankSecurityResult').textContent='CARD STATUS UPDATE FAILED';return;}
    $('bankSecurityResult').textContent=next==='blocked'?'CARD BLOCKED':'CARD UNBLOCKED';
    loadBankAccount();
  }

  inject();
  const oldRefresh=window.refreshBank;
  if(typeof oldRefresh==='function'){
    window.refreshBank=async function(){const r=await oldRefresh.apply(this,arguments);await loadBankAccount();return r;};
  }
  if(typeof window.loadProfile==='function'){
    const oldLoad=window.loadProfile;
    window.loadProfile=async function(){const r=await oldLoad.apply(this,arguments);await loadBankAccount();return r;};
  }
  setTimeout(loadBankAccount,500);
})();

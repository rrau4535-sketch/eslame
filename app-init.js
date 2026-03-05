/* ════════════════════════════════════════════════════════
   app-init.js v3 — الموسوعة الإسلامية
   • الثيم الموحد على كل الصفحات (BroadcastChannel + StorageEvent)
   • تطبيق الثيم INSTANTLY قبل أي render (بدون flash)
   • PWA install prompt
   • شاشة الأذونات أول مرة
════════════════════════════════════════════════════════ */

/* ══ 1. INSTANT THEME — قبل أي render ══
   يشتغل فوراً في <head> قبل CSS لمنع الـ flash */
(function(){
  const t = localStorage.getItem('appTheme') || 'dark';
  const root = document.documentElement;
  root.setAttribute('data-theme', t);
  if(t === 'light') root.classList.add('light');
  // adaya.html بتستخدم dark-mode class
  if(t === 'dark') root.classList.add('dark-mode');
  // inject critical CSS variable instantly
  root.style.setProperty('--theme-ready','1');
})();

/* ══ 2. THEME MANAGER ══ */
window.AppTheme = {
  get(){ return localStorage.getItem('appTheme') || 'dark'; },

  set(t){
    localStorage.setItem('appTheme', t);
    const root = document.documentElement;
    root.setAttribute('data-theme', t);
    root.classList.toggle('light', t === 'light');
    root.classList.toggle('dark-mode', t === 'dark');
    if(document.body){
      document.body.classList.toggle('light', t === 'light');
      document.body.classList.toggle('dark-mode', t === 'dark');
    }
    // بلّغ كل التابات المفتوحة
    try{ AppTheme._bc.postMessage(t); }catch(e){}
    window.dispatchEvent(new CustomEvent('themeChange', { detail: t }));
  },

  toggle(){
    this.set(this.get() === 'dark' ? 'light' : 'dark');
  },

  // BroadcastChannel — للتزامن بين التابات
  _bc: (function(){
    try{ return new BroadcastChannel('app_theme'); }
    catch(e){ return { postMessage:()=>{} }; }
  })()
};

// استقبل تغيير الثيم من تابات تانية
try{
  AppTheme._bc.onmessage = function(e){
    if(e.data) AppTheme.set(e.data);
  };
}catch(e){}

// استقبل تغيير localStorage من نفس السبب (fallback)
window.addEventListener('storage', e => {
  if(e.key === 'appTheme' && e.newValue) AppTheme.set(e.newValue);
});

/* ══ 3. GLOBAL toggleTheme ══
   كل الصفحات تستخدم نفس الدالة */
window.toggleTheme = function(){
  AppTheme.toggle();
};

/* ══ 4. DOMContentLoaded ══ */
document.addEventListener('DOMContentLoaded', () => {
  // طبّق الثيم على body
  const t = AppTheme.get();
  if(document.body){
    document.body.classList.toggle('light', t === 'light');
    document.body.classList.toggle('dark-mode', t === 'dark');
  }
  // PWA
  AppInstall.init();
  // أذونات أول مرة
  AppPermissions.init();
});

/* ══ 5. PERFORMANCE — preconnect hints ══ */
(function(){
  const links = [
    {rel:'preconnect', href:'https://fonts.googleapis.com'},
    {rel:'preconnect', href:'https://fonts.gstatic.com', crossorigin:true},
    {rel:'preconnect', href:'https://api.aladhan.com'},
    {rel:'dns-prefetch', href:'https://firestore.googleapis.com'},
  ];
  links.forEach(l => {
    if(document.querySelector(`link[href="${l.href}"]`)) return;
    const el = document.createElement('link');
    el.rel  = l.rel;
    el.href = l.href;
    if(l.crossorigin) el.crossOrigin = 'anonymous';
    document.head.appendChild(el);
  });
})();

/* ══ 6. PWA INSTALL PROMPT ══ */
window.AppInstall = {
  deferredPrompt: null,
  shown: false,

  init(){
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      this.deferredPrompt = e;
      if(!localStorage.getItem('pwaInstalled') && !this.shown){
        setTimeout(() => this.showBanner(), 4000);
      }
    });
    window.addEventListener('appinstalled', () => {
      localStorage.setItem('pwaInstalled', '1');
      this.hideBanner();
    });
  },

  showBanner(){
    if(this.shown || document.getElementById('installBanner')) return;
    this.shown = true;
    const b = document.createElement('div');
    b.id = 'installBanner';
    b.style.cssText = `
      position:fixed;bottom:20px;left:50%;
      transform:translateX(-50%) translateY(100px);
      background:#0c1810;border:1px solid rgba(196,160,60,.3);
      border-radius:16px;padding:13px 16px;z-index:9000;
      display:flex;align-items:center;gap:11px;
      box-shadow:0 8px 30px rgba(0,0,0,.5);
      max-width:340px;width:90%;
      font-family:'Noto Naskh Arabic',serif;
      transition:transform .4s cubic-bezier(.34,1.56,.64,1);
    `;
    b.innerHTML = `
      <span style="font-size:1.4rem">📲</span>
      <div style="flex:1">
        <div style="font-size:.85rem;color:#eee8d8;font-weight:600;">ثبّت التطبيق</div>
        <div style="font-size:.7rem;color:#6a6248;margin-top:2px;">أضفه للشاشة الرئيسية</div>
      </div>
      <button id="installNowBtn" style="padding:6px 13px;border-radius:9px;border:none;cursor:pointer;background:linear-gradient(135deg,#8a6e26,#c4a03c);color:#0c1008;font-family:'Noto Naskh Arabic',serif;font-weight:700;font-size:.78rem;">تثبيت</button>
      <button id="installCloseBtn" style="background:none;border:none;color:#6a6248;cursor:pointer;font-size:1.1rem;line-height:1;padding:4px;">✕</button>
    `;
    document.body.appendChild(b);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      b.style.transform = 'translateX(-50%) translateY(0)';
    }));
    document.getElementById('installNowBtn').onclick = async () => {
      if(!this.deferredPrompt) return;
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if(outcome === 'accepted') localStorage.setItem('pwaInstalled','1');
      this.deferredPrompt = null;
      this.hideBanner();
    };
    document.getElementById('installCloseBtn').onclick = () => this.hideBanner();
  },

  hideBanner(){
    const b = document.getElementById('installBanner');
    if(b){ b.style.transform='translateX(-50%) translateY(100px)'; setTimeout(()=>b.remove(),400); }
  }
};

/* ══ 7. PERMISSIONS SCREEN ══ */
window.AppPermissions = {
  KEY: 'permissionsGranted_v2',
  needed(){ return !localStorage.getItem(this.KEY); },

  async requestAll(){
    const res = { location:false, notifications:false };
    try{
      await new Promise((ok)=>{
        navigator.geolocation.getCurrentPosition(
          p=>{ res.location=true; ok(p); },
          ()=>ok(null),
          {timeout:8000}
        );
      });
    }catch(e){}
    if('Notification' in window){
      try{ res.notifications = (await Notification.requestPermission()) === 'granted'; }catch(e){}
    }
    localStorage.setItem(this.KEY, JSON.stringify(res));
    return res;
  },

  show(onDone){
    const ov = document.createElement('div');
    ov.id = 'permOverlay';
    const t = AppTheme.get();
    const bg   = t==='light' ? '#f5ede0' : '#060d0a';
    const gold = '#c4a03c';
    ov.style.cssText = `position:fixed;inset:0;z-index:99999;background:${bg};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 22px;text-align:center;font-family:'Noto Naskh Arabic',serif;animation:_pFadeIn .4s ease;`;
    ov.innerHTML = `
      <style>
        @keyframes _pFadeIn{from{opacity:0}to{opacity:1}}
        @keyframes _pFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        #permOverlay .pi{font-size:3.5rem;animation:_pFloat 3s ease-in-out infinite;margin-bottom:14px;}
        #permOverlay .pt{font-family:'Amiri',serif;font-size:1.7rem;color:${gold};margin-bottom:6px;}
        #permOverlay .ps{font-size:.85rem;color:#6a6248;line-height:1.8;margin-bottom:24px;max-width:300px;}
        #permOverlay .plist{display:flex;flex-direction:column;gap:9px;width:100%;max-width:300px;margin-bottom:24px;}
        #permOverlay .pitem{display:flex;align-items:center;gap:11px;background:rgba(255,255,255,.04);border:1px solid rgba(196,160,60,.15);border-radius:12px;padding:11px 14px;text-align:right;}
        #permOverlay .piico{font-size:1.3rem;flex-shrink:0;}
        #permOverlay .piname{font-size:.88rem;color:#eee8d8;font-weight:600;}
        #permOverlay .pidesc{font-size:.7rem;color:#6a6248;margin-top:1px;}
        #permOverlay .pibadge{font-size:.65rem;padding:2px 7px;border-radius:7px;flex-shrink:0;}
        #permOverlay .pending{background:rgba(196,160,60,.1);color:${gold};}
        #permOverlay .granted{background:rgba(74,222,128,.1);color:#4ade80;}
        #permOverlay .denied{background:rgba(248,113,113,.1);color:#f87171;}
        #permOverlay .pbtn{width:100%;max-width:300px;padding:13px;border-radius:13px;border:none;cursor:pointer;background:linear-gradient(135deg,#8a6e26,#c4a03c);color:#0c1008;font-family:'Noto Naskh Arabic',serif;font-weight:700;font-size:.95rem;transition:all .2s;box-shadow:0 4px 18px rgba(196,160,60,.25);}
        #permOverlay .pbtn:disabled{opacity:.6;cursor:not-allowed;}
        #permOverlay .pskip{margin-top:10px;font-size:.75rem;color:#3a3228;cursor:pointer;background:none;border:none;font-family:'Noto Naskh Arabic',serif;}
        #permOverlay .pskip:hover{color:#6a6248;}
      </style>
      <div class="pi">🕌</div>
      <div class="pt">أهلاً بك</div>
      <div class="ps">نحتاج بعض الأذونات لتجربة كاملة</div>
      <div class="plist">
        <div class="pitem"><div class="piico">📍</div><div style="flex:1"><div class="piname">الموقع الجغرافي</div><div class="pidesc">لمواقيت الصلاة واتجاه القبلة</div></div><div class="pibadge pending" id="ps-loc">مطلوب</div></div>
        <div class="pitem"><div class="piico">🔔</div><div style="flex:1"><div class="piname">الإشعارات</div><div class="pidesc">لتنبيهك بأذان كل صلاة</div></div><div class="pibadge pending" id="ps-notif">مطلوب</div></div>
      </div>
      <button class="pbtn" id="permStartBtn">السماح ←</button>
      <button class="pskip" id="permSkipBtn">تخطي — لاحقاً</button>
    `;
    document.body.appendChild(ov);

    document.getElementById('permStartBtn').addEventListener('click', async () => {
      const btn = document.getElementById('permStartBtn');
      btn.textContent = '⏳ جاري...'; btn.disabled = true;
      const r = await AppPermissions.requestAll();
      const le=document.getElementById('ps-loc'), ne=document.getElementById('ps-notif');
      if(le){ le.textContent=r.location?'✓ تم':'✗ مرفوض'; le.className='pibadge '+(r.location?'granted':'denied'); }
      if(ne){ ne.textContent=r.notifications?'✓ تم':'✗ مرفوض'; ne.className='pibadge '+(r.notifications?'granted':'denied'); }
      await new Promise(x=>setTimeout(x,700));
      ov.style.opacity='0'; ov.style.transition='opacity .35s';
      setTimeout(()=>{ ov.remove(); if(onDone) onDone(r); }, 350);
    });
    document.getElementById('permSkipBtn').addEventListener('click', ()=>{
      localStorage.setItem(AppPermissions.KEY, JSON.stringify({skipped:true}));
      ov.style.opacity='0'; ov.style.transition='opacity .35s';
      setTimeout(()=>{ ov.remove(); if(onDone) onDone({}); }, 350);
    });
  },

  init(onDone){
    if(this.needed()){
      if(document.readyState==='loading'){
        document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>this.show(onDone),300));
      } else {
        setTimeout(()=>this.show(onDone), 300);
      }
    } else {
      if(onDone) onDone({});
    }
  }
};

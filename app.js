/* =======================================================================
  祺祺的生活工作台 —— 单页应用，localStorage 持久化
  ======================================================================= */

/* ---------- 存储 ---------- */
const DB_KEY = "qiqi_life_v1";
let DB = null;
function defaultDB(){
  return {
    closet:[],        // {id,name,category,occasions:[],colors:[],note,img}
    outfits:[],       // {id,occasion,items:[closetId],note}
    goods:[],         // {id,name,category,stock,unit,target,note}
    expiry:[],        // {id,name,category,prodDate,expireDate,note}
    booksLit:[],      // 已读书名数组
    moviesLit:[],     // 已看片名数组
    weekendPlans:{},  // 日期->{plan,actual,with}
    festivals:[],     // {id,name,emoji,date,type(公历/农历),repeat}
    exercises:[],     // {id,type,name,duration,date,mood,note}
    memos:[],         // {id,type(title),content,img,link,createdAt}
    luggage:[],       // {id,name,cat,done}
  };
}
function load(){
  try{ DB = JSON.parse(localStorage.getItem(DB_KEY)) || defaultDB(); }
  catch(e){ DB = defaultDB(); }
  // 补齐遗漏字段
  const d = defaultDB();
  for(const k in d){ if(DB[k]===undefined) DB[k]=d[k]; }
}
function save(){
  localStorage.setItem(DB_KEY, JSON.stringify(DB));
  updateStoreInfo();
}
function updateStoreInfo(){
  try{
    const bytes = (localStorage.getItem(DB_KEY)||"").length;
    document.getElementById("storeInfo").textContent = "本地存储 " + Math.round(bytes/1024*10)/10 + " KB";
  }catch(e){}
}
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

/* ---------- 工具 ---------- */
$ = id => document.getElementById(String(id).replace(/^#/,''));
function toast(msg){
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.remove("show"),1800);
}
function fmtNum(n){ return n==null?"":n; }
function todayStr(){ 
  const d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function diffDays(dateStr){
  const now = new Date(); now.setHours(0,0,0,0);
  const t = new Date(dateStr+"T00:00:00");
  return Math.round((t-now)/86400000);
}

/* ---------- 农历（简化，用于节日生成参考 + 显示） ---------- */
const LUNAR_MONTHS=["正","二","三","四","五","六","七","八","九","十","冬","腊"];
// 标准农历日中文名（1-30）
const LUNAR_DAY_CN = ["初一","初二","初三","初四","初五","初六","初七","初八","初九","初十",
  "十一","十二","十三","十四","十五","十六","十七","十八","十九","二十",
  "廿一","廿二","廿三","廿四","廿五","廿六","廿七","廿八","廿九","三十"];
// 1900-2100 农历数据表（字节）
const LUNAR_INFO = [
0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0
];
function lYearDays(y){ let s=348; for(let i=0x8000;i>0x8;i>>=1){ s+=(LUNAR_INFO[y-1900]&i)?1:0; } return s+leapDays(y); }
function leapMonth(y){ return LUNAR_INFO[y-1900]&0xf; }
function leapDays(y){ if(leapMonth(y)) return (LUNAR_INFO[y-1900]&0x10000)?30:29; return 0; }
function monthDays(y,m){ return (LUNAR_INFO[y-1900]&(0x10000>>m))?30:29; }
function lunarToSolar(y,m,d,isLeap){
  // 农历 y 年 m 月 d 日 -> {y,m,d} 公历
  let offset=0;
  for(let i=1900;i<y;i++) offset+=lYearDays(i);
  let leap=leapMonth(y);
  for(let i=1;i<m;i++){ offset+=monthDays(y,i); if(i===leap) offset+=leapDays(y); }
  if(isLeap && m>leap) offset+=leapDays(y);
  offset+=d-1;
  // 1900-01-31 是农历 1900 年 1 月 1 日
  let base=new Date(1900,0,31); let target=new Date(base.getTime()+offset*86400000);
  return {y:target.getFullYear(), m:target.getMonth()+1, d:target.getDate()};
}
function solarToLunar(y,m,d){
  let base=new Date(1900,0,31); let obj=new Date(y,m-1,d);
  let offset=Math.round((obj-base)/86400000);
  let i=1900, temp=0;
  for(;i<2100 && offset>0;i++){ temp=lYearDays(i); offset-=temp; }
  if(offset<0){ offset+=temp; i--; }
  let year=i;
  let leap=leapMonth(year), isLeap=false;
  for(i=1;i<13 && offset>0;i++){
    if(leap>0 && i===leap+1 && isLeap===false){ --i; isLeap=true; temp=leapDays(year); }
    else temp=monthDays(year,i);
    if(isLeap && i===leap+1) isLeap=false;
    offset-=temp;
  }
  if(offset===0 && leap>0 && i===leap+1){ if(isLeap){ isLeap=false; } else { isLeap=true; --i; } }
  if(offset<0){ offset+=temp; --i; }
  return {y:year,m:i,d:offset+1,isLeap};
}
function lunarStr(y,m,d){
  return LUNAR_MONTHS[m-1]+"月" + (LUNAR_DAY_CN[d-1]||"");
}
/* =======================================================================
  模块：菜单导航 & 通用渲染
  ======================================================================= */
const MODULES = [
  {id:"closet",    name:"电子衣橱",   ic:"👗", emoji:"👗"},
  {id:"goods",     name:"生活消耗",   ic:"🧺", emoji:"🧺"},
  {id:"expiry",    name:"赏味期限",   ic:"⏰", emoji:"⏰"},
  {id:"books",     name:"读书记录",   ic:"📚", emoji:"📚"},
  {id:"movies",    name:"电影记录",   ic:"🎬", emoji:"🎬"},
  {id:"weekend",   name:"周末玩耍",   ic:"🎡", emoji:"🎡"},
  {id:"festival",  name:"节日记录",   ic:"🎉", emoji:"🎉"},
  {id:"body",      name:"身体倍棒",   ic:"💪", emoji:"💪"},
  {id:"memo",      name:"生活备忘",   ic:"🗒️", emoji:"🗒️"},
  {id:"luggage",   name:"行李清单",   ic:"🧳", emoji:"🧳"},
];
let currentModule = "closet";

function moduleCount(id){
  switch(id){
    case "closet": return DB.closet.length;
    case "goods": return DB.goods.length;
    case "expiry": return DB.expiry.length;
    case "books": return DB.booksLit.length + "/100";
    case "movies": return DB.moviesLit.length + "/100";
    case "weekend": return Object.keys(DB.weekendPlans).length;
    case "festival": return DB.festivals.length;
    case "body": return DB.exercises.length;
    case "memo": return DB.memos.length;
    case "luggage": return DB.luggage.length;
  }
  return "";
}

function renderMenu(){
  const nav = $("#menuNav");
  nav.innerHTML = MODULES.map(m=>`
    <div class="menu-item ${currentModule===m.id?'active':''}" data-m="${m.id}" onclick="switchModule('${m.id}')">
      <span class="ic">${m.ic}</span><span class="lb">${m.name}</span>
      <span class="cnt">${moduleCount(m.id)}</span>
    </div>`).join("");
}

function switchModule(id){
  currentModule = id;
  renderMenu();
  renderContent();
  closeDrawer();
  const m = MODULES.find(x=>x.id===id);
  $("#topTitle").textContent = m ? m.name : "祺祺生活台";
  $("#content").scrollTop = 0;
}
function renderTopDate(){
  const now = new Date();
  const week=["日","一","二","三","四","五","六"][now.getDay()];
  const lun = solarToLunar(now.getFullYear(), now.getMonth()+1, now.getDate());
  $("#topDate").innerHTML = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 周五<br>农历${lunarStr(lun.y,lun.m,lun.d)}`;
}
function renderContent(){
  const c = $("#content");
  const fn = {
    closet: renderCloset, goods: renderGoods, expiry: renderExpiry,
    books: ()=>renderIceberg("books"), movies: ()=>renderIceberg("movies"),
    weekend: renderWeekend, festival: renderFestival, body: renderBody,
    memo: renderMemo, luggage: renderLuggage,
  }[currentModule];
  c.innerHTML = `<div id="pageHost"></div>`;
  fn();
}

/* ============ 弹窗通用 ============ */
function openModal(html){
  const mask = document.createElement("div");
  mask.className = "modal-mask";
  mask.id = "_modalMask";
  mask.innerHTML = `<div class="modal">${html}</div>`;
  mask.addEventListener("click", e=>{ if(e.target===mask) closeModal(); });
  document.body.appendChild(mask);
}
function closeModal(){
  const m = $("#_modalMask"); if(m) m.remove();
}
function pickImg(cb){
  const inp = document.createElement("input");
  inp.type="file"; inp.accept="image/*";
  inp.onchange = e=>{
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ev=>{
      const img = new Image();
      img.onload=()=>{
        const max=720; let w=img.width,h=img.height;
        if(w>max){ h=Math.round(h*max/w); w=max; }
        const cv=document.createElement("canvas"); cv.width=w; cv.height=h;
        cv.getContext("2d").drawImage(img,0,0,w,h);
        cb(cv.toDataURL("image/jpeg",0.72));
      };
      img.src=ev.target.result;
    };
    r.readAsDataURL(f);
  };
  inp.click();
}

/* =======================================================================
  1. 电子衣橱
  ======================================================================= */
const CLOSET_CATS = [
  {k:"上衣",e:"👕"},{k:"下装",e:"👖"},{k:"连衣裙",e:"👗"},{k:"外套",e:"🧥"},
  {k:"鞋子",e:"👟"},{k:"包包",e:"👜"},{k:"帽子",e:"🧢"},{k:"配饰",e:"💍"},{k:"其他",e:"🧦"}
];
const OCCASIONS = ["日常","上班","约会","运动","旅行","聚会","重要场合","居家"];
let closetFilter = "全部";
let closetTab = "wardrobe"; // wardrobe | outfit

function renderCloset(){
  if(closetTab==="outfit") return renderOutfitView();
  const list = DB.closet.filter(x=> closetFilter==="全部" || x.category===closetFilter);
  const catCount = new Set(DB.closet.map(x=>x.category)).size;
  const ocCount = DB.closet.reduce((s,o)=>s+(o.occasions||[]).length,0);
  let h = `
    <div class="stats">
      <div class="stat"><div class="pic" style="background:#fdeef2">👗</div><div><div class="num">${DB.closet.length}</div><div class="cap">衣物总数</div></div></div>
      <div class="stat"><div class="pic" style="background:#fdf3e2">🗂️</div><div><div class="num">${catCount}</div><div class="cap">分类数</div></div></div>
      <div class="stat"><div class="pic" style="background:#e9f2f8">✨</div><div><div class="num">${DB.outfits.length}</div><div class="cap">搭配方案</div></div></div>
      <div class="stat"><div class="pic" style="background:#e6f5ec">🆕</div><div><div class="num">${DB.closet.filter(x=>weekAge(x.id)<30).length}</div><div class="cap">本月新增</div></div></div>
    </div>
    <div class="ex-tabs">
      <div class="ex-tab ${closetTab==='wardrobe'?'active':''}" onclick="setClosetTab('wardrobe')">👗 我的衣柜</div>
      <div class="ex-tab ${closetTab==='outfit'?'active':''}" onclick="setClosetTab('outfit')">✨ 场合搭配</div>
    </div>
    <div class="chips" id="closetChips">
      ${['全部',...CLOSET_CATS.map(c=>c.k)].map(k=>{
        const cat = CLOSET_CATS.find(c=>c.k===k);
        return `<button class="chip ${closetFilter===k?'active':''}" onclick="setClosetFilter('${k}')">${k==='全部'?'':(cat?cat.e+' ':'')}${k}</button>`;
      }).join("")}
    </div>
    <div class="tools">
      <button class="btn" onclick="openClosetModal()"> ＋ 添加衣物</button>
    </div>
    <div class="search"><span class="ic">🔍</span><input placeholder="搜索衣物：名称、颜色、备注" oninput="searchCloset(this.value)"></div>
    <div id="closetList" style="margin-top:12px;"></div>
  `;
  $("#pageHost").innerHTML=h;
  renderClosetList(list);
}
function setClosetTab(t){ closetTab=t; renderCloset(); }
function weekAge(id){
  const t = parseInt(String(id).slice(0,8),36); // 创建时间戳(ms)
  if(!t) return 999;
  return (Date.now() - t)/86400000; // 天
}
function setClosetFilter(k){ closetFilter=k; renderCloset(); }
function searchCloset(v){
  v=v.trim().toLowerCase();
  const list = DB.closet.filter(x=>(closetFilter==="全部"||x.category===closetFilter) &&
    (!v || (x.name||"").toLowerCase().includes(v)||(x.colors||[]).some(c=>c.toLowerCase().includes(v))||(x.note||"").toLowerCase().includes(v)));
  renderClosetList(list);
}
function renderClosetList(list){
  const wrap = $("#closetList"); if(!wrap) return;
  wrap.innerHTML = `<div class="closet-grid">${list.map(x=>`
    <div class="closet-item">
      <div class="ci-x" onclick="delCloset('${x.id}')">✕</div>
      <div class="ph" onclick="editCloset('${x.id}')">${x.img?`<img src="${x.img}">`:(CLOSET_CATS.find(c=>c.k===x.category)?.e||"👕")}</div>
      <div class="ci-body" onclick="editCloset('${x.id}')">
        <div class="ci-name">${x.name}</div>
        <div class="ci-meta">${x.category} ${x.colors&&x.colors.length?"·"+x.colors.join("/"):""}</div>
      </div>
    </div>`).join("")}</div>
    ${list.length===0?`<div class="empty"><div class="big">👗</div>还没有衣物，点击上方添加</div>`:""}`;
}
function openClosetModal(editId){
  const x = editId ? DB.closet.find(o=>o.id===editId) : null;
  const cats = CLOSET_CATS.map(c=>c.k);
  const selOcc = x ? (x.occasions||[]) : [];
  openModal(`
    <div class="modal-h">${x?"编辑衣物":"＋ 添加衣物"}</div>
    <div class="form-row"><label>名称 *</label><input id="cName" value="${x?esc(x.name):''}" placeholder="如：粉色碎花连衣裙"></div>
    <div class="form-row"><label>分类</label><div class="opts" id="cCats">${cats.map(c=>`<button class="opt ${x&&x.category===c?'on':''}" onclick="pickCat('${c}',this)">${CLOSET_CATS.find(y=>y.k===c).e} ${c}</button>`).join("")}</div></div>
    <div class="form-row"><label>适合场合（可多选）</label><div class="opts" id="cOcc">${OCCASIONS.map(c=>`<button class="opt ${selOcc.includes(c)?'on':''}" onclick="toggleOpt(this,'${c}')">${c}</button>`).join("")}</div></div>
    <div class="form-row"><label>颜色/标签（用顿号或逗号分隔）</label><input id="cColor" value="${x?(x.colors||[]).join("、"):''}" placeholder="如：粉色、碎花"></div>
    <div class="form-row"><label>备注</label><textarea id="cNote">${x?esc(x.note||''):''}</textarea></div>
    <div class="form-row"><label>图片（点按上传，压缩后本地保存）</label>
      <button class="btn ghost" style="width:100%;justify-content:center" onclick="pickImg(d=>{$('#cImg').value=d; $('#cImgPrev').src=d; $('#cImgPrev').style.display='block';})">上传图片</button>
      <img id="cImgPrev" class="photo-preview" style="display:${x&&x.img?'block':'none'}" src="${x&&x.img?x.img:''}">
      <input id="cImg" type="hidden" value="${x&&x.img?x.img:''}">
    </div>
    <div class="modal-ft">
      <button class="btn" onclick="saveCloset('${editId||''}')">保存</button>
      <button class="btn ghost" onclick="closeModal()">取消</button>
    </div>
  `);
}
function pickCat(c,btn){
  document.querySelectorAll("#cCats .opt").forEach(o=>o.classList.remove("on"));
  btn.classList.add("on");
}
function toggleOpt(btn,v){
  btn.classList.toggle("on");
}
function saveCloset(editId){
  const name=$("#cName").value.trim(); if(!name) return toast("请填写名称");
  const cat = document.querySelector("#cCats .opt.on")?.textContent.replace(/^\S+\s/,"")||"其他";
  const occ=[...document.querySelectorAll("#cOcc .opt.on")].map(o=>o.textContent.trim());
  const colors=$("#cColor").value.split(/[、,，]/).map(s=>s.trim()).filter(Boolean);
  const note=$("#cNote").value.trim();
  const img=$("#cImg").value;
  if(editId){
    const x=DB.closet.find(o=>o.id===editId); Object.assign(x,{name,category:cat,occasions:occ,colors,note,img});
  }else{
    DB.closet.unshift({id:uid(),name,category:cat,occasions:occ,colors,note,img});
  }
  save(); closeModal(); renderCloset(); renderMenu(); toast("已保存");
}
function delCloset(id){ DB.closet=DB.closet.filter(x=>x.id!==id); save(); renderCloset(); renderMenu(); toast("已删除"); }
function editCloset(id){ openClosetModal(id); }

/* ---------- 场合搭配视图 ---------- */
let outfitOccasion = "约会";
function renderOutfitView(){
  const occasion = outfitOccasion;
  // 属于该场合的衣物
  const usable = DB.closet.filter(x=> (x.occasions||[]).includes(occasion));
  // 按分类分组
  const groups = CLOSET_CATS.map(c=>({cat:c, items: usable.filter(x=>x.category===c.k)})).filter(g=>g.items.length);
  let h=`
    <div class="stats">
      <div class="stat"><div class="pic" style="background:#fdeef2">👗</div><div><div class="num">${DB.closet.length}</div><div class="cap">衣物总数</div></div></div>
      <div class="stat"><div class="pic" style="background:#e9f2f8">✨</div><div><div class="num">${DB.outfits.length}</div><div class="cap">搭配方案</div></div></div>
    </div>
    <div class="ex-tabs">
      <div class="ex-tab ${closetTab==='wardrobe'?'active':''}" onclick="setClosetTab('wardrobe')">👗 我的衣柜</div>
      <div class="ex-tab ${closetTab==='outfit'?'active':''}" onclick="setClosetTab('outfit')">✨ 场合搭配</div>
    </div>
    <div style="font-weight:600;font-size:14px;margin:6px 0 8px">选择场合，挑出适合的衣物组合成一套</div>
    <div class="chips">
      ${OCCASIONS.map(o=>`<button class="chip ${occasion===o?'active':''}" onclick="setOutfitOccasion('${o}')">${o}</button>`).join("")}
    </div>
    <div style="font-size:12.5px;color:var(--muted);margin:4px 0 8px">「${occasion}」适合以下 ${usable.length} 件衣物，点选可加入搭配</div>
    <div id="outfitPicker"></div>
    <div class="tools"><button class="btn" onclick="saveOutfit()"> 💾 保存这套搭配</button></div>
    <div style="font-weight:600;font-size:14px;margin:10px 0 8px">已保存的搭配方案</div>
    <div id="outfitSaved"></div>
  `;
  $("#pageHost").innerHTML=h;
  renderOutfitPicker(groups);
  renderOutfitSaved();
}
function setOutfitOccasion(o){ outfitOccasion=o; renderOutfitView(); }
function renderOutfitPicker(groups){
  const wrap=$("#outfitPicker"); if(!wrap)return;
  wrap.innerHTML = groups.length? groups.map(g=>`
    <div style="margin-bottom:12px">
      <div style="font-size:13px;font-weight:600;margin:4px 0 6px">${g.cat.e} ${g.cat.k}</div>
      <div class="closet-grid">${g.items.map(x=>`
        <div class="closet-item outfit-sel" data-id="${x.id}" style="cursor:pointer" onclick="toggleOutfitSel('${x.id}',this)">
          <div class="ci-x" onclick="event.stopPropagation();delCloset('${x.id}')">✕</div>
          <div class="ph">${x.img?`<img src="${x.img}">`:(g.cat.e)}</div>
          <div class="ci-body"><div class="ci-name">${x.name}</div></div>
        </div>`).join("")}
      </div>
    </div>`).join("") : `<div class="empty"><div class="big">👗</div>「${outfitOccasion}」还没有合适的衣物，先去衣橱添加并标注此场合</div>`;
}
function toggleOutfitSel(id,el){ el.classList.toggle("selected"); }
function saveOutfit(){
  const selected=[...document.querySelectorAll(".outfit-sel.selected")].map(el=>el.dataset.id);
  if(!selected.length) return toast("请先点选几件衣物组成搭配");
  DB.outfits.unshift({id:uid(),occasion:outfitOccasion,items:selected,createdAt:Date.now()});
  save(); renderOutfitView(); renderMenu(); toast("搭配已保存 ✨");
}
function renderOutfitSaved(){
  const wrap=$("#outfitSaved"); if(!wrap)return;
  wrap.innerHTML = DB.outfits.length? DB.outfits.map(o=>{
    const items=o.items.map(id=>DB.closet.find(x=>x.id===id)).filter(Boolean);
    return `<div class="card">
      <div class="name" style="margin-bottom:6px">✨ ${o.occasion}搭配 <span style="font-weight:400;font-size:12px;color:var(--muted)">${formatDateCN(o.createdAt)}</span></div>
      <div class="ci-scroll" style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px">
        ${items.map(x=>`
          <div style="min-width:56px;text-align:center">
            <div style="width:56px;height:64px;border-radius:9px;background:#f7eef1;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:22px">${x.img?`<img src="${x.img}" style="width:100%;height:100%;object-fit:cover">`:((CLOSET_CATS.find(c=>c.k===x.category)||{}).e||"👕")}</div>
            <div style="font-size:9px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:56px">${x.name}</div>
          </div>`).join("")}
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px">
        <button class="edit" onclick="delOutfit('${o.id}')">🗑️ 删除搭配</button>
      </div>
    </div>`;
  }).join("") : `<div style="color:var(--muted);text-align:center;padding:14px;font-size:13px">还没有保存的搭配方案</div>`;
}
function formatDateCN(ts){
  if(!ts) return "";
  const d=new Date(ts);
  return `${d.getMonth()+1}月${d.getDate()}日`;
}
function delOutfit(id){ DB.outfits=DB.outfits.filter(x=>x.id!==id); save(); renderOutfitView(); renderMenu(); toast("已删除搭配"); }

/* =======================================================================
  2. 生活消耗
  ======================================================================= */
const GOODS_CATS = [
  {k:"纸品",e:"🧻"},{k:"清洁",e:"🧴"},{k:"洗衣",e:"🧺"},{k:"个护",e:"🧼"},{k:"厨房",e:"🍳"},{k:"衣物",e:"🧦"},{k:"食品",e:"🍚"},{k:"其他",e:"📦"}
];
let goodsFilter = "全部";
function renderGoods(){
  const list = goodsFilter==="全部"? DB.goods : DB.goods.filter(x=>x.category===goodsFilter);
  const total = DB.goods.reduce((s,x)=>s+Number(x.stock||0),0);
  const need = DB.goods.filter(x=>Number(x.stock||0)<=Number(x.target||0));
  let h = `
    <div class="stats">
      <div class="stat"><div class="pic" style="background:#fdf3e2">📦</div><div><div class="num">${DB.goods.length}</div><div class="cap">品种数</div></div></div>
      <div class="stat"><div class="pic" style="background:#e9f2f8">📊</div><div><div class="num">${total}</div><div class="cap">总库存</div></div></div>
      <div class="stat ${need.length?'warn':''}"><div class="pic" style="background:#fbe6e8">⚠️</div><div><div class="num">${need.length}</div><div class="cap">需补货</div></div></div>
    </div>
    ${need.length?`<div class="card" style="background:#fdf6e4;border:1px solid #f2dfb0">⚠️ 以下物品库存不足，考虑补货：${need.map(x=>x.name).join("、")}</div>`:""}
    <div class="chips">
      ${['全部',...GOODS_CATS.map(c=>c.k)].map(k=>{
        const cat=GOODS_CATS.find(c=>c.k===k);
        return `<button class="chip ${goodsFilter===k?'active':''}" onclick="setGoodsFilter('${k}')">${k==='全部'?'':(cat?cat.e+' ':'')}${k}</button>`;
      }).join("")}
    </div>
    <div class="tools">
      <button class="btn" onclick="openGoodsModal()"> ＋ 添加物品</button>
    </div>
    <div class="search"><span class="ic">🔍</span><input placeholder="搜索物品：名称、分类、备注" oninput="searchGoods(this.value)"></div>
    <div id="goodsList" style="margin-top:12px;"></div>
  `;
  $("#pageHost").innerHTML=h;
  renderGoodsList(list);
}
function setGoodsFilter(k){ goodsFilter=k; renderGoods(); }
function searchGoods(v){
  v=v.trim().toLowerCase();
  const list=DB.goods.filter(x=>(goodsFilter==="全部"||x.category===goodsFilter)&&
    (!v||(x.name||"").toLowerCase().includes(v)||(x.note||"").toLowerCase().includes(v)));
  renderGoodsList(list);
}
function renderGoodsList(list){
  const wrap=$("#goodsList"); if(!wrap)return;
  wrap.innerHTML=list.map(x=>{
    const low=Number(x.stock||0)<=Number(x.target||0);
    const pct=Math.min(100,Math.round(Number(x.stock||0)/(Number(x.target||0)*3)*100));
    const cat=GOODS_CATS.find(c=>c.k===x.category);
    return `<div class="card"><div class="row">
      <div style="font-size:26px">${cat?cat.e:"📦"}</div>
      <div class="main">
        <div class="name">${x.name} <span style="color:var(--pink-deep);font-weight:700;font-size:16px">${x.stock||0}</span></div>
        <div class="meta">${x.category} · ${x.unit||"件"} ${low?'<span style="color:var(--yellow);font-weight:600">需补货</span>':''}</div>
        <div class="prog"><div style="width:${pct}%;background:${low?'var(--yellow)':'var(--green)'}"></div></div>
      </div>
      <button class="edit" onclick="openGoodsModal('${x.id}')">✏️</button>
      <button class="del" onclick="delGoods('${x.id}')">🗑️</button>
    </div></div>`;
  }).join("") + (list.length===0?`<div class="empty"><div class="big">🧺</div>还没有囤货记录，先加一个吧</div>`:"");
}
function openGoodsModal(editId){
  const x=editId?DB.goods.find(o=>o.id===editId):null;
  openModal(`
    <div class="modal-h">${x?"编辑物品":"＋ 添加物品"}</div>
    <div class="form-row"><label>名称 *</label><input id="gName" value="${x?esc(x.name):''}" placeholder="如：除菌洗衣液"></div>
    <div class="form-row"><label>分类</label><div class="opts" id="gCats">${GOODS_CATS.map(c=>`<button class="opt ${x&&x.category===c.k?'on':''}" onclick="pickGcat('${c.k}',this)">${c.e} ${c.k}</button>`).join("")}</div></div>
    <div class="form-row"><label>当前库存数量 *</label><input id="gStock" type="number" min="0" value="${x?x.stock:''}" placeholder="0"></div>
    <div class="form-row"><label>单位</label><input id="gUnit" value="${x?esc(x.unit||''):'件'}" placeholder="瓶/盒/包/件"></div>
    <div class="form-row"><label>补货警戒线（≤此数量提醒补货）</label><input id="gTarget" type="number" min="0" value="${x?x.target:1}"></div>
    <div class="form-row"><label>备注</label><textarea id="gNote">${x?esc(x.note||''):''}</textarea></div>
    <div class="modal-ft">
      <button class="btn" onclick="saveGoods('${editId||''}')">保存</button>
      <button class="btn ghost" onclick="closeModal()">取消</button>
    </div>
  `);
}
function pickGcat(k,btn){ document.querySelectorAll("#gCats .opt").forEach(o=>o.classList.remove("on")); btn.classList.add("on"); }
function saveGoods(editId){
  const name=$("#gName").value.trim(); if(!name)return toast("请填写名称");
  const cat=document.querySelector("#gCats .opt.on")?.textContent.replace(/^\S+\s/,"")||"其他";
  const stock=Number($("#gStock").value)||0;
  const unit=$("#gUnit").value.trim()||"件";
  const target=Number($("#gTarget").value)||0;
  const note=$("#gNote").value.trim();
  if(editId){ const x=DB.goods.find(o=>o.id===editId); Object.assign(x,{name,category:cat,stock,unit,target,note}); }
  else DB.goods.unshift({id:uid(),name,category:cat,stock,unit,target,note});
  save();closeModal();renderGoods();renderMenu();toast("已保存");
}
function delGoods(id){ DB.goods=DB.goods.filter(x=>x.id!==id);save();renderGoods();renderMenu();toast("已删除"); }
/* =======================================================================
  3. 赏味期限
  ======================================================================= */
const EXPIRY_CATS = [
  {k:"护肤品",e:"🧴"},{k:"美妆",e:"💄"},{k:"食品",e:"🍰"},{k:"药品",e:"💊"},{k:"日用品",e:"🧼"},{k:"其他",e:"📦"}
];
let expiryFilter = "全部";
function expiryStatus(item){
  const d=diffDays(item.expireDate);
  if(d<0) return {key:"expired",label:`已过期 ${-d}天`,cls:"red"};
  if(d<=30) return {key:"soon",label:`剩${d}天`,cls:"orange"};
  return {key:"safe",label:`剩${d}天`,cls:"green"};
}
function renderExpiry(){
  const now=Date.now();
  const total=DB.expiry.length;
  const expired=DB.expiry.filter(x=>expiryStatus(x).key==="expired");
  const soon=DB.expiry.filter(x=>expiryStatus(x).key==="soon");
  const safe=DB.expiry.filter(x=>expiryStatus(x).key==="safe");
  let list=DB.expiry;
  if(expiryFilter!=="全部") list=DB.expiry.filter(x=>{
    if(expiryFilter==="expired")return expiryStatus(x).key==="expired";
    if(expiryFilter==="soon")return expiryStatus(x).key==="soon";
    if(expiryFilter==="safe")return expiryStatus(x).key==="safe";
    return false;
  });
  let h=`
    <div class="stats">
      <div class="stat"><div class="pic" style="background:#fdeef2">⏰</div><div><div class="num">${total}</div><div class="cap">记录总数</div></div></div>
      <div class="stat ${expired.length?'warn':''}"><div class="pic" style="background:#fbe6e8">❌</div><div><div class="num">${expired.length}</div><div class="cap">已过期</div></div></div>
      <div class="stat ${soon.length?'warn':''}"><div class="pic" style="background:#fdf3e2">⚠️</div><div><div class="num">${soon.length}</div><div class="cap">30天内</div></div></div>
      <div class="stat"><div class="pic" style="background:#e6f5ec">✅</div><div><div class="num">${safe.length}</div><div class="cap">安全</div></div></div>
    </div>
    <div class="chips">
      ${[["全部","全部",""],["expired","❌ 已过期",expired.length],["soon","⚠️ 30天内",soon.length],["safe","✅ 安全",safe.length]].map(c=>`
        <button class="chip ${expiryFilter===c[0]?'active':''}" onclick="setExpiryFilter('${c[0]}')">${c[1]}</button>`).join("")}
    </div>
    <div class="tools"><button class="btn" onclick="openExpiryModal()"> ＋ 添加记录</button></div>
    <div class="search"><span class="ic">🔍</span><input placeholder="搜索记录：名称、分类、备注" oninput="searchExpiry(this.value)"></div>
    <div id="expiryList" style="margin-top:12px;"></div>
  `;
  $("#pageHost").innerHTML=h;
  renderExpiryList(list);
}
function setExpiryFilter(k){ expiryFilter=k; renderExpiry(); }
function searchExpiry(v){
  v=v.trim().toLowerCase();
  const list=DB.expiry.filter(x=>(!v||(x.name||"").toLowerCase().includes(v)||(x.note||"").toLowerCase().includes(v)));
  renderExpiryList(list);
}
function renderExpiryList(list){
  const wrap=$("#expiryList"); if(!wrap)return;
  wrap.innerHTML=list.map(x=>{
    const st=expiryStatus(x);
    const cat=EXPIRY_CATS.find(c=>c.k===x.category);
    return `<div class="card"><div class="row">
      <div style="font-size:25px">${cat?cat.e:"🧴"}</div>
      <div class="main">
        <div class="name">${x.name}</div>
        <div class="meta">${x.category} · 保质期至 ${x.expireDate}</div>
      </div>
      <span class="pill ${st.cls}">${st.label}</span>
      <button class="edit" onclick="openExpiryModal('${x.id}')">✏️</button>
      <button class="del" onclick="delExpiry('${x.id}')">🗑️</button>
    </div></div>`;
  }).join("")+(list.length===0?`<div class="empty"><div class="big">⏰</div>暂无记录，添加一件用品看看保质期吧</div>`:"");
}
function openExpiryModal(editId){
  const x=editId?DB.expiry.find(o=>o.id===editId):null;
  openModal(`
    <div class="modal-h">${x?"编辑记录":"＋ 添加记录"}</div>
    <div class="form-row"><label>名称 *</label><input id="eName" value="${x?esc(x.name):''}" placeholder="如：可复美面霜"></div>
    <div class="form-row"><label>分类</label><div class="opts" id="eCats">${EXPIRY_CATS.map(c=>`<button class="opt ${x&&x.category===c.k?'on':''}" onclick="pickEcat('${c.k}',this)">${c.e} ${c.k}</button>`).join("")}</div></div>
    <div class="form-row"><label>生产日期</label><input id="eProd" type="date" value="${x?x.prodDate:''}"></div>
    <div class="form-row"><label>保质期截止日 *</label><input id="eExp" type="date" value="${x?x.expireDate:''}"></div>
    <div class="form-row"><label>备注</label><textarea id="eNote">${x?esc(x.note||''):''}</textarea></div>
    <div class="modal-ft">
      <button class="btn" onclick="saveExpiry('${editId||''}')">保存</button>
      <button class="btn ghost" onclick="closeModal()">取消</button>
    </div>
  `);
}
function pickEcat(k,btn){ document.querySelectorAll("#eCats .opt").forEach(o=>o.classList.remove("on")); btn.classList.add("on"); }
function saveExpiry(editId){
  const name=$("#eName").value.trim(); if(!name)return toast("请填写名称");
  const cat=document.querySelector("#eCats .opt.on")?.textContent.replace(/^\S+\s/,"")||"其他";
  const prodDate=$("#eProd").value; const expireDate=$("#eExp").value;
  if(!expireDate)return toast("请填写保质期截止日");
  const note=$("#eNote").value.trim();
  const record={name,category:cat,prodDate,expireDate,note};
  if(editId){ const x=DB.expiry.find(o=>o.id===editId); Object.assign(x,record); }
  else DB.expiry.unshift({id:uid(),...record});
  save();closeModal();renderExpiry();renderMenu();toast("已保存");
}
function delExpiry(id){ DB.expiry=DB.expiry.filter(x=>x.id!==id);save();renderExpiry();renderMenu();toast("已删除"); }

/* =======================================================================
  4&5. 读书 / 电影 —— 冰山地图
  ======================================================================= */
function renderIceberg(kind){
  const isBook = kind==="books";
  const data = isBook ? (window.DOUBAN_BOOKS||[]) : (window.DOUBAN_MOVIES||[]);
  const litSet = new Set(isBook? DB.booksLit : DB.moviesLit);
  const litCount = litSet.size;
  const total=data.length;
  const color = isBook? "#f6a5b5" : "#8fb8dd";
  const title = isBook? "📚 读书冰山" : "🎬 电影冰山";
  const sub = isBook? "豆瓣读书 Top100" : "豆瓣电影 Top100";
  const topId = isBook? "BOOK" : "MOVIE";
  let h=`
    <div class="stats">
      <div class="stat"><div class="pic" style="background:${isBook?'#fdeef2':'#e9f2f8'}">${isBook?'📚':'🎬'}</div><div><div class="num">${litCount}/${total}</div><div class="cap">${isBook?'已读':'已看'}</div></div></div>
      <div class="stat"><div class="pic" style="background:#fdf3e2">🌟</div><div><div class="num">${total-litCount}</div><div class="cap">待${isBook?'读':'看'}</div></div></div>
      <div class="stat"><div class="pic" style="background:#e6f5ec">📈</div><div><div class="num">${Math.round(litCount/total*100)}%</div><div class="cap">点亮率</div></div></div>
    </div>
    <div id="icebergWrap">
      <div id="iceberg">
        <div id="icebergInner"></div>
        <div id="iceList"></div>
      </div>
    </div>
  `;
  $("#pageHost").innerHTML=h;
  // 布局冰山：按行组织，每行格子数不同，中间对齐成冰山轮廓
  const inner=$("#icebergInner");
  const layout = makeIcebergLayout(data.length);
  inner.innerHTML = `
    <div class="ice-head">${title} · ${sub}</div>
    <div class="ice-toolbar">
      <span style="font-size:12px;color:#4a7d95">点按方块点亮 / 取消</span>
      <button class="ice-zoom" onclick="openIceList('${topId}')">🔍 放大查看完整名单</button>
    </div>
    <div class="ice-wave">〜〜〜 水面线 〜〜〜</div>
    <div class="ice-grid" id="iceGrid">${layout.rows.map(row=>`
      <div class="ice-row">${row.items.map(idx=>`
        <div class="ice-cell ${litSet.has(data[idx].title)?'lit':''}" onclick="toggleIce('${topId}',${idx})">
          <span class="txt">${trunc(data[idx].title, 4)}</span>
        </div>`).join("")}
      </div>`).join("")}
    </div>
    <div class="ice-hint">👈 左右滑动看更多 · 点上方按钮放大查看完整书名 👉</div>
  `;
}
function trunc(s,n){ return s.length>n? s.slice(0,n)+"…" : s; }
function makeIcebergLayout(n){
  // 冰山轮廓：顶部窄（尖角露于水面），中部变宽，水下最宽。
  const rowPattern = [3,4,5,6,7,8,9,9,10,10,10,11,11];
  const maxCols = Math.max(...rowPattern);
  const rows=[]; let idx=0, r=0;
  while(idx<n){
    const size = rowPattern[r % rowPattern.length];
    const inRow = Math.min(size, n-idx);
    const items=[];
    for(let k=0;k<inRow;k++){ items.push(idx); idx++; }
    rows.push({items, width: Math.round(inRow/maxCols*100)});
    r++;
  }
  return {rows};
}

function toggleIce(kind, idx){
  const isBook=kind==="BOOK";
  const data=isBook? window.DOUBAN_BOOKS: window.DOUBAN_MOVIES;
  const arr=isBook? DB.booksLit: DB.moviesLit;
  const title=data[idx].title;
  const pos=arr.indexOf(title);
  if(pos>=0){ arr.splice(pos,1); toast("已取消点亮"); }
  else { arr.push(title); toast("✨ 已点亮"); }
  save(); renderIceberg(isBook?"books":"movies"); renderMenu();
}
function openIceList(kind){
  const isBook=kind==="BOOK";
  const data=isBook? window.DOUBAN_BOOKS: window.DOUBAN_MOVIES;
  const litSet=new Set(isBook?DB.booksLit:DB.moviesLit);
  const list=$("#iceList");
  list.innerHTML=`
    <div class="back" onclick="closeIceList()">‹ 返回冰山</div>
    <div style="font-weight:600;margin-bottom:10px">${isBook?"📚 完整书单（点击书名点亮）":"🎬 完整片单（点击片名点亮）"} · 共${data.length}部</div>
    <div class="ice-list-items">${data.map((x,i)=>`
      <div class="ice-list-item ${litSet.has(x.title)?'lit':''}" onclick="toggleIceList('${kind}',${i})">
        <div class="rank">${i+1}</div>
        <div class="nm">${x.title}</div>
        <div class="sc">${x.score?x.score:'⭐'}</div>
      </div>`).join("")}</div>`;
  list.classList.add("show");
}
function toggleIceList(kind,i){
  toggleIce(kind,i);
  // 重新打开列表
  openIceList(kind);
}
function closeIceList(){ const l=$("#iceList"); if(l){l.classList.remove("show"); l.innerHTML="";} }
/* =======================================================================
  6. 周末玩耍 —— 365天日历
  ======================================================================= */
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-11
function renderWeekend(){
  const plans=DB.weekendPlans;
  const litCount=Object.keys(plans).length;
  let h=`
    <div class="stats">
      <div class="stat"><div class="pic" style="background:#fdeef2">🎡</div><div><div class="num">${litCount}</div><div class="cap">玩耍记录</div></div></div>
      <div class="stat"><div class="pic" style="background:#e9f2f8">📅</div><div><div class="num">${calYear}</div><div class="cap">当前年份</div></div></div>
    </div>
    <div id="weekendCal"></div>
    <div class="cal-legend">
      <span><span class="star">★</span> 出去玩过/记录</span>
      <span style="display:flex;align-items:center"><span style="width:12px;height:12px;border:2px solid var(--pink);border-radius:3px;display:inline-block;margin-right:4px"></span>今天</span>
    </div>
    <div style="margin-top:14px;font-weight:600;font-size:14px">本月周末安排</div>
    <div id="weekendPlans" style="margin-top:8px"></div>
    <div class="tools"><button class="btn" onclick="openPlanModal()"> ＋ 添加玩法计划</button></div>
  `;
  $("#pageHost").innerHTML=h;
  renderCalendar();
  renderPlansList();
}
function renderCalendar(){
  const wrap=$("#weekendCal"); if(!wrap)return;
  const first=new Date(calYear,calMonth,1);
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const startDay=first.getDay();
  const wk=["日","一","二","三","四","五","六"];
  const today=todayStr();
  let cells="";
  for(let i=0;i<startDay;i++){ cells+=`<div class="cal-day blank"></div>`; }
  for(let d=1;d<=daysInMonth;d++){
    const dateStr=`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const dow=(startDay+d-1)%7;
    const isWeekend=(dow===0||dow===6);
    const has=DB.weekendPlans[dateStr];
    const isToday=dateStr===today;
    cells+=`<div class="cal-day ${isToday?'today':''} ${isWeekend?'weekend':''} ${has?'star':''} tap" onclick="dayTap('${dateStr}')">
      <span class="d">${d}</span><span class="wk">${wk[dow]}</span></div>`;
  }
  wrap.innerHTML=`
    <div class="cal-head">
      <button class="arr" onclick="calNav(-1)">‹</button>
      <div class="y-title">${calYear}年 ${calMonth+1}月</div>
      <button class="arr" onclick="calNav(1)">›</button>
    </div>
    <div class="cal-weekdays">${wk.map(w=>`<div>${w}</div>`).join("")}</div>
    <div class="cal-grid">${cells}</div>`;
}
function calNav(d){ calMonth+=d; if(calMonth<0){calMonth=11;calYear--;} if(calMonth>11){calMonth=0;calYear++;} renderCalendar(); }
function dayTap(dateStr){
  const p=DB.weekendPlans[dateStr]||{};
  openModal(`
    <div class="modal-h">📅 ${dateStr} 周末计划</div>
    <div class="form-row"><label>周末计划（想做什么）</label><input id="wpPlan" value="${p.plan?esc(p.plan):''}" placeholder="如：去逛集市"></div>
    <div class="form-row"><label>实际去哪玩了</label><input id="wpActual" value="${p.actual?esc(p.actual):''}" placeholder="如：大学城夜市"></div>
    <div class="form-row"><label>和谁玩</label><input id="wpWith" value="${p.with?esc(p.with):''}" placeholder="如：小美、阿杰"></div>
    <div class="modal-ft">
      <button class="btn" onclick="savePlan('${dateStr}')">保存</button>
      ${p.plan||p.actual?`<button class="btn ghost" onclick="clearPlan('${dateStr}')">清除</button>`:''}
      <button class="btn ghost" onclick="closeModal()">取消</button>
    </div>
  `);
}
function savePlan(dateStr){
  const plan=$("#wpPlan").value.trim();
  const actual=$("#wpActual").value.trim();
  const withWho=$("#wpWith").value.trim();
  if(!plan&&!actual){ delete DB.weekendPlans[dateStr]; }
  else DB.weekendPlans[dateStr]={plan,actual,with:withWho};
  save();closeModal();renderWeekend();renderMenu();toast("已保存");
}
function clearPlan(dateStr){ delete DB.weekendPlans[dateStr];save();closeModal();renderWeekend();renderMenu();toast("已清除"); }
function openPlanModal(){
  // 快捷添加本周计划的入口，定位到今天的月
  const t=new Date(); calYear=t.getFullYear(); calMonth=t.getMonth();
  renderCalendar();
  openModal(`
    <div class="modal-h">🎡 添加玩法计划</div>
    <div class="form-row"><label>日期</label><input id="npDate" type="date" value="${todayStr()}"></div>
    <div class="form-row"><label>周末计划</label><input id="npPlan" placeholder="如：去逛集市"></div>
    <div class="form-row"><label>实际去哪玩了</label><input id="npActual" placeholder="如：大学城夜市"></div>
    <div class="form-row"><label>和谁玩</label><input id="npWith" placeholder="如：小美、阿杰"></div>
    <div class="modal-ft"><button class="btn" onclick="saveQuickPlan()">保存</button><button class="btn ghost" onclick="closeModal()">取消</button></div>
  `);
}
function saveQuickPlan(){
  const dateStr=$("#npDate").value; const plan=$("#npPlan").value.trim(); const actual=$("#npActual").value.trim(); const withWho=$("#npWith").value.trim();
  if(!dateStr)return toast("请选择日期");
  DB.weekendPlans[dateStr]={plan,actual,with:withWho};
  save();closeModal();renderWeekend();renderMenu();toast("已保存");
}
function renderPlansList(){
  const wrap=$("#weekendPlans"); if(!wrap)return;
  const prefix=`${calYear}-${String(calMonth+1).padStart(2,"0")}`;
  const entries=Object.keys(DB.weekendPlans).filter(d=>d.startsWith(prefix)).sort().reverse();
  wrap.innerHTML=entries.length? entries.map(d=>{
    const p=DB.weekendPlans[d];
    return `<div class="plan-card">
      <div class="pd">${d} ${weekCN(d)}</div>
      ${p.plan?`<div><span class="plabel">计划：</span>${esc(p.plan)}</div>`:''}
      ${p.actual?`<div><span class="plabel">实去：</span>${esc(p.actual)}</div>`:''}
      ${p.with?`<div><span class="plabel">和谁：</span>${esc(p.with)}</div>`:''}
      <div style="margin-top:8px;text-align:right"><button class="edit" onclick="dayTap('${d}')">✏️</button></div>
    </div>`;
  }).join("") : `<div style="color:var(--muted);text-align:center;padding:16px;font-size:13px">本月还没有玩耍记录，走出门去玩吧！</div>`;
}
function weekCN(dateStr){
  const d=new Date(dateStr+"T00:00:00");
  return "周"+"日一二三四五六"[d.getDay()];
}

/* =======================================================================
  7. 节日记录
  ======================================================================= */
const DEFAULT_FESTIVALS = [
  {name:"元旦",emoji:"🎊",type:"solar",month:1,day:1},
  {name:"情人节",emoji:"💘",type:"solar",month:2,day:14},
  {name:"妇女节",emoji:"🌷",type:"solar",month:3,day:8},
  {name:"母亲节",emoji:"🌹",type:"lunarSpecial",special:"mother"},
  {name:"父亲节",emoji:"👔",type:"lunarSpecial",special:"father"},
  {name:"儿童节",emoji:"🎈",type:"solar",month:6,day:1},
  {name:"端午节",emoji:"🐲",type:"lunar",month:5,day:5},
  {name:"中秋节",emoji:"🥮",type:"lunar",month:8,day:15},
  {name:"国庆节",emoji:"🇨🇳",type:"solar",month:10,day:1},
  {name:"圣诞节",emoji:"🎄",type:"solar",month:12,day:25},
  {name:"春节",emoji:"🧧",type:"lunar",month:1,day:1},
  {name:"元宵节",emoji:"🏮",type:"lunar",month:1,day:15},
  {name:"七夕节",emoji:"💫",type:"lunar",month:7,day:7},
  {name:"重阳节",emoji:"🌼",type:"lunar",month:9,day:9},
  {name:"腊八节",emoji:"🥣",type:"lunar",month:12,day:8},
  {name:"小年",emoji:"🍬",type:"lunar",month:12,day:23},
  {name:"除夕",emoji:"🏮",type:"lunarSpecial",special:"newYearEve"},
];
function initFestivals(){
  if(DB.festivals.length) return;
  DB.festivals = DEFAULT_FESTIVALS.map(f=>({id:uid(),name:f.name,emoji:f.emoji,type:f.type,month:f.month||0,day:f.day||0,special:f.special||null}));
}
function festDate(f, forYear){
  const y = forYear || new Date().getFullYear();
  if(f.type==="solar"){ return {y,m:f.month,d:f.day,label:`${f.month}月${f.day}日`}; }
  if(f.type==="lunar"){ const s=lunarToSolar(y,f.month,f.day,false); return {y:s.y,m:s.m,d:s.d,label:`农历${LUNAR_MONTHS[f.month-1]}月${LUNAR_DAY_CN[f.day-1]||""}`}; }
  if(f.special==="mother"){ return motherDay(y); }
  if(f.special==="father"){ return fatherDay(y); }
  if(f.special==="newYearEve"){ return newYearEve(y); }
  return null;
}
function motherDay(y){ // 5月第2个周日
  const d=new Date(y,4,1); while(d.getDay()!==0)d.setDate(d.getDate()+1); d.setDate(d.getDate()+7);
  return {y,m:d.getMonth()+1,d:d.getDate(),label:"5月第2个周日"};
}
function fatherDay(y){ // 6月第3个周日
  const d=new Date(y,5,1); while(d.getDay()!==0)d.setDate(d.getDate()+1); d.setDate(d.getDate()+14);
  return {y,m:d.getMonth()+1,d:d.getDate(),label:"6月第3个周日"};
}
function newYearEve(y){ // 农历腊月最后一天 = 农历次年正月初一前一天
  const cn=lunarToSolar(y+1,1,1,false);
  const d=new Date(cn.y,cn.m-1,cn.d); d.setDate(d.getDate()-1);
  return {y:d.getFullYear(),m:d.getMonth()+1,d:d.getDate(),label:"除夕"};
}
function festDateStr(f){ const r=festDate(f); return r?`${r.y}-${String(r.m).padStart(2,"0")}-${String(r.d).padStart(2,"0")}`:""; }
function renderFestival(){
  const fest=DB.festivals;
  const now=new Date(); const today=todayStr();
  // 计算每个节日到今天的最近一天（取今年，若已过则取明年）
  const list=fest.map(f=>{
    const s=festDateStr(f); const d=diffDays(s);
    let target=s; let days=d;
    if(d<0){ // 今年已过，算明年
      const s2=festDateStrFor(f,now.getFullYear()+1); target=s2; days=diffDays(s2);
    }
    return {...f, date:target, days};
  }).sort((a,b)=>a.days-b.days);
  const upcoming=list.filter(x=>x.days>=0);
  const passed=list.filter(x=>x.days<0);
  let h=`
    <div class="stats">
      <div class="stat"><div class="pic" style="background:#fdeef2">🎉</div><div><div class="num">${fest.length}</div><div class="cap">节日总数</div></div></div>
      <div class="stat"><div class="pic" style="background:#e6f5ec">📆</div><div><div class="num">${upcoming.length}</div><div class="cap">今年待过</div></div></div>
    </div>
    <div class="chips">
      <button class="chip active">🎉 节日列表</button>
    </div>
    <div style="font-weight:600;font-size:14px;margin:6px 0 8px">⏳ 即将到来（按倒计时）</div>
    <div id="festList"></div>
    <div class="tools"><button class="btn" onclick="openFestModal()"> ＋ 添加节日</button></div>
  `;
  $("#pageHost").innerHTML=h;
  const wrap=$("#festList");
  wrap.innerHTML=upcoming.map(x=>{
    const cls = x.days<=0?"pink": x.days<=7?"orange":"green";
    const label = x.days===0?"今天": x.days===1?"明天":`剩${x.days}天`;
    return `<div class="fest-card">
      <div class="emoji">${x.emoji}</div>
      <div class="fbody"><div class="fn">${x.name}</div><div class="fd">${x.date} · ${x.origLabel&&x.type!=="solar"?x.origLabel:""}</div></div>
      <span class="pill ${cls}">${label}</span>
      <button class="edit" onclick="openFestModal('${x.id}')">✏️</button>
      <button class="del" onclick="delFest('${x.id}')">🗑️</button>
    </div>`;
  }).join("") + (passed.length? `<div style="font-weight:600;font-size:14px;margin:12px 0 8px">✅ 今年已过（点击查看明年）</div>`+passed.map(x=>{
    const s2=festDateStrFor(x, now.getFullYear()+1);
    return `<div class="fest-card" style="opacity:.8">
      <div class="emoji">${x.emoji}</div>
      <div class="fbody"><div class="fn">${x.name}</div><div class="fd">${s2} 明年 · 剩${diffDays(s2)}天</div></div>
    </div>`;
  }).join(""):"") + (fest.length===0?`<div class="empty"><div class="big">🎉</div>暂无节日</div>`:"");
}
function festDateStrFor(f,y){ const r=festDate(f,y); return r?`${r.y}-${String(r.m).padStart(2,"0")}-${String(r.d).padStart(2,"0")}`:""; }
function openFestModal(editId){
  const x=editId?DB.festivals.find(o=>o.id===editId):null;
  openModal(`
    <div class="modal-h">${x?"编辑节日":"＋ 添加节日"}</div>
    <div class="form-row"><label>节日名称 *</label><input id="fName" value="${x?esc(x.name):''}" placeholder="如：朋友生日"></div>
    <div class="form-row"><label>表情</label><input id="fEmoji" value="${x?esc(x.emoji):'🎉'}" placeholder="🎂"></div>
    <div class="form-row"><label>类型</label>
      <div class="opts" id="fType">
        <button class="opt ${x&&x.type==='solar'?'on':''}" onclick="pickFtype('solar',this)">☀️ 阳历（公历）</button>
        <button class="opt ${x&&x.type==='lunar'?'on':''}" onclick="pickFtype('lunar',this)">🌙 农历</button>
      </div>
    </div>
    <div class="form-row" id="fNumRow"><label>月 / 日</label>
      <div style="display:flex;gap:10px">
        <input id="fMonth" type="number" min="1" max="12" placeholder="月" value="${x&&x.month||''}">
        <input id="fDay" type="number" min="1" max="30" placeholder="日" value="${x&&x.day||''}">
      </div>
    </div>
    <div class="modal-ft">
      <button class="btn" onclick="saveFest('${editId||''}')">保存</button>
      <button class="btn ghost" onclick="closeModal()">取消</button>
    </div>
  `);
}
function pickFtype(t,btn){ $("#fNumRow").style.display="block"; document.querySelectorAll("#fType .opt").forEach(o=>o.classList.remove("on")); btn.classList.add("on"); }
function saveFest(editId){
  const name=$("#fName").value.trim(); if(!name)return toast("请填写名称");
  const type=[...document.querySelectorAll("#fType .opt")].find(o=>o.classList.contains("on"));
  const t=type? (type.textContent.includes("农历")?"lunar":"solar"):"solar";
  const month=Number($("#fMonth").value)||0; const day=Number($("#fDay").value)||0;
  if(t!=="solar"&&t!=="lunar")return;
  if((t==="solar"||t==="lunar")&&(!month||!day))return toast("请填写月/日");
  const emoji=$("#fEmoji").value.trim()||"🎉";
  if(editId){ const x=DB.festivals.find(o=>o.id===editId); Object.assign(x,{name,emoji,type:t,month,day,special:null}); }
  else DB.festivals.push({id:uid(),name,emoji,type:t,month,day,special:null});
  save();closeModal();renderFestival();renderMenu();toast("已保存");
}
function delFest(id){ DB.festivals=DB.festivals.filter(x=>x.id!==id);save();renderFestival();renderMenu();toast("已删除"); }
/* =======================================================================
  8. 身体倍棒 —— 运动 & 泡脚
  ======================================================================= */
const EX_TYPES = [
  {k:"游泳",e:"🏊"},{k:"跑步",e:"🏃"},{k:"羽毛球",e:"🏸"},{k:"瑜伽",e:"🧘"},{k:"健身",e:"🏋️"},{k:"骑行",e:"🚴"},{k:"跳绳",e:"🪢"},{k:"爬山",e:"⛰️"},{k:"泡脚",e:"🦶"},{k:"拉伸",e:"🤸"},{k:"其他",e:"✨"}
];
let exTab="exercise";
function renderBody(){
  const total=DB.exercises.length;
  const thisWeek=DB.exercises.filter(x=>weekOf(x.date)===thisWeekStart());
  const list=DB.exercises.filter(x=> exTab==="all"? true : (x.type==="footbath"?"泡脚":x.type)===(exTab==="foot"? "泡脚": "exercise"));
  // 简化，下面重新分类
  let h=`
    <div class="stats">
      <div class="stat"><div class="pic" style="background:#fdeef2">💪</div><div><div class="num">${total}</div><div class="cap">累计记录</div></div></div>
      <div class="stat"><div class="pic" style="background:#e6f5ec">🔥</div><div><div class="num">${thisWeek.length}</div><div class="cap">本周运动</div></div></div>
    </div>
    <div class="ex-tabs">
      <div class="ex-tab ${exTab==='exercise'?'active':''}" onclick="setExTab('exercise')">🏃 运动</div>
      <div class="ex-tab ${exTab==='foot'?'active':''}" onclick="setExTab('foot')">🦶 泡脚</div>
    </div>
    <div class="tools"><button class="btn" onclick="openExModal()"> ＋ 添加记录</button></div>
    <div id="exList"></div>
  `;
  $("#pageHost").innerHTML=h;
  renderExList();
}
function setExTab(t){ exTab=t; renderBody(); }
function weekOf(dateStr){ if(!dateStr)return ""; const d=new Date(dateStr+"T00:00:00"); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); return d.toDateString(); }
function thisWeekStart(){ const d=new Date(); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); return d.toDateString(); }
function renderExList(){
  const wrap=$("#exList"); if(!wrap)return;
  const list=DB.exercises.filter(x=>{
    const isFoot = x.type==="footbath";
    if(exTab==="foot") return isFoot;
    return !isFoot;
  }).sort((a,b)=>b.date.localeCompare(a.date));
  wrap.innerHTML=list.length? list.map(x=>{
    const isFoot=x.type==="footbath";
    const cat=isFoot?{e:"🦶"}:EX_TYPES.find(c=>c.k===x.type);
    return `<div class="ex-row">
      <div class="eic">${isFoot?"🦶":(cat?cat.e:"✨")}</div>
      <div class="einfo">
        <div class="en">${x.name}</div>
        <div class="ed">${x.date} ${x.note?esc(x.note):""}</div>
      </div>
      <div class="ed-dur">${x.duration? x.duration+"分":""}</div>
      <button class="edit" onclick="openExModal('${x.id}')">✏️</button>
      <button class="del" onclick="delEx('${x.id}')">🗑️</button>
    </div>`;
  }).join(""):`<div class="empty"><div class="big">${exTab==="foot"?"🦶":"🏃"}</div>${exTab==="foot"?"还没有泡脚记录，今天泡个脚放松一下吧":"还没有运动记录，动起来吧！"}</div>`;
}
function openExModal(editId){
  const x=editId?DB.exercises.find(o=>o.id===editId):null;
  const isFoot=x&&x.type==="footbath";
  openModal(`
    <div class="modal-h">${x?"编辑记录":"＋ 添加记录"}</div>
    <div class="form-row"><label>类型</label><div class="opts" id="exCats">${EX_TYPES.map(c=>`<button class="opt ${x&&x.type===c.k?'on':''}" onclick="pickExType('${c.k}',this)">${c.e} ${c.k}</button>`).join("")}</div></div>
    <div class="form-row"><label>名称（可留空自动带类型）</label><input id="xName" value="${x?esc(x.name):''}" placeholder="如：晨跑5公里"></div>
    <div class="form-row"><label>时长（分钟）</label><input id="xDur" type="number" value="${x?x.duration:''}" placeholder="30"></div>
    <div class="form-row"><label>日期 *</label><input id="xDate" type="date" value="${x?x.date:todayStr()}"></div>
    <div class="form-row"><label>备注/心情</label><input id="xNote" value="${x?esc(x.note||''):''}" placeholder="如：状态很好"></div>
    <div class="modal-ft">
      <button class="btn" onclick="saveEx('${editId||''}')">保存</button>
      <button class="btn ghost" onclick="closeModal()">取消</button>
    </div>
  `);
}
function pickExType(k,btn){ document.querySelectorAll("#exCats .opt").forEach(o=>o.classList.remove("on")); btn.classList.add("on"); }
function saveEx(editId){
  let type=document.querySelector("#exCats .opt.on")?.textContent.replace(/^\S+\s/,"")||"其他";
  const name=$("#xName").value.trim()||type;
  const duration=Number($("#xDur").value)||0;
  const date=$("#xDate").value; if(!date)return toast("请选择日期");
  const note=$("#xNote").value.trim();
  const cat=EX_TYPES.find(c=>c.k===type);
  const record={type: type, name, duration, date, note};
  if(editId){ const x=DB.exercises.find(o=>o.id===editId); Object.assign(x,record); }
  else DB.exercises.unshift({id:uid(),...record});
  save();closeModal();renderBody();renderMenu();toast("已保存");
}
function delEx(id){ DB.exercises=DB.exercises.filter(x=>x.id!==id);save();renderBody();renderMenu();toast("已删除"); }

/* =======================================================================
  9. 生活备忘 —— 文字/图片/链接
  ======================================================================= */
function renderMemo(){
  const list=DB.memos.slice().sort((a,b)=>b.createdAt-a.createdAt);
  let h=`
    <div class="stats">
      <div class="stat"><div class="pic" style="background:#fdeef2">🗒️</div><div><div class="num">${list.length}</div><div class="cap">备忘录</div></div></div>
      <div class="stat"><div class="pic" style="background:#e9f2f8">📎</div><div><div class="num">${list.filter(x=>x.link).length}</div><div class="cap">含链接</div></div></div>
    </div>
    <div class="tools"><button class="btn" onclick="openMemoModal()"> ＋ 写备忘</button></div>
    <div class="search"><span class="ic">🔍</span><input placeholder="搜索备忘内容" oninput="searchMemo(this.value)"></div>
    <div id="memoList" style="margin-top:12px;"></div>
  `;
  $("#pageHost").innerHTML=h;
  renderMemoList(list);
}
function searchMemo(v){ v=v.trim().toLowerCase(); const list=DB.memos.filter(x=>(!v||(x.content||"").toLowerCase().includes(v)||(x.title||"").toLowerCase().includes(v)||(x.link||"").toLowerCase().includes(v))); renderMemoList(list); }
function renderMemoList(list){
  const wrap=$("#memoList"); if(!wrap)return;
  wrap.innerHTML=list.map(x=>`
    <div class="memo-card">
      ${x.title?`<div class="mt">${esc(x.title)}</div>`:''}
      ${x.content?`<div class="mc">${esc(x.content).replace(/\n/g,"<br>")}</div>`:''}
      ${x.img?`<img class="mimg" src="${x.img}">`:''}
      ${x.link?`<a class="mlink" href="${esc(x.link)}" target="_blank">🔗 ${esc(x.link)}</a>`:''}
      <div class="mfoot">
        <span>${new Date(x.createdAt).toLocaleString("zh-CN",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
        <span style="display:flex;gap:10px">
          <button class="edit" onclick="openMemoModal('${x.id}')">✏️ 编辑</button>
          <button class="del" onclick="delMemo('${x.id}')">🗑️ 删除</button>
        </span>
      </div>
    </div>`).join("")+(list.length===0?`<div class="empty"><div class="big">🗒️</div>还没有备忘，随手记点什么吧</div>`:"");
}
function openMemoModal(editId){
  const x=editId?DB.memos.find(o=>o.id===editId):null;
  openModal(`
    <div class="modal-h">${x?"编辑备忘":"✍️ 写备忘"}</div>
    <div class="form-row"><label>标题（可选）</label><input id="mTitle" value="${x?esc(x.title):''}"></div>
    <div class="form-row"><label>内容</label><textarea id="mContent" style="min-height:110px">${x?esc(x.content):''}</textarea></div>
    <div class="form-row"><label>链接（可选）</label><input id="mLink" value="${x?esc(x.link):''}" placeholder="https://..."></div>
    <div class="form-row"><label>图片（可选）</label>
      <button class="btn ghost" style="width:100%;justify-content:center" onclick="pickImg(d=>{$('#mImg').value=d;$('#mImgPrev').src=d;$('#mImgPrev').style.display='block';})">上传图片</button>
      <img id="mImgPrev" class="photo-preview" style="display:${x&&x.img?'block':'none'}" src="${x&&x.img?x.img:''}">
      <input id="mImg" type="hidden" value="${x&&x.img?x.img:''}">
    </div>
    <div class="modal-ft">
      <button class="btn" onclick="saveMemo('${editId||''}')">保存</button>
      <button class="btn ghost" onclick="closeModal()">取消</button>
    </div>
  `);
}
function saveMemo(editId){
  const title=$("#mTitle").value.trim();
  const content=$("#mContent").value.trim();
  const link=$("#mLink").value.trim();
  const img=$("#mImg").value;
  if(!title&&!content&&!link&&!img)return toast("内容不能为空");
  if(editId){ const x=DB.memos.find(o=>o.id===editId); Object.assign(x,{title,content,img,link}); }
  else DB.memos.unshift({id:uid(),title,content,img,link,createdAt:Date.now()});
  save();closeModal();renderMemo();renderMenu();toast("已保存");
}
function delMemo(id){ DB.memos=DB.memos.filter(x=>x.id!==id);save();renderMemo();renderMenu();toast("已删除"); }

/* =======================================================================
  10. 行李清单
  ======================================================================= */
const LUG_CATS=["衣物","洗漱","电子","证件","药品","食品","其他"];
let lugFilter="全部";
function renderLuggage(){
  const list=DB.luggage.filter(x=> lugFilter==="全部"?true: x.cat===lugFilter);
  const done=DB.luggage.filter(x=>x.done).length;
  let h=`
    <div class="stats">
      <div class="stat"><div class="pic" style="background:#fdeef2">🧳</div><div><div class="num">${DB.luggage.length}</div><div class="cap">清单项</div></div></div>
      <div class="stat"><div class="pic" style="background:#e6f5ec">✅</div><div><div class="num">${done}</div><div class="cap">已打包</div></div></div>
    </div>
    <div class="chips">
      ${["全部",...LUG_CATS].map(k=>`<button class="chip ${lugFilter===k?'active':''}" onclick="setLugFilter('${k}')">${k}</button>`).join("")}
    </div>
    <div class="tools"><button class="btn" onclick="openLugModal()"> ＋ 添加物品</button></div>
    <div id="lugList"></div>
    <div style="text-align:center;margin-top:10px;font-size:13px;color:var(--muted)">出发前逐项打勾，免得忘带！</div>
  `;
  $("#pageHost").innerHTML=h;
  const wrap=$("#lugList");
  wrap.innerHTML=list.map(x=>{
    const cat=LUG_CATS.includes(x.cat)?x.cat:"其他";
    return `<div class="lug-item ${x.done?'done':''}">
      <div class="cbx" onclick="toggleLug('${x.id}')">${x.done?'✓':''}</div>
      <div class="ln">${esc(x.name)}</div>
      <span class="lcat">${cat}</span>
      <button class="edit" onclick="openLugModal('${x.id}')">✏️</button>
      <button class="del" onclick="delLug('${x.id}')">🗑️</button>
    </div>`;
  }).join("")+(list.length===0?`<div class="empty"><div class="big">🧳</div>清单空空的，添加要带的东西吧</div>`:"");
}
function setLugFilter(k){ lugFilter=k; renderLuggage(); }
function toggleLug(id){ const x=DB.luggage.find(o=>o.id===id); if(x)x.done=!x.done; save(); renderLuggage(); }
function openLugModal(editId){
  const x=editId?DB.luggage.find(o=>o.id===editId):null;
  openModal(`
    <div class="modal-h">${x?"编辑物品":"＋ 添加物品"}</div>
    <div class="form-row"><label>物品名称 *</label><input id="lName" value="${x?esc(x.name):''}" placeholder="如：充电宝、防晒霜"></div>
    <div class="form-row"><label>分类</label><div class="opts" id="lCats">${LUG_CATS.map(c=>`<button class="opt ${x&&x.cat===c?'on':''}" onclick="pickLcat('${c}',this)">${c}</button>`).join("")}</div></div>
    <div class="modal-ft">
      <button class="btn" onclick="saveLug('${editId||''}')">保存</button>
      <button class="btn ghost" onclick="closeModal()">取消</button>
    </div>
  `);
}
function pickLcat(c,btn){ document.querySelectorAll("#lCats .opt").forEach(o=>o.classList.remove("on")); btn.classList.add("on"); }
function saveLug(editId){
  const name=$("#lName").value.trim(); if(!name)return toast("请填写名称");
  const cat=document.querySelector("#lCats .opt.on")?.textContent.trim()||"其他";
  if(editId){ const x=DB.luggage.find(o=>o.id===editId); Object.assign(x,{name,category:cat,cat}); }
  else DB.luggage.unshift({id:uid(),name,cat,done:false});
  save();closeModal();renderLuggage();renderMenu();toast("已保存");
}
function delLug(id){ DB.luggage=DB.luggage.filter(x=>x.id!==id);save();renderLuggage();renderMenu();toast("已删除"); }

/* =======================================================================
  导出 / 导入
  ======================================================================= */
function exportData(){
  const blob=new Blob([JSON.stringify(DB,null,2)],{type:"application/json"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=`祺祺生活台_备份_${todayStr()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  toast("已导出备份，请妥善保存");
}
function importData(){
  const inp=document.createElement("input"); inp.type="file"; inp.accept="application/json,.json";
  inp.onchange=e=>{
    const f=e.target.files[0]; if(!f)return;
    const r=new FileReader();
    r.onload=()=>{
      try{
        const data=JSON.parse(r.result);
        if(!data||typeof data!=="object")throw 0;
        DB=Object.assign(defaultDB(),data);
        save(); renderMenu(); renderContent(); toast("导入成功！");
      }catch(err){ toast("导入失败：文件格式不正确"); }
    };
    r.readAsText(f);
  };
  inp.click();
}

/* ============ 抽屉（手机端侧栏） ============ */
function toggleDrawer(){ document.body.classList.toggle("drawer-open"); }
function closeDrawer(){ document.body.classList.remove("drawer-open"); }

/* ============ 通用转义 ============ */
function esc(s){ return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

/* ============ 初始化 ============ */
function init(){
  load();
  initFestivals();
  save();
  renderMenu();
  renderTopDate();
  // 支持 ?m=模块名 直接打开特定模块（方便测试与分享）
  const m = new URLSearchParams(location.search).get("m");
  if(m && MODULES.some(x=>x.id===m)){ currentModule=m; }
  renderContent();
  updateStoreInfo();
  showFirstGuide();
}

/* ============ 首次使用引导（教用户添加到主屏当 App 用） ============ */
function showFirstGuide(){
  if(localStorage.getItem("qiqi_guide_shown")) return;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  openModal(`
    <div class="modal-h">🌸 欢迎来到祺祺生活台</div>
    <div style="font-size:14px;line-height:1.9;color:#6f5a60">
      <p>这是一个可以在手机上<b>当 App 用</b>的生活平台。你的所有数据都存在手机本地，随时可用。</p>
      <div style="background:#fdeef2;border-radius:12px;padding:12px;margin:12px 0;font-size:13px">
        <b style="color:#e96a86">📲 添加成手机 App（推荐）</b><br>
        ${isIOS? `① 点浏览器底部 <b>分享</b> 按钮（方框箭头）<br>② 选 <b>添加到主屏幕</b><br>之后桌面就有一个「祺祺生活台」图标，点开全屏运行、无地址栏，像原生 App。`
        : isAndroid? `① 点浏览器右上角 <b>⋮</b> 菜单<br>② 选 <b>添加到主屏幕 / 安装应用</b><br>之后桌面就有一个「祺祺生活台」图标，点开全屏运行。`
        : `① 在浏览器菜单里选 <b>添加到主屏幕</b><br>之后桌面就有快捷方式，点开即用。`}
      </div>
      <p style="font-size:13px;color:var(--muted)">💡 换机或清除浏览器缓存前，记得在左下角「导出数据」备份，换新机后「导入数据」即可恢复。</p>
    </div>
    <div class="modal-ft">
      <button class="btn" onclick="localStorage.setItem('qiqi_guide_shown','1');closeModal();toast('开始记录你的生活吧！')">知道了，开始使用</button>
    </div>
  `);
}
document.addEventListener("DOMContentLoaded", init);

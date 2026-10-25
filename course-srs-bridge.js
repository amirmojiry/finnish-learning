(function attachCourseSrsBridge(root,factory) {
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FinnishCourseSrsBridge=api;
})(typeof globalThis!=='undefined'?globalThis:this,function createCourseSrsBridge(){
  'use strict';
  const DAY_MS=86400000;
  const LOOKBACK_DAYS=30;
  const IGNORE=new Set(['teach','number-grid','short-reading']);
  const normalize=value=>String(value||'').normalize('NFC').toLocaleLowerCase('fi-FI').trim();
  const stableFormId=value=>'form:'+[...normalize(value)]
    .map(c=>c.codePointAt(0).toString(16)).join('-');
  function eligibleMappings(mapData){
    if(mapData?.schema_version!==1||!Array.isArray(mapData.mappings))return null;
    const excluded=new Set(Array.isArray(mapData.excluded_ambiguous_form_ids)
      ? mapData.excluded_ambiguous_form_ids : []);
    const indexed=new Map(),conflicted=new Set(),names=new Map();
    for(const row of mapData.mappings){
      if(!row||typeof row.section_id!=='string'||!row.section_id||
        typeof row.item_id!=='string'||!row.item_id||typeof row.surface_form!=='string')continue;
      const surface=normalize(row.surface_form),id=stableFormId(surface);
      if(row.form_id!==id||excluded.has(id))continue;
      const key=row.section_id+'\u0000'+row.item_id;
      if(conflicted.has(key))continue;
      if(indexed.has(key)&&indexed.get(key)!==id){
        indexed.delete(key);conflicted.add(key);continue;
      }
      indexed.set(key,id);
      names.set(id,surface);
    }
    return {indexed,names};
  }
  // Course evidence is an advisory **exact-form** signal. No lexical family,
  // sense, schedule, CEFR progress or SRS mastery is inherited from it.
  function reviewPrioritiesByFormId(courseProgress,mapData,now=Date.now()){
    const evidence=courseProgress?.answerHistory;
    const mapping=eligibleMappings(mapData);
    if(!Array.isArray(evidence)||!mapping)return {};
    const first=new Set(),counts=new Map();
    const events=[...evidence].sort((a,b)=>(Number(a?.answeredAt)||0)-(Number(b?.answeredAt)||0)
      ||(Number(a?.sequence)||0)-(Number(b?.sequence)||0));
    for(const e of events){
      if(!e||e.firstAttempt!==true||typeof e.correct!=='boolean'||IGNORE.has(e.activityType)
        ||!e.sessionId||!e.sectionId||!e.targetId||!Number.isFinite(e.answeredAt)
        ||e.answeredAt>now||e.answeredAt<now-LOOKBACK_DAYS*DAY_MS)continue;
      const id=mapping.indexed.get(e.sectionId+'\u0000'+e.targetId);
      if(!id)continue;
      const key=e.sessionId+'\u0000'+e.sectionId+'\u0000'+e.targetId;
      if(first.has(key))continue;
      first.add(key);
      if(e.correct)continue;
      counts.set(id,(counts.get(id)||0)+1);
    }
    return Object.fromEntries([...counts.entries()].sort(([a],[b])=>a.localeCompare(b,'en')));
  }
  function reviewPriorities(courseProgress,mapData,now=Date.now()){
    const byId=reviewPrioritiesByFormId(courseProgress,mapData,now);
    const names=eligibleMappings(mapData)?.names||new Map();
    const counts=new Map();
    for(const [id,count] of Object.entries(byId)){
      const word=names.get(id);
      if(word)counts.set(word,(counts.get(word)||0)+count);
    }
    return Object.fromEntries([...counts.entries()].sort(([a],[b])=>a.localeCompare(b,'fi')));
  }
  function fromStorage(storage,mapData,storageKey,expectedVersion,now,byFormId){
    if(!storage||typeof storage.getItem!=='function'||typeof storageKey!=='string'||!storageKey
      ||!Number.isInteger(expectedVersion))return {};
    try{
      const raw=storage.getItem(storageKey);
      if(typeof raw!=='string'||!raw)return {};
      // Read original first-attempt flags, not Course's lossy progress sanitizer.
      const progress=JSON.parse(raw);
      if(!progress||typeof progress!=='object'||Array.isArray(progress)
        ||progress.version!==expectedVersion)return {};
      return byFormId?reviewPrioritiesByFormId(progress,mapData,now):reviewPriorities(progress,mapData,now);
    }catch{return {};}
  }
  function reviewPrioritiesFromStorage(storage,mapData,storageKey,expectedVersion,now=Date.now()){
    return fromStorage(storage,mapData,storageKey,expectedVersion,now,false);
  }
  function reviewPrioritiesByFormIdFromStorage(storage,mapData,storageKey,expectedVersion,now=Date.now()){
    return fromStorage(storage,mapData,storageKey,expectedVersion,now,true);
  }
  return {LOOKBACK_DAYS,stableFormId,reviewPriorities,reviewPrioritiesByFormId,
    reviewPrioritiesFromStorage,reviewPrioritiesByFormIdFromStorage};
});

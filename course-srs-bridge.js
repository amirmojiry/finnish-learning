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
  const MODES=['receptive','listening','dictation','typed','guided','independent'];
  const GUIDED=new Set(['expression-completion','controlled-production','inflection-production',
    'negative-transform','sentence-order','guided-writing','dialogue-order','sequence-order']);
  const tokens=value=>String(value||'').normalize('NFC').toLocaleLowerCase('fi-FI').match(/[\p{L}\p{N}]+/gu)||[];
  function evidenceMode(event){
    if(event.activityType==='choice'&&event.mode==='listen')return 'listening';
    if(event.activityType==='dictation')return 'dictation';
    if(event.activityType==='type')return 'typed';
    if(event.activityType==='production'&&!event.guided)return 'independent';
    if(GUIDED.has(event.activityType)||event.guided===true)return 'guided';
    return 'receptive';
  }
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
      if(indexed.has(key)&&indexed.get(key).form_id!==id){
        indexed.delete(key);conflicted.add(key);continue;
      }
      // Never invent lexeme/sense identity. No family-wide mastery transfer.
      const reviewed=typeof row.lexeme_id==='string'&&row.lexeme_id.length>0
        &&typeof row.sense_id==='string'&&row.sense_id.length>0;
      const fi=typeof row.context_fi==='string'?row.context_fi.trim():'';
      const fa=typeof row.context_fa==='string'?row.context_fa.trim():'';
      const context=fi.length<=220&&fa.length<=220&&tokens(fi).length>=2
        &&tokens(fi).includes(surface)&&fa?{fi,fa}:null;
      indexed.set(key,{form_id:id,context,lexeme_id:reviewed?row.lexeme_id:null,
        sense_id:reviewed?row.sense_id:null});
      names.set(id,surface);
    }
    return {indexed,names};
  }
  // Read-only, exact-form evidence from raw first attempts. Do not overwrite or
  // infer SRS intervals, mastery, cross-case success, or ambiguous-sense history.
  function reviewEvidenceByFormId(courseProgress,mapData,now=Date.now()){
    const events=courseProgress?.answerHistory,mapping=eligibleMappings(mapData);
    if(!Array.isArray(events)||!mapping)return {};
    const first=new Set(),byId=new Map();
    const ordered=[...events].sort((a,b)=>(Number(a?.answeredAt)||0)-(Number(b?.answeredAt)||0)
      ||(Number(a?.sequence)||0)-(Number(b?.sequence)||0));
    for(const e of ordered){
      if(!e||e.firstAttempt!==true||typeof e.correct!=='boolean'||IGNORE.has(e.activityType)
        ||!e.sessionId||!e.sectionId||!e.targetId||!Number.isFinite(e.answeredAt)
        ||e.answeredAt>now||e.answeredAt<now-LOOKBACK_DAYS*DAY_MS)continue;
      const m=mapping.indexed.get(e.sectionId+'\u0000'+e.targetId);
      if(!m)continue;
      const key=e.sessionId+'\u0000'+e.sectionId+'\u0000'+e.targetId;
      if(first.has(key))continue;
      first.add(key);
      const result=byId.get(m.form_id)||{form_id:m.form_id,errors:0,correct:0,
        byMode:Object.fromEntries(MODES.map(mode=>[mode,{correct:0,incorrect:0}])),lastError:null};
      const mode=evidenceMode(e);
      result.byMode[mode][e.correct?'correct':'incorrect']++;
      if(e.correct)result.correct++;
      else {
        result.errors++;
        result.lastError={mode,section_id:e.sectionId,item_id:e.targetId,
          context:m.context,lexeme_id:m.lexeme_id,sense_id:m.sense_id};
      }
      byId.set(m.form_id,result);
    }
    return Object.fromEntries([...byId.entries()].sort(([a],[b])=>a.localeCompare(b,'en')));
  }
  function reviewHintsByFormId(courseProgress,mapData,now=Date.now()){
    return Object.fromEntries(Object.entries(reviewEvidenceByFormId(courseProgress,mapData,now))
      .filter(([,v])=>v.errors>0)
      .map(([id,v])=>[id,{priority:v.errors,byMode:v.byMode,lastError:v.lastError}]));
  }
  function suggestedMode(hint){
    const modes=hint?.byMode;
    if(!modes)return null;
    const errors=mode=>Number(modes[mode]?.incorrect)||0;
    if(errors('dictation')||errors('typed')||errors('guided')||errors('independent'))
      return 'cloze-input';
    if(errors('listening'))return 'cloze-choice';
    if(errors('receptive'))return 'translation';
    return null;
  }
  function reviewPrioritiesByFormId(courseProgress,mapData,now=Date.now()){
    return Object.fromEntries(Object.entries(reviewHintsByFormId(courseProgress,mapData,now))
      .map(([id,h])=>[id,h.priority]));
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
      return byFormId==='hints'?reviewHintsByFormId(progress,mapData,now):byFormId?reviewPrioritiesByFormId(progress,mapData,now):reviewPriorities(progress,mapData,now);
    }catch{return {};}
  }
  function reviewPrioritiesFromStorage(storage,mapData,storageKey,expectedVersion,now=Date.now()){
    return fromStorage(storage,mapData,storageKey,expectedVersion,now,false);
  }
  function reviewPrioritiesByFormIdFromStorage(storage,mapData,storageKey,expectedVersion,now=Date.now()){
    return fromStorage(storage,mapData,storageKey,expectedVersion,now,true);
  }
  function reviewHintsByFormIdFromStorage(storage,mapData,storageKey,expectedVersion,now=Date.now()){
    return fromStorage(storage,mapData,storageKey,expectedVersion,now,'hints');
  }
  return {LOOKBACK_DAYS,stableFormId,evidenceMode,suggestedMode,
    reviewEvidenceByFormId,reviewHintsByFormId,reviewHintsByFormIdFromStorage,
    reviewPriorities,reviewPrioritiesByFormId,
    reviewPrioritiesFromStorage,reviewPrioritiesByFormIdFromStorage};
});

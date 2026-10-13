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
  function reviewPriorities(courseProgress,mapData,now=Date.now()){
    const evidence=courseProgress?.answerHistory;
    const mappings=mapData?.mappings;
    if(!Array.isArray(evidence)||!Array.isArray(mappings)||mapData.schema_version!==1)return {};
    const map=new Map();
    for(const row of mappings){
      if(!row||typeof row.section_id!=='string'||typeof row.item_id!=='string'
        ||typeof row.form_id!=='string'||!row.form_id.startsWith('form:')||!row.surface_form)continue;
      const key=row.section_id+'\u0000'+row.item_id;
      if(!map.has(key))map.set(key,{id:row.form_id,word:normalize(row.surface_form)});
    }
    const first=new Set(),counts=new Map();
    const events=[...evidence].sort((a,b)=>(Number(a?.answeredAt)||0)-(Number(b?.answeredAt)||0)
      ||(Number(a?.sequence)||0)-(Number(b?.sequence)||0));
    for(const e of events){
      if(!e||e.firstAttempt!==true||typeof e.correct!=='boolean'||IGNORE.has(e.activityType)
        ||!e.sessionId||!e.sectionId||!e.targetId||!Number.isFinite(e.answeredAt)
        ||e.answeredAt>now||e.answeredAt<now-LOOKBACK_DAYS*DAY_MS)continue;
      const source=map.get(e.sectionId+'\u0000'+e.targetId);
      if(!source)continue;
      const key=e.sessionId+'\u0000'+e.sectionId+'\u0000'+e.targetId;
      if(first.has(key))continue;
      first.add(key);
      if(e.correct)continue;
      counts.set(source.word,(counts.get(source.word)||0)+1);
    }
    return Object.fromEntries([...counts.entries()].sort(([a],[b])=>a.localeCompare(b,'fi')));
  }
  return {LOOKBACK_DAYS,reviewPriorities};
});

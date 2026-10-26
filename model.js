/* 제22대 총선(2024) 제도 기준. 이름·득표는 수업용이다. */
const Election = (() => {
  const parties = [
    {name:'하늘당', mark:'◆', color:'#3168ca'},
    {name:'산들당', mark:'●', color:'#168272'},
    {name:'해봄당', mark:'▲', color:'#b95a28'}
  ];
  const surnames = [...'김이박최정강조윤장임한오서신권황안송류홍전고문양손배백허유남'];
  const middles = [...'가나도라서수시여유지하'];
  const endings = [...'온린윤원빈율현솔'];
  function candidate(district, party) {
    const i=district*3+party;
    return {name:surnames[i%surnames.length]+middles[Math.floor(i/surnames.length)%middles.length]+endings[Math.floor(i/(surnames.length*middles.length))], age:40+(district*7+party*11)%31};
  }
  function winner(votes, ages) {
    const max=Math.max(...votes);
    if (!max) return null;
    return votes.map((v,i)=>i).filter(i=>votes[i]===max).sort((a,b)=>ages[b]-ages[a])[0];
  }
  function largestRemainder(weights, seats, random=Math.random) {
    const total=weights.reduce((a,b)=>a+b,0);
    if(!total) return {seats:weights.map(()=>0), tied:false};
    const quotas=weights.map(v=>seats*v/total), counts=quotas.map(Math.floor);
    const ranks=quotas.map((v,i)=>({i,remainder:v-Math.floor(v),lot:random()}));
    ranks.sort((a,b)=>Math.abs(b.remainder-a.remainder)<1e-10 ? a.lot-b.lot : b.remainder-a.remainder);
    const left=seats-counts.reduce((a,b)=>a+b,0);
    const tied=left>0&&left<ranks.length&&Math.abs(ranks[left-1].remainder-ranks[left].remainder)<1e-10;
    ranks.slice(0,left).forEach(r=>counts[r.i]++);
    return {seats:counts,tied};
  }
  function proportional(votes, districts, random=Math.random) {
    if(votes.some(v=>!Number.isSafeInteger(v)||v<0)||districts.some(v=>!Number.isSafeInteger(v)||v<0)||votes.length!==districts.length||districts.reduce((a,b)=>a+b,0)!==254) throw new Error('전국 254개 지역구 결과와 유효한 정당 득표가 필요합니다.');
    const total=votes.reduce((a,b)=>a+b,0);
    if(!total) return null;
    const eligible=votes.map((v,i)=>v/total>=.03||districts[i]>=5);
    const valid=votes.reduce((n,v,i)=>n+(eligible[i]?v:0),0);
    if(!valid) return null;
    const outside=districts.reduce((n,v,i)=>n+(eligible[i]?0:v),0);
    const ratios=votes.map((v,i)=>eligible[i]?v/valid:0);
    const linked=ratios.map((v,i)=>eligible[i]?Math.max(0,Math.round(((300-outside)*v-districts[i])/2)):0);
    const linkedTotal=linked.reduce((a,b)=>a+b,0);
    const result=largestRemainder(linkedTotal>46?linked:ratios,linkedTotal>46?46:46-linkedTotal,random);
    const seats=result.seats.map((v,i)=>v+(linkedTotal>46?0:linked[i]));
    return {seats,eligible,ratios,linked,linkedTotal,tied:result.tied,method:linkedTotal>46?'조정 배분':linkedTotal<46?'잔여 배분':'연동 배분'};
  }
  function empty(count) { return {local:Array.from({length:count},()=>[0,0,0]),party:[0,0,0],personal:0,sample:0}; }
  function cast(state,district,candidateIndex,partyIndex) {
    if(!Number.isInteger(district)||!state.local[district]||![0,1,2].includes(candidateIndex)||![0,1,2].includes(partyIndex)) throw new Error('투표 대상을 확인해 주세요.');
    state.local[district][candidateIndex]++; state.party[partyIndex]++; state.personal++;
  }
  function fill(state) {
    state.local.forEach((votes,i)=>{
      if(votes.some(Boolean)) return;
      // shortcut: 전국 득표는 수업용 예시 100명/지역이며 실제 선거 예측이 아니다.
      const lead=(i*17+Math.floor(i/7))%3;
      votes[lead]=45;votes[(lead+1)%3]=34;votes[(lead+2)%3]=21;
      state.party[0]+=i%3===0?34:33;state.party[1]+=i%3===1?34:33;state.party[2]+=i%3===2?34:33;
      state.sample+=100;
    });
  }
  function count(state,random=Math.random) {
    const winners=state.local.map((v,i)=>winner(v,parties.map((_,p)=>candidate(i,p).age)));
    const districts=parties.map((_,p)=>winners.filter(w=>w===p).length);
    const complete=winners.every(v=>v!==null);
    return {winners,districts,complete,proportional:complete?proportional(state.party,districts,random):null};
  }
  return {parties,candidate,winner,largestRemainder,proportional,empty,cast,fill,count};
})();
if(typeof module!=='undefined') module.exports=Election;

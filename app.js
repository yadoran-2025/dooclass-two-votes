(() => {
  'use strict';
  const $=s=>document.querySelector(s), E=Election, symbols=['a','b','c'];
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=n=>n.toLocaleString('ko-KR');
  const provinces=[...new Set(DISTRICTS.map(d=>d[0]))];
  const shortProvince=s=>s.replace(/특별자치도|특별자치시|특별시|광역시|도$/g,'');
  let state=E.empty(254), district=0, pickedCandidate=null, pickedParty=null, province=provinces[0];
  let stage='local', result=null, inspected=0, seatFilter='all', pickingForResult=false;
  const style=p=>`--party:var(--${symbols[p]})`;
  const partyLabel=p=>`<span style="${style(p)}" class="assembly-party-name"><i class="party-symbol">${E.parties[p].mark}</i>${E.parties[p].name}</span>`;
  function renderBallots() {
    $('#district-label').textContent=shortProvince(DISTRICTS[district][0])+' · '+DISTRICTS[district][1];
    $('#candidates').innerHTML=E.parties.map((p,i)=>{
      const c=E.candidate(district,i);
      return `<button class="choice" style="${style(i)}" data-candidate="${i}" aria-pressed="${pickedCandidate===i}"><span class="party-symbol" aria-hidden="true">${p.mark}</span><span><span class="choice-name">${c.name}<small>${c.age}세</small></span><span class="choice-party">기호 ${i+1} · ${p.name}</span></span><span class="stamp-box" aria-hidden="true"></span></button>`;
    }).join('');
    $('#parties').innerHTML=E.parties.map((p,i)=>`<button class="choice" style="${style(i)}" data-party="${i}" aria-pressed="${pickedParty===i}"><span class="party-symbol" aria-hidden="true">${p.mark}</span><span class="choice-name">${p.name}<small>기호 ${i+1}</small></span><span class="stamp-box" aria-hidden="true"></span></button>`).join('');
    updateSelection();
  }
  function updateSelection() {
    document.querySelectorAll('[data-candidate]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.candidate)===pickedCandidate));
    document.querySelectorAll('[data-party]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.party)===pickedParty));
    $('#cast').disabled=pickedCandidate===null||pickedParty===null;
    $('#selection-note').textContent=pickedCandidate===null&&pickedParty===null?'후보의 소속 정당과 다른 정당을 골라도 돼요.':`${pickedCandidate===null?'후보를 골라 주세요':E.candidate(district,pickedCandidate).name+' 후보'} · ${pickedParty===null?'정당을 골라 주세요':E.parties[pickedParty].name}`;
  }
  function updateCounts() {
    $('#voter-count').textContent=num(state.personal+state.sample);
    $('#voter-detail').textContent=`직접 ${num(state.personal)}명 · 예시 ${num(state.sample)}명`;
    $('#open-results').disabled=state.personal+state.sample===0;
    $('#open-results').textContent=result?'개표 결과 다시 보기 →':'개표하고 국회 구성 보기 →';
    $('#fill').disabled=state.local.every(v=>v.some(Boolean));
  }
  function renderDistrictPicker() {
    const query=$('#district-search').value.trim();
    $('#province-list').innerHTML=provinces.map((p,i)=>`<button data-province="${i}" aria-pressed="${!query&&p===province}">${shortProvince(p)}</button>`).join('');
    const list=DISTRICTS.map((d,i)=>({d,i})).filter(({d})=>query?d.join(' ').includes(query):d[0]===province);
    $('#district-list').innerHTML=list.map(({d,i})=>`<button data-district="${i}" aria-current="${(pickingForResult?inspected:district)===i}">${esc(d[1])}${query?`<small>${esc(d[0])}</small>`:''}</button>`).join('')||'<p class="muted">일치하는 선거구가 없어요. 다른 이름으로 찾아보세요.</p>';
    $('#district-count').textContent=`${query?'검색 결과':province} · ${list.length}개 선거구`;
  }
  const legend=()=>`<div class="legend">${E.parties.map((p,i)=>`<span style="${style(i)}"><i>${p.mark}</i>${p.name}</span>`).join('')}<span>□ 투표 대기</span></div>`;
  function localDetails() {
    const votes=state.local[inspected], total=votes.reduce((a,b)=>a+b,0), winner=result.winners[inspected];
    const tie=winner!==null&&votes.filter(v=>v===votes[winner]).length>1;
    return `<h4>${esc(DISTRICTS[inspected][1])}</h4><p class="muted">${esc(DISTRICTS[inspected][0])} · 유효표 ${num(total)}표</p>${E.parties.map((p,i)=>{
      const c=E.candidate(inspected,i), percent=total?votes[i]/total*100:0;
      return `<div class="result-row" style="${style(i)}"><div class="row-label"><span>${p.mark} ${c.name} <small>${p.name}</small></span><span>${num(votes[i])}표</span></div><div class="bar-track"><span style="width:${percent}%"></span></div></div>`;
    }).join('')}<p class="winner-note">${winner===null?'아직 투표하지 않은 지역이에요.':`${E.parties[winner].mark} ${E.candidate(inspected,winner).name} 당선 · 1석`}<small>${winner===null?'이 지역구에서 두 표를 넣거나 예시 표를 채워 주세요.':tie?'최고 득표 동률 → 연장자 당선(2024 제도 기준)':'지역구에서 가장 많은 표를 얻은 후보가 당선돼요.'}</small></p><button class="secondary inspect-picker" data-inspect-picker>다른 선거구 결과 찾기</button>`;
  }
  function renderLocal() {
    const filled=result.districts.reduce((a,b)=>a+b,0);
    return `<div class="result-lead"><div><h3>지역마다 당선인 한 명씩.</h3><p>지도에서 지역구를 눌러 결과를 살펴보세요. 작은 지역은 확대할 수 있어요.</p></div><span class="count-pill">${filled}<span class="pending"> / 254석</span></span></div><div class="result-columns map-results"><div>${ElectionMap.html(result.winners,inspected)}${legend()}</div><section class="local-detail" id="local-detail" aria-live="polite">${localDetails()}</section></div>`;
  }
  function pendingProportional() {
    const missing=result.winners.filter(w=>w===null).length;
    return `<div class="empty-notice">아직 ${missing}개 지역구의 투표가 남았어요.<br>비례대표는 전국 정당 득표와 지역구 당선 결과를 함께 반영해 배분해요.<button class="secondary" data-fill-results>나머지 지역 예시 표 채우기</button><p class="explain-note">예시 표는 투표가 없는 지역에만 100명씩 추가해요.<br>직접 넣은 표와 이미 투표한 지역은 유지돼요.</p></div>`;
  }
  function renderParty() {
    const total=state.party.reduce((a,b)=>a+b,0), pr=result.proportional;
    return `<div class="result-lead"><div><h3>정당에 던진 표는 전국에서 모아요.</h3><p>지역구에서 뽑힌 의원 수까지 반영해 비례대표 46석을 배분해요.</p></div><span class="count-pill">${pr?'46':'—'}<span class="pending"> / 46석</span></span></div>${pr?`<div class="pr-summary"><section class="pr-block"><h4>전국 정당 득표 · ${num(total)}표</h4>${E.parties.map((p,i)=>`<div class="result-row" style="${style(i)}"><div class="row-label"><span>${p.mark} ${p.name}</span><span>${(state.party[i]/total*100).toFixed(1)}% <small>${num(state.party[i])}표</small></span></div><div class="bar-track"><span style="width:${state.party[i]/total*100}%"></span></div></div>`).join('')}<p class="explain-note">후보에게 준 표는 이 정당 득표에 더하지 않아요.</p></section><section class="pr-block"><h4>비례대표 당선 · 정당별 명부 순서</h4>${E.parties.map((p,i)=>`<div class="pr-party" style="${style(i)}"><div class="row-label"><span>${p.mark} ${p.name}</span><span>${pr.seats[i]}석</span></div><div class="seat-strip">${Array.from({length:pr.seats[i]},(_,j)=>`<span class="list-seat" title="${p.name} 비례 명부 ${j+1}번"><small>${j+1}</small></span>`).join('')||'<span class="muted">배분된 의석 없음</span>'}</div></div>`).join('')}</section></div><p class="explain-note">2024 준연동형 기준 · 연동 배분 후 ${pr.method}${pr.tied?' · 남은 의석 동률은 수업용 추첨으로 결정했어요.':''}<br>정당 득표율에 46을 곱한 값과 의석수가 꼭 같지는 않아요.</p>`:pendingProportional()}`;
  }
  function assemblySvg() {
    const seats=[];
    E.parties.forEach((_,p)=>{
      result.winners.forEach((w,i)=>{if(w===p)seats.push({p,type:'local',label:`${DISTRICTS[i].join(' ')} · ${E.candidate(i,p).name} · ${E.parties[p].name}`});});
      for(let j=0;j<(result.proportional?.seats[p]||0);j++)seats.push({p,type:'party',label:`${E.parties[p].name} · 비례대표 명부 ${j+1}번`});
    });
    while(seats.length<300)seats.push({p:null,type:'empty',label:'아직 구성되지 않은 의석'});
    const rowCounts=[24,30,36,42,48,56,64];
    const positions=[];
    rowCounts.forEach((n,row)=>{
      const radius=105+row*25;
      for(let j=0;j<n;j++){const angle=Math.PI-(j/(n-1))*Math.PI;positions.push({angle,x:320+radius*Math.cos(angle),y:288-radius*Math.sin(angle)});}
    });
    positions.sort((a,b)=>b.angle-a.angle);
    const dots=positions.map(({x,y},i)=>{
        const s=seats[i],color=s.p===null?'var(--line)':`var(--${symbols[s.p]})`;
        const dim=seatFilter!=='all'&&s.type!==seatFilter;
        return `<g class="seat pop ${dim?'dimmed':''}" style="--i:${i}" data-seat-type="${s.type}"><title>${esc(s.label)}</title>${s.type==='local'?`<rect x="${x-3.5}" y="${y-3.5}" width="7" height="7" rx="1" fill="${color}"/>`:`<circle cx="${x}" cy="${y}" r="3.5" fill="${s.type==='empty'?'transparent':color}" stroke="${color}" stroke-width="${s.type==='empty'?'1':'2'}"/>`}${s.type==='party'?`<circle cx="${x}" cy="${y}" r="1.1" fill="var(--surface)"/>`:''}</g>`;
    }).join('');
    const filled=seats.filter(s=>s.p!==null).length;
    return `<svg class="assembly-chart" viewBox="35 20 570 290" role="img" aria-label="전체 국회 의석 ${filled}석 구성. 정당별 의석은 아래 표에 표시합니다.">${dots}<text x="320" y="244" text-anchor="middle" class="assembly-total">${filled}<tspan font-size="17"> / 300석</tspan></text><text x="320" y="275" text-anchor="middle" class="assembly-label">${filled===300?'하나의 국회':'국회 구성 중'}</text></svg>`;
  }
  function renderAssembly() {
    const pr=result.proportional, filled=result.districts.reduce((a,b)=>a+b,0)+(pr?46:0);
    return `<div class="result-lead assembly-head"><div><h3>뽑는 방법은 둘, 국회는 하나.</h3><p>지역구 의원과 비례대표 의원은 함께 국회를 구성해요.</p></div><div class="filter-buttons" role="group" aria-label="의석 종류 강조"><button data-seat-filter="all" aria-pressed="${seatFilter==='all'}">전체</button><button data-seat-filter="local" aria-pressed="${seatFilter==='local'}">지역구</button><button data-seat-filter="party" aria-pressed="${seatFilter==='party'}">비례대표</button></div></div><div id="assembly-svg">${assemblySvg()}</div><p class="type-legend"><b>■</b> 지역구 254석 &nbsp; + &nbsp; <b>⊙</b> 비례대표 46석</p><table class="assembly-totals"><thead><tr><th scope="col">정당</th><th scope="col">지역구</th><th scope="col">비례대표</th><th scope="col">전체</th></tr></thead><tbody>${E.parties.map((p,i)=>`<tr><td>${partyLabel(i)}</td><td>${result.districts[i]}석</td><td>${pr?pr.seats[i]+'석':'대기'}</td><td>${result.districts[i]+(pr?.seats[i]||0)}석</td></tr>`).join('')}</tbody><tfoot><tr><td>합계</td><td>${result.districts.reduce((a,b)=>a+b,0)} / 254석</td><td>${pr?'46 / 46석':'배분 대기'}</td><td>${filled} / 300석</td></tr></tfoot></table>${pr?'':`<p class="explain-note">남은 지역의 결과가 정해지면 비례대표를 배분할 수 있어요. ‘비례대표 46석’에서 예시 표를 채울 수 있어요.</p>`}`;
  }
  function renderResults() {
    document.querySelectorAll('[data-stage]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.stage===stage));
    $('#result-content').innerHTML=stage==='local'?renderLocal():stage==='party'?renderParty():renderAssembly();
    if(stage==='local')ElectionMap.bind(inspectDistrict);
    $('#result-caption').textContent=stage==='local'?'후보 표는 해당 지역구의 당선인을 결정해요.':stage==='party'?'비례대표는 정당이 제출한 후보자명부 순서대로 당선돼요.':'한 사람의 두 표가 서로 다른 경로를 거쳐 국회 구성에 반영돼요.';
    $('#next-stage').textContent=stage==='local'?'비례대표 보기 →':stage==='party'?'전체 국회 보기 →':'투표로 돌아가기';
  }
  function openResults() {
    if(!state.personal&&!state.sample)return;
    if(!result){result=E.count(state);stage='local';inspected=district;}
    renderResults();updateCounts();$('#results-dialog').showModal();
  }
  function fillVotes() {
    E.fill(state);result=null;updateCounts();
    $('#vote-status').className='vote-status success';
    $('#vote-status').textContent=`투표가 없던 지역에만 예시 표를 채웠어요. 직접 ${num(state.personal)}명 · 예시 ${num(state.sample)}명. 실제 선거 결과가 아닙니다.`;
  }
  function inspectDistrict(i,zoom=false) {
    inspected=i;
    ElectionMap.select(i,zoom);
    $('#local-detail').innerHTML=localDetails();
  }
  function openDistrictPicker(forResult=false) {
    pickingForResult=forResult;province=DISTRICTS[forResult?inspected:district][0];
    $('#district-title').textContent=forResult?'어느 지역의 결과를 볼까요?':'어느 지역에서 투표할까요?';
    $('#district-search').value='';renderDistrictPicker();$('#district-dialog').showModal();$('#district-search').focus();
  }
  document.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.candidate!==undefined){pickedCandidate=Number(b.dataset.candidate);updateSelection();}
    if(b.dataset.party!==undefined){pickedParty=Number(b.dataset.party);updateSelection();}
    if(b.dataset.province!==undefined){province=provinces[Number(b.dataset.province)];$('#district-search').value='';renderDistrictPicker();$('#province-list').querySelector(`[data-province="${b.dataset.province}"]`).focus();}
    if(b.dataset.district!==undefined){if(pickingForResult){inspectDistrict(Number(b.dataset.district),true);$('#district-dialog').close();$('[data-inspect-picker]').focus();}else{district=Number(b.dataset.district);province=DISTRICTS[district][0];pickedCandidate=null;pickedParty=null;renderBallots();$('#district-dialog').close();}}
    if(b.hasAttribute('data-close'))b.closest('dialog').close();
    if(b.dataset.stage){stage=b.dataset.stage;renderResults();}
    if(b.hasAttribute('data-inspect-picker'))openDistrictPicker(true);
    if(b.dataset.seatFilter){seatFilter=b.dataset.seatFilter;document.querySelectorAll('[data-seat-filter]').forEach(t=>t.setAttribute('aria-pressed',t.dataset.seatFilter===seatFilter));document.querySelectorAll('[data-seat-type]').forEach(t=>t.classList.toggle('dimmed',seatFilter!=='all'&&t.dataset.seatType!==seatFilter));}
    if(b.hasAttribute('data-fill-results')){fillVotes();result=E.count(state);renderResults();updateCounts();$('#next-stage').focus();}
  });
  $('#choose-district').addEventListener('click',()=>openDistrictPicker());
  $('#district-search').addEventListener('input',renderDistrictPicker);
  $('#cast').addEventListener('click',()=>{
    if(pickedCandidate===null||pickedParty===null)return;
    const name=E.candidate(district,pickedCandidate).name,party=E.parties[pickedParty].name;
    E.cast(state,district,pickedCandidate,pickedParty);result=null;
    $('#vote-status').className='vote-status success';
    $('#vote-status').textContent=`투표했어요. ${DISTRICTS[district][1]} ${name} 후보에게 1표 · ${party}에 1표. 다음 사람도 투표할 수 있어요.`;
    pickedCandidate=null;pickedParty=null;renderBallots();updateCounts();$('#open-results').focus();
  });
  $('#fill').addEventListener('click',fillVotes);
  $('#open-results').addEventListener('click',openResults);
  $('#next-stage').addEventListener('click',()=>{
    if(stage==='assembly'){$('#results-dialog').close();return;}
    stage=stage==='local'?'party':'assembly';renderResults();
    $(`[data-stage="${stage}"]`).focus();$('#results-dialog').scrollTop=0;
  });
  $('#reset').addEventListener('click',()=>{
    if((state.personal||state.sample)&&!confirm('직접 넣은 표와 예시 표를 모두 지우고 새 선거를 시작할까요?'))return;
    state=E.empty(254);pickedCandidate=null;pickedParty=null;result=null;stage='local';seatFilter='all';
    $('#vote-status').textContent='새 선거를 시작했어요. 각 투표용지에서 하나씩 골라 주세요.';$('#vote-status').className='vote-status';renderBallots();updateCounts();
  });
  document.addEventListener('keydown',event=>{
    if(!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(event.key))return;
    const group=event.target.closest('.choices,.province-list,.district-list,.result-steps,.filter-buttons');
    if(!group||event.target.tagName!=='BUTTON')return;
    const buttons=[...group.querySelectorAll('button:not(:disabled)')],i=buttons.indexOf(event.target);
    if(i<0)return;
    let next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(i+(['ArrowRight','ArrowDown'].includes(event.key)?1:-1)+buttons.length)%buttons.length;
    event.preventDefault();buttons[next].focus();
  });
  renderBallots();updateCounts();
})();

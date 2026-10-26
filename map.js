/* 실제 제22대 선거구 경계 · 외부 지도 서비스 없이 SVG로 표시한다. */
const ElectionMap=(()=>{
  const [x0,y0,x1,y1]=DISTRICT_MAP.bounds, full=[x0,y0,x1-x0,y1-y0], ratio=full[2]/full[3];
  let view=[...full],selected=0,choose=null,drag=null,moved=false;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const label=i=>DISTRICTS[i].join(' ');
  function html(winners,i){
    selected=i;
    return `<div class="map-panel"><div class="map-toolbar" role="group" aria-label="지도 범위와 확대"><button data-map="all">전국</button><button data-map="seoul">서울</button><button data-map="busan">부산</button><button data-map="selected">선택 지역 확대</button><span class="map-zoom"><button data-map="out" aria-label="지도 축소">−</button><button data-map="in" aria-label="지도 확대">+</button></span></div><svg id="election-map" viewBox="${view.join(' ')}" role="group" aria-label="전국 254개 지역구 지도. 방향키로 이동, 더하기와 빼기로 확대 축소, Home으로 전국 보기." tabindex="0"><g>${DISTRICT_MAP.districts.map((d,n)=>{
      const p=winners[n],name=`${label(n)} · ${p===null?'투표 대기':Election.parties[p].name+' 당선'}`;
      return `<path d="${d.d}" class="map-district ${n===i?'selected':''} ${p===null?'empty':''}" fill="${p===null?'var(--page)':`var(--${['a','b','c'][p]})`}" fill-rule="evenodd" vector-effect="non-scaling-stroke" data-map-district="${n}" role="button" tabindex="${n===i?0:-1}" aria-label="${escape(name)}" aria-pressed="${n===i}"><title>${escape(name)}</title></path>`;
    }).join('')}</g></svg><div class="map-location" id="map-location" role="status">선택: ${escape(label(i))}</div><div class="map-footnote"><span>선거구 하나가 1석 · 넓이와 의석수는 관계없어요.</span><a href="https://github.com/OhmyNews/2024_22_elec_map" target="_blank" rel="noopener">지도: 오마이뉴스(2024)</a></div></div>`;
  }
  function apply(){
    const svg=document.querySelector('#election-map');if(!svg)return;
    view[2]=Math.max(25,Math.min(full[2],view[2]));view[3]=view[2]/ratio;
    view[0]=Math.max(full[0],Math.min(full[0]+full[2]-view[2],view[0]));
    view[1]=Math.max(full[1],Math.min(full[1]+full[3]-view[3],view[1]));
    svg.setAttribute('viewBox',view.join(' '));
    document.querySelector('[data-map="out"]').disabled=view[2]>=full[2]-.01;
    document.querySelector('[data-map="in"]').disabled=view[2]<=25.01;
    document.querySelector('[data-map="all"]').setAttribute('aria-pressed',view[2]>=full[2]-.01);
  }
  function fit(bounds){
    const [a,b,c,d]=bounds,w=Math.max(25,Math.max(c-a,(d-b)*ratio)*1.22),h=w/ratio;
    view=[(a+c-w)/2,(b+d-h)/2,w,h];apply();
  }
  function zoom(factor,anchor){
    const [x,y,w,h]=view,[cx,cy]=anchor||[x+w/2,y+h/2];
    const next=Math.max(25,Math.min(full[2],w*factor)),scale=next/w;
    view=[cx+(x-cx)*scale,cy+(y-cy)*scale,next,h*scale];apply();
  }
  function province(name){
    const boxes=DISTRICTS.flatMap((d,i)=>d[0]===name?[DISTRICT_MAP.districts[i].bounds]:[]);
    fit([Math.min(...boxes.map(b=>b[0])),Math.min(...boxes.map(b=>b[1])),Math.max(...boxes.map(b=>b[2])),Math.max(...boxes.map(b=>b[3]))]);
  }
  function select(i,focus=false){
    selected=i;
    document.querySelectorAll('[data-map-district]').forEach(p=>{const active=Number(p.dataset.mapDistrict)===i;p.classList.toggle('selected',active);p.setAttribute('aria-pressed',active);p.setAttribute('tabindex',active?'0':'-1');});
    const path=document.querySelector(`[data-map-district="${i}"]`);
    // 다른 경계 아래에 가려지지 않게 선택한 경계를 마지막에 그린다.
    if(path)path.parentElement.append(path);
    const status=document.querySelector('#map-location');if(status)status.textContent='선택: '+label(i);
    if(focus)fit(DISTRICT_MAP.districts[i].bounds);
  }
  function bind(onSelect){
    choose=onSelect;
    const svg=document.querySelector('#election-map');if(!svg)return;
    document.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>{
      const action=b.dataset.map;
      if(action==='all'){view=[...full];apply();}
      if(action==='seoul')province('서울특별시');
      if(action==='busan')province('부산광역시');
      if(action==='selected')fit(DISTRICT_MAP.districts[selected].bounds);
      if(action==='in')zoom(1/1.65);
      if(action==='out')zoom(1.65);
    });
    svg.addEventListener('pointerdown',e=>{
      if(e.button!==0||drag)return;
      drag={id:e.pointerId,x:e.clientX,y:e.clientY,view:[...view],matrix:svg.getScreenCTM().inverse(),district:e.target.closest('[data-map-district]')?.dataset.mapDistrict};
      moved=false;svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove',e=>{
      if(!drag||e.pointerId!==drag.id)return;
      if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)moved=true;
      if(!moved)return;
      const from=new DOMPoint(drag.x,drag.y).matrixTransform(drag.matrix),to=new DOMPoint(e.clientX,e.clientY).matrixTransform(drag.matrix);
      view=[drag.view[0]+from.x-to.x,drag.view[1]+from.y-to.y,drag.view[2],drag.view[3]];apply();
    });
    svg.addEventListener('pointerup',e=>{
      if(!drag||e.pointerId!==drag.id)return;
      const i=drag.district;drag=null;
      if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);
      if(!moved&&i!==undefined)choose(Number(i));
    });
    svg.addEventListener('pointercancel',()=>{drag=null;});
    svg.addEventListener('wheel',e=>{
      e.preventDefault();const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
      zoom(e.deltaY>0?1.2:1/1.2,[p.x,p.y]);
    },{passive:false});
    svg.addEventListener('keydown',e=>{
      const i=e.target.closest('[data-map-district]')?.dataset.mapDistrict;
      if((e.key==='Enter'||e.key===' ')&&i!==undefined){e.preventDefault();choose(Number(i));return;}
      if(['+','=','-','Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
        e.preventDefault();
        if(e.key==='+'||e.key==='=')zoom(1/1.65);
        if(e.key==='-')zoom(1.65);
        if(e.key==='Home'){view=[...full];apply();}
        if(e.key==='ArrowLeft')view[0]-=view[2]*.15;
        if(e.key==='ArrowRight')view[0]+=view[2]*.15;
        if(e.key==='ArrowUp')view[1]-=view[3]*.15;
        if(e.key==='ArrowDown')view[1]+=view[3]*.15;
        apply();
      }
    });
    select(selected);apply();
  }
  return {html,bind,select};
})();

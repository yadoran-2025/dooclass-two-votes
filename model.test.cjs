const assert=require('node:assert/strict');
const E=require('./model.js'),districts=require('./districts.js');
const map=require('./map-data.js');
assert.equal(map.districts.length,254);
assert.equal(new Set(map.districts.map(d=>d.code)).size,254);
assert.ok(map.districts.every((d,i)=>d.name===districts[i].join(' ')));
assert.ok(map.districts.every(d=>d.d.startsWith('M')&&d.d.endsWith('Z')&&d.bounds.every(Number.isFinite)));
assert.ok(map.districts.every(d=>d.bounds[0]>=map.bounds[0]&&d.bounds[1]>=map.bounds[1]&&d.bounds[2]<=map.bounds[2]&&d.bounds[3]<=map.bounds[3]));
assert.equal(districts.length,254);
assert.equal(new Set(districts.map(d=>d.join('/'))).size,254);
assert.equal(new Set(districts.map(d=>d[0])).size,17);
assert.equal(E.winner([4,6,3],[50,45,40]),1);
assert.equal(E.winner([4,4,3],[50,45,40]),0);
assert.equal(E.winner([0,0,0],[50,45,40]),null);
let s=E.empty(254);E.cast(s,0,0,2);
assert.deepEqual(s.local[0],[1,0,0]);assert.deepEqual(s.party,[0,0,1]);
assert.equal(E.count(s).proportional,null);
E.fill(s);assert.equal(s.sample,25300);assert.deepEqual(s.local[0],[1,0,0]);
const r=E.count(s,()=>.5);assert.equal(r.complete,true);
assert.equal(r.districts.reduce((a,b)=>a+b),254);assert.equal(r.proportional.seats.reduce((a,b)=>a+b),46);
assert.equal(s.party.reduce((a,b)=>a+b),s.sample+s.personal);
E.fill(s);assert.equal(s.sample,25300);
// 선관위 제22대 총선 개표자료의 전국 유효표·당선 결과 대조: 비례 18·14·12·2석.
const real=E.proportional([10395264,7567459,6874278,1025775,609313,483827,642433,746170,0,0,0,0],[0,0,0,1,0,0,0,0,161,90,1,1],()=>.5);
assert.deepEqual(real.seats,[18,14,12,2,0,0,0,0,0,0,0,0]);
assert.deepEqual(E.proportional([45,35,20,0],[150,90,10,4],()=>.5).seats,[6,12,28,0]);
assert.equal(E.proportional([1,0,0],[254,0,0]).seats[0],46);
assert.equal(E.largestRemainder([1,1,1],2,()=>.5).tied,true);
assert.throws(()=>E.cast(s,-1,0,0));assert.throws(()=>E.proportional([1,-1],[254,0]));
for(let i=0;i<1000;i++) {
 const local=[i%255,Math.floor((254-i%255)*.6),0];local[2]=254-local[0]-local[1];
 const p=E.proportional([i+1,Math.max(1,1000-i),17+i%100],local,()=>.5);
 assert.equal(p.seats.reduce((a,b)=>a+b),46);assert.ok(p.seats.every(v=>Number.isInteger(v)&&v>=0));
}
console.log('확인 완료: 실제 254개 선거구·17개 시도, 분리 투표, 지역구 다수대표·동률, 예시 표 보존, 2024 실개표 비례 의석 대조, 1,000가지 배분의 합계·범위');

import test from 'node:test';
import assert from 'node:assert/strict';
import {albumFootprints,clampCamera,initialMapCamera,placeOnMap,projectChina,projectWorld,zoomCamera} from '../apps/web/src/lib/footprints.ts';
import type {Album,Photo} from '../apps/web/src/lib/types.ts';
const photo:Photo={id:'cover',title:'cover',alt:'cover',tags:[],sections:[],featured:false,isPublic:true,image:{url:'photo.jpg',width:1200,height:800}};
const album=(city:string,country='中国'):Album=>({id:city,slug:city,title:city,city,country,date:'2026-01-01',excerpt:'',preface:[],cover:{photo,focusX:.5,focusY:.5},spreads:[]});
const domestic=['舟山','深圳','香港','澳门','珠海','上海','南京','重庆','湖州','杭州'];
test('only requested pending destinations appear without published content',()=>{
 const china=albumFootprints([]),world=albumFootprints([],'world');
 assert.deepEqual(china.map(p=>p.city),domestic);
 assert.deepEqual(world.map(p=>[p.city,p.country]),[['新加坡','新加坡'],['吉隆坡','马来西亚'],['马六甲','马来西亚']]);
 for(const p of [...china,...world]){assert.equal(p.pending,true);assert.deepEqual(p.albums,[]);}
});
test('existing multi-album destinations keep their order and pending places resolve automatically',()=>{
 const albums=[...['大连','苏州','厦门','广州','昆明','大理'].map(city=>album(city)),album('金门','中国台湾'),album('台北','中国台湾'),album('广州'),album('苏州')];
 const points=albumFootprints(albums);
 assert.equal(points.length,18);assert.equal(points.filter(p=>p.pending).length,10);
 assert.equal(points.reduce((n,p)=>n+p.albums.length,0),10);
 assert.deepEqual(points.find(p=>p.city==='广州')!.albums,[albums[3],albums[8]]);
 const shanghai=album('上海'),singapore=album('新加坡','新加坡');
 const resolved=albumFootprints([...albums,shanghai]).find(p=>p.city==='上海')!;
 assert.equal(resolved.pending,false);assert.deepEqual(resolved.albums,[shanghai]);
 assert.deepEqual(albumFootprints([singapore],'world').find(p=>p.city==='新加坡')!.albums,[singapore]);
 assert.equal(albumFootprints([album('吉隆坡','中国')],'world').find(p=>p.city==='吉隆坡')!.pending,true);
});
test('nearby Chinese locations retain actual coordinates with no display offsets',()=>{
 const points=albumFootprints([album('厦门'),album('金门','中国台湾')]);
 for(const p of points)assert.deepEqual({x:p.x,y:p.y},projectChina(p.longitude,p.latitude));
 const xiamen=points.find(p=>p.city==='厦门')!,kinmen=points.find(p=>p.city==='金门')!;
 assert(xiamen.x<kinmen.x);assert(Math.abs(xiamen.x-kinmen.x)<4);
 const macau=points.find(p=>p.city==='澳门')!,zhuhai=points.find(p=>p.city==='珠海')!;
 assert(macau.x<zhuhai.x&&macau.y>zhuhai.y);
});
test('international locations are in the initial regional view and within the full world map',()=>{
 const camera=initialMapCamera('world');
 for(const p of albumFootprints([],'world')){
  assert.deepEqual({x:p.x,y:p.y},projectWorld(p.longitude,p.latitude));
  for(const point of [p,placeOnMap(p,camera)])assert(point.x>0&&point.x<1000&&point.y>0&&point.y<700);
 }
 assert.deepEqual(initialMapCamera('china'),{scale:1,x:0,y:0});
});
test('zoom keeps its anchor fixed, can reverse, and never pans beyond map bounds',()=>{
 const start={scale:1,x:0,y:0},anchor={x:650,y:580},zoomed=zoomCamera(start,8,anchor);
 assert.deepEqual(placeOnMap(anchor,zoomed),anchor);
 assert.deepEqual(zoomCamera(zoomed,1,anchor),start);
 assert.deepEqual(clampCamera({scale:4,x:50,y:-9999}),{scale:4,x:0,y:-2100});
 assert.deepEqual(clampCamera({scale:.1,x:-400,y:40}),start);
 assert.equal(zoomCamera(start,200,anchor).scale,64);
});

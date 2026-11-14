import test from 'node:test';
import assert from 'node:assert/strict';
import {getArchiveStats} from '../apps/web/src/lib/archive-stats.ts';
import {hasPhotoStory} from '../apps/web/src/lib/photo-stories.ts';
import type {Album,Photo} from '../apps/web/src/lib/types.ts';

const photo=(id:string,caption=''):Photo=>({id,caption,title:id,alt:id,tags:[],sections:[],featured:false,isPublic:true,image:{url:'photo.jpg',width:1200,height:800}});
const album=(city:string,cover:Photo,photos:Photo[],country='中国'):Album=>({id:city,slug:city,title:city,city,country,date:'2025-01-01',excerpt:'',preface:[],cover:{photo:cover,focusX:.5,focusY:.5},spreads:[{key:'spread',layout:'full',photos,text:[]}]});
test('archive totals deduplicate repeated covers, shared photographs, and two albums in the same city',()=>{
 const a=photo('a','清晨的湖面。'),b=photo('b','拍摄于苏州'),c=photo('c'),d=photo('d','风停了。');
 const albums=[album('苏州',a,[a,b]),album(' 苏州 ',a,[b,c]),album('大理',d,[d,a])];
 assert.deepEqual(getArchiveStats(albums),{cities:2,frames:4,stories:2});
 // Adding a new city and story updates every count without editing constants.
 const e=photo('e','雨后的街角。');
 assert.deepEqual(getArchiveStats([...albums,album('大连',e,[e])]),{cities:3,frames:5,stories:3});
});
test('story marks and totals distinguish location-only credits from short actual stories',()=>{
 for(const text of [undefined,'','  ','拍摄于大连','拍摄于大连。'])assert.equal(hasPhotoStory(text),false);
 for(const text of ['风起。','拍摄于大连。那天风很大。','**清晨**\n\n风吹过湖面。'])assert.equal(hasPhotoStory(text),true);
});
test('empty archive has no invented counters',()=>assert.deepEqual(getArchiveStats([]),{cities:0,frames:0,stories:0}));

import type {Album} from './types';

export type MapScope='china'|'world';
export type MapPoint={x:number;y:number};
export type MapCamera=MapPoint&{scale:number};
export const mapFrame={width:1000,height:700};
export function projectChina(longitude:number,latitude:number):MapPoint {
 return {x:500+(longitude-104.2978515625)*Math.cos(35*Math.PI/180)*17.5,y:350-(latitude-35.8544921875)*17.5};
}
export function projectWorld(longitude:number,latitude:number):MapPoint {
 return {x:500+longitude*(950/360),y:350-latitude*(950/360)};
}
export function placeOnMap(point:MapPoint,camera:MapCamera):MapPoint {
 return {x:point.x*camera.scale+camera.x,y:point.y*camera.scale+camera.y};
}
export function clampCamera(camera:MapCamera):MapCamera {
 const scale=Math.max(1,Math.min(64,camera.scale));
 return {scale,x:Math.max(mapFrame.width*(1-scale),Math.min(0,camera.x)),y:Math.max(mapFrame.height*(1-scale),Math.min(0,camera.y))};
}
export function zoomCamera(camera:MapCamera,scale:number,anchor:MapPoint):MapCamera {
 const nextScale=Math.max(1,Math.min(64,scale)),factor=nextScale/camera.scale;
 return clampCamera({scale:nextScale,x:anchor.x-(anchor.x-camera.x)*factor,y:anchor.y-(anchor.y-camera.y)*factor});
}
export function initialMapCamera(scope:MapScope):MapCamera {
 if(scope==='china')return {scale:1,x:0,y:0};
 // The first international photographs are in Southeast Asia. Full world view
 // remains available with the overview control; coordinates never get offset.
 const center=projectWorld(102.5,2.6),scale=20;
 return clampCamera({scale,x:500-center.x*scale,y:350-center.y*scale});
}
type Destination={id:string;city:string;country:string;longitude:number;latitude:number;scope?:MapScope;placeholder?:boolean};
// Only the user's explicitly requested pending destinations appear without an album.
const destinations:Destination[]=[
 {id:'dalian',city:'大连',country:'中国',longitude:121.62,latitude:38.92},
 {id:'suzhou',city:'苏州',country:'中国',longitude:120.58,latitude:31.30},
 {id:'xiamen',city:'厦门',country:'中国',longitude:118.08,latitude:24.48},
 {id:'guangzhou',city:'广州',country:'中国',longitude:113.26,latitude:23.13},
 {id:'kinmen',city:'金门',country:'中国台湾',longitude:118.32,latitude:24.44},
 {id:'kunming',city:'昆明',country:'中国',longitude:102.71,latitude:25.04},
 // Airport reference point: CAA aerodrome chart, 25°04′49″N 121°13′56″E.
 {id:'taoyuan-airport',city:'台北',country:'中国台湾',longitude:121+13/60+56/3600,latitude:25+4/60+49/3600},
 {id:'dali',city:'大理',country:'中国',longitude:100.23,latitude:25.60},
 {id:'zhoushan',city:'舟山',country:'中国',longitude:122.2072,latitude:29.9853,placeholder:true},
 {id:'shenzhen',city:'深圳',country:'中国',longitude:114.0579,latitude:22.5431,placeholder:true},
 {id:'hong-kong',city:'香港',country:'中国',longitude:114.1694,latitude:22.3193,placeholder:true},
 {id:'macau',city:'澳门',country:'中国',longitude:113.5439,latitude:22.1987,placeholder:true},
 {id:'zhuhai',city:'珠海',country:'中国',longitude:113.5767,latitude:22.2707,placeholder:true},
 {id:'shanghai',city:'上海',country:'中国',longitude:121.4737,latitude:31.2304,placeholder:true},
 {id:'nanjing',city:'南京',country:'中国',longitude:118.7969,latitude:32.0603,placeholder:true},
 {id:'chongqing',city:'重庆',country:'中国',longitude:106.5516,latitude:29.5630,placeholder:true},
 {id:'huzhou',city:'湖州',country:'中国',longitude:120.0868,latitude:30.8943,placeholder:true},
 {id:'hangzhou',city:'杭州',country:'中国',longitude:120.1551,latitude:30.2741,placeholder:true},
 {id:'singapore',city:'新加坡',country:'新加坡',longitude:103.8198,latitude:1.3521,scope:'world',placeholder:true},
 {id:'kuala-lumpur',city:'吉隆坡',country:'马来西亚',longitude:101.6869,latitude:3.1390,scope:'world',placeholder:true},
 {id:'malacca',city:'马六甲',country:'马来西亚',longitude:102.2501,latitude:2.1896,scope:'world',placeholder:true},
];
export function albumFootprints(albums:Album[],scope:MapScope='china') {
 return destinations.filter(place=>(place.scope||'china')===scope).flatMap(place=>{
  const matches=albums.filter(album=>album.city===place.city&&album.country===place.country);
  const project=scope==='china'?projectChina:projectWorld;
  return matches.length||place.placeholder?[{...place,scope,...project(place.longitude,place.latitude),albums:matches,pending:matches.length===0}]:[];
 });
}

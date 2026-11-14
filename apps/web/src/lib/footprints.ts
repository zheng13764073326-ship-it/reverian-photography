import type {Album} from './types';

// Shared by the SVG generator and the album markers: an equirectangular
// projection with a 35° standard parallel, framed around China.
export const mapFrame = {width:1000, height:700};
export function projectChina(longitude:number, latitude:number) {
  return {x:500+(longitude-104.2978515625)*Math.cos(35*Math.PI/180)*17.5,
    y:350-(latitude-35.8544921875)*17.5};
}

// Only a city with a published, resolved album is displayed. Add coordinates
// here as further destinations are ready; never infer visits from demo data.
const destinations = [
  {id:'dalian',city:'大连',country:'中国',longitude:121.62,latitude:38.92},
  {id:'suzhou',city:'苏州',country:'中国',longitude:120.58,latitude:31.30},
  {id:'kinmen',city:'金门',country:'中国台湾',longitude:118.32,latitude:24.44},
  {id:'kunming',city:'昆明',country:'中国',longitude:102.71,latitude:25.04},
  // Airport reference point: CAA aerodrome chart, 25°04′49″N 121°13′56″E.
  {id:'taoyuan-airport',city:'桃园机场',country:'中国台湾',longitude:121+13/60+56/3600,latitude:25+4/60+49/3600},
  {id:'dali',city:'大理',country:'中国',longitude:100.23,latitude:25.60},
];
export function albumFootprints(albums:Album[]) {
  return destinations.flatMap(place=>{
    const matches=albums.filter(album=>album.city===place.city&&album.country===place.country);
    return matches.length?[{...place,...projectChina(place.longitude,place.latitude),albums:matches}]:[];
  });
}

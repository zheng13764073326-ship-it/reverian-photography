import data from './guide-data.json';
export type BrandName = 'Sony'|'Canon'|'Nikon'|'Fujifilm'|'Panasonic'|'OM SYSTEM'|'Ricoh'|'Leica'|'Hasselblad';
export type SensorFormat='1-inch'|'M43'|'APS-C'|'FullFrame'|'MediumFormat';
export type BudgetTier='1k-3k'|'3k-5k'|'5k-8k'|'8k-12k'|'12k+';
export interface CameraPlacement {budgetTier:BudgetTier;condition:'new'|'used';summary:string;caution:string}
export interface CameraItem {id:string;brand:BrandName;name:string;alias?:string;sensor:SensorFormat;lensType:'fixed'|'interchangeable';bodyType:'mirrorless'|'dslr'|'compact';hasEVF:boolean;hasMechanicalShutter:boolean;image:string;placements:CameraPlacement[]}
export const guide=data;
export const cameras=data.cameras as CameraItem[];
export const sensorNames:Record<SensorFormat,string>={'1-inch':'1 英寸',M43:'M4/3','APS-C':'APS-C',FullFrame:'全画幅',MediumFormat:'中画幅'};
export const chapters=[['sensor','01','认识画幅','SENSOR FORMAT'],['brands','02','品牌生态','CAMERA ECOSYSTEMS'],['genres','03','按题材选','GENRE-BASED CHOICE'],['budget','04','预算选机','BUDGET GUIDE'],['checklist','05','二手验机','SECOND-HAND CHECKLIST'],['decision','06','最终决策','DECISION FRAMEWORK']] as const;

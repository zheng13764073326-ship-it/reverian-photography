export const QUIZ_VERSION = 'reverian-2026-11-v3';
export type TacitQuestion = {
  question: string;
  options: string[];
  answers: number[];
  explanation: string;
};

// Personal answers approved by Reverian. Indices refer to the displayed options.
export const tacitQuestions: TacitQuestion[] = [
  {question:'如果用一种颜色代表我的日常偏好，你觉得会是？',options:['森林般的绿色','海雾般的蓝色','暮色般的紫色','落日般的橙色'],answers:[1],explanation:'我最喜欢的颜色是蓝色。'},
  {question:'翻看我拍下的照片，我更偏爱哪一种画面影调？',options:['温暖柔和的复古胶片感','浓郁鲜艳的高饱和色彩','明亮通透的日系清淡风','深沉克制的冷峻暗调'],answers:[2],explanation:'比起浓重的色调，我更喜欢明亮清淡的照片。'},
  {question:'在陌生城市醒来，我通常会怎么开启旅途的一天？',options:['趁清晨人少先背相机出门逛逛','睡到自然醒，看心情慢慢安排','卡着点起床，赶上酒店早餐就行','白天在住处休息，等傍晚光线好了再出门'],answers:[0],explanation:'出去旅行时，我通常会选择早起出门。'},
  {question:'旅行途中正准备去吃晚饭，突然遇上绝佳的日落蓝调时刻，我会？',options:['民以食为天，填饱肚子再说，风景下次还能拍','站在原地快速抓拍几张，绝不耽误去餐厅干饭','看同行朋友的脸色，大家饿了就乖乖去吃饭','立刻找机位拍完这阵光，晚饭推迟一小时也值了'],answers:[3],explanation:'两者撞上时，我会优先去拍想拍的风景。'},
  {question:'每逢世界杯或洲际大赛，我最支持的主队是？',options:['桑巴军团 · 巴西队','潘帕斯雄鹰 · 阿根廷队','高卢雄鸡 · 法国队','日耳曼战车 · 德国队'],answers:[1],explanation:'我最支持的是阿根廷队。'},
  {question:'绿茵场上，我最欣赏的球星组合是？',options:['梅西 & 内马尔','C 罗 & 姆巴佩','梅西 & 姆巴佩','内马尔 & 哈兰德'],answers:[2],explanation:'梅西和姆巴佩，都是我喜欢的球员。'},
  {question:'闲暇重温日本动画电影时，百看不厌的那一部是？',options:['《你的名字》','《天空之城》','《千与千寻》','《哈尔的移动城堡》'],answers:[2],explanation:'我最喜欢的日本动画是《千与千寻》。'},
  {question:'换成迪士尼的动画世界，最打动我的是哪一部？',options:['《疯狂动物城》','《寻梦环游记》','《心灵奇旅》','《头脑特工队》'],answers:[0],explanation:'这几部动画里，我最喜欢《疯狂动物城》。'},
  {question:'戴上耳机，我的歌单里占据最高席位的歌手是？',options:['陈奕迅','周杰伦','黄家驹','张国荣'],answers:[3],explanation:'我最喜欢的歌手是张国荣。'},
  {question:'如果现在就能出发，我的下一站会是哪里？',options:['新疆','云南','川西','西藏'],answers:[2],explanation:'下一次旅行，我最想去的是川西。'},
];

export function tacitResult(score: number): {title: string; message: string} {
  if (score >= 80) return {title:'最佳同行者',message:'默契十足！连我下一站想去哪、日落时选拍照还是干饭都一清二楚，下次旅行必须有你。'};
  if (score >= 40) return {title:'同频快门',message:'已经捉住了大半的默契！无论是看球、听歌还是拍照，我们随时能聊到一块去。'};
  return {title:'初识旅人',message:'看来我们才刚刚对上焦。不妨多逛逛我的影集，下次一起出门走走。'};
}

export function isInFocus(question: TacitQuestion, picks: number[]): boolean {
  return picks.length === question.answers.length && new Set(picks).size === picks.length && question.answers.every(answer => picks.includes(answer));
}

export function tacitScore(questions: TacitQuestion[], picks: number[][]): number {
  if (!questions.length) return 0;
  return Math.round(questions.reduce((count, question, i) => count + Number(isInFocus(question,picks[i] ?? [])),0) / questions.length * 100);
}

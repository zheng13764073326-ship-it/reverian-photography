export const QUIZ_VERSION = 'reverian-2026-11-v1';
export type TacitQuestion = {
  question: string;
  options: string[];
  answers: number[];
  explanation: string;
};

// Personal answers approved by Reverian. Indices refer to the displayed options.
export const tacitQuestions: TacitQuestion[] = [
  {question:'我最喜欢哪一种颜色？',options:['绿色','蓝色','紫色','橙色'],answers:[1],explanation:'我最喜欢的颜色是蓝色。'},
  {question:'我更喜欢什么样的照片色调？',options:['温暖复古','浓郁鲜艳','明亮清淡','深沉冷峻'],answers:[2],explanation:'比起浓重的色调，我更喜欢明亮清淡的照片。'},
  {question:'出去旅行，我通常会怎么开始一天？',options:['早起出门，趁人少先逛一逛','睡到自然醒，再慢慢安排','赶上酒店早餐就行','白天休息，傍晚再出去'],answers:[0],explanation:'出去旅行时，我通常会选择早起出门。'},
  {question:'拍照和吃饭的时间撞上了，我会怎么选？',options:['先吃饭，照片什么时候都能拍','看哪边排队的人少','让同行的朋友来决定','先去拍想拍的风景，吃饭晚一点也行'],answers:[3],explanation:'两者撞上时，我会优先去拍想拍的风景。'},
  {question:'我最支持哪支足球队？',options:['巴西队','阿根廷队','法国队','德国队'],answers:[1],explanation:'我最支持的是阿根廷队。'},
  {question:'我最喜欢的两位球员是谁？',options:['C 罗','姆巴佩','内马尔','梅西','哈兰德'],answers:[1,3],explanation:'梅西和姆巴佩，都是我喜欢的球员。这一题两位都选对才得分。'},
  {question:'我最喜欢哪部日本动画？',options:['《你的名字》','《天空之城》','《千与千寻》','《哈尔的移动城堡》'],answers:[2],explanation:'我最喜欢的日本动画是《千与千寻》。'},
  {question:'下面这些动画里，我最喜欢哪一部？',options:['《疯狂动物城》','《寻梦环游记》','《心灵奇旅》','《头脑特工队》'],answers:[0],explanation:'这几部动画里，我最喜欢《疯狂动物城》。'},
  {question:'我最喜欢的歌手是谁？',options:['陈奕迅','周杰伦','黄家驹','张国荣'],answers:[3],explanation:'我最喜欢的歌手是张国荣。'},
  {question:'下一次旅行，我最想去哪里？',options:['新疆','云南','川西','西藏'],answers:[2],explanation:'下一次旅行，我最想去的是川西。'},
];

export function isInFocus(question: TacitQuestion, picks: number[]): boolean {
  return picks.length === question.answers.length && new Set(picks).size === picks.length && question.answers.every(answer => picks.includes(answer));
}

export function tacitScore(questions: TacitQuestion[], picks: number[][]): number {
  if (!questions.length) return 0;
  return Math.round(questions.reduce((count, question, i) => count + Number(isInFocus(question,picks[i] ?? [])),0) / questions.length * 100);
}

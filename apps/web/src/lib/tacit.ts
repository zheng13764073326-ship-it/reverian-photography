export const QUIZ_VERSION = 'reverian-2026-11-v4';
export type TacitQuestion = {
  question: string;
  options: string[];
  answers: number[];
  explanation: string;
};

// Personal answers approved by Reverian. Indices refer to the displayed options.
export const tacitQuestions: TacitQuestion[] = [
  {
    "question": "如果用一种颜色代表我的日常偏好，你觉得会是？",
    "options": [
      "落日般的橙色",
      "海雾般的蓝色",
      "旧书页的暖白",
      "雨后苔藓的森绿"
    ],
    "answers": [
      1
    ],
    "explanation": "我喜欢海雾般的蓝色。"
  },
  {
    "question": "翻看我拍下的照片，我更偏爱哪一种画面影调？",
    "options": [
      "温暖柔和的复古胶片感",
      "浓郁高反差的电影暗调",
      "明亮通透的日系清淡风",
      "极简冷峻的黑白灰"
    ],
    "answers": [
      2
    ],
    "explanation": "我更偏爱明亮通透的日系清淡风。"
  },
  {
    "question": "在陌生城市醒来，我通常会怎么开启旅途的一天？",
    "options": [
      "趁清晨人少先背相机出门逛逛",
      "睡到自然醒再去找当地早午餐",
      "严格按计划表打卡第一个景点",
      "坐在民宿窗边发呆听歌"
    ],
    "answers": [
      0
    ],
    "explanation": "我会趁清晨人少，先背相机出门逛逛。"
  },
  {
    "question": "旅行途中正准备去吃晚饭，突然遇上绝佳的日落蓝调时刻，我会？",
    "options": [
      "站在原地快速抓拍几张，绝不耽误去餐厅干饭",
      "用眼睛静静看完，不掏相机了",
      "边走边随手录一段视频",
      "立刻找机位拍完这阵光，晚饭推迟一小时也值了"
    ],
    "answers": [
      3
    ],
    "explanation": "我会先拍完这阵光，晚饭推迟一小时也值了。"
  },
  {
    "question": "如果深夜看球赛，哪组“主队与球星”最能让我瞬间精神？",
    "options": [
      "五星巴西桑巴军团 · 内马尔 & 维尼修斯",
      "潘帕斯雄鹰阿根廷 · 梅西 & 姆巴佩",
      "法兰西高卢雄鸡 · C罗 & 姆巴佩",
      "英格兰三狮军团 · 贝林厄姆 & 凯恩"
    ],
    "answers": [
      1
    ],
    "explanation": "我支持阿根廷，也喜欢梅西和姆巴佩。"
  },
  {
    "question": "闲暇重温动画电影时，最能击中我的那组世界是？",
    "options": [
      "《哈尔的移动城堡》 & 《心灵奇旅》",
      "《起风了》 & 《寻梦环游记》",
      "《千与千寻》&《疯狂动物城》",
      "《龙猫》 & 《飞屋环游记》"
    ],
    "answers": [
      2
    ],
    "explanation": "最能打动我的，是《千与千寻》和《疯狂动物城》。"
  },
  {
    "question": "戴上耳机走在街上，我的歌单里占据最高席位的歌手是？",
    "options": [
      "陈奕迅",
      "周杰伦",
      "林宥嘉",
      "张国荣"
    ],
    "answers": [
      3
    ],
    "explanation": "我的歌单里，张国荣占据最高席位。"
  },
  {
    "question": "假如手里有一台 36 张的一次性胶片机，现在只剩最后第 36 张快门，你觉得我会留给什么画面？",
    "options": [
      "路边偶遇的、再也不会见第二次的荒诞小景",
      "旅途中最好看的那座地标建筑",
      "和同行朋友一起搞怪的合影",
      "留到回家那天拍自己房间的一角"
    ],
    "answers": [
      0
    ],
    "explanation": "我会把最后一格留给路边偶遇的、再也不会见第二次的荒诞小景。"
  },
  {
    "question": "如果能给生活偷偷加一个不起眼的“小程序外挂”，你觉得我最想要哪个？",
    "options": [
      "去任何城市都能自动导航到没人排队的宝藏小店",
      "任何熬夜写完东西的第二天都能自动满血复活",
      "听一遍的歌就能立刻学会弹唱",
      "给喜欢的瞬间按下“0.5倍速慢放键”，比如日落或深夜看球赛的时刻"
    ],
    "answers": [
      1
    ],
    "explanation": "我想要的是熬夜写完东西后，第二天也能自动满血复活。"
  },
  {
    "question": "如果现在就能收拾背包出发，我的下一站会是哪里？",
    "options": [
      "冰岛",
      "川西",
      "北海道",
      "新疆阿勒泰"
    ],
    "answers": [
      2
    ],
    "explanation": "如果现在就能出发，我想去北海道。"
  }
];

export function tacitResult(score: number): {title: string; message: string} {
  if (score >= 80) return {title:'默契 / 合焦',message:'每一张都精准合焦。那些没明说的习惯和偏好，原来你早就替我留好景深了。'};
  if (score >= 40) return {title:'同频 / 测光',message:'测光已经很准了。在很多画面和节奏上，我们不需要刻意对齐就能同频。'};
  return {title:'初识 / 搜焦',message:'前几张还在反复搜焦——不过答完这十题，你手里拿到的就是我的对焦手册了。'};
}

export function isInFocus(question: TacitQuestion, picks: number[]): boolean {
  return picks.length === question.answers.length && new Set(picks).size === picks.length && question.answers.every(answer => picks.includes(answer));
}

export function tacitScore(questions: TacitQuestion[], picks: number[][]): number {
  if (!questions.length) return 0;
  return Math.round(questions.reduce((count, question, i) => count + Number(isInFocus(question,picks[i] ?? [])),0) / questions.length * 100);
}

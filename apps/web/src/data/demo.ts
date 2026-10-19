import assets from "./assets.json";
import type { Content, Photo, RichText, Cover } from "../lib/types";
export const paragraph = (text: string): RichText => [
  {
    _type: "block",
    _key: "p",
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: "s", text, marks: [] }],
  },
];
const definitions = [
  ["coast", "海面", "蓝绿色海面上的波浪"],
  ["city", "街道", "高楼之间的城市街道"],
  ["town", "沿岸建筑", "海岸山坡上的彩色房屋"],
  ["forest", "林间", "日光穿过树林"],
  ["paris", "河岸", "河岸与远处的埃菲尔铁塔"],
  ["lake", "船与湖面", "湖面上的木船与远处的群山"],
  ["mountain", "山体与倒影", "湖面倒映山峰与天空"],
  ["field", "山脊", "落日下层叠的山脊"],
  ["valley", "湖畔木屋", "山间湖泊岸边的木屋"],
  ["stilllight", "窗边", "窗边花瓶与茶杯的静物照片"],
  ["gardenchair", "庭院", "庭院树荫中的一把木椅"],
  ["afternoon", "午后", "阳光下的花束、水果和木桌"],
];
export const demoPhotos: Photo[] = definitions.map(([id, title, alt]) => {
  const meta = assets[id as keyof typeof assets];
  return {
    id,
    title,
    alt: alt + "（示例照片）",
    caption:
      id.startsWith("still") || ["gardenchair", "afternoon"].includes(id)
        ? "封面场景中的示例照片"
        : "占位照片 · Unsplash",
    tags: [],
    sections: ["city", "paris", "town"].includes(id) ? ["street"] : ["journal"],
    featured: !["stilllight", "gardenchair", "afternoon"].includes(id),
    isPublic: true,
    image: {
      url: `/images/${id}.jpg`,
      width: meta.width,
      height: meta.height,
      lqip: meta.lqip,
      localKey: id,
    },
  };
});
const photo = (id: string) => demoPhotos.find((p) => p.id === id)!;
const cover = (id: string): Cover => ({
  photo: photo(id),
  focusX: 0.5,
  focusY: 0.5,
});
const destinations = [
  ["kyoto-2026", "京都", "日本", "2026-10-01", "forest", "field", "city"],
  ["dali-2026", "大理", "中国", "2026-08-01", "lake", "valley", "coast"],
  [
    "northern-italy-2026",
    "意大利北部",
    "意大利",
    "2026-07-01",
    "town",
    "mountain",
    "coast",
  ],
  ["paris-2026", "巴黎", "法国", "2026-05-01", "paris", "city", "town"],
  ["alps-2025", "阿尔卑斯", "瑞士", "2025-10-01", "mountain", "lake", "valley"],
  ["hangzhou-2025", "杭州", "中国", "2025-03-01", "valley", "forest", "lake"],
];
export const demo: Content = {
  mode: "demo",
  photos: demoPhotos,
  featured: ["coast", "city", "forest", "town"].map(photo),
  albums: destinations.map(
    ([slug, city, country, date, first, second, third]) => ({
      id: slug,
      slug,
      title: city,
      city,
      country,
      date,
      excerpt: "一组关于光线、建筑与沿途风景的摄影故事。",
      cover: cover(first),
      preface: paragraph(
        "把一段旅程编成一册影集，让照片之间留有距离，也让不同的画面彼此回应。这里的文字、地点与照片仅用于演示排版，不代表真实旅行记录。",
      ),
      spreads: [
        { key: "full", layout: "full", photos: [photo(first)], text: [] },
        {
          key: "pair",
          layout: "pair",
          photos: [photo(second), photo(third)],
          text: [],
        },
        {
          key: "text",
          layout: "text",
          photos: [photo(first)],
          text: paragraph(
            "同一张照片可以再次出现。在不同的篇章里，它与另一段文字构成新的联系。此处展示图文混排。",
          ),
        },
      ],
    }),
  ),
  journals: [
    {
      id: "light",
      slug: "on-light",
      title: "光线的另一侧",
      date: "2026-09-16",
      excerpt: "几张照片，以及关于观看距离的笔记。",
      body: paragraph(
        "一张照片留下什么，也取决于画面之外是什么。试着把视线放低，或在相同的位置多停一会儿，熟悉的空间就会出现另一种关系。这是一篇用于展示阅读节奏的示例札记。",
      ),
      photos: [photo("forest"), photo("field")],
    },
    {
      id: "sequence",
      slug: "between-images",
      title: "照片之间",
      date: "2026-08-03",
      excerpt: "关于选片、留白，以及影像的次序。",
      body: paragraph(
        "排列照片时，先不看标题。色调、形状、远近，是它们最先给出的线索。前后交换一次，故事也会发生变化。本文和配图均为示例。",
      ),
      photos: [photo("coast"), photo("valley")],
    },
  ],
  settings: {
    title: "Reverian Photography",
    photographer: "Reverian",
    genres: "旅行 · 街头 · 胶片",
    motto: "按下快门，因为热爱",
    homePresentation: "desk",
    introduction: "这里收录旅行摄影，以及一些想留下的作品。",
    about: paragraph(
      "从城市街道到自然风景，用照片记录不同地方的样子。把旅途编成影集，也给偶然遇见的画面留一个位置。以上为个人介绍示例，待替换为你的文字。",
    ),
    portrait: cover("valley"),
    socialLinks: [],
    seo: { description: "Reverian 的旅行摄影、街巷观察与影像札记。" },
  },
};

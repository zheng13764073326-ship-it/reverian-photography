import { defineArrayMember, defineField, defineType } from "sanity";

const requiredText = (name: string, title: string) =>
  defineField({ name, title, type: "string", validation: (r) => r.required() });
const photoRef = (name = "photo", title = "照片") =>
  defineField({
    name,
    title,
    type: "reference",
    to: [{ type: "photo" }],
    validation: (r) => r.required(),
  });
const visible = defineField({
  name: "isPublic",
  title: "公开展示",
  type: "boolean",
  initialValue: true,
  description:
    "关闭后，下一次发布构建会从公开网站移除；草稿本身不会出现在网站。",
});
const body = defineType({
  name: "body",
  title: "正文",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "正文", value: "normal" },
        { title: "小标题", value: "h2" },
        { title: "引语", value: "blockquote" },
      ],
      marks: {
        decorators: [
          { title: "粗体", value: "strong" },
          { title: "斜体", value: "em" },
        ],
        annotations: [
          {
            name: "link",
            type: "object",
            title: "链接",
            fields: [
              {
                name: "href",
                type: "url",
                title: "网址",
                validation: (r) =>
                  r.uri({ scheme: ["http", "https", "mailto"] }),
              },
            ],
          },
        ],
      },
    }),
  ],
});
const slug = defineField({
  name: "slug",
  title: "固定网址",
  type: "slug",
  description: "首次发布后保持不变；调整标题不会改变网址。",
  options: { source: "title", maxLength: 80 },
  validation: (r) =>
    r.required().custom(async (value, context) => {
      if (!value?.current) return true;
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.current))
        return "使用小写英文字母、数字和连字符，例如 kyoto-2026。";
      const id = context.document?._id?.replace(/^drafts\./, "");
      if (!id) return true;
      const published = await context
        .getClient({ apiVersion: "2025-02-19" })
        .withConfig({ perspective: "raw", useCdn: false })
        .fetch<string | null>("*[_id == $id][0].slug.current", { id });
      return (
        !published ||
        published === value.current ||
        "此网址已经发布，请保留原值；如需迁移网址，应先配置重定向。"
      );
    }),
});
const cover = defineType({
  name: "photoCover",
  title: "封面与独立裁切",
  type: "object",
  fields: [
    photoRef(),
    defineField({
      name: "focusX",
      title: "焦点水平位置（0 左侧 / 1 右侧）",
      type: "number",
      initialValue: 0.5,
      validation: (r) => r.min(0).max(1),
    }),
    defineField({
      name: "focusY",
      title: "焦点垂直位置（0 顶部 / 1 底部）",
      type: "number",
      initialValue: 0.5,
      validation: (r) => r.min(0).max(1),
    }),
  ],
  preview: { select: { title: "photo.title", media: "photo.image" } },
});
const photo = defineType({
  name: "photo",
  title: "照片库",
  type: "document",
  fields: [
    requiredText("title", "作品标题"),
    defineField({
      name: "image",
      title: "原图",
      type: "image",
      options: { hotspot: true },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "alt",
      title: "替代文本",
      type: "string",
      description: "描述画面主体，供屏幕阅读器和搜索引擎使用。",
      validation: (r) => r.required().min(3).max(240),
    }),
    defineField({ name: "caption", title: "作品说明", type: "text", rows: 3 }),
    defineField({ name: "takenAt", title: "拍摄日期", type: "date" }),
    defineField({
      name: "location",
      title: "地点",
      type: "object",
      fields: [
        { name: "city", type: "string", title: "城市" },
        { name: "country", type: "string", title: "国家 / 地区" },
      ],
    }),
    defineField({
      name: "tags",
      title: "标签",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
    }),
    defineField({
      name: "sections",
      title: "展示栏目（可多选）",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: [
          { title: "街巷观察", value: "street" },
          { title: "影像札记", value: "journal" },
        ],
      },
    }),
    defineField({
      name: "featured",
      title: "精选作品",
      type: "boolean",
      initialValue: false,
      description: "进入作品页；首页精选及顺序在「首页精选顺序」管理。",
    }),
    visible,
  ],
  preview: {
    select: { title: "title", media: "image", isPublic: "isPublic" },
    prepare: ({ title, media, isPublic }) => ({
      title,
      media,
      subtitle: isPublic ? "公开" : "隐藏",
    }),
  },
  orderings: [
    {
      title: "拍摄日期从新到旧",
      name: "takenAtDesc",
      by: [{ field: "takenAt", direction: "desc" }],
    },
  ],
});
const spread = defineType({
  name: "spread",
  title: "专辑版式",
  type: "object",
  fields: [
    defineField({
      name: "layout",
      title: "版式模板",
      type: "string",
      initialValue: "full",
      options: {
        list: [
          { title: "单张大图", value: "full" },
          { title: "双列照片", value: "pair" },
          { title: "照片与文字", value: "text" },
        ],
        layout: "radio",
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "photos",
      title: "引用照片（拖动排序）",
      type: "array",
      of: [{ type: "reference", to: [{ type: "photo" }] }],
      validation: (r) =>
        r
          .required()
          .min(1)
          .max(2)
          .unique()
          .custom((value, context) => {
            const layout = (context.parent as { layout?: string })?.layout;
            if (!value) return true;
            return (
              value.length === (layout === "pair" ? 2 : 1) ||
              (layout === "pair"
                ? "双列版式需要两张照片。"
                : "此版式需要一张照片。")
            );
          }),
    }),
    defineField({
      name: "text",
      title: "配文",
      type: "body",
      hidden: ({ parent }) => parent?.layout !== "text",
    }),
  ],
  preview: {
    select: { title: "layout", media: "photos.0.image" },
    prepare: ({ title, media }) => ({
      title:
        (
          { full: "单张大图", pair: "双列照片", text: "照片与文字" } as Record<
            string,
            string
          >
        )[title] || "版式",
      media,
    }),
  },
});
const album = defineType({
  name: "album",
  title: "旅行影集",
  type: "document",
  fields: [
    requiredText("title", "影集标题"),
    slug,
    requiredText("city", "城市 / 目的地"),
    requiredText("country", "国家 / 地区"),
    defineField({
      name: "date",
      title: "旅行日期",
      type: "date",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "cover",
      title: "影集封面",
      type: "photoCover",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "excerpt",
      title: "故事简介",
      type: "text",
      rows: 3,
      validation: (r) => r.max(240),
    }),
    defineField({ name: "preface", title: "序言", type: "body" }),
    defineField({
      name: "spreads",
      title: "专辑正文（拖动模块与照片排序）",
      type: "array",
      of: [{ type: "spread" }],
      validation: (r) => r.min(1),
    }),
    defineField({
      name: "order",
      title: "目录顺序",
      type: "number",
      initialValue: 100,
      description: "数字越小越靠前；同顺序按日期从新到旧。",
    }),
    visible,
  ],
  preview: {
    select: { title: "title", subtitle: "city", media: "cover.photo.image" },
  },
  orderings: [
    {
      title: "目录顺序",
      name: "editorialOrder",
      by: [
        { field: "order", direction: "asc" },
        { field: "date", direction: "desc" },
      ],
    },
  ],
});
const journal = defineType({
  name: "journal",
  title: "影像札记",
  type: "document",
  fields: [
    requiredText("title", "标题"),
    slug,
    defineField({
      name: "date",
      title: "日期",
      type: "date",
      validation: (r) => r.required(),
    }),
    defineField({ name: "excerpt", title: "导语", type: "text", rows: 3 }),
    defineField({ name: "body", title: "正文", type: "body" }),
    defineField({
      name: "photos",
      title: "照片（引用照片库，拖动排序）",
      type: "array",
      of: [{ type: "reference", to: [{ type: "photo" }] }],
      validation: (r) => r.unique(),
    }),
    visible,
  ],
  preview: {
    select: { title: "title", subtitle: "date", media: "photos.0.image" },
  },
});
const featured = defineType({
  name: "featured",
  title: "首页精选顺序",
  type: "document",
  fields: [
    defineField({
      name: "photos",
      title: "首页照片（拖动排序）",
      type: "array",
      of: [{ type: "reference", to: [{ type: "photo" }] }],
      validation: (r) => r.unique().max(12),
    }),
  ],
  preview: { prepare: () => ({ title: "首页精选顺序" }) },
});
const settings = defineType({
  name: "siteSettings",
  title: "网站设置",
  type: "document",
  fields: [
    requiredText("title", "网站名称"),
    defineField({
      name: "photographer",
      title: "摄影师名字",
      type: "string",
      initialValue: "Reverian",
    }),
    defineField({
      name: "genres",
      title: "首页题材",
      type: "string",
      initialValue: "旅行 · 街头 · 胶片",
    }),
    defineField({
      name: "motto",
      title: "首页短句",
      type: "string",
      initialValue: "按下快门，因为热爱",
    }),
    defineField({
      name: "homeCover",
      title: "首页宽幅封面",
      type: "photoCover",
    }),
    defineField({
      name: "mobileCover",
      title: "手机竖版封面（可选）",
      type: "photoCover",
    }),
    defineField({
      name: "homePresentation",
      title: "首页展示方式",
      type: "string",
      initialValue: "photograph",
      options: {
        list: [
          { title: "单张摄影封面", value: "photograph" },
          { title: "现有照片盒封面（保留原样）", value: "desk" },
        ],
      },
    }),
    defineField({
      name: "introduction",
      title: "简短介绍",
      type: "text",
      rows: 3,
    }),
    defineField({ name: "about", title: "关于我与摄影理念", type: "body" }),
    defineField({
      name: "portrait",
      title: "个人介绍配图",
      type: "photoCover",
    }),
    defineField({
      name: "socialLinks",
      title: "社交链接",
      type: "array",
      of: [
        defineArrayMember({
          name: "socialLink",
          type: "object",
          fields: [
            requiredText("label", "名称"),
            {
              name: "url",
              type: "url",
              title: "网址",
              validation: (r) =>
                r.required().uri({ scheme: ["http", "https", "mailto"] }),
            },
          ],
        }),
      ],
    }),
    defineField({
      name: "seo",
      title: "搜索与分享",
      type: "object",
      fields: [
        {
          name: "description",
          type: "text",
          rows: 3,
          title: "网站描述",
          validation: (r) => r.max(180),
        },
        { name: "shareImage", type: "photoCover", title: "分享图片" },
      ],
    }),
  ],
  initialValue: { title: "Reverian Photography" },
  preview: { prepare: () => ({ title: "网站设置" }) },
});
export const schemaTypes = [
  body,
  cover,
  spread,
  photo,
  album,
  journal,
  featured,
  settings,
];

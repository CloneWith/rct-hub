/**
 * RCT S1 赛事情报 —— 静态数据源
 *
 * 内容依据《RCT S1 Staff 用手册》整理。标注「暂定」的项目以手册为准，
 * 正式开赛前可能调整。
 */

export type PieceKey =
  | "NM"
  | "FM"
  | "SHIRO"
  | "HD"
  | "HR"
  | "DT"
  | "TB";

export type ZoneKey = "NM" | "HD" | "HR" | "DT";

export interface PieceDef {
  key: PieceKey;
  label: string;
  name: string;
  color: string; // 主色（描边 / 图标 / 文本）
  soft: string; // 半透明底色
  zone: "free" | "locked";
  blurb: string;
}

export interface ZoneDef {
  key: ZoneKey;
  name: string;
  color: string;
  soft: string;
  blurb: string;
}

export interface RoundDef {
  key: string;
  name: string;
  nameEn: string;
  stars: string;
  ban: number;
  pool: string;
  note?: string;
}

export interface PoolEntry {
  mod: string;
  count: number;
  note?: string;
}

export interface PrizeTier {
  tier: string;
  emoji: string;
  title: string;
  items: string[];
}

// ---------------------------------------------------------------------------
// 棋子
// ---------------------------------------------------------------------------

export const PIECES: PieceDef[] = [
  {
    key: "NM",
    label: "NM",
    name: "NoMod",
    color: "#a6acb3",
    soft: "rgba(166, 172, 179, 0.14)",
    zone: "free",
    blurb: "不附加任何模组的标准谱面，可在任意区域落子。",
  },
  {
    key: "HD",
    label: "HD",
    name: "Hidden",
    color: "#4aa3ff",
    soft: "rgba(74, 163, 255, 0.14)",
    zone: "locked",
    blurb: "只能落在 HD 限定区内。",
  },
  {
    key: "HR",
    label: "HR",
    name: "HardRock",
    color: "#ff7a45",
    soft: "rgba(255, 122, 69, 0.14)",
    zone: "locked",
    blurb: "只能落在 HR 限定区内。",
  },
  {
    key: "DT",
    label: "DT",
    name: "DoubleTime",
    color: "#b56eff",
    soft: "rgba(181, 110, 255, 0.14)",
    zone: "locked",
    blurb: "只能落在 DT 限定区内。",
  },
  {
    key: "FM",
    label: "FM",
    name: "FreeMod",
    color: "#5ad07a",
    soft: "rgba(90, 208, 122, 0.14)",
    zone: "free",
    blurb: "四名玩家分别用 HD / HR / NM / Force Mod。Force Mod 位随落点区域同化。",
  },
  {
    key: "SHIRO",
    label: "白",
    name: "Shiro",
    color: "#eef2f6",
    soft: "rgba(238, 242, 246, 0.14)",
    zone: "free",
    blurb: "白色棋子。不受任何一方持有，可被双方争夺。",
  },
  {
    key: "TB",
    label: "TB",
    name: "Tiebreak",
    color: "#eec15a",
    soft: "rgba(238, 193, 90, 0.14)",
    zone: "free",
    blurb: "加赛图。强制 NF + ScoreV2，可选 HD / HR。",
  },
];

export const DEAD_PIECE = {
  label: "亡",
  name: "死亡棋",
  color: "#6b6166",
  soft: "rgba(107, 97, 102, 0.14)",
  blurb: "夺棋时被牺牲的棋子。不参与连对判定，也无法再被夺取。",
};

// ---------------------------------------------------------------------------
// 限定区
// ---------------------------------------------------------------------------

export const ZONES: ZoneDef[] = [
  { key: "HD", name: "HD 区", color: "#4aa3ff", soft: "rgba(74, 163, 255, 0.10)", blurb: "Hidden 限定区" },
  { key: "DT", name: "DT 区", color: "#b56eff", soft: "rgba(181, 110, 255, 0.10)", blurb: "DoubleTime 限定区" },
  { key: "HR", name: "HR 区", color: "#ff7a45", soft: "rgba(255, 122, 69, 0.10)", blurb: "HardRock 限定区" },
  { key: "NM", name: "NM 区", color: "#a6acb3", soft: "rgba(166, 172, 179, 0.08)", blurb: "无约束区（NM / FM / Shiro 自由落子）" },
];

/** 4×4 棋盘限定区布局（行 1–4，列 A–D）。 */
export const BOARD_ZONES: ZoneKey[][] = [
  ["HD", "HD", "DT", "DT"],
  ["HD", "HD", "DT", "DT"],
  ["HR", "HR", "NM", "NM"],
  ["HR", "HR", "NM", "NM"],
];

export const COL_LABELS = ["A", "B", "C", "D"] as const;
export const ROW_LABELS = ["1", "2", "3", "4"] as const;

// ---------------------------------------------------------------------------
// 图池结构
// ---------------------------------------------------------------------------

export const POOL_STRUCTURE: PoolEntry[] = [
  { mod: "NM", count: 3 },
  { mod: "HD", count: 3 },
  { mod: "HR", count: 3 },
  { mod: "DT", count: 4 },
  { mod: "FM", count: 5 },
  { mod: "Shiro", count: 1 },
  { mod: "TB", count: 1 },
];

export const POOL_TOTAL = POOL_STRUCTURE.reduce((s, p) => s + p.count, 0);

export const SKILLSETS: { mod: string; desc: string }[] = [
  { mod: "NM1", desc: "强双图" },
  { mod: "NM2", desc: "特殊读图" },
  { mod: "NM3", desc: "滑条 / 科技图" },
  { mod: "FM1", desc: "跳（切）图" },
  { mod: "FM2", desc: "串图" },
  { mod: "FM3", desc: "轻技" },
  { mod: "FM4", desc: "高速单点" },
  { mod: "FM5", desc: "高速综合" },
  { mod: "DT1", desc: "瞄准底力" },
  { mod: "DT2", desc: "耐力底力" },
  { mod: "DT3", desc: "爆发底力" },
  { mod: "DT4", desc: "高 AR 底力" },
  { mod: "HD1–3", desc: "任意具备 HD 模组特色的谱面" },
  { mod: "HR1–3", desc: "任意具备 HR 模组特色的谱面" },
];

// ---------------------------------------------------------------------------
// 赛程
// ---------------------------------------------------------------------------

export const ROUNDS: RoundDef[] = [
  {
    key: "swiss",
    name: "瑞士轮",
    nameEn: "QF · Swiss",
    stars: "6.6 – 6.8★",
    ban: 1,
    pool: "17 枚棋子",
    note: "暂定",
  },
  {
    key: "sf",
    name: "半决赛",
    nameEn: "Semifinals",
    stars: "7.0★",
    ban: 2,
    pool: "18 枚棋子",
    note: "暂定",
  },
  {
    key: "f",
    name: "决赛",
    nameEn: "Finals",
    stars: "7.2★",
    ban: 2,
    pool: "18 枚棋子",
    note: "暂定",
  },
  {
    key: "gf",
    name: "总决赛",
    nameEn: "Grand Finals",
    stars: "7.5★",
    ban: 2,
    pool: "18 枚棋子",
    note: "暂定",
  },
];

// ---------------------------------------------------------------------------
// 连对 / 获胜
// ---------------------------------------------------------------------------

export const LINES = [
  { name: "二连对", n: 2, desc: "同方赢棋横向或纵向边靠边连续 2 次（无斜向判定）。" },
  { name: "三连对", n: 3, desc: "同方赢棋边靠边横向、纵向或对角连续 3 次。" },
  { name: "四连对", n: 4, desc: "同方赢棋横向、纵向或对角连续 4 次 —— 立即获胜。" },
];

// ---------------------------------------------------------------------------
// 夺棋
// ---------------------------------------------------------------------------

export const ROBBERY_RULES = [
  {
    title: "夺取对方赢棋",
    cost: "牺牲己方一个三连；或依次牺牲两个二连",
    condition: "被夺之棋须能立即加入己方的某个三连对",
  },
  {
    title: "夺取白子",
    cost: "牺牲己方一个二连",
    condition: "被夺之棋须能立即加入己方的某个二连对",
  },
];

// ---------------------------------------------------------------------------
// 计时器
// ---------------------------------------------------------------------------

export const TIMERS = [
  { action: "BAN 一张图", time: "60s + 15s" },
  { action: "夺棋 + PICK 一张图", time: "90s + 30s" },
  { action: "设置一颗赢棋", time: "20s + 10s" },
  { action: "TB 前准备", time: "90s" },
  { action: "双方 ROLL 点", time: "不计时" },
];

// ---------------------------------------------------------------------------
// 队伍 / 赛制
// ---------------------------------------------------------------------------

export const TEAMS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export const TIERS = [
  { name: "Tier I", range: "BWS #1 – #8", role: "1 号位" },
  { name: "Tier II", range: "BWS #9 – #16", role: "2 号位" },
  { name: "Tier III", range: "BWS #17 – #24", role: "3 号位" },
  { name: "Tier IV", range: "BWS #25 – #32", role: "4 号位" },
  { name: "Tier V", range: "BWS #33 – ∞", role: "选秀位（5–8 号）" },
];

export const DRAFT_ROUNDS = [
  "A → B → C → D → E → F → G → H",
  "H → G → F → E → D → C → B → A",
  "A → B → C → D → E → F → G → H",
  "H → G → F → E → D → C → B → A",
];

// ---------------------------------------------------------------------------
// 奖品
// ---------------------------------------------------------------------------

export const PRIZE_TIERS: PrizeTier[] = [
  {
    tier: "冠军",
    emoji: "👑",
    title: "冠军队伍奖品",
    items: [
      "瓜分二次元玩偶奖池（16 款，或兑换 1 个月 osu!supporter）",
      "队长/策略师另有 1 个月 osu!supporter",
      "全员定制 banner",
    ],
  },
  {
    tier: "亚军",
    emoji: "🥈",
    title: "亚军队伍奖品",
    items: [
      "瓜分冠军挑剩的玩偶",
      "其余成员每人 1 个月 osu!supporter",
      "全员定制 banner",
    ],
  },
  {
    tier: "季军",
    emoji: "🥉",
    title: "季军队伍奖品",
    items: [
      "瓜分亚军队挑剩的玩偶（如有）",
      "其余成员每人 1 个月 osu!supporter",
      "全员定制 banner",
    ],
  },
];

export const PLUSHIES = [
  "雪未来 2023",
  "初音未来·秋日郊游",
  "流萤",
  "爱莉希雅",
  "叶瞬光",
  "菊雪莉",
  "芙宁娜",
  "若叶睦（Ave Mujica）",
  "菲比",
  "丛雨",
  "初音未来睡眠公仔",
  "水星野",
  "一姬（挂件）",
  "八木唯（挂件）",
  "辉夜姬（挂件）",
  "月间八千代（挂件）",
];

export const STAFF_PRIZES = [
  { role: "直播 / 裁判", rewards: "1 个月 osu!supporter + 定制 banner" },
  { role: "定制图制作", rewards: "定制 banner + 定制图 banner" },
  { role: "选图 / 程序 / 美工 / 其他", rewards: "定制 banner" },
];

// ---------------------------------------------------------------------------
// 背景故事
// ---------------------------------------------------------------------------

export const CHARACTERS = [
  {
    name: "安烛",
    alias: "烛",
    age: 17,
    trait: "红色短发 · 金黄色瞳",
    desc: "原型是红掌花，喜阳光不耐阴。干得了体力活，总把希望挂在嘴边。",
    accent: "#e5483f",
  },
  {
    name: "花白",
    alias: "花白",
    age: 16,
    trait: "白色短发 · 金黄色瞳",
    desc: "原型是白掌花，耐阴却见不得直射阳光。看淡生死，喜欢修东西、搞科研。",
    accent: "#f2e9ed",
  },
];

export const STORY = {
  title: "序 · 核冬天开始的第 165 天",
  paragraphs: [
    "地下室的储备已几乎全部耗尽，来自不知名回收站的电机也在这一天完成了它的使命。寒冷的清晨，烛醒得比往常都要早——也是她发现，她们短暂的家已经不再适合居住。",
    "她摇了摇沙发上还在睡觉的花白，对她说：是时候去到外面了。",
    "而外面的世界是未知的。她们牢牢地宅在家里度过了 165 天，甚至 165 天前的那一天究竟发生了什么，她们也不清楚。只是当她们醒来时，通往地上的楼梯间传来砸门与夯地的巨大声响。她们想，应该是电视里说的那个来了，于是封死了通道，不再出门。",
    "但现在不出门也不行了。花白捧着一副棋——这个家脏兮兮的，这副棋盘却很干净。谁发明的已不可考，却是她们平日里唯一用来打发时间的好东西。",
    "纹丝不动的大门终于从里面被打开。天上飘着白色的尘与雪。就这样，两个女孩一头扎进了一个对很多人来说，已经消逝了的世界。",
  ],
  tagline: "在核冬天里下一盘棋。",
};

export const THEME_NOTE =
  "主题色取自这个世界：烬红是烛、雪白是花白、金黄是两人的瞳色也是核武的警戒色，灰黑是核尘，深绿是她们褪色的羽绒服。";

/* SCUT 工作台 · 在线版演示种子数据（脱敏虚构） */
export const DEMO_ACCOUNT = { email: "demo@scut.edu.cn", password: "Demo#2026" };

export const DEMO = {
  org: { name: "2026级计算机类1班", type: "class" },
  user: { name: "演示同学", sid: "202600000000", className: "2026级计算机类1班", campus: "大学城校区", termStart: "2026-08-31" },

  memberships: [
    { role: "monitor", name: "班长", org: "2026级计算机类1班", capabilities: ["own", "notice", "collect", "remind", "roster", "stats"] },
    { role: "league_secretary", name: "团支书", org: "2026级计算机类1班", capabilities: ["own", "collect", "remind", "roster", "approve", "doc"] },
    { role: "union_minister", name: "学生会部长", org: "计算机学院学生会", capabilities: ["own", "assign", "collect", "stats", "doc"] }
  ],

  periods: [
    [1, "8:50", "9:35"], [2, "9:40", "10:25"], [3, "10:40", "11:25"], [4, "11:30", "12:15"],
    [5, "14:00", "14:45"], [6, "14:50", "15:35"], [7, "15:45", "16:30"], [8, "16:35", "17:20"],
    [9, "19:00", "19:45"], [10, "19:55", "20:40"], [11, "20:50", "21:35"]
  ],

  courses: [
    { day: 1, s: 1, e: 2, name: "高等数学 A(一)", room: "A1201", weeks: "3-16" },
    { day: 1, s: 3, e: 4, name: "大学英语(一)", room: "B204", weeks: "3-16" },
    { day: 1, s: 5, e: 6, name: "体育(一)", room: "田径场", weeks: "3-16" },
    { day: 1, s: 9, e: 11, name: "计算机导论", room: "A2208", weeks: "3-12" },
    { day: 2, s: 1, e: 2, name: "线性代数与解析几何", room: "A1207", weeks: "3-16" },
    { day: 2, s: 3, e: 4, name: "高等数学 A(一)", room: "A1201", weeks: "3-16" },
    { day: 2, s: 5, e: 6, name: "C 语言程序设计", room: "A1108", weeks: "3-16" },
    { day: 2, s: 9, e: 11, name: "离散数学", room: "A3202", weeks: "3-14" },
    { day: 3, s: 1, e: 2, name: "高等数学 A(一)", room: "A1201", weeks: "3-16" },
    { day: 3, s: 3, e: 4, name: "线性代数与解析几何", room: "A1207", weeks: "3-16" },
    { day: 3, s: 5, e: 6, name: "思想道德与法治", room: "A2409", weeks: "3-16" },
    { day: 3, s: 7, e: 8, name: "C 语言程序设计", room: "A3103", weeks: "3-16" },
    { day: 3, s: 9, e: 10, name: "大学物理 B(一)", room: "A1409", weeks: "4-15" },
    { day: 4, s: 5, e: 6, name: "高等数学 A(一)", room: "A1202", weeks: "3-16" },
    { day: 4, s: 9, e: 11, name: "离散数学", room: "A2307", weeks: "3-14" },
    { day: 5, s: 1, e: 2, name: "大学英语(一)", room: "B204", weeks: "3-16" },
    { day: 5, s: 5, e: 6, name: "思想道德与法治", room: "A3408", weeks: "3-16" },
    { day: 5, s: 7, e: 8, name: "计算机导论", room: "A3303", weeks: "10-16" },
    { day: 6, s: 1, e: 2, name: "体育(一)", room: "操场", weeks: "11" }
  ],

  homework: [
    { id: "hw1", course: "高等数学 A(一)", title: "习题四 2-5、9、11", due: "2026-11-24 23:59", state: "未提交", note: "教材 P88" },
    { id: "hw2", course: "线性代数与解析几何", title: "行列式练习 第 3 组", due: "2026-11-25 23:59", state: "进行中", note: "" },
    { id: "hw3", course: "C 语言程序设计", title: "第 4 章 循环结构编程题（8 题）", due: "2026-11-26 22:00", state: "未提交", note: "OJ 提交" },
    { id: "hw4", course: "离散数学", title: "集合·关系·函数 课后题", due: "2026-11-23 23:59", state: "未提交", note: "明天截止" },
    { id: "hw5", course: "大学英语(一)", title: "Unit 3 写作练习", due: "2026-11-28 23:59", state: "进行中", note: "" },
    { id: "hw6", course: "计算机导论", title: "调研报告：AI 在学习中的应用", due: "2026-12-02 23:59", state: "未提交", note: "小组作业" },
    { id: "hw7", course: "大学物理 B(一)", title: "实验报告 一：力学基础", due: "2026-11-21 23:59", state: "已提交", note: "" }
  ],

  todos: [
    { id: "t1", date: "2026-11-22", time: "19:00", title: "离散数学课前预习：集合·关系·函数", cat: "学习", done: false, important: true },
    { id: "t2", date: "2026-11-22", time: "21:00", title: "跟进学生代表材料：还差 2 人", cat: "团务", done: false, important: false },
    { id: "t3", date: "2026-11-23", time: "23:59", title: "离散数学课后题提交", cat: "学习", done: false, important: true },
    { id: "t4", date: "2026-11-23", time: "18:00", title: "班委例会：汇总本周收集进度", cat: "团务", done: false, important: false },
    { id: "t5", date: "2026-11-24", time: "23:59", title: "高等数学习题四提交", cat: "学习", done: false, important: true },
    { id: "t6", date: "2026-11-25", time: "10:00", title: "评优名单汇总", cat: "团务", done: false, important: false },
    { id: "t7", date: "2026-11-26", time: "22:00", title: "C 语言第 4 章 OJ 作业", cat: "学习", done: false, important: false },
    { id: "t8", date: "2026-11-22", time: "08:30", title: "取快递", cat: "生活", done: true, important: false },
    { id: "t9", date: "2026-11-24", time: "14:00", title: "去图书馆还书", cat: "生活", done: false, important: false },
    { id: "t10", date: "2026-11-27", time: "20:00", title: "社团活动：技术分享会", cat: "生活", done: false, important: false },
    { id: "t11", date: "2026-11-28", time: "23:59", title: "大学英语 Unit 3 写作", cat: "学习", done: false, important: false },
    { id: "t12", date: "2026-11-22", time: "12:30", title: "整理本周课堂笔记", cat: "学习", done: false, important: false }
  ],

  notices: [
    { id: "n1", title: "关于 2026 年秋季学期期中教学检查的通知", source: "学院", body: "本周开展期中教学检查，请各班学委配合收集课堂反馈。", time: "11-22 09:10", read: false },
    { id: "n2", title: "高等数学 期中考试安排", source: "学院", body: "第 12 周周四 19:00，地点另行通知，请提前复习。", time: "11-21 16:40", read: false },
    { id: "n3", title: "班级团日活动报名", source: "班委", body: "本周六下午团日活动，请各位同学在群接龙报名。", time: "11-21 10:20", read: false },
    { id: "n4", title: "学生会招新面试通知", source: "学生会", body: "面试时间 11-25 晚 19:00，地点 B301，请提前 10 分钟到场。", time: "11-20 20:15", read: true },
    { id: "n5", title: "图书馆闭馆时间调整", source: "学院", body: "自本周起，图书馆周末闭馆时间调整为 21:00。", time: "11-20 08:00", read: true },
    { id: "n6", title: "编程社团技术分享会", source: "社团", body: "主题：从零做一个校园工作台。周五晚 20:00，线上会议。", time: "11-19 19:30", read: false }
  ],

  events: [
    { id: "e1", name: "高等数学 期中考试", start: "2026-12-03 19:00", place: "待定", kind: "exam" },
    { id: "e2", name: "班级团日活动", start: "2026-11-28 14:00", place: "大学城校区", kind: "activity" },
    { id: "e3", name: "离散数学作业截止", start: "2026-11-23 23:59", place: "课程中心", kind: "deadline" },
    { id: "e4", name: "学生会招新面试", start: "2026-11-25 19:00", place: "B301", kind: "activity" },
    { id: "e5", name: "编程社团分享会", start: "2026-11-27 20:00", place: "线上", kind: "activity" },
    { id: "e6", name: "C 语言实验课", start: "2026-11-24 14:00", place: "机房 A305", kind: "course" },
    { id: "e7", name: "英语四级模拟考", start: "2026-12-06 09:00", place: "教学楼", kind: "exam" },
    { id: "e8", name: "志愿服务报名截止", start: "2026-11-30 18:00", place: "线上", kind: "deadline" }
  ],

  collections: [
    { id: "c1", title: "学生代表信息收集", role: "monitor", due: "2026-11-24", fields: ["姓名", "学号", "联系方式"], total: 50, got: 48 },
    { id: "c2", title: "入团志愿书归档", role: "league_secretary", due: "2026-11-27", fields: ["姓名", "入团时间"], total: 48, got: 41 },
    { id: "c3", title: "评优材料收集", role: "league_secretary", due: "2026-11-30", fields: ["姓名", "奖项"], total: 50, got: 33 },
    { id: "c4", title: "技术分享会报名", role: "union_minister", due: "2026-11-26", fields: ["姓名", "部门"], total: 60, got: 52 }
  ],

  approvals: [
    { id: "a1", title: "入团申请 · 王同学", kind: "入团", state: "待审批", applicant: "王同学" },
    { id: "a2", title: "评优推荐 · 李同学", kind: "评优", state: "待审批", applicant: "李同学" },
    { id: "a3", title: "志愿活动报名 · 张同学", kind: "报名", state: "已通过", applicant: "张同学" }
  ],

  roster: {
    class: ["张同学", "李同学", "王同学", "赵同学", "刘同学", "陈同学", "杨同学", "黄同学", "周同学", "吴同学", "徐同学", "孙同学", "马同学", "朱同学", "胡同学", "郭同学", "何同学", "高同学", "林同学", "罗同学"],
    league: ["张同学", "李同学", "王同学", "赵同学", "刘同学", "陈同学", "杨同学", "黄同学", "周同学", "吴同学", "徐同学", "孙同学", "马同学", "朱同学", "胡同学"]
  },

  focusPresets: [
    { key: "pomodoro", name: "番茄工作法", focus: 25, short: 5, long: 15 },
    { key: "52_17", name: "52/17 法则", focus: 52, short: 17, long: 17 },
    { key: "90", name: "90 分钟法", focus: 90, short: 20, long: 20 }
  ],

  links: [
    { name: "课程中心", url: "https://ecourse.scut.edu.cn/" },
    { name: "教务系统", url: "https://xsjw2018.jw.scut.edu.cn/" },
    { name: "华南理工大学", url: "https://www.scut.edu.cn/new/" },
    { name: "雨课堂", url: "https://www.yuketang.cn/" }
  ]
};

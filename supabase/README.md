# Supabase 接入说明（切真云端时用）

本目录 `migration.sql` 是完整迁移脚本（建表 + 函数 + 触发器 + RLS + 种子）。

## 为什么现在还用 localStorage
博客那个 Supabase 只有公开 anon key，**没有 service_role key 无法程序化建表**。REST 用 anon 也不能 DDL。
所以在线版先用浏览器 localStorage，代码已按 repository 抽象，切库只改数据层。

## 三步切到真云端
1. Supabase Dashboard → SQL Editor → 粘贴 `migration.sql` 全选执行；
   - 到 Authentication 建用户 `demo@scut.edu.cn`（密码 `Demo#2026`），复制其 uuid；
   - 把 migration.sql 末尾"绑定演示用户"三行的 `DEMO_UID` 替换为真实 uuid，再执行一次。
2. 前端接 Supabase：把 `app.js` 里的 localStorage 读写换成 `supabase-js` 调用（repository 接口已定义好，逐表映射）。
3. 每日保活：GitHub Actions `schedule` 每天调一次 `select 1` 的 RPC，防止免费层 7 天不活跃被 pause。

## 已知风险
- 免费层 7 天低活跃会暂停（官方 FAQ）；保活必备。
- 单 demo 账号多人共用会互相踩数据；migration 里保留能力模型，后续可加匿名隔离。

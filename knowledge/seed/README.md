# Seed 知识库（占位示例）

V1 只交付 RAG **管线与契约**，本目录放几条**自整理示例**占位，内容等真实数据就绪后再灌入（见 `docs/requirements.md` FR-RAG-01）。

每条记录通过 frontmatter 声明 `source_name`、`source_type` 与 `copyright_status`：

- `copyright_status: usable` 才会进入核心知识库；`unknown` / `restricted` 会被过滤。
- 当前条目均标记为「玄枢示例资料（自整理）」，非古籍原文，仅用于验证检索管线。

本目录随 npm 包发布（`package.json` 的 `files`）。本地知识库优先级高于本目录，可通过 `XUAN_KNOWLEDGE_DIR` 指定。

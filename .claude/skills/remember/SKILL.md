---
name: remember
description: 更新项目 .claude/memory/ 中的进度和偏好
---

请更新当前项目的 `.claude/memory/` 目录下的 memory 文件。

1. 先读 `.claude/memory/MEMORY.md` 索引了解有哪些文件
2. 根据本轮对话中完成的工作或用户提到的新偏好，更新 `.claude/memory/project-status.md`
3. 如果发现了新的架构变化或坑（非代码可见的事实），更新 `.claude/memory/architecture.md`
4. 如果用户表达了新偏好，更新 `.claude/memory/user-prefs.md`
5. 保持简洁，每文件不超过 30 行
6. 不要添加代码结构、git 历史等能从代码里直接看到的内容——只记非显而易见的

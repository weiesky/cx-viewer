# update_goal

`update_goal` 用来把现有 goal 标记为 `complete` 或 `blocked`。

使用边界：

- 只有目标真实完成且没有剩余必要工作时，才能标记 `complete`。
- 只有同一阻塞条件连续重复达到规则要求、且无法继续取得实质进展时，才能标记 `blocked`。
- 不能把预算不足、任务较难或需要澄清本身当作完成或阻塞。

# 普通 CLI / PTY 的增加工作区入口：待纠偏

2026-11-21，用户截图显示Header只有“当前项目:cx-viewer”，缺少新建工作区“＋”。此为源码对齐缺口，与B6后端进程尚未重启是两个独立问题。此前B2已获用户验收的历史事实保留，但Header普通CLI/PTY范围恢复待纠偏，不再沿用SDK GUI通过结论。

## 实际依据

- 活动7008的`GET /api/cli-mode`返回`{"cliMode":true,"sdkMode":false,"workspaceMode":false}`，与截图中的普通项目标签吻合。没有修改该实例状态。
- `apps/web/src/App.jsx`传入`workspaceControls={this.renderSdkWorkspaces()}`。
- `apps/web/src/AppBase.jsx`的`renderSdkWorkspaces()`只在`this.state.sdkMode`为真时返回`SdkWorkspaceTabs`。
- `SdkWorkspaceTabs.jsx`内的newProject按钮才调用共享`NewProjectModal`；`AppHeader.jsx`没有workspaceControls时回退到`HeaderProjectLabel`，此分支没有“＋”。因此当前普通CLI模式即使更新到最新后端并刷新，仍不会获得该入口。
- 固定上游`74cd752d99caf122e750216d2af3bb9f467c4de1`的AppHeader调用`HeaderProjectSwitcher`，其少于两个项目分支仍渲染`HeaderProjectLabel`和`NewProjectButton`；后者仅检查onNewProject，不以sdkMode作为开关。实际读取HeaderProjectSwitcher/NewProjectButton完整分支、上游AppHeader调用及本地上述调用链。关联B2 PR #145 / `eb2e9703a2837550a9bf2a62a8bb5d20fac7f723`，不声称本次已迁入修复。

## 修复边界

原共享弹窗语义是“启动新项目、原有其他项目进程保持运行”。本地`/api/workspaces/launch`的非SDK分支仍调用全局`initForWorkspace`并启动PTY；不能只把SDK UI条件删掉、让普通模式复用SDK registry，或自动切换transport，就宣称已实现原多工作区语义。

修复前须按固定上游实际diff追完普通PTY注册、启动、视图切换与进程保留链，复用已有组件；验证当前会话保留、独立新cwd、同名实例、切回与关闭，不自行重排Header。尚未实施此修复、未重启活动进程、未替用户切换SDK。B6本身格式预览/引用的验收不受此项重新定级影响。

截图来源`/tmp/cx-viewer-uploads/image-1795258420813.png`。本轮为只读诊断及状态纠正，未把静态代码核对或SDK测试记作普通PTY GUI通过。

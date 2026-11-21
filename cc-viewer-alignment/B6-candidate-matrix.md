# B6 候选范围核验

固定上游`74cd752d99caf122e750216d2af3bb9f467c4de1`。42条主索引+12条交叉索引并集为**46条**（初期误写47已纠正）。B6范围已完成，最终验证见[完成矩阵](./B6-completion-matrix.md)。此表核销B6范围；不将B6子项完成等同整个混合提交完成。机器diff足迹只用于精确追溯，实际代码阅读/适配/验收见逐笔实施，其他工作包沿用各自证据。

| 上游完整hash | B6结论 | 证据 |
| --- | --- | --- |
| `fc68e850f23ad28a453eb5219c8113c7165086f9` | B6图像显示复用B4已核Codex图像管线；Claude JSONL normalizer不移植，其他协议/元数据仍按B3/B11 | [记录](./B4-completion-matrix.md) |
| `e4fc788b9e324c8b1604a20eac541d88bade78ec` | 复用B3已验冷读终态/渲染窗口；没有独立B6预览改动，其他子项不扩大完成 | [记录](./B3-completion-matrix.md) |
| `e12dcaded939f2d9bee67c226e03fc0aaed8d253` | B7输入/导航/对话布局或缓存候选，非B6格式预览/引用；保留B7逐笔核验，不搬整条 | [记录](./cc-viewer-alignment-plan.md) |
| `fcfef597ddaa3c754b641a13b6f989e1b83af775` | B7输入/导航/对话布局或缓存候选，非B6格式预览/引用；保留B7逐笔核验，不搬整条 | [记录](./cc-viewer-alignment-plan.md) |
| `dc1aeb28402abcaf4bc0479d343d5fccafc2e68c` | 仅研究/发布历史元数据，B11保留，不复制上游版本或研究文档作为B6实现 | [记录](./B5-cross-package-audit.md) |
| `20e6573b7c351fa710933ea58a36359fc01f4fb4` | 复用B3已验冷读终态/渲染窗口；没有独立B6预览改动，其他子项不扩大完成 | [记录](./B3-completion-matrix.md) |
| `1c5fadafbf730e1e4a0639d238809dfefd710347` | 原Task HUD及native任务协议已在B4完成，B6无新增 | [记录](./B4-completion-matrix.md) |
| `a70440ee62bf74decd27cbde976f72f94aaecc3a` | B7输入/导航/对话布局或缓存候选，非B6格式预览/引用；保留B7逐笔核验，不搬整条 | [记录](./cc-viewer-alignment-plan.md) |
| `bd50636219e086ba082ab4bb36e5c0b6a996172e` | 复用B5文件/搜索/菜单/路径/引用已验子项，B6新增预览统一dispatcher和实例链保持；混合其余包仍独立 | [记录](./B5-candidate-matrix.md) |
| `aa584229562d8a511023e10a79119424b0e56d52` | B7输入/导航/对话布局或缓存候选，非B6格式预览/引用；保留B7逐笔核验，不搬整条 | [记录](./cc-viewer-alignment-plan.md) |
| `caaab3d12fd8ea8849d4264a1b9f1ed5d15e1ec0` | B7输入/导航/对话布局或缓存候选，非B6格式预览/引用；保留B7逐笔核验，不搬整条 | [记录](./cc-viewer-alignment-plan.md) |
| `6880f77320fa163442eaa64ff6385dc46a1b69f1` | 复用B5文件/搜索/菜单/路径/引用已验子项，B6新增预览统一dispatcher和实例链保持；混合其余包仍独立 | [记录](./B5-candidate-matrix.md) |
| `865604d68e05e62aaebf8de7a04afa9a9f1e999d` | 复用B5文件/搜索/菜单/路径/引用已验子项，B6新增预览统一dispatcher和实例链保持；混合其余包仍独立 | [记录](./B5-candidate-matrix.md) |
| `365af800e58f34a57b2339cf705f56390874f20b` | 复用B5文件/搜索/菜单/路径/引用已验子项，B6新增预览统一dispatcher和实例链保持；混合其余包仍独立 | [记录](./B5-candidate-matrix.md) |
| `5aa5728b95024a2fbf9aea98f1275844a42b611f` | 复用B5文件/搜索/菜单/路径/引用已验子项，B6新增预览统一dispatcher和实例链保持；混合其余包仍独立 | [记录](./B5-candidate-matrix.md) |
| `a278d68954bc41150533177f8e1bbfec320d00a2` | 复用B5文件/搜索/菜单/路径/引用已验子项，B6新增预览统一dispatcher和实例链保持；混合其余包仍独立 | [记录](./B5-candidate-matrix.md) |
| `7830664780a5c16219edbb7e79662ad0ad27db9b` | 复用B5文件/搜索/菜单/路径/引用已验子项，B6新增预览统一dispatcher和实例链保持；混合其余包仍独立 | [记录](./B5-candidate-matrix.md) |
| `d906edb3de840208944bbca9d33ec037bdeb6bc5` | AGENTS/skill目录、target身份/编辑/管理复用B5；输入/skills展示等B7及其他混合范围保持 | [记录](./B5-completion-matrix.md) |
| `a2be00c45b71be0faf6b8bf1e1e93916b9cc1eb7` | B5文件上传/共享导入已验，composer (+)及级联输入菜单留B7，B6不重排入口 | [记录](./B5-cross-package-audit.md) |
| `3cf3e9585f9f93cb59b021a81d789c8f4ef5e528` | B5文件上传/共享导入已验，composer (+)及级联输入菜单留B7，B6不重排入口 | [记录](./B5-cross-package-audit.md) |
| `3bd2aa96961379537a8ccfb50667cab4b2335aa9` | 混合Homebrew CI及ghost输入建议，B11/B7保留，无B6独立功能 | [记录](./cc-viewer-alignment-plan.md) |
| `117ee25de22e82dd4891e98c88117a7d5c704ffe` | B7输入/导航/对话布局或缓存候选，非B6格式预览/引用；保留B7逐笔核验，不搬整条 | [记录](./cc-viewer-alignment-plan.md) |
| `1e0edc00f3992edbeb47208e7326977101344f1b` | B7输入/导航/对话布局或缓存候选，非B6格式预览/引用；保留B7逐笔核验，不搬整条 | [记录](./cc-viewer-alignment-plan.md) |
| `566ade13fc3bf2c3fd8d90044b1f36602c6980bf` | AGENTS/skill目录、target身份/编辑/管理复用B5；输入/skills展示等B7及其他混合范围保持 | [记录](./B5-completion-matrix.md) |
| `7a75e1be81b3e90f55f8888c423e66e05c1cde64` | AGENTS/skill目录、target身份/编辑/管理复用B5；输入/skills展示等B7及其他混合范围保持 | [记录](./B5-completion-matrix.md) |
| `ebfcbaec0d5dac5621dcf5f4c38ecd8481b96c64` | B7输入/导航/对话布局或缓存候选，非B6格式预览/引用；保留B7逐笔核验，不搬整条 | [记录](./cc-viewer-alignment-plan.md) |
| `dd23ce8df14dbe3522a03d3662aa5c3365d0ef37` | 复用B5文件/搜索/菜单/路径/引用已验子项，B6新增预览统一dispatcher和实例链保持；混合其余包仍独立 | [记录](./B5-candidate-matrix.md) |
| `0cbb5452887476d3838c772e9fcd04cf3d01ce63` | 复用B5文件/搜索/菜单/路径/引用已验子项，B6新增预览统一dispatcher和实例链保持；混合其余包仍独立 | [记录](./B5-candidate-matrix.md) |
| `791a5e18f8b9d6445fde737dab42e0d47d74a07e` | B7输入/导航/对话布局或缓存候选，非B6格式预览/引用；保留B7逐笔核验，不搬整条 | [记录](./cc-viewer-alignment-plan.md) |
| `d90ac9587dcd9caadee721cbbf26c43ecb5711ea` | B7输入/导航/对话布局或缓存候选，非B6格式预览/引用；保留B7逐笔核验，不搬整条 | [记录](./cc-viewer-alignment-plan.md) |
| `ff0fe1ba93defb633823eea8e9afa3d5ad065232` | B7输入/导航/对话布局或缓存候选，非B6格式预览/引用；保留B7逐笔核验，不搬整条 | [记录](./cc-viewer-alignment-plan.md) |
| `a6b82f16dff7991670ca8bdf3f01c6ae6f0d5d4b` | 复用B5文件/搜索/菜单/路径/引用已验子项，B6新增预览统一dispatcher和实例链保持；混合其余包仍独立 | [记录](./B5-candidate-matrix.md) |
| `ea995f38833b20201b47ebd2c13ec5e54e24aa95` | 复用B5文件/搜索/菜单/路径/引用已验子项，B6新增预览统一dispatcher和实例链保持；混合其余包仍独立 | [记录](./B5-candidate-matrix.md) |
| `beaa2e86f2dfa451a2044348c6c14fa874419e6f` | 复用B5文件/搜索/菜单/路径/引用已验子项，B6新增预览统一dispatcher和实例链保持；混合其余包仍独立 | [记录](./B5-candidate-matrix.md) |
| `91a523d043dbc27bd404f1cd911d2cc588847b8b` | E1原ArchivePreview/vendor/32MiB raw，E8本地文案参数适配；B11发布外壳仍独立 | [记录](./B6-implementation.md#e1) |
| `f96811cddb3f1f5516ef7823bcc2a36d142a95e3` | E1/E4共享dispatcher/PDF内置回退/图像分类；B5既有binary/UTF16保护复用 | [记录](./B6-implementation.md#e4) |
| `6dd3b3b7e55acce07fb558cd27ca7e55de5d0647` | 仅研究/发布历史元数据，B11保留，不复制上游版本或研究文档作为B6实现 | [记录](./B5-cross-package-audit.md) |
| `20313b254cffff4f8fec955b74a7b5233a0620ee` | E2原AudioPreview/Range MIME，native descriptor适配；E9真实target/admin/inode验证 | [记录](./B6-implementation.md#e2) |
| `18bd742bc50d38ce52abf9f8df89930c49b50807` | E1解析器后续修复/E3字幕/E4APNG-JFIF及MIME/引用/E8参数；分类图标复用B5 | [记录](./B6-implementation.md#e3) |
| `5fc4c752297c7df9f581c913aa2a1852a0b27a38` | 复用B5文件/搜索/菜单/路径/引用已验子项，B6新增预览统一dispatcher和实例链保持；混合其余包仍独立 | [记录](./B5-candidate-matrix.md) |
| `2e09d30192774017db5cb06d1783686c63b16031` | E5原浮动选区/quote chip/预览移除/发送，native确认与scope最小适配 | [记录](./B6-implementation.md#e5) |
| `478268a4db5aadb50be1396207b2c54093824c58` | E7原Markdown源复制、GFM/安全链接/选区范围、原依赖版本和chunk；B5已有函数体补链 | [记录](./B6-implementation.md#e7) |
| `ab1b89ee133664c9f2c0e3e17ada8711180f4dc5` | 复用B5文件/搜索/菜单/路径/引用已验子项，B6新增预览统一dispatcher和实例链保持；混合其余包仍独立 | [记录](./B5-candidate-matrix.md) |
| `1ae82a825b512a8d1fbe745e0a9a2e911f74e29f` | 仅研究/发布历史元数据，B11保留，不复制上游版本或研究文档作为B6实现 | [记录](./B5-cross-package-audit.md) |
| `9e248272640c3165f641124502e716369e961313` | PR #170合并索引：B6只对应91a/f968最终代码，禁止重复cherry-pick；自动答题B9、其他B5/B7/B8/B11混合子项保留 | [记录](./B0-commit-lineage.md) |
| `1b3c2268e3bd0e73ffef043bf450662d01a28371` | E6原Diff/KV/Ask区域、单range守卫、问答拖选不切换，保持portal排除 | [记录](./B6-implementation.md#e6) |

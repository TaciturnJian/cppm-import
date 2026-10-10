# cppm-import

为 C++ 模块文件提供 `import` 语句补全的 VS Code 扩展。

## 功能特性

- **import 后缀补全**：在 C++ 文件中输入 `import` 后，根据工作区根目录 `.vscode/cppmi.json` 中的模块字符串列表，进行忽略大小写的后缀补全。例如输入 `import cango.s` 会弹出包含 `cango.stdio` 的补全候选。
- **生成 cppmi.json**：根据根目录 `compile_commands.json` 生成 `.vscode/cppmi.json` 模块列表。
- **自动模式**：监控 `compile_commands.json` 的改动，自动重新生成并加载 `cppmi.json`。

## 命令

| 命令 | 说明 |
| --- | --- |
| `cppm-import.gen` | 从 `compile_commands.json` 生成 `cppmi.json` |
| `cppm-import.auto` | 切换自动模式：监控 `compile_commands.json` 改动并自动生成 |

## cppmi.json 格式

`cppmi.json` 为模块字符串数组，例如：

```json
[
    "cango.aes",
    "cango.aes.galois_field",
    "cango.std.CharWriter"
]
```

## 发布说明

详见 [CHANGELOG.md](CHANGELOG.md)。

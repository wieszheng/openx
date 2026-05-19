# 本地工具链（ADB / HDC）

安装包或开发运行时，会按平台查找本目录下的可执行文件；若不存在则回退到系统 `PATH` 中的 `adb` / `hdc`。

## 目录约定

将官方发布的二进制放到对应子目录（文件名需一致）：

| 平台 | ADB | HDC | AAPT |
|------|-----|-----|------|
| Windows x64 | `adb/win/adb.exe` | `hdc/win/hdc.exe` | `aapt/win/aapt.exe` |
| macOS Apple Silicon | `adb/darwin-arm64/adb` | `hdc/darwin-arm64/hdc` | `aapt/darwin-arm64/aapt` |
| macOS Intel | `adb/darwin-x64/adb` | `hdc/darwin-x64/hdc` | `aapt/darwin-x64/aapt` |
| Linux x64（可选） | `adb/linux-x64/adb` | `hdc/linux-x64/hdc` | `aapt/linux-x64/aapt` |

- **ADB**：从 [Android SDK Platform-Tools](https://developer.android.com/tools/releases/platform-tools) 解压后复制 `adb`（Windows 为 `adb.exe`）。仅复制单个可执行文件通常不够，Windows 上可能还需同目录的 `AdbWinApi.dll`、`AdbWinUsbApi.dll` 等依赖；建议将整个 `platform-tools` 目录中的依赖一并放在同一目录，或把完整 `platform-tools` 加入系统 PATH 后删除包内 adb 仅用 PATH。
- **HDC**：从华为/鸿蒙提供的 **HarmonyOS Command Line Tools** 中获取与当前系统匹配的 `hdc`（Windows 为 `hdc.exe`），放入上表路径。
- **AAPT**：从 [Android SDK Build-Tools](https://developer.android.com/tools/releases/build-tools) 对应平台目录复制 `aapt`（Windows 为 `aapt.exe`），用于解析 APK 应用名与图标。

## 环境变量覆盖（调试 / CI）

- `OPENX_ADB_PATH`：指向 `adb` / `adb.exe` 的绝对路径  
- `OPENX_HDC_PATH`：指向 `hdc` / `hdc.exe` 的绝对路径  
- `OPENX_AAPT_PATH`：指向 `aapt` / `aapt.exe` 的绝对路径  

## 打包行为

`electron-builder.yml` 已将 `resources/toolkit` 作为 `extraResources` 复制到安装目录的 `resources/toolkit`（与 `app.asar` 同级）。运行时由主进程 `toolkit-paths.ts` 解析路径。

## macOS 可执行权限

将 `adb`、`hdc` 放入 darwin 目录后若无法运行，请执行：

```bash
chmod +x adb/darwin-arm64/adb hdc/darwin-arm64/hdc
```

（按实际架构目录替换。）

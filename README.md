# 如升楼

椿的个人博客，基于 [Hexo](https://hexo.io/) + [Fluid](https://github.com/fluid-dev/hexo-theme-fluid)，托管在 GitHub Pages。

- 站点：https://cghs163.github.io
- 仓库：https://github.com/cghs163/cghs163.github.io

## 环境准备

本机 Node / Git 路径（新开 PowerShell 时执行一次）：

```powershell
. .\tools\env.ps1
```

首次克隆后安装依赖：

```powershell
npm install
```

## 日常发文

| 命令 | 作用 |
|------|------|
| `npm run new -- "文章标题"` | 在 `source/_posts/` 新建 Markdown |
| `npm run server` | 本地预览 http://localhost:4000 |
| `npm run build` | 清理并生成静态站点到 `public/` |
| `npm run deploy` | 提交全部更改并推送到 `main`（触发自动发布） |

## 上线说明

1. 在 GitHub 创建空仓库 `cghs163.github.io`（不要勾选自动添加 README）
2. 本仓库已配置 `.github/workflows/pages.yml`
3. 首次推送后，打开仓库 **Settings → Pages → Source**，选择 **GitHub Actions**
4. 等待 Actions 成功后访问 https://cghs163.github.io

## 常用配置

- 站点信息：`_config.yml`（标题、作者、网址等）
- 主题外观：`_config.fluid.yml`（导航、横幅、暗色模式、关于页等）
- 关于页正文：`source/about/index.md`
- 自定义头图：把图片放到 `source/img/`，再改 `_config.fluid.yml` 里对应的 `banner_img`

## 主题文档

- Fluid 配置指南：https://fluid.ist/docs/guide/

# 如升楼

椿的个人博客

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


| 命令                      | 作用                                                  |
| ----------------------- | --------------------------------------------------- |
| `npm run new -- "文章标题"` | 在 `source/_posts/` 新建 Markdown                      |
| `npm run server`        | 本地预览 [http://localhost:4000](http://localhost:4000) |
| `npm run build`         | 清理并生成静态站点到 `public/`                                |
| `npm run deploy`        | 提交全部更改并推送到 `main`（触发自动发布）                           |


## 上线说明

1. 仓库：[https://github.com/cghs163/cghs163.github.io（旧静态站已备份到](https://github.com/cghs163/cghs163.github.io（旧静态站已备份到) `legacy-site` 分支）
2. 本仓库已配置 `.github/workflows/pages.yml`
3. 打开仓库 **Settings → Pages → Source**，选择 **GitHub Actions**（若尚未选择）
4. 等待 Actions 成功后访问：
  - [https://cghs163.github.io](https://cghs163.github.io)
  - 自定义域名：[https://cghs.eu.org（`source/CNAME`](https://cghs.eu.org（`source/CNAME`) 已保留）

若自定义域名失效，在 Pages 设置中确认 Custom domain 仍为 `cghs.eu.org`，并按需开启 Enforce HTTPS。

## 本地快速改外观 / 内容

改完后执行 `npm run server` 预览，满意再 `npm run deploy` 上线。


| 想改什么       | 改哪个文件                                                                                       | 关键字段 / 位置                                       |
| ---------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 站点标题、作者、简介 | `[_config.yml](_config.yml)`                                                                | `title` / `author` / `description` / `subtitle` |
| 顶部菜单       | `[_config.fluid.yml](_config.fluid.yml)`                                                    | `navbar.menu`（增删一行即可；可用 `name` 自定义显示名）          |
| 导航栏站名      | `[_config.fluid.yml](_config.fluid.yml)`                                                    | `navbar.blog_title`                             |
| 首页背景图      | 图片放到 `source/img/`，再改 `[_config.fluid.yml](_config.fluid.yml)`                              | `index.banner_img`（如 `/img/my-bg.jpg`）          |
| 其他页背景      | 同上                                                                                          | `archive.banner_img` / `about.banner_img` 等     |
| 首页打字机文案    | `[_config.fluid.yml](_config.fluid.yml)`                                                    | `index.slogan.text`                             |
| 页脚文字       | `[_config.fluid.yml](_config.fluid.yml)`                                                    | `footer.content`（已去掉 Hexo / Fluid 链接）           |
| 关于页介绍      | `[_config.fluid.yml](_config.fluid.yml)` + `[source/about/index.md](source/about/index.md)` | `about.name` / `about.intro`；正文写在 about 的 md 里  |
| 写文章        | `source/_posts/*.md`                                                                        | `npm run new -- "标题"` 新建                        |


换背景示例：把图片复制为 `source/img/banner.jpg`，然后：

```yaml
# _config.fluid.yml → index
banner_img: /img/banner.jpg
```

菜单示例（加一项「友链」）：

```yaml
menu:
  - { key: "home", link: "/", icon: "iconfont icon-home-fill" }
  - { key: "archive", link: "/archives/", icon: "iconfont icon-archive-fill" }
  - { key: "about", link: "/about/", icon: "iconfont icon-user-fill" }
  - { key: "links", name: "友链", link: "/links/", icon: "iconfont icon-link-fill" }
```



## 主题文档

- Fluid 配置指南：[https://fluid.ist/docs/guide/](https://fluid.ist/docs/guide/)


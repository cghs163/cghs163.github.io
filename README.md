# 如升楼

椿的个人博客，有你在的雨也香甜！

## 推荐：用 Obsidian 写文章（插图最省事）

本仓库根目录已配置为 Obsidian 仓库（`.obsidian/`）。

| 本地（Obsidian） | 线上（Hexo） |
|------------------|--------------|
| 文章：`source/_posts/*.md` | 同样路径发布为博文 |
| 图片库：`source/img/library/` | 访问路径 `/img/library/文件名` |
| 写法：`![[照片.png]]` | 自动转为网站图片 |
| Callout：`> [!tip]` | 上线保留提示框样式 |

### 第一次使用

1. Obsidian →「打开本地仓库」→ 选 `E:\download_doc\blog`  
   或执行：`npm run obsidian`
2. 设置 → 核心插件 → 打开 **模板**，模板文件夹应为 `source/_templates`
3. 新建笔记时可用模板 `hexo-文章`（含 Front Matter）

### 日常流程

1. 在 Obsidian 新建/编辑 `source/_posts` 下文章（务必保留开头的 `---` Front Matter）
2. 直接粘贴图片 → 自动进 `source/img/library/`，正文出现 `![[xxx.png]]`
3. 本地预览：`npm run server` → http://localhost:4000
4. 上线：`npm run deploy`

> 说明：网页整体皮肤仍是博客主题（像素风）；**正文里的图片路径、Callout、标题层级**会与 Obsidian 写作内容保持一致。Obsidian 软件自身的皮肤主题不会原样搬到网站上。

## 日常发文

| 命令 | 作用 |
|------|------|
| `npm run obsidian` | 用 Obsidian 打开本仓库 |
| `npm run new -- "文章标题"` | 也可用 Hexo 命令新建（无模板时） |
| `npm run server` | 本地预览 http://localhost:4000 |
| `npm run build` | 清理并生成静态站点到 `public/` |
| `npm run deploy` | 提交并推送到 `main`（自动发布） |


## 上线说明

1. 仓库：[https://github.com/cghs163/cghs163.github.io（旧静态站已备份到](https://github.com/cghs163/cghs163.github.io（旧静态站已备份到) `legacy-site` 分支）
2. 本仓库已配置 `.github/workflows/pages.yml`
3. 打开仓库 **Settings → Pages → Source**，选择 **GitHub Actions**（若尚未选择）
4. 等待 Actions 成功后访问：
  - [https://cghs163.github.io](https://cghs163.github.io)
  - 自定义域名：[https://cghs.eu.org（`source/CNAME](https://cghs.eu.org（`source/CNAME`)` 已保留）

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

- 主题来自Fluid，Fluid 配置指南：[https://fluid.ist/docs/guide/](https://fluid.ist/docs/guide/)


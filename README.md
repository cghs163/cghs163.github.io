# 如升楼

椿的个人博客，有你在的雨也香甜！

## 推荐：用 Obsidian 写文章（插图最省事）

Obsidian **只打开写作目录** `source/`（不是整个代码仓库），侧边栏主要是文章和图片，看不到 `node_modules`、配置文件等。

| 本地（Obsidian） | 线上（Hexo） |
|------------------|--------------|
| 文章：`_posts/*.md` | `source/_posts` 发布为博文 |
| 图片库：`img/library/` | `/img/library/文件名` |
| 写法：`![[照片.png]]` | 自动转为网站图片 |
| Callout：`> [!tip]` | 上线保留提示框样式 |

### 第一次使用

1. 先在 Obsidian 里**关掉**旧的 `blog` 根目录仓库（如果还开着）
2. 「打开本地仓库」→ 选 `E:\download_doc\blog\source`  
   或执行：`npm run obsidian`
3. 核心插件打开 **模板**，模板文件夹：`_templates`
4. 新建笔记可用模板 `hexo-文章`

侧边栏应主要看到：`_posts`、`img`、`_templates`、`about`（`css` 等已排除）。

### 日常流程

1. 在 `_posts` 写文章（保留开头 `---` Front Matter）
2. 粘贴图片 → `img/library/`，正文用 `![[xxx.png]]`（不要用 `/img/...`）
3. `npm run server` 预览 → `npm run deploy` 上线

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


---
title: 选型修订：内网 GLM + Oracle 审核网关 + OfficeCLI/Python + 开源出图现实方案
date: 2026-09-29 23:20:00
tags:
  - 离线部署
  - GLM
  - Oracle
  - 出图
categories:
  - 工程实践
index_img: /img/offline-agent-sql-gateway-architecture.png
banner_img: /img/offline-agent-sql-gateway-architecture.png
mermaid: true
---

上一篇《离线增强版 OpenCode…》是通用蓝图。按你的最新约束，本篇给出**可落地的选型修订**：数据库固定 **Oracle**；办公用 **Python 或 OfficeCLI**；对话模型用 **内网 GLM**；出图**不再首选 ComfyUI 节点图**，并如实说明「开源免费能否追上 ChatGPT / Cursor 生图」。

> 结论先说清楚：  
> **Cursor / ChatGPT 生图是云端闭源能力，无法「开源打包」到内网。**  
> 开源侧目前最接近商用观感的是 **FLUX 系开源权重**；界面上比 ComfyUI 省心的是 **SwarmUI / Forge Neo** 这类表单 UI。  
> 「效果一模一样且完全免费商用」在 2026 年仍做不到；只能做到「多数场景接近、可私有化」。

---

## 一、总栈怎么改（对照表）

| 模块 | 旧建议 | **你的约束下的新建议** |
|------|--------|------------------------|
| 大模型 | Ollama 自管 | **内网已有 GLM（OpenAI 兼容网关）**，Agent 只改 `base_url` |
| 办公 | python-docx + LibreOffice | **python-docx / openpyxl** 或 **OfficeCLI**（二选一或组合） |
| 数据库 | PostgreSQL 示例 | **Oracle + python-oracledb + EXPLAIN PLAN 网关** |
| 出图 | ComfyUI | **优先 SwarmUI 或 Forge Neo + FLUX**；ComfyUI 仅作后端可选 |

上一篇总架构图仍适用，只把「Ollama」换成「内网 GLM」，「PG」换成「Oracle」。

---

## 二、内网 GLM：怎么接到「类 OpenCode」里

智谱官方明确：可用 OpenAI SDK，只改 **API Key + base_url**。

- 官方文档：[OpenAI API 兼容（智谱）](https://docs.bigmodel.cn/cn/guide/develop/openai/introduction)

公网示例是 `https://open.bigmodel.cn/api/paas/v4/`。  
**内网私有化**时，把 `base_url` 换成你们运维提供的地址，例如：

```text
http://glm-gateway.intra.example.com:8000/v1
```

```python
from openai import OpenAI

client = OpenAI(
    api_key="内网分配的密钥",
    base_url="http://glm-gateway.intra.example.com:8000/v1",  # 问你们 GLM 管理员
)

resp = client.chat.completions.create(
    model="glm-4",  # 以内网实际模型名为准
    messages=[{"role": "user", "content": "你好"}],
)
print(resp.choices[0].message.content)
```

对接 OpenCode / Open WebUI 时同理：Provider 选 OpenAI-Compatible，填内网 `base_url`。  
OpenCode 本地/自托管模型配置思路见：[Self-hosted models](https://opencode-ai-opencode.mintlify.app/advanced/self-hosted-models)。

**你要向内网 GLM 管理员确认的 5 件事**（写进变更单）：

1. OpenAI 兼容路径是 `/v1` 还是 `/v4`  
2. 模型名字符串（如 `glm-4`、`glm-4-plus`）  
3. 是否支持 **tools / function calling**（Agent 调工具必需）  
4. 上下文长度与超时  
5. 是否允许出网（严格离线则必须纯内网推理）

若单位是「权重私有化」而非「只给 API」，常见推理引擎仍是 vLLM / SGLang（社区部署文很多，以你们信创镜像为准）。智谱兼容调用方式仍可用同一套 OpenAI SDK。

---

## 三、办公：Python 程序 或 OfficeCLI

### 3.1 Python（可控、好审计、适合模板填数）

| 格式 | 库 | 官方文档 |
|------|-----|----------|
| Word `.docx` | python-docx | [python-docx.readthedocs.io](https://python-docx.readthedocs.io/en/latest/) |
| Excel `.xlsx` | openpyxl | [openpyxl.readthedocs.io](https://openpyxl.readthedocs.io/) |

适合：**固定模板 + 查询结果灌表**（精美度靠模板，不靠模型自由发挥）。

### 3.2 OfficeCLI（更偏「Agent 一句话出稿」）

- 产品说明与对比：[OfficeCLI vs python-docx / openpyxl / LibreOffice](https://officecli.io/officecli-vs-python-docx-openpyxl-libreoffice)

定位：上层「提示词 → 可编辑办公件」；底层仍可能用到 python-docx/LibreOffice。  
内网落地前请确认：**许可证是否允许离线/商用**、是否需要外网预览功能（可关）。

### 3.3 推荐组合（务实）

```text
日常精美报告：公司 Word/Excel 模板 + python-docx/openpyxl 填数
临时演示稿：OfficeCLI（若采购/开源条款允许）
转 PDF（可选）：LibreOffice headless
  https://www.libreoffice.org/download/download/
```

---

## 四、出图：比 ComfyUI 好落地的方案 + 和 Cursor 的差距

### 4.1 先打破一个误解

| 能力 | 是否开源 | 能否离线私有化 |
|------|----------|----------------|
| Cursor GenerateImage | 否（Cursor 内置） | 否 |
| ChatGPT 生图 | 否 | 否 |
| FLUX 开源权重 + 本地 UI | 权重/工具开源（许可分档） | 能（要 GPU） |

所以：**不能**把 Cursor 生图「打包成 exe 离线用」；只能换「本地开源栈」逼近观感。

### 4.2 质量上，开源侧目前怎么选？

行业对比里，**FLUX 系**常被当作开源侧冲击 DALL·E / 商用级观感的主力（尤其真实感、文字渲染）。例如公开评测讨论：[Flux.1 vs DALL-E 3](https://www.aitooltutorials.com/flux-1-vs-dall-e-3-which-image-generator/)、[2026 开源生图模型综述](https://www.thundercompute.com/blog/best-open-source-image-generation-models)。

**许可务必自己核对**（这点比效果更重要）：

- Black Forest Labs 对 **FLUX.1 [dev]** 等权重通常区分 **非商用 / 需商业授权**；「免费开源」≠「任意商用免费」。以官网许可证为准：  
  [https://blackforestlabs.ai](https://blackforestlabs.ai) / Hugging Face 模型卡上的 License  
- **FLUX.1 [schnell]** 一类许可往往更宽松，但画质通常弱于 dev  
- 部署前做法务/采购确认，避免内网「能跑」却「不能商用」

### 4.3 UI：不想碰 ComfyUI 节点图时

{% mermaid %}
flowchart LR
  A["只要填提示词"] --> B["SwarmUI<br/>表单 UI，后端可挂 Comfy"]
  A --> C["Forge Neo<br/>类似 A1111 表单 + 支持 FLUX"]
  D["能接受节点"] --> E["ComfyUI 本体"]
{% endmermaid %}

| 方案 | 难度 | 是否适合你 | 说明与入口 |
|------|------|------------|------------|
| **SwarmUI** | 低～中 | **首选之一** | 表单界面，新模型跟进快，可避免手搭节点；社区常用作 ComfyUI 的「外壳」 |
| **Forge Neo** | 低～中 | **首选之一** | 熟悉的 WebUI 滑条界面，支持 FLUX；比原版 A1111 更适合新模型 |
| Fooocus | 很低 | 仅入门 | 极简，但维护停滞、基本停在 SDXL，**追不上** Cursor/ChatGPT 观感 |
| ComfyUI | 高 | 不推荐你作为主 UI | 能力最强，但学习与运维成本高 |

公开对比可参考：[ComfyUI / A1111 / Fooocus / Forge 选型文](https://insiderllm.com/guides/comfyui-vs-automatic1111-vs-fooocus/)、[Fooocus vs Forge](https://offlinecreator.com/compare/fooocus-vs-forge)。

**硬件现实**：要冲 FLUX 观感，常见建议是 **12GB+ 显存**（量化可压，但越低越糊/越慢）。没有合适 GPU 时，开源本地很难接近 Cursor。

### 4.4 和 Agent 集成（简单路径）

```text
编排器 → HTTP 调 SwarmUI / Forge 的生成 API
       → 取回 PNG
       → python-docx 插图 或 OfficeCLI 引用图片
```

不要让 GLM「直接画图」除非你们内网另有多模态生图服务；**文生图应是独立工具服务**。

### 4.5 若单位允许「内网商业生图 API」

若信创云已采购商用生图且**数据不出域**，画质往往更接近 ChatGPT，运维远比自建 FLUX 轻。  
这不属于开源，但常是政企最优解——与「开源免费」目标分开评估。

---

## 五、Oracle 安全网关：把上一篇规则换成 Oracle 语义

策略不变：禁 DBLink、行数分流、无害计划审核、约 1 分钟超时、SELECT 可自动、DML 人审。

### 5.1 禁 DBLink（两层）

**层 1：SQL 文本/AST**

- 拒绝含 `@dblink名`、`FROM table@link`、以及明确调用远程对象的写法  
- 解析可用 [sqlglot](https://github.com/tobymao/sqlglot)（`oracle` dialect）作辅助，再加 Oracle 特有正则  

**层 2：执行计划列**

Oracle `PLAN_TABLE` 中 **`OBJECT_NODE`** 会记录通过 database link 访问对象时的链路信息。  
官方说明见：[Using EXPLAIN PLAN](https://docs.oracle.com/cd/E11882_01/server.112/e41573/ex_plan.htm)（`OBJECT_NODE` 字段含义）。

审核逻辑：`EXPLAIN PLAN` 后若计划行出现非空远程 `OBJECT_NODE` → **拒绝**。

**层 3（库端）**：网关专用账号 **不授予** 创建/使用 DBLink 的权限；从源头减面。  
DBLink 概念：[Distributed Database Concepts](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/distributed-database-concepts.html)

### 5.2 无害执行计划（不要跑真查询）

```sql
EXPLAIN PLAN SET STATEMENT_ID = 'agent_xxx' FOR
SELECT ... ;   -- 仅分析计划，不是把业务 SELECT 跑完

SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY());
```

官方：

- [`EXPLAIN PLAN` 语法](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/EXPLAIN-PLAN.html)  
- 显示计划：`DBMS_XPLAN`（同系列文档）

用计划中的 **基数 CARDINALITY / 代价 COST** 做「是否超量 → 进人审」；阈值写在 `sql_policy.yaml`。

### 5.3 「1 分钟内完成」在 Oracle 怎么落地

PostgreSQL 的 `statement_timeout` 在 Oracle **没有同名参数**。推荐组合：

| 手段 | 作用 | 文档 |
|------|------|------|
| **python-oracledb `call_timeout`** | 客户端毫秒级超时，超时断调用 | [Connection.call_timeout](https://python-oracledb.readthedocs.io/en/latest/api_manual/connection.html) |
| **`Connection.cancel()`** | 取消长语句 | 同上 |
| **Resource Manager** | 服务端按资源取消 SQL/终止会话 | [Managing Resources with Resource Manager](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/managing-resources-with-oracle-database-resource-manager.html) |

```python
import oracledb

conn = oracledb.connect(user=..., password=..., dsn=...)
conn.call_timeout = 60_000  # 60 秒，单位毫秒
# 执行只读 SELECT；超时抛错，网关记审计
```

驱动总文档：[python-oracledb](https://python-oracledb.readthedocs.io/)

### 5.4 只读账号 + DML 人审

- 自动通道：仅 `CREATE SESSION` + 目标表 `SELECT`  
- 变更通道：独立角色，**仅审批服务**在批准后短时使用  
- 官方权限模型：[Privileges and Roles](https://docs.oracle.com/en/database/oracle/oracle-database/19/dbseg/configuring-privilege-and-role-authorization.html)

流水线与上一篇相同，只把「EXPLAIN」换成「EXPLAIN PLAN + DBMS_XPLAN」：

{% mermaid %}
flowchart TD
  Q["SQL 提交"] --> P["解析 + 禁 DBLink 文本"]
  P --> T{"SELECT?"}
  T -->|否 DML/DDL| H["管理员审批工单"]
  T -->|是| E["EXPLAIN PLAN"]
  E --> N{"计划含远程 OBJECT_NODE?"}
  N -->|是| X["拒绝"]
  N -->|否| R{"估计行数 ≤ 阈值?"}
  R -->|是| S["call_timeout=60s 执行"]
  R -->|否| V["计划人审/规则审"]
  V --> S
  H -->|批准| S2["受控执行 + 审计"]
{% endmermaid %}

---

## 六、推荐落地顺序（按你的栈重排）

1. **打通内网 GLM**（OpenAI SDK 改 base_url）→ 能聊天  
2. **搭 SQL 网关（Oracle）**：禁 link、EXPLAIN PLAN、call_timeout、DML 工单  
3. **办公工具**：模板 + python-docx；需要「一句话出稿」再评 OfficeCLI  
4. **出图**：有 GPU 则 SwarmUI/Forge Neo + FLUX（核许可证）；无 GPU 则谈内网商用生图或降级 SDXL  
5. 再把邮件 IMAP、规则引擎挂上编排器  

---

## 七、直接回答你的三句原话

1. **「办公就用 Python 或 OfficeCLI」** — 可以；精美报表优先「模板 + Python」，Agent 自由生成可加 OfficeCLI。  
2. **「离线 AI 用内网 GLM」** — 正确；不要在隔离区再强上公网 Ollama，除非 GLM 不够用。  
3. **「出图要开源免费且接近 ChatGPT/Cursor，ComfyUI 不好实现」** —  
   - 接近观感：看 **FLUX + SwarmUI/Forge Neo**；  
   - 完全等价 Cursor：**做不到**（闭源云端）；  
   - 完全免费商用：以 **FLUX 具体许可证**为准，部署前必须法务确认。

---

## 八、关键链接（本篇用到的）

1. [智谱 OpenAI API 兼容](https://docs.bigmodel.cn/cn/guide/develop/openai/introduction)  
2. [python-docx](https://python-docx.readthedocs.io/en/latest/)  
3. [openpyxl](https://openpyxl.readthedocs.io/)  
4. [OfficeCLI 对比说明](https://officecli.io/officecli-vs-python-docx-openpyxl-libreoffice)  
5. [Oracle EXPLAIN PLAN](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlrf/EXPLAIN-PLAN.html)  
6. [Using EXPLAIN PLAN（含 OBJECT_NODE）](https://docs.oracle.com/cd/E11882_01/server.112/e41573/ex_plan.htm)  
7. [python-oracledb call_timeout](https://python-oracledb.readthedocs.io/en/latest/api_manual/connection.html)  
8. [Oracle Resource Manager](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/managing-resources-with-oracle-database-resource-manager.html)  
9. [开源生图模型 2026 综述](https://www.thundercompute.com/blog/best-open-source-image-generation-models)  
10. [WebUI 选型：Comfy / Forge / Fooocus](https://insiderllm.com/guides/comfyui-vs-automatic1111-vs-fooocus/)

若你提供：**内网 GLM 的 base_url 形态（打码即可）、Oracle 版本、GPU 型号与显存**，可以再写一版「仅含配置模板与网关伪代码目录」的专篇（仍保持可考证链接、不含绕过）。

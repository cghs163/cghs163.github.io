---
title: 离线增强版 OpenCode：办公出图邮件规则与 SQL 安全审核一体实现指南
date: 2026-09-29 23:00:00
tags:
  - 离线部署
  - AI Agent
  - 数据安全
  - OpenCode
categories:
  - 工程实践
index_img: /img/offline-agent-sql-gateway-architecture.png
banner_img: /img/offline-agent-sql-gateway-architecture.png
mermaid: true
---

本文面向「要在**完全离线/内网**环境，搭一套比 OpenCode 更强的本地智能体平台」的读者：能写代码、生成精美办公稿、本地出图、收邮件、自定义规则响应，并能**高性能访问数据库**——但数据库能力必须过**安全审核闸门**（禁 DBLink、按预估数据量分流、执行计划无害评估、1 分钟超时、查询可自动放行、增删改走人审）。

![[offline-agent-sql-gateway-architecture.png]]

> **诚实边界（请先读）**  
> 1. 「小白一天装完商业级全家桶」不现实。本文给出的是**可考证组件 + 可运行参考架构 + 分阶段验收**，按阶段做，每一阶段都有官方/开源文档链接。  
> 2. 「绝对真实有效」指链接指向官方文档或可核对的开源仓库；**你的机房账号、网闸、证书、厂商授权**仍需按本单位规范自行准备。  
> 3. 数据库网关示例以 **PostgreSQL** 为主讲（官方 `EXPLAIN`/`statement_timeout` 语义清晰）；Oracle 的 DBLink、`EXPLAIN PLAN` 在对应章节给官方入口，需按方言再适配解析器。  
> 4. 本文不教绕过安全产品或越权访问生产库；默认你在**自有/授权**库上建设。

---

## 〇、目标对照：OpenCode 是什么，你要多什么

**OpenCode**（开源 AI 编码智能体，可接本地 OpenAI 兼容接口）参考：

- 项目与文档索引：[https://opencode.ai](https://opencode.ai) / GitHub 生态常见仓库 [anomalyco/opencode](https://github.com/anomalyco/opencode)  
- 自托管模型说明：[Self-hosted models（Mintlify 文档镜像）](https://opencode-ai-opencode.mintlify.app/advanced/self-hosted-models)  
- 本地模型实践笔记：[Setting Up OpenCode with Local Models](https://theaiops.substack.com/p/setting-up-opencode-with-local-models)

| 能力 | 典型 OpenCode | 本文增强目标 |
|------|----------------|--------------|
| 本地大模型 | Ollama / 兼容 API | 同左，并固化离线包 |
| 写代码/改文件 | 有 | 保留，并加工具编排 |
| 精美办公稿 | 弱/无 | python-docx / openpyxl + LibreOffice |
| 出图 | 无 | ComfyUI / SD 本地 |
| 收邮件 | 无 | IMAP 拉取 |
| 自定义规则响应 | 弱 | 规则引擎 + 审批流 |
| 数据库 | 一般靠模型直接连（危险） | **强制经 SQL 安全网关** |

---

## 一、总架构（先建立地图）

{% mermaid %}
flowchart TB
  subgraph user["用户层"]
    UI["聊天 UI<br/>Open WebUI / OpenCode CLI"]
  end
  subgraph brain["推理与编排"]
    LLM["本地 LLM<br/>Ollama / vLLM"]
    ORCH["Agent 编排器<br/>工具路由 + 规则"]
  end
  subgraph tools["能力工具箱"]
    OFF["办公生成"]
    IMG["图片生成"]
    MAIL["邮件 IMAP"]
    RULE["自定义规则"]
  end
  subgraph gate["SQL 安全网关 必经"]
    PARSE["AST 解析"]
    POL["策略引擎"]
    PLAN["EXPLAIN 审核"]
    APPR["人审队列"]
  end
  DB[("业务数据库")]
  UI --> ORCH
  ORCH --> LLM
  ORCH --> OFF
  ORCH --> IMG
  ORCH --> MAIL
  ORCH --> RULE
  ORCH -->|"唯一出口"| PARSE
  PARSE --> POL
  POL -->|小查询自动| DB
  POL -->|大查询| PLAN
  PLAN -->|通过| DB
  POL -->|DML| APPR
  APPR -->|管理员批准| DB
{% endmermaid %}

**硬规矩**：Agent **禁止**持有业务库直连账号做任意 SQL；只允许调用「SQL 安全网关」API。这与 [QueryProxy](https://queryproxy.com/)、[Querycop](https://github.com/hundkraft/querycop)、[AccessFlow](https://github.com/bablsoft/accessflow)、[database-gateway + OPA](https://github.com/kazhuravlev/database-gateway/) 等「查询审批/代理」思路一致。

---

## 二、阶段 A：离线「能对话的大脑」（1～3 天）

### A1. 联网跳板机预下载（一次）

在**有网机器**拉取镜像与模型，再 U 盘/单向网闸导入隔离区。可参考空气隔离实践仓库：

- [thunderstornX/sovereign-llm-quickstart](https://github.com/thunderstornX/sovereign-llm-quickstart)（Ollama + Open WebUI + Nginx + 审计）  
- Open WebUI 离线文档：[offline-mode.mdx](https://github.com/open-webui/docs/blob/main/docs/tutorials/maintenance/offline-mode.mdx)  
- DeepWiki 汇总：[Offline Mode and Air-Gapped Deployments](https://deepwiki.com/open-webui/docs/10.2-offline-mode-and-air-gapped-deployments)

关键环境变量（以 Open WebUI 官方教程为准）：

| 变量 | 作用 | 文档 |
|------|------|------|
| `OFFLINE_MODE=true` | 禁自动下载/版本检查 | [offline-mode.mdx](https://github.com/open-webui/docs/blob/main/docs/tutorials/maintenance/offline-mode.mdx) |
| `HF_HUB_OFFLINE=1` | Hugging Face 离线 | 同上 |
| `RAG_*_AUTO_UPDATE=false` 等 | 禁后台更新模型 | 同上 |

### A2. 本地推理：Ollama

- 安装与文档：[https://ollama.com](https://ollama.com)  
- **OpenAI 兼容接口**（给 OpenCode / Open WebUI 用）：  
  - 官方说明：[OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility)  
  - 博客原文：[ollama.com/blog/openai-compatibility](https://ollama.com/blog/openai-compatibility)  
  - Base URL 一般为：`http://127.0.0.1:11434/v1`  

**验收**：

```bash
curl http://127.0.0.1:11434/v1/models
```

能列出本地模型即通过。

### A3. 对话前端二选一（或并存）

1. **Open WebUI**（浏览器聊天 + 可挂 Agent）  
   - 文档首页：[https://docs.openwebui.com](https://docs.openwebui.com)  
   - 连接外部 Agent：[Connect an Agent](https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/connect-an-agent/index.md)  

2. **OpenCode CLI**（编码向）  
   - 配置本地 provider 指向 Ollama `/v1`（见上文 Self-hosted / Substack 教程）  
   - 工具调用相关注意：上下文窗口过小会导致工具异常，社区讨论见 [opencode#2362](https://github.com/anomalyco/opencode/issues/2362)（`OLLAMA_CONTEXT_LENGTH`、`tool_call: true`）

**本阶段完成标准**：断外网后仍能本地问答；OpenCode 或 WebUI 能打到 Ollama。

---

## 三、阶段 B：Agent 编排器（比 OpenCode「更能干活」的关键）

OpenCode 擅长代码工具链；你要的是「多工具平台」。推荐模式：

```text
用户消息 → 编排器（决定调哪些工具）→ 工具结果回填 → 模型总结
```

可选实现路径（由易到难）：

| 方案 | 说明 | 链接 |
|------|------|------|
| Open WebUI + 外部 Agent | UI 成熟，Agent 另起服务 | [Connect an Agent](https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/connect-an-agent/index.md) |
| 自写 FastAPI 工具网关 | 完全可控，适合内网合规 | FastAPI 官方：[https://fastapi.tiangolo.com](https://fastapi.tiangolo.com) |
| LangGraph / 自研状态机 | 复杂多步工作流 | LangGraph 文档：[https://langchain-ai.github.io/langgraph/](https://langchain-ai.github.io/langgraph/) |

**工具注册原则**（安全基线）：

1. 每个工具独立进程/容器，最小权限  
2. 办公/出图/邮件**不**直接碰业务库  
3. 唯一 `sql.execute` 工具 → 只指向「SQL 安全网关」  
4. 全量审计日志（谁、何时、哪工具、入参哈希、结果摘要）

---

## 四、阶段 C：精美办公软件生成

### C1. 生成 DOCX（Word）

- 官方文档：[python-docx](https://python-docx.readthedocs.io/en/latest/)  
- 能力：标题、样式、表格、插图、分页等  

示例（最小可跑）：

```python
from docx import Document
from docx.shared import Pt, Inches

doc = Document()
doc.add_heading("季度经营简报", 0)
p = doc.add_paragraph("本报告由离线智能体根据审核后的查询结果生成。")
doc.add_heading("一、核心指标", level=1)
table = doc.add_table(rows=2, cols=3)
table.style = "Table Grid"
hdr = table.rows[0].cells
hdr[0].text, hdr[1].text, hdr[2].text = "指标", "本期", "同比"
doc.save("/data/out/report.docx")
```

### C2. 生成 XLSX（Excel）

- 官方文档：[openpyxl](https://openpyxl.readthedocs.io/)  

### C3. 版式「精美」与转 PDF

纯库生成结构；**视觉成品**常用 LibreOffice 无界面转换：

```bash
soffice --headless --convert-to pdf --outdir /data/out /data/out/report.docx
```

- LibreOffice 下载：[https://www.libreoffice.org/download/download/](https://www.libreoffice.org/download/download/)  
- CLI 实践说明可参考社区整理（非官网，作操作参考）：[Convert Office to PDF with LibreOffice and Python](https://tariknazorek.medium.com/convert-office-files-to-pdf-with-libreoffice-and-python-a70052121c44)

**进阶**：用单位统一的 **Word/PPT 模板**（公司 VI），Agent 只填书签/占位符，比「从零排版」更稳、更精美。

**验收**：给定 JSON 指标 → 产出 docx + pdf，人工打开无乱码。

---

## 五、阶段 D：本地生成图片

离线出图主流路径：**Stable Diffusion 系 + ComfyUI**。

- ComfyUI 项目：[https://github.com/comfyanonymous/ComfyUI](https://github.com/comfyanonymous/ComfyUI)  
- 模型需在联网机下载后拷入 `models/checkpoints` 等目录（遵循各模型许可证）  
- Agent 侧：HTTP 调 ComfyUI API 投递工作流 JSON，取回图片路径，再嵌入 docx  

**验收**：提示词 → 本地 PNG；断外网可重复生成。

> 注意：本博客站点的 Cursor GenerateImage **不能**作为你离线内网方案；内网必须自备扩散模型栈。

---

## 六、阶段 E：接收邮件

使用标准 **IMAP**（企业邮、Exchange 常开 IMAP 或用 Graph；内网以你们邮服文档为准）。

Python 标准库：

- [`imaplib` 文档](https://docs.python.org/3/library/imaplib.html)  
- 更现代的封装可选：[aioimaplib](https://github.com/bamthomas/aioimaplib)（第三方）

最小流程：

1. 专用邮箱（只读权限更佳）  
2. 定时 `SEARCH UNSEEN` → `FETCH`  
3. 解析主题/正文/附件 → 写入编排器任务队列  
4. **附件不可执行**；Office 附件进沙箱解析  

**自定义规则响应**（示例）：

| 规则 ID | 条件 | 动作 |
|---------|------|------|
| R1 | 主题含 `[日报]` | 调办公工具生成摘要 docx |
| R2 | 发件人 ∈ 白名单且含 SQL 请求 | 把 SQL 交给网关（不直连库） |
| R3 | 其他 | 仅入库待人工 |

规则可用：

- 自研 YAML + 代码  
- 或策略引擎 [Open Policy Agent](https://www.openpolicyagent.org/docs/latest/)（与 [database-gateway](https://github.com/kazhuravlev/database-gateway/) 同类思路）

---

## 七、阶段 F：SQL 安全网关（全文核心，按你的审核条件落地）

### F0. 你的策略翻译成机器规则

| 你的要求 | 网关实现要点 |
|----------|----------------|
| 有 DBLink 的查询禁止 | AST/词法检测 `@dblink`、`DBLINK`、FDW 外部表黑名单等 → **直接拒绝** |
| 数据量在阈值内可放行 | 用 **EXPLAIN 估计行数**（不是先跑全表）与 `LIMIT` 策略；≤ 阈值且为只读 → 自动执行 |
| 超量要执行计划审核 | 进入「计划审核」队列；人工或自动规则看计划 |
| 计划审核对库无影响 | **只用 `EXPLAIN`，禁止 `EXPLAIN ANALYZE`**（后者会真正执行） |
| 查询须 1 分钟内完成 | 会话级 `statement_timeout = 60s` |
| 仅查询可自动通过 | 语句类型 ∈ `{SELECT, WITH…SELECT, EXPLAIN…}` 才可能自动 |
| 增删改走人审 | `INSERT/UPDATE/DELETE/MERGE/DDL` → 工单 + 管理员批准后执行 |

PostgreSQL 官方依据：

- **普通 `EXPLAIN` 不执行查询**；**`EXPLAIN ANALYZE` 会执行**并产生副作用可能：  
  [Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)  
- 语句超时：[`statement_timeout`](https://www.postgresql.org/docs/current/runtime-config-client.html)  

Oracle 侧对照（需另写方言适配）：

- [`EXPLAIN PLAN`](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/generating-and-displaying-execution-plans.html)  
- DBLink 概念：[Database Links](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/distributed-database-concepts.html)

开源「查询审批/代理」可对照（选型或抄架构，不必从零发明）：

- [Querycop](https://github.com/hundkraft/querycop)（PG 代理 + 审批 + 可接 Ollama 评分）  
- [QueryProxy](https://queryproxy.com/)（自托管查询审批门户）  
- [AccessFlow](https://github.com/bablsoft/accessflow)（含 dry-run / EXPLAIN）  
- [Raxis 表级白名单与结果行上限规格](https://www.raxis.io/docs/specs/v2/proxy-table-allowlists)  
- [database-gateway + OPA](https://github.com/kazhuravlev/database-gateway/)

### F1. 推荐流水线

{% mermaid %}
flowchart TD
  Q["提交 SQL"] --> P["解析 AST<br/>sqlglot / 官方驱动"]
  P --> T{"语句类型?"}
  T -->|DML/DDL| W["人审工单"]
  T -->|SELECT 类| L{"含 DBLink/禁对象?"}
  L -->|是| X["拒绝并审计"]
  L -->|否| E["EXPLAIN 无 ANALYZE"]
  E --> R{"估计行数 ≤ 阈值?"}
  R -->|是| S["SET statement_timeout=60s<br/>只读事务执行"]
  R -->|否| V["执行计划审核队列"]
  V -->|计划不通过| X
  V -->|通过| S
  W -->|管理员批准| S2["受控执行 + 强审计"]
  W -->|驳回| X
{% endmermaid %}

### F2. 解析与禁 DBLink（示意）

用 [sqlglot](https://github.com/tobymao/sqlglot)（多方言 SQL 解析，MIT）做 AST，比正则更稳：

```python
import re
import sqlglot
from sqlglot import exp

FORBIDDEN_PATTERNS = [
    re.compile(r"@\w+", re.I),          # Oracle 常见 dblink 记号（需按规范收紧）
    re.compile(r"\bdblink\b", re.I),
    re.compile(r"\bdbe_link\b", re.I),
]

READONLY = {exp.Select, exp.With}  # 再细判 With 是否仅包装 Select

def assert_no_dblink(sql: str) -> None:
    for pat in FORBIDDEN_PATTERNS:
        if pat.search(sql):
            raise PermissionError("政策禁止：检测到疑似 DBLink/远程链路语法")

def classify(sql: str, dialect: str = "postgres") -> str:
    assert_no_dblink(sql)
    trees = sqlglot.parse(sql, read=dialect)
    if len(trees) != 1:
        raise PermissionError("禁止多语句批处理")
    root = trees[0]
    if isinstance(root, exp.Select) or (
        isinstance(root, exp.With) and isinstance(root.this, exp.Select)
    ):
        return "SELECT"
    if isinstance(root, (exp.Insert, exp.Update, exp.Delete, exp.Create, exp.Drop, exp.Alter)):
        return "MUTATING"
    raise PermissionError(f"未允许的语句类型: {type(root)}")
```

> 生产环境要把「禁远程」做成：**账号级取消 DBLink/FDW 权限 + 网关双重拦截**。仅靠字符串不够。

### F3. 无害执行计划（PostgreSQL）

```python
import psycopg

# 文档：https://www.psycopg.org/psycopg3/docs/
def explain_rows_estimate(conn, sql: str) -> float:
    # 切勿加 ANALYZE —— 官方说明 ANALYZE 会真实执行
    # https://www.postgresql.org/docs/current/using-explain.html
    with conn.cursor() as cur:
        cur.execute("EXPLAIN (FORMAT JSON) " + sql)  # 仅当 sql 已判定为单条 SELECT
        plan = cur.fetchone()[0]
    # 取根节点 Plan Rows（结构随版本略有差异，需单测固定）
    return float(plan[0]["Plan"]["Plan Rows"])
```

阈值示例（写进配置，勿写死代码）：

```yaml
sql_policy:
  auto_approve_max_estimated_rows: 10000
  hard_max_result_rows: 50000          # 结果集硬截断，参考 Raxis max_result_rows 思路
  statement_timeout_ms: 60000
  allow_auto: ["SELECT"]
  require_human: ["INSERT", "UPDATE", "DELETE", "MERGE", "DDL"]
  deny: ["DBLINK", "COPY_TO_PROGRAM", "FILE_ACCESS"]
```

### F4. 1 分钟超时执行

```python
def run_select(conn, sql: str, max_rows: int):
    with conn.transaction():
        with conn.cursor() as cur:
            cur.execute("SET LOCAL statement_timeout = '60s'")
            # https://www.postgresql.org/docs/current/runtime-config-client.html
            cur.execute(sql)
            rows = cur.fetchmany(max_rows + 1)
            if len(rows) > max_rows:
                raise PermissionError("结果行数超过硬上限，已中止返回")
            cols = [d.name for d in cur.description]
            return cols, rows
```

只读保障（数据库侧）：

- 应用账号仅 `GRANT SELECT`  
- 默认事务 `SET default_transaction_read_only = on`（会话）  
- 官方权限：[GRANT](https://www.postgresql.org/docs/current/sql-grant.html)

### F5. 增删改：管理员流程

最小可行人审（内网可跑）：

1. 网关写入表 `sql_tickets(id, sql_hash, sql_text, applicant, status, reviewers…)`  
2. 管理端页面 Approve/Reject（或对接现有 OA）  
3. 批准后用**独立高权限短时凭证**执行，全程审计  
4. 可对接 Camunda / Temporal 等正式 BPM（可选）  
   - Temporal：[https://docs.temporal.io](https://docs.temporal.io)  

开源参考：Querycop / QueryProxy 的审批队列与 Slack 审批（见上文链接）。

### F6. 高性能怎么做（在安全前提下）

| 手段 | 说明 | 文档 |
|------|------|------|
| 连接池 | 网关用池化，Agent 不建千连 | [PgBouncer](https://www.pgbouncer.org/)（注意 transaction 模式会重置 `SET`，超时要用 `SET LOCAL` 包在事务内） |
| 只读副本 | 查询走副本，降低主库压力 | PostgreSQL 流复制：[High Availability](https://www.postgresql.org/docs/current/high-availability.html) |
| 结果缓存 | 相同 SQL+权限指纹短 TTL 缓存 | 自研 Redis/本地 |
| 禁止大扫描 | 强制条件、分区裁剪、索引规范 | EXPLAIN 审核卡住坏查询 |

---

## 八、推荐目录与 Compose 草图（落地骨架）

```text
offline-agent/
  docker-compose.yml
  models/                 # 预置 GGUF / SD 权重
  services/
    llm/                  # ollama
    ui/                   # open-webui
    orchestrator/         # FastAPI 编排
    tools-office/
    tools-image/
    tools-mail/
    sql-gateway/          # 本篇核心
    approval-ui/
  policies/
    sql_policy.yaml
    mail_rules.yaml
  audit/
```

空气隔离安装步骤（与 sovereign-llm / Open WebUI 离线文档对齐）：

1. 联网机 `docker pull` + `docker save` + 模型打包 + `sha256sum`  
2. 介质导入隔离区校验哈希  
3. `docker load` + `compose up`  
4. 用抓包/出口防火墙验证无外联  

---

## 九、分阶段验收清单（给小白逐步打勾）

| 阶段 | 验收标准 | 主要链接 |
|------|----------|----------|
| A | 断网可聊 | [Ollama OpenAI 兼容](https://docs.ollama.com/api/openai-compatibility)、[OWUI 离线](https://github.com/open-webui/docs/blob/main/docs/tutorials/maintenance/offline-mode.mdx) |
| B | 能调 1 个自定义工具 | [FastAPI](https://fastapi.tiangolo.com)、[OWUI Agent](https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/connect-an-agent/index.md) |
| C | 产出 docx/pdf | [python-docx](https://python-docx.readthedocs.io/en/latest/)、LibreOffice |
| D | 本地出图 | [ComfyUI](https://github.com/comfyanonymous/ComfyUI) |
| E | 拉取未读邮件并规则分流 | [imaplib](https://docs.python.org/3/library/imaplib.html) |
| F1 | DBLink SQL 被拒 | sqlglot + 库权限 |
| F2 | 小 SELECT 自动跑，>阈值进计划审 | [EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html) |
| F3 | 慢查询 60s 被杀 | [statement_timeout](https://www.postgresql.org/docs/current/runtime-config-client.html) |
| F4 | UPDATE 无批准无法执行 | Querycop/自研工单 |

---

## 十、参考链接总表（建议收藏）

### 智能体与离线

1. [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility)  
2. [Ollama OpenAI 兼容博客](https://ollama.com/blog/openai-compatibility)  
3. [Open WebUI 离线模式](https://github.com/open-webui/docs/blob/main/docs/tutorials/maintenance/offline-mode.mdx)  
4. [sovereign-llm-quickstart](https://github.com/thunderstornX/sovereign-llm-quickstart)  
5. [OpenCode 自托管模型](https://opencode-ai-opencode.mintlify.app/advanced/self-hosted-models)  
6. [Open WebUI Connect an Agent](https://github.com/open-webui/docs/blob/main/docs/getting-started/quick-start/connect-an-agent/index.md)

### 办公与出图邮件

7. [python-docx](https://python-docx.readthedocs.io/en/latest/)  
8. [openpyxl](https://openpyxl.readthedocs.io/)  
9. [LibreOffice 下载](https://www.libreoffice.org/download/download/)  
10. [ComfyUI](https://github.com/comfyanonymous/ComfyUI)  
11. [Python imaplib](https://docs.python.org/3/library/imaplib.html)

### SQL 治理与数据库官方

12. [PostgreSQL Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)  
13. [PostgreSQL statement_timeout](https://www.postgresql.org/docs/current/runtime-config-client.html)  
14. [PostgreSQL GRANT](https://www.postgresql.org/docs/current/sql-grant.html)  
15. [sqlglot](https://github.com/tobymao/sqlglot)  
16. [Querycop](https://github.com/hundkraft/querycop)  
17. [QueryProxy](https://queryproxy.com/)  
18. [AccessFlow](https://github.com/bablsoft/accessflow)  
19. [database-gateway](https://github.com/kazhuravlev/database-gateway/)  
20. [Raxis allowlist 规格](https://www.raxis.io/docs/specs/v2/proxy-table-allowlists)  
21. [Open Policy Agent](https://www.openpolicyagent.org/docs/latest/)  
22. [Oracle EXPLAIN PLAN](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/generating-and-displaying-execution-plans.html)

---

## 十一、结语

- **OpenCode 类能力** = 本地 LLM + 工具调用；离线关键是**预下载 + OFFLINE 开关 + 无外联网络**。  
- **更强**来自工具箱：办公、出图、邮件、规则，而不是盲目换更大模型。  
- **数据库**必须做成「智能体永远碰不到裸连接串」；你列的 DBLink 禁止、行数分流、无害 EXPLAIN、60 秒超时、DML 人审，都可以落成网关策略，且与 PostgreSQL 官方语义一致。  

下一步若你指定数据库引擎（只 PG / 只 Oracle / 双栈）和是否已有 OA 审批，我可以按同一架构再写一版「只含 `sql-gateway` 可运行脚手架目录 + 配置模板」专篇（仍保持防御向、可考证链接）。

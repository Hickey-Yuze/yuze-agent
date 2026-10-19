# Tabbit 运行时调用关系图（REA 静态分析）

来源：`/Applications/Tabbit Browser.app/Contents/Frameworks/Tabbit Browser Framework.framework/Versions/1.18.20.0/Resources/TabbitDance/runtime/src`（36 个 .mjs，REA 扫描 45,546 个 AST 节点、468 条 finding、1,482 条 call-flow 关系）。

## 一、调用链

```mermaid
flowchart TD
  A["agent-bridge-main.mjs<br/>扩展/CLI 入口"] -->|submit / getReceipt| B["controller.mjs<br/>BrowserRuntimeService"]
  A -->|reportAccepted| A2["回执投影"]

  B -->|taskName 幂等<br/>reused:true| B1["taskNames.get"]
  B -->|submit| C["task-runtime.mjs<br/>TaskRuntime"]
  B -->|waitMs>0| C2["waitForReceipt"]
  B -->|recoveryNextAction| B3["receiptWithRecovery"]
  B -->|投影| B4["compactReceipt<br/>{requestId, elapsedMs, value, mutationState}"]

  C -->|requestId 幂等| C1["receipts.get(requestId)<br/>存在即 clone 返回"]
  C -->|校验| C3["code 大小 / 队列 / mutation / timeout / acquisition"]
  C -->|建 receipt| C4["status:'queued'<br/>submittedAt"]
  C -->|串行入队| C5["tail.then(execute)"]
  C5 --> C6["execute 求值"]
  C6 -->|完成| C7["finish()<br/>+completedAt<br/>唤醒 waiters"]
  C6 -->|执行层| D["persistent-evaluator.mjs"]
  D --> D1["playwright-runtime.mjs"]
  D --> D2["browser-fetch.mjs"]
  D --> D3["path-safety.mjs"]
  D --> D4["png-dimensions.mjs"]
  D --> D5["playbooks.mjs"]

  B -->|CLI 投影| E["cli-command.mjs<br/>projectedEvaluation"]
  E --> F["docs.mjs<br/>常量：MAXIMUM_RECEIPT_WAIT_MS<br/>TASK_IDLE_TIMEOUT_MS<br/>DEFAULT_EVALUATION_TIMEOUT_MS"]
```

## 二、receipt 状态机

```mermaid
stateDiagram-v2
  [*] --> queued: submit(requestId)
  queued --> running: execute 开始
  running --> succeeded: 正常结束
  running --> failed: 异常（errorFields）
  running --> interrupted: 取消 / 硬超时 / 关闭
  succeeded --> [*]
  failed --> [*]
  interrupted --> [*]
```

`finish()` 是唯一出口：`Object.assign(receipt, fields, {completedAt})` → 持久化 → 唤醒该 requestId 的所有 waiter。

## 三、六条可复刻语义

| # | 语义 | 实现位置 | Yue-agent 对照 |
|---|------|----------|----------------|
| 1 | **请求级幂等**：同 requestId 重复 submit 直接返回原 receipt，不重复执行 | `task-runtime.mjs` `submit()`：`receipts.get(requestId)` 命中 → `clone(existing)` | ✅ offscreen `start()` 同 requestId 返回 `{duplicate:true}` |
| 2 | **任务级幂等**：同 taskName 复用同一任务，返回 `reused:true` | `controller.mjs` `taskNames.get(taskName)` | ✅ 会话级单任务 |
| 3 | **终态立即返回**：已是 succeeded/failed/interrupted 直接返回，不挂 waiter | `waitForReceipt()` 开头 `TERMINAL_STATUSES.has(...)` | ✅ 0.5.5 侧边栏 `completedAt + taskStatus` 判终态复位 |
| 4 | **超时 resolve 而非 reject**：到点返回当前 receipt（可能仍是 running） | `setTimeout(() => resolve(clone(current)))` | ✅ 12 秒回执兜底后回查 agentRun |
| 5 | **串行队列**：同一 TaskRuntime 的投递排队执行 | `this.tail = this.tail.then(() => execute(...))` | ✅ 后台单循环 |
| 6 | **mutationState 决定持久化**：只有可能改浏览器状态时才落盘 receipt（崩溃后可查） | `persistReceipt()`：`mutationState !== 'possible'` 直接 return | ⚠️ 本地恒落盘，仅作记录 |

## 四、错误恢复投影

`recoveryNextAction(receipt)` 按状态给出下一步：

- `queued` / `running`：**等，别重投**（"Wait for this receipt using the same request ID and task name; do not resubmit the program."）
- `failed` + `mutationState:'possible'`：可能已执行部分动作，先用只读任务核对可见状态，再考虑重试
- `failed` + `none`：程序有错，改代码换新 requestId
- `interrupted` + `taskTerminated`：硬超时已杀执行器，保留标签页，新建只读任务并 resume groupId
- `interrupted` + `possible`：同 failed 的可能已变更

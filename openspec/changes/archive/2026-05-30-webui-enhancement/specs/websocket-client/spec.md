# WebSocket Client 增强

## ADDED Requirements

### Requirement: useWebSocket 暴露新状态

WHEN 组件调用 `useWebSocket()`
THEN 返回值中包含以下新字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `isReconnecting` | `boolean` | 是否正在重连 |
| `reconnectAttempts` | `number` | 当前重连尝试次数 |
| `lastConnectedAt` | `number \| null` | 上次成功连接的时间戳 |

#### Scenario: 连接正常

WHEN WebSocket 连接正常建立并维持
THEN `isReconnecting` 为 `false`
THEN `reconnectAttempts` 为 `0`
THEN `lastConnectedAt` 为连接建立时的 `Date.now()` 值

#### Scenario: 断开重连

WHEN WebSocket 连接断开且自动重连触发
THEN `isReconnecting` 切换为 `true`
THEN `reconnectAttempts` 逐次递增（1, 2, 3, ...）
THEN `lastConnectedAt` 保持上次成功连接的时间戳不变
WHEN 重连成功
THEN `isReconnecting` 切换为 `false`
THEN `reconnectAttempts` 重置为 `0`
THEN `lastConnectedAt` 更新为新连接建立的时间戳

#### Scenario: 组件卸载

WHEN 组件卸载（`useEffect` 清理函数执行）
THEN 所有状态清理，不再更新 `isReconnecting`、`reconnectAttempts`、`lastConnectedAt`
THEN 无内存泄漏或状态残留

### Requirement: 指数退避状态暴露

WHEN `isReconnecting` 为 `true`
THEN UI 可读取 `reconnectAttempts` 计算当前退避延迟
THEN 退避公式为 `Math.min(1000 * 2 ** reconnectAttempts, 30000)` 毫秒
WHEN `reconnectAttempts` 达到最大次数（如 10 次）
THEN 不再自动重连，`isReconnecting` 切换为 `false`
THEN 触发 `onMaxRetriesReached` 回调

#### Scenario: 退避延迟展示

WHEN UI 渲染重连提示
THEN 显示 "Reconnecting... (attempt {reconnectAttempts}, next in {backoff}s)"
THEN `backoff` 根据公式实时计算并向下取整展示
WHEN `reconnectAttempts` 从 1 增长到 10
THEN 退避延迟依次为 2s, 4s, 8s, 16s, 30s, 30s, 30s, 30s, 30s, 30s

### Requirement: health-report 消息处理

WHEN WebSocket 收到 `type === 'health-report'` 的消息
THEN `useWebSocket` 解析消息体并触发 `onHealthReport` 回调
THEN 消息体遵循以下接口：

```typescript
interface HealthReportMessage {
  type: 'health-report';
  payload: {
    cpu: number;        // 0-100
    memory: number;     // 0-100
    disk: number;       // 0-100
    uptime: number;     // 秒
    timestamp: number;  // unix ms
  };
}
```

#### Scenario: 健康报告接收

WHEN 后端每 30 秒推送一条 `health-report` 消息
THEN `useWebSocket` 校验消息 `type` 为 `'health-report'`
THEN 调用 `onHealthReport(payload)` 传递解析后的数据
THEN payload 中所有数值在传入回调前不做任何变换

#### Scenario: 消息格式异常

WHEN 收到 `type === 'health-report'` 但 payload 缺少必要字段
THEN `useWebSocket` 输出 `console.warn('[WS] Malformed health-report:', raw)`
THEN 不调用 `onHealthReport`
THEN 不中断 WebSocket 连接

### Requirement: 新消息类型 TypeScript 接口

WHEN 项目中引用 WebSocket 消息类型
THEN 新增以下 TypeScript 接口定义

#### Scenario: 接口定义

```typescript
// 联合类型：所有可能收到的消息
type WSMessage =
  | TaskUpdateMessage
  | HealthReportMessage
  | ScheduleUpdateMessage
  | RecoveryStatusMessage;

// 任务更新
interface TaskUpdateMessage {
  type: 'task-update';
  payload: {
    taskId: string;
    status: TaskStatus;
    progress?: number;
    timestamp: number;
  };
}

// 健康报告
interface HealthReportMessage {
  type: 'health-report';
  payload: {
    cpu: number;
    memory: number;
    disk: number;
    uptime: number;
    timestamp: number;
  };
}

// 调度更新
interface ScheduleUpdateMessage {
  type: 'schedule-update';
  payload: {
    scheduleId: string;
    action: 'created' | 'updated' | 'deleted' | 'triggered';
    cron?: string;
    nextRun?: number;
    timestamp: number;
  };
}

// 恢复状态
interface RecoveryStatusMessage {
  type: 'recovery-status';
  payload: {
    connectionId: string;
    status: 'recovering' | 'stable' | 'failed';
    retryCount: number;
    backoffSeconds: number;
    timestamp: number;
  };
}

// 任务状态枚举
type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'scheduled'
  | 'queued'
  | 'retrying';
```

#### Scenario: 接口导入

WHEN 组件需要处理 WebSocket 消息
THEN 从 `@/types/websocket` 路径导入 `WSMessage` 及相关接口
WHEN 使用 `onMessage` 回调
THEN 回调参数类型标注为 `WSMessage`
THEN TypeScript 编译器可通过 `type` 字段进行类型收窄

```typescript
// 使用示例
import { WSMessage, HealthReportMessage } from '@/types/websocket';

function onMessage(msg: WSMessage) {
  if (msg.type === 'health-report') {
    // msg.payload 自动收窄为 HealthReportMessage['payload']
    updateHealthDashboard(msg.payload);
  }
}
```

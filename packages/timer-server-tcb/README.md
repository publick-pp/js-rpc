# timer-server-tcb

[![NPM version](https://img.shields.io/npm/v/timer-server-tcb.svg?style=flat)](https://www.npmjs.com/package/timer-server-tcb)

一个为 **小程序云开发** 设计的定时任务（Timer Trigger）自动路由框架。

属于 `js-rpc` 生态的一部分。它允许你将所有定时任务统一管理在一个云函数中，根据 `TriggerName` 自动分发到 `api/` 目录下对应的文件执行。

## ✨ 特性

-   🕰️ **统一入口**: 一个云函数处理 N 个定时任务，节省资源，管理清晰。
-   📂 **自动路由**: 根据触发器名称 (`TriggerName`) 自动加载对应文件。
-   🚀 **极简写法**: 任务文件只需直接导出一个函数。

## 📦 安装

```bash
npm install timer-server-tcb
```

## 🚀 快速开始

### 1. 目录结构

建议创建一个专门处理定时任务的云函数（例如命名为 `timerEntry`）：

```
cloudfunctions/
└── timerEntry/
    ├── api/                   <-- 存放任务逻辑
    |   ├── history_job.js     <-- 对应 config.json 里的 TriggerName
    |   └── clean_job.js       <-- 对应 config.json 里的 TriggerName
    ├── index.js               <-- 入口文件
    ├── config.json            <-- 触发器配置文件
    └── package.json
```

### 2. 编写入口文件 (`index.js`)

```javascript
const { create } = require('timer-server-tcb');

// 一行代码启动路由
exports.main = create();
```

### 3. 编写任务逻辑 (`api/history_job.js`)

**文件名必须与 `config.json` 中的 `name` 保持一致。**

直接导出一个异步函数即可：

```javascript
// 你可以使用 cloud sdk
const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

/**
 * 任务逻辑
 * @param {object} event - 包含 TriggerName, Time 等信息
 * @param {object} context - 云函数上下文
 */
module.exports = async function(event, context) {
  console.log('开始执行历史数据抓取任务...');
  
  // 1. 执行业务逻辑
  const count = await db.collection('history').count();
  
  // 2. 返回结果（会打印在云函数日志中）
  return `任务完成，当前历史记录数: ${count.total}`;
};
```

### 4. 配置定时触发器 (`config.json`)

在云函数的 `config.json` 中定义触发器：

```json
{
  "permissions": {
    "openapi": []
  },
  "triggers": [
    {
      "name": "history_job",
      "type": "timer",
      "config": "0 0 8 * * * *"
    },
    {
      "name": "clean_job",
      "type": "timer",
      "config": "0 0 2 * * * *"
    }
  ]
}
```

上传并部署云函数（记得选择“上传所有文件”），系统会根据 Cron 表达式触发，`timer-server-tcb` 会自动路由。

## 📄 开源协议

[MIT](https://opensource.org/licenses/MIT)
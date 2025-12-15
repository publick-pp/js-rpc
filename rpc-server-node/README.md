# rpc-server-node

[![NPM version](https://img.shields.io/npm/v/rpc-server-node.svg?style=flat)](https://www.npmjs.com/package/rpc-server-node)

一个 **原生 Node.js** 实现的、零依赖、零配置的 RPC 服务端框架。

它不依赖 Express 或 Koa，直接使用 Node.js 原生 `http`/`https` 模块构建。非常适合构建轻量级的后端服务、BFF 层，或者作为 React/Vue 本地开发的 API 服务器。

## ✨ 特性

-   🍃 **极轻量**: 零第三方依赖，安装即用，包体积极小。
-   ⚡️ **零配置**: 默认设置即可运行，自动路由 `api/` 目录。
-   📂 **静态托管**: 内置静态文件服务器，一行配置即可托管前端构建产物 (dist)。
-   🛡️ **中间件钩子**: 提供 `before` 和 `after` 钩子，轻松实现鉴权和日志。
-   🔐 **HTTPS 支持**: 支持传入 SSL 证书启动 HTTPS 服务。
-   🔌 **CORS 开箱即用**: 默认开启跨域支持，前端调用无障碍。

## 📦 安装

```bash
npm install rpc-server-node
```

## 🚀 快速开始

### 1. 准备目录结构

创建一个 `api` 文件夹，这是默认存放业务逻辑的地方。

```
project/
├── api/
|   └── hello.js    <-- 你的业务模块
├── index.js        <-- 启动文件
└── package.json
```

### 2. 编写业务代码 (`api/hello.js`)

```javascript
module.exports = {
  // 一个普通的异步函数
  async sayHi(name) {
    return `Hello, ${name}! form Node.js`;
  }
}
```

### 3. 启动服务 (`index.js`)

#### 方式一：极简模式 (推荐)

什么参数都不用传，默认监听 **3000** 端口。

```javascript
const { createRpcServer } = require('rpc-server-node');

// 启动服务！
// 默认监听端口: 3000
// 默认 API 目录: ./api
createRpcServer();
```

运行 `node index.js`，服务就启动了。

---

#### 方式二：进阶模式 (静态托管 + 鉴权)

如果你需要托管前端页面（如 Vue/React 打包后的 `dist`），或者需要鉴权：

```javascript
const { createRpcServer } = require('rpc-server-node');
const path = require('path');

createRpcServer({
  // 自定义端口
  port: 8080,
  
  // 开启静态文件托管 (例如托管 Vue 打包后的 dist 目录)
  // 访问 http://localhost:8080 即可看到页面
  staticDir: './dist',
  
  // 鉴权中间件
  before: async (ctx) => {
    // 获取请求头中的 Token
    const token = ctx.headers['authorization'];
    
    // 如果没有 Token 且不是登录接口，抛出 401
    // (注意：rpcAction 对应 api/xxx.js 里的方法名)
    if (!token && ctx.body.rpcAction !== 'login') {
      throw { code: '401', message: 'Unauthorized' };
    }
    
    // 你也可以在这里把用户信息挂载到 ctx.state 上
    // ctx.state.user = ...
  }
});
```

## ⚙️ 配置项详细

### `createRpcServer(options)`

| 属性 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| `port` | `number` | `3000` | 服务监听端口。 |
| `apiDirName` | `string` | `'api'` | 存放业务模块的目录名。 |
| `staticDir` | `string` | `null` | 静态文件目录路径。如果不传则不开启静态服务。 |
| `cors` | `boolean` | `true` | 是否自动开启跨域支持 (Access-Control-Allow-Origin: *)。 |
| `ssl` | `object` | `null` | HTTPS 配置 `{ key: '...', cert: '...' }`。 |
| `before` | `Function` | - | 前置钩子 `async (ctx) => {}`，常用于鉴权。 |
| `after` | `Function` | - | 后置钩子 `async (ctx, result, error) => {}`。 |

## 📖 上下文对象 (Context)

在 `before` 钩子和业务函数（通过 `this`）中，你可以访问到 `ctx`：

-   `ctx.req`: 原生 Node.js `IncomingMessage` 对象。
-   `ctx.res`: 原生 Node.js `ServerResponse` 对象。
-   `ctx.body`: 解析后的 JSON 请求体。
-   `ctx.headers`: 请求头对象。
-   `ctx.state`: 用于存放共享数据（如 `ctx.state.user`）。

## 🤝 客户端调用

推荐配合 [rpc-client-fetch](https://www.npmjs.com/package/rpc-client-fetch) 使用，完美支持 Web 和 Node 环境。

```javascript
import { createRpcClient } from 'rpc-client-fetch';

const rpc = createRpcClient({
  // 指向你的 Node 服务地址
  url: 'http://localhost:3000', 
});

// 调用 api/hello.js 中的 sayHi 方法
await rpc.hello.sayHi('World');
```

## 📄 开源协议

[MIT](LICENSE)
# rpc-server-scf

[![NPM version](https://img.shields.io/npm/v/rpc-server-scf.svg?style=flat)](https://www.npmjs.com/package/rpc-server-scf)
[![NPM downloads](https://img.shields.io/npm/dm/rpc-server-scf.svg?style=flat)](https://www.npmjs.com/package/rpc-server-scf)

一个为 **腾讯云云函数 (SCF)** 设计的、零配置、支持中间件机制的 RPC 服务端框架。

它旨在让你在 Serverless 环境下，也能拥有如同“云对象”般的开发体验。它自动处理了 API 网关的复杂报文结构，提供了优雅的 **前置拦截（鉴权）** 和 **后置处理** 机制。

配合 [rpc-client-fetch](https://www.npmjs.com/package/rpc-client-fetch) 使用，可实现 Web/App 端对云函数的丝滑调用。

## ✨ 特性

-   🚀 **零配置启动**: 自动路由 `api/` 目录下的模块，无需手动配置 API 网关路径。
-   🛡️ **中间件机制**: 提供 `before` 和 `after` 钩子，轻松实现 Token 鉴权、参数校验和统一日志。
-   🔌 **API 网关适配**: 自动解析 HTTP 请求体 (Body/Headers)，并自动封装符合网关规范的返回格式。
-   📂 **模块化**: 按文件组织业务逻辑，结构清晰，维护简单。
-   🧠 **上下文注入**: 通过 `this` 访问请求上下文 (`ctx`)，在中间件和业务函数间共享数据（如用户信息）。

## 📦 安装

在你的 SCF 云函数目录下执行：

```bash
npm install rpc-server-scf
```

## 🚀 快速开始

#### 1. 目录结构

建议的云函数目录结构：

```
scf_function/
├── api/                <-- 业务逻辑模块
|   ├── user.js
|   └── order.js
├── index.js            <-- 云函数入口
└── package.json
```

#### 2. 编写业务模块 (`api/user.js`)

```javascript
module.exports = {
  // 普通业务函数
  async getInfo(userId) {
    return { id: userId, name: 'Alice', role: 'admin' };
  },

  // 需要用到鉴权信息的函数
  async getProfile() {
    // this.state 是在 before 钩子中挂载的
    // 这种方式让业务函数极其干净，无需处理 Token 解析
    const currentUser = this.state.user;
    return { ...currentUser, extra: 'vip' };
  }
}
```

#### 3. 编写入口文件 (`index.js`)

```javascript
const { createRpcServer } = require('rpc-server-scf');

// 导出 main_handler
exports.main_handler = createRpcServer({
  // 可以在这里配置鉴权中间件 (见下文)
});
```

## 🔐 进阶：鉴权与中间件

SCF 与小程序云开发不同，它通常通过 HTTP 触发，因此**鉴权**是必须考虑的环节。`rpc-server-scf` 通过 `before` 钩子完美解决了这个问题。

### 实现 Token 鉴权拦截器

```javascript
// index.js
const { createRpcServer } = require('rpc-server-scf');
const jwt = require('jsonwebtoken'); // 假设你使用 JWT

exports.main_handler = createRpcServer({
  /**
   * 前置钩子：在业务函数执行前触发
   * @param {object} ctx - 上下文对象
   */
  before: async (ctx) => {
    // 1. 定义免登录接口白名单 (格式: 模块名.方法名)
    const whiteList = ['auth.login', 'auth.register'];
    const action = `${ctx.body.rpcModule}.${ctx.body.rpcAction}`;
    
    if (whiteList.includes(action)) {
      return; // 跳过鉴权
    }

    // 2. 获取 Token (适配各种 Header 大小写情况)
    const token = ctx.headers['authorization'] || ctx.headers['Authorization'];
    
    if (!token) {
      // 抛出的错误会被框架捕获并返回给客户端
      throw { code: 'UNAUTHORIZED', message: 'Token is required' };
    }

    try {
      // 3. 验证 Token (去除 Bearer 前缀)
      const decoded = jwt.verify(token.replace('Bearer ', ''), 'YOUR_SECRET_KEY');
      
      // 4. 将用户信息挂载到 ctx.state
      // 之后的业务函数可以通过 this.state.user 访问
      ctx.state.user = decoded;
      
    } catch (err) {
      throw { code: 'INVALID_TOKEN', message: 'Token is invalid' };
    }
  }
});
```

## 📖 上下文对象 (Context)

在 `before` 钩子和业务函数（通过 `this`）中，你可以访问到同一个上下文对象 `ctx`：

| 属性 | 说明 |
| :--- | :--- |
| `ctx.event` | 原始的 SCF Event 对象 |
| `ctx.scfContext` | 原始的 SCF Context 对象 |
| `ctx.headers` | 解析后的请求头 (Object) |
| `ctx.body` | 解析后的请求体 (Object) |
| `ctx.state` | **推荐**。用于存放中间件产生的数据（如用户信息），在整个链路中共享。 |

## ⚙️ 配置项

### `createRpcServer(options)`

-   `options.apiDirName` `<string>`: API 目录名，默认为 `'api'`。
-   `options.before` `<Function>`: 前置钩子 `async (ctx) => {}`。
-   `options.after` `<Function>`: 后置钩子 `async (ctx, result, error) => {}`。用于自定义返回结构（通常不需要设置）。

## 🤝 客户端调用

推荐配合 [rpc-client-fetch](https://www.npmjs.com/package/rpc-client-fetch) 使用，它支持动态 Header 配置，完美适配 Token 鉴权场景。

```javascript
// 前端代码示例
import { createRpcClient } from 'rpc-client-fetch';

const rpc = createRpcClient({
  endpoint: 'https://service-xxxx.tencentapigw.com/release/',
  headers: () => ({
    'Authorization': localStorage.getItem('token')
  })
});

await rpc.user.getProfile();
```

## 📄 开源协议

[MIT](LICENSE)
# rpc-client-fetch

[![NPM version](https://img.shields.io/npm/v/rpc-client-fetch.svg?style=flat)](https://www.npmjs.com/package/rpc-client-fetch)
[![NPM downloads](https://img.shields.io/npm/dm/rpc-client-fetch.svg?style=flat)](https://www.npmjs.com/package/rpc-client-fetch)

一个基于标准 **Fetch API** 的通用 RPC 客户端。

它是 RPC 生态的重要组成部分，专门为 **Web 前端 (Vue/React)**、**Node.js** 和 **React Native** 环境设计。

它让你能像调用本地函数一样，远程调用部署在 **腾讯云 SCF**、**阿里云 FC** 或 **Node.js 服务器** 上的 RPC 服务。配合 [rpc-server-scf](https://www.npmjs.com/package/rpc-server-scf) 使用，体验更佳。

## ✨ 特性

-   🌐 **全平台支持**: 完美运行于所有现代浏览器、Node.js (18+) 和 React Native 环境。
-   🔐 **智能鉴权**: 支持函数式 Headers 配置，完美解决 Token 动态获取和过期刷新问题。
-   🪄 **极致体验**: 以 `rpc.module.action(params)` 的方式调用远程 API，完全屏蔽 HTTP 细节。
-   📦 **零依赖**: 基于原生 Fetch 实现，极致轻量，无需引入 Axios 等庞大的第三方库。
-   🛡️ **统一错误处理**: 无论是网络 404/500 还是后端业务抛出的 Error，均通过标准 `try...catch` 捕获。

## 📦 安装

```bash
npm install rpc-client-fetch
```

## 🚀 快速开始

#### 1. 初始化客户端

在你的项目中创建一个 API 实例（建议放在 `src/api/rpc.js`）。

```javascript
import { createRpcClient } from 'rpc-client-fetch';

const rpc = createRpcClient({
  // 1. 设置 RPC 服务地址 (例如腾讯云 API 网关地址)
  url: 'https://service-xxxx.tencentapigw.com/release/rpc',
  
  // 2. (可选) 配置请求头
  // 强烈建议使用函数形式，这样每次请求都会重新执行，获取最新的 Token
  headers: () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }
});

export default rpc;
```

#### 2. 在组件中调用

现在，你可以在任何页面或组件中直接使用它。

```javascript
import rpc from '@/api/rpc';

async function loadUserProfile() {
  try {
    // ✨ 魔法发生的地方：就像调用本地函数一样！
    // 实际发送 POST 请求: { rpcModule: 'user', rpcAction: 'getProfile', rpcParams: [123] }
    const user = await rpc.user.getProfile(123);
    
    console.log('用户信息:', user);
    
  } catch (error) {
    // 统一捕获错误
    console.error('调用失败:', error.message);
    
    if (error.code === 'UNAUTHORIZED') {
      // 处理未登录逻辑，例如跳转登录页
      location.href = '/login';
    }
  }
}
```

## 📖 指南

### 动态 Token 鉴权

在 Web 开发中，Token 通常存储在 `localStorage` 中，且可能会在用户重新登录后发生变化。

如果将 `headers` 配置为静态对象，Token 将无法自动更新。**`rpc-client-fetch` 支持将 `headers` 配置为一个函数（甚至是异步函数）**，每次发起请求前都会执行该函数。

```javascript
const rpc = createRpcClient({
  url: '...',
  // 推荐：函数形式
  headers: async () => {
    // 你甚至可以在这里处理 Token 刷新逻辑
    let token = await getTokenFromStorage(); 
    return { 'Authorization': token };
  }
});
```

### Node.js 环境兼容 (Polyfill)

Node.js 18+ 原生支持 `fetch`。如果你在旧版本 Node.js 环境中使用，可以通过 `fetch` 选项注入 polyfill（如 `node-fetch`）。

```javascript
import nodeFetch from 'node-fetch';
import { createRpcClient } from 'rpc-client-fetch';

const rpc = createRpcClient({
  url: 'http://localhost:3000/rpc',
  fetch: nodeFetch // 注入自定义 fetch
});
```

## ⚙️ API 参考

### `createRpcClient(options)`

| 属性 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `url` | `string` | ✅ | RPC 服务的完整 URL 地址。 |
| `headers` | `object` \| `() => object` | ❌ | 请求头。推荐使用函数形式，支持返回 Promise。 |
| `fetch` | `Function` | ❌ | 自定义 fetch 实现。用于兼容性处理。 |

## 🤝 服务端配合

此客户端需要配合遵循标准 RPC 协议的服务端使用：

| 环境 | 服务端包 |
| :--- | :--- |
| **腾讯云云函数 (SCF)** | [rpc-server-scf](https://www.npmjs.com/package/rpc-server-scf) |
| **Node.js (Express/Koa)** | `rpc-server-node` (规划中) |

## 📄 开源协议

[MIT](LICENSE)
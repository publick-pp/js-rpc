# JS-RPC

> **让远程调用像本地函数一样简单。**  
> Make remote calls as simple as local functions.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**JS-RPC** 是一个专为 JavaScript 全栈生态设计的轻量级 RPC（远程过程调用）解决方案。

它打破了前端与后端的边界，通过“约定优于配置”的设计理念，让您在 小程序、Web、Node.js、UniApp 等任何 JS 运行环境中，都能享受到极致丝滑的接口调用体验。

## ⚡️ 核心亮点

- **极致轻量**: 每个子包都追求零依赖，体积小巧，拒绝臃肿。
- **零配置**: 自动路由、自动序列化，开箱即用。
- **全栈覆盖**:
  - **客户端**: 完美支持 **Web (Vue/React)**、**Node.js**、**微信小程序**、**UniApp**、**Taro**。
  - **服务端**: 支持 **微信云开发 (TCB)**、**腾讯云函数 (SCF)**、**原生 Node.js**。
- **智能鉴权**: 强大的中间件机制，轻松处理 Token 校验与拦截。
- **类型友好**: 设计逻辑清晰，易于配合 TypeScript 使用。

## 📦 生态矩阵 (Packages)

JS-RPC 采用模块化设计，您可以根据项目需求自由组合使用。

### 🟢 服务端 (Server)

| 包名                                                  | 适用场景           | 描述                                                             |
| :---------------------------------------------------- | :----------------- | :--------------------------------------------------------------- |
| **[`rpc-server-node`](./packages/rpc-server-node)**   | Node.js 原生       | 基于原生 HTTP 模块，无框架依赖，支持 Express/Koa 等环境集成。    |
| **[`rpc-server-scf`](./packages/rpc-server-scf)**     | 腾讯云云函数 (SCF) | 专为 Serverless 设计，适配 API 网关触发器，内置鉴权与响应封装。  |
| **[`rpc-server-tcb`](./packages/rpc-server-tcb)**     | 微信云开发 (TCB)   | 利用 `wx.cloud.callFunction` 原生能力，一行代码启动 RPC 服务。   |
| **[`timer-server-tcb`](./packages/timer-server-tcb)** | 微信云开发 (定时)  | 专用于处理云开发定时触发器任务，解决定时任务路由与参数传递难题。 |

### 🔵 客户端 (Client)

| 包名                                                      | 适用场景        | 描述                                                                                   |
| :-------------------------------------------------------- | :-------------- | :------------------------------------------------------------------------------------- |
| **[`rpc-client-fetch`](./packages/rpc-client-fetch)**     | Web / Node / RN | 基于标准 `Fetch API`，通用性最强，支持 React Native 和现代浏览器。                     |
| **[`rpc-client-request`](./packages/rpc-client-request)** | UniApp / 小程序 | 自动适配 `uni.request` 或 `wx.request`，完美支持 UniApp、Taro 及原生小程序 HTTP 调用。 |
| **[`rpc-client-tcb`](./packages/rpc-client-tcb)**         | 微信小程序      | 基于 `wx.cloud.callFunction`，原生云开发最佳拍档，无需 HTTP 请求。                     |

## 🚀 快速预览

### 1. 定义服务端业务 (目录与代码)

**目录结构：**

```text
my-server/
├── api/                <-- 存放业务逻辑的目录
│   └── user.js         <-- 对应客户端 rpc.user
├── index.js            <-- 服务入口
└── package.json
```

**编写业务逻辑 (`api/user.js`):**

无需任何路由配置，只需导出函数即可。

```javascript
module.exports = {
  // 1. 普通函数：客户端通过 rpc.user.getInfo(1001) 调用
  async getInfo(uid) {
    // 模拟从数据库查数据
    return { id: uid, name: 'Alice', balance: 99.9 };
  },

  // 2. 使用上下文：通过 this 访问请求信息 (Header, IP 等)
  async login(username, password) {
    const ip = this.ip; // 获取客户端 IP
    if (password !== '123456') {
      throw { code: 'AUTH_FAIL', message: '密码错误' }; // 抛出的错误会被客户端捕获
    }
    return { token: 'mock-token', loginIp: ip };
  },
};
```

### 2. 启动服务 (Node.js 示例)

在入口文件 `index.js` 中引入 SDK 即可启动。

```javascript
const { create } = require('rpc-server-node');

// 自动扫描 ./api 目录并启动 HTTP 服务
create();

console.log('RPC Server running at http://localhost:3000');
```

### 3. 客户端调用 (Web/UniApp/小程序)

客户端代码风格完全统一，就像调用本地库一样。

```javascript
// 以 Web 为例
import { create } from 'rpc-client-fetch';

const rpc = create({
  url: 'http://localhost:3000',
});

async function main() {
  try {
    // ✨ 魔法时刻：远程调用就像本地函数
    const user = await rpc.user.getInfo(1001);
    console.log(user);
    // 输出: { id: 1001, name: 'Alice', balance: 99.9 }

    // 登录操作
    const result = await rpc.user.login('tom', '123456');
  } catch (err) {
    console.error('调用出错:', err.message);
  }
}
```

## 🛠️ 安装与使用

本项目采用多包管理，具体安装和使用方式请查看各个子包的 `README` 文档。

- [Web/Node 开发指引 (rpc-client-fetch)](./packages/rpc-client-fetch)
- [UniApp/小程序 HTTP 开发指引 (rpc-client-request)](./packages/rpc-client-request)
- [微信云开发指引 (rpc-server-tcb)](./packages/rpc-server-tcb)
- [腾讯云函数指引 (rpc-server-scf)](./packages/rpc-server-scf)

## 🤝 贡献指南

欢迎提交 Issue 或 Pull Request 来改进 JS-RPC。

## 📄 开源协议

本项目基于 [MIT](LICENSE) 协议开源。

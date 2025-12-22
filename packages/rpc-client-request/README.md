# rpc-client-request

[![NPM version](https://img.shields.io/npm/v/rpc-client-request.svg?style=flat)](https://www.npmjs.com/package/rpc-client-request)

专为 **UniApp** 和 **微信小程序** 设计的 RPC 客户端。

它基于 Proxy 模式，自动适配 `uni.request` 或 `wx.request`，让你在小程序环境下也能享受到如同调用本地函数般的远程调用体验。

## ✨ 特性

- 📱 **多端适配**: 自动检测并使用 `uni.request` (UniApp) 或 `wx.request` (微信原生)。
- 🔌 **无缝替换**: API 设计与 `rpc-client-fetch` 完全一致，代码迁移成本极低。
- 🔐 **动态 Token**: 支持异步获取 Headers，完美适配小程序 `getStorage` 异步读取 Token 的场景。
- 📦 **Promise 封装**: 自动将小程序的 success/fail 回调封装为 Promise。

## 📦 安装

```bash
npm install rpc-client-request
```

## 🚀 快速开始

### 1. 在 UniApp / 小程序中初始化

建议新建一个 `api/rpc.js` 文件：

```javascript
import { create } from 'rpc-client-request';

const rpc = create({
  // 1. 设置服务端地址
  url: 'https://service-xxxx.tencentapigw.com/release/',

  // 2. 配置请求头 (支持异步函数，非常适合从 Storage 读取 Token)
  headers: async () => {
    try {
      // UniApp 示例
      const token = wx.getStorageSync('auth_token');
      // 或者微信原生示例
      // const token = wx.getStorageSync('auth_token');
      
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch (e) {
      return {};
    }
  },
  
  // 3. (可选) 超时设置等，如果需要传递给 request 的其他参数，目前版本主要接管了 method/url/data/header
});

export default rpc;
```

### 2. 页面调用

```javascript
import rpc from '@/api/rpc';

export default {
  methods: {
    async login() {
      try {
        // 直接调用服务端 api/auth.js 中的 login 方法
        const userInfo = await rpc.auth.login(this.username, this.password);
        console.log('登录成功', userInfo);
      } catch (err) {
        wx.showToast({ title: err.message, icon: 'none' });
      }
    }
  }
}
```

## ⚙️ 配置项

### `create(options)`

| 属性 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `url` | `string` | ✅ | 服务器地址 |
| `headers` | `object` \| `() => object` | ❌ | 请求头，支持返回 Promise |
| `request` | `Function` | ❌ | 自定义请求函数。默认自动使用 `uni.request` 或 `wx.request` |

### 自定义 Request 示例

如果你使用 Taro 或其他框架，或者对 request 有特殊的拦截封装，可以手动传入 `request`：

```javascript
import Taro from '@tarojs/taro';
import { create } from 'rpc-client-request';

const rpc = create({
  url: '...',
  // 适配 Taro.request
  request: (config) => Taro.request(config), 
});
```

## 🤝 服务端配合

请配合 [rpc-server-scf](https://www.npmjs.com/package/rpc-server-scf) 或 [rpc-server-node](https://www.npmjs.com/package/rpc-server-node) 使用。

## 📄 开源协议

[MIT](https://opensource.org/licenses/MIT)
/**
 * 创建一个基于 wx.request 或 uni.request 的 RPC 客户端实例。
 * 适用于 微信小程序、UniApp 等环境。
 *
 * @public
 * @param {object} options - 配置项。
 * @param {string} options.url - RPC 服务的完整地址 (如 API 网关地址)。
 * @param {object|Function} [options.headers] - 请求头。可以是对象，也可以是返回对象(或Promise)的函数。
 * @param {Function} [options.request] - (可选) 自定义的 request 函数。如果不传，自动检测 uni.request 或 wx.request。
 * @returns {Proxy} 一个 RPC 客户端代理对象。
 */
function createRpcClient(options) {
  if (!options || !options.url) {
    throw new Error('[rpc-client-request] `options.url` is required.');
  }

  // 1. 自动适配请求函数
  let requestFn = options.request;

  if (!requestFn) {
    if (typeof uni !== 'undefined' && uni.request) {
      // UniApp (通常返回 Promise，但也可能是 callback 风格，这里做 Promise 封装兼容)
      requestFn = (config) => {
        return new Promise((resolve, reject) => {
          uni.request({
            ...config,
            success: (res) => resolve(res),
            fail: (err) => reject(err),
          });
        });
      };
    } else if (typeof wx !== 'undefined' && wx.request) {
      // 微信小程序 (原生通常是 callback 风格)
      requestFn = (config) => {
        return new Promise((resolve, reject) => {
          wx.request({
            ...config,
            success: (res) => resolve(res),
            fail: (err) => reject(err),
          });
        });
      };
    } else {
      throw new Error('[rpc-client-request] No global `uni.request` or `wx.request` found. Please pass `options.request`.');
    }
  }

  return new Proxy({}, {
    get(target, moduleName) {
      if (moduleName === 'then') return undefined; // 防止 Promise 链式调用误判

      return new Proxy({}, {
        get(target, actionName) {
          return async (...params) => {
            try {
              // 2. 准备 Headers
              let customHeaders = {};
              if (typeof options.headers === 'function') {
                customHeaders = await options.headers();
              } else if (typeof options.headers === 'object') {
                customHeaders = options.headers;
              }

              const payload = {
                rpcModule: moduleName.toString(),
                rpcAction: actionName.toString(),
                rpcParams: params,
              };

              // 3. 发起请求
              // 注意：小程序/UniApp 中 header 字段通常叫 'header' 而不是 'headers'
              const res = await requestFn({
                url: options.url,
                method: 'POST',
                header: {
                  'content-type': 'application/json', // 小程序默认可能是小写
                  ...customHeaders,
                },
                data: payload,
              });

              // 4. 处理响应
              // 小程序/UniApp 的 res 结构通常是 { data: Object, statusCode: Number, ... }
              
              const statusCode = res.statusCode || res.status; // 兼容不同平台

              if (statusCode && (statusCode < 200 || statusCode >= 300)) {
                throw new Error(`HTTP Error: ${statusCode}`);
              }

              // 服务端返回的实际数据通常在 res.data 中
              const result = res.data;

              // 处理有些封装可能直接返回数据的情况
              if (!result) {
                 throw new Error('No data received from server');
              }

              if (result.success) {
                return result.data;
              } else if (result.error) {
                const error = new Error(result.error.message || 'Unknown RPC Error');
                error.code = result.error.code;
                throw error;
              } else {
                throw new Error('Unknown server response format.');
              }

            } catch (err) {
              // 可以在这里统一打印日志
              // console.error('[RPC Failed]', moduleName, actionName, err);
              throw err;
            }
          };
        },
      });
    },
  });
}

// 导出方式保持一致
export { createRpcClient };
export const create = createRpcClient;
export default createRpcClient;
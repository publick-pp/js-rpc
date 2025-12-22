/**
 * 创建一个基于 Fetch 的 RPC 客户端实例。
 * 适用于 Web、React Native、Node.js 等所有支持 Fetch API 的环境。
 *
 * @public
 * @param {object} options - 配置项。
 * @param {string} options.url - RPC 服务的完整地址 (如 API 网关地址)。
 * @param {object|Function} [options.headers] - 请求头。可以是对象，也可以是返回对象(或Promise)的函数。用于传递 Token。
 * @param {Function} [options.fetch] - (可选) 自定义的 fetch 实现。如果不传，默认使用全局 fetch。
 * @returns {Proxy} 一个 RPC 客户端代理对象。
 */
function createRpcClient(options) {
  // 修改 1: 校验改为 checking options.url
  if (!options || !options.url) {
    throw new Error('[rpc-client-fetch] `options.url` is required.');
  }

  const fetchFn = options.fetch || (typeof fetch !== 'undefined' ? fetch : null);

  if (!fetchFn) {
    throw new Error('[rpc-client-fetch] global `fetch` is not defined. Please pass a polyfill via `options.fetch`.');
  }

  return new Proxy({}, {
    get(target, moduleName) {
      if (moduleName === 'then') {
        return undefined;
      }

      return new Proxy({}, {
        get(target, actionName) {
          return async (...params) => {
            try {
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

              // 修改 2: 使用 options.url
              const response = await fetchFn(options.url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...customHeaders,
                },
                body: JSON.stringify(payload),
              });

              if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
              }

              const result = await response.json();

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
              throw err;
            }
          };
        },
      });
    },
  });
}

// 1. 原有的命名导出 (保持兼容性)
export { createRpcClient };

// 2. 统一的简写命名导出 (对应服务端 module.exports.create)
export const create = createRpcClient;

// 3. 默认导出 (对应服务端 module.exports = ...)
export default createRpcClient;
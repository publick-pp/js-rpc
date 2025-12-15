const path = require('path');

/**
 * 创建腾讯云 SCF RPC 服务
 * @param {object} [options]
 * @param {string} [options.apiDirName='api'] - API 目录名
 * @param {Function} [options.before] - 前置钩子：async (ctx) => {}
 * @param {Function} [options.after] - 后置钩子：async (ctx, result, error) => {}
 */
function createRpcServer(options = {}) {
  const apiDirName = options.apiDirName || 'api';
  const apiAbsolutePath = path.join(process.cwd(), apiDirName);

  // 默认的后置处理：适配 API 网关的返回格式
  const defaultAfter = async (ctx, result, error) => {
    // 如果有错误
    if (error) {
      console.error('[RPC Error]', error);
      return {
        isBase64Encoded: false,
        statusCode: 200, // 通常业务错误也返回 200，通过 body 里的 code 区分
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: {
            code: error.code || 'INTERNAL_ERROR',
            message: error.message || 'Internal Server Error',
          }
        }),
      };
    }

    // 如果成功
    return {
      isBase64Encoded: false,
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        data: result,
      }),
    };
  };

  const beforeHook = options.before || (async () => {});
  const afterHook = options.after || defaultAfter;

  return async (event, scfContext) => {
    // 1. 初始化上下文 ctx
    const ctx = {
      event,       // 原始 event
      scfContext,  // 原始 SCF context
      headers: {}, // 存放解析后的 headers
      body: {},    // 存放解析后的 body
      state: {},   // 用于存放鉴权后的用户信息等
    };

    let rpcModule, rpcAction, rpcParams;

    try {
      // 2. 解析请求 (处理 API 网关透传的数据)
      // 处理 Headers (注意：API网关 header 可能是大小写不敏感的，这里简单处理)
      ctx.headers = event.headers || {};
      
      // 处理 Body
      let requestBody = event.body;
      if (typeof requestBody === 'string') {
        try {
          requestBody = JSON.parse(requestBody);
        } catch (e) {
          // body 解析失败
        }
      }
      ctx.body = requestBody || {};

      // 获取 RPC 核心参数
      // 优先从 body 获取，也可以支持从 queryString 获取
      ({ rpcModule, rpcAction, rpcParams = [] } = ctx.body);

      if (!rpcModule || !rpcAction) {
        throw { code: 'INVALID_REQUEST', message: 'rpcModule and rpcAction are required' };
      }

      // 3. 执行 Before 钩子 (鉴权、拦截)
      // 如果这里 throw error，会直接跳到 catch
      await beforeHook(ctx);

      // 4. 加载模块和函数
      const modulePath = path.join(apiAbsolutePath, `${rpcModule}.js`);
      
      if (process.env.NODE_ENV !== 'production' && require.cache[require.resolve(modulePath)]) {
        delete require.cache[require.resolve(modulePath)];
      }

      const apiModule = require(modulePath);
      const apiFunction = apiModule[rpcAction];

      if (typeof apiFunction !== 'function') {
        throw { code: 'FUNCTION_NOT_FOUND', message: `Action '${rpcAction}' not found` };
      }

      // 5. 执行业务函数
      // 将 ctx 绑定为 this，让业务函数里可以通过 this.state.user 获取用户信息
      const result = await apiFunction.apply(ctx, rpcParams);

      // 6. 执行 After 钩子 (成功)
      return await afterHook(ctx, result, null);

    } catch (error) {
      // 7. 执行 After 钩子 (失败)
      return await afterHook(ctx, null, error);
    }
  };
}

module.exports = {
  createRpcServer,
};
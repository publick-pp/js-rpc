const path = require('path');

/**
 * 创建定时任务路由处理器
 * @param {object} [options]
 * @param {string} [options.apiDirName='api'] - 存放任务逻辑的目录名
 */
function createTimerHandler(options = {}) {
  const apiDirName = options.apiDirName || 'api';
  const apiAbsolutePath = path.join(process.cwd(), apiDirName);

  return async (event, context) => {
    // 1. 获取触发器名称
    // 微信云开发的定时触发器 event 结构中包含 TriggerName
    const { TriggerName } = event;

    // 容错处理：如果没有 TriggerName，说明不是定时任务触发，或者是手动调用没传参
    if (!TriggerName) {
      console.warn('[Timer] No "TriggerName" found in event. Skipped.');
      return { success: false, message: 'Not a timer event' };
    }

    console.log(`[Timer] Triggered: ${TriggerName}`);

    try {
      // 2. 动态加载对应的任务文件
      const modulePath = path.join(apiAbsolutePath, `${TriggerName}.js`);

      // 生产环境外清除缓存，方便调试
      if (process.env.NODE_ENV !== 'production') {
        try { delete require.cache[require.resolve(modulePath)]; } catch(e){}
      }

      let taskModule;
      try {
        taskModule = require(modulePath);
      } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
          throw new Error(`Timer task file not found: ${apiDirName}/${TriggerName}.js`);
        }
        throw err;
      }

      // 3. 智能获取执行函数
      // 优先支持：module.exports = async function() {} (推荐)
      // 兼容支持：module.exports = { main: async function() {} }
      let taskFunction = taskModule;
      if (typeof taskModule !== 'function') {
        if (typeof taskModule.main === 'function') {
          taskFunction = taskModule.main;
        } else if (typeof taskModule.default === 'function') {
          // 兼容 ES Module 的 default export
          taskFunction = taskModule.default;
        } else {
          throw new Error(`File ${TriggerName}.js must export a function (or object with 'main').`);
        }
      }

      // 4. 执行任务
      // 将 event 和 context 注入到 this，保持和 js-rpc 其他包一致的体验
      const ctx = { event, context };
      
      // 执行函数，传入 event 和 context 作为参数
      const result = await taskFunction.apply(ctx, [event, context]);

      console.log(`[Timer] Task ${TriggerName} completed.`);
      return { success: true, data: result };

    } catch (error) {
      console.error(`[Timer] Task ${TriggerName} failed:`, error);
      // 必须抛出错误，这样云开发控制台才会将该次执行标记为“失败”，方便告警
      throw error;
    }
  };
}

module.exports = {
  createTimerHandler,
};
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

/**
 * 简单的 MIME 类型映射
 */
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm',
};

/**
 * 创建 Node.js 原生 RPC 服务
 * @param {object} [options]
 * @param {number} [options.port=3000] - 服务端口
 * @param {string} [options.apiDirName='api'] - API 模块目录名
 * @param {string} [options.staticDir] - 静态文件目录 (可选)
 * @param {object} [options.ssl] - HTTPS 配置 { key, cert } (可选)
 * @param {boolean} [options.cors=true] - 是否开启默认 CORS (可选)
 * @param {Function} [options.before] - 前置钩子 async (ctx) => {}
 * @param {Function} [options.after] - 后置钩子 async (ctx, result, error) => {}
 */
function createRpcServer(options = {}) {
    const port = options.port || 3000;
    const apiDirName = options.apiDirName || 'api';
    const apiAbsolutePath = path.join(process.cwd(), apiDirName);
    const staticAbsolutePath = options.staticDir ? path.resolve(process.cwd(), options.staticDir) : null;
    const enableCors = options.cors !== false; // 默认开启

    const beforeHook = options.before || (async () => { });
    const afterHook = options.after || (async (ctx, res, err) => {
        if (err) return { success: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.message } };
        return { success: true, data: res };
    });

    // 请求处理主逻辑
    const requestHandler = async (req, res) => {
        // 1. 处理 CORS
        if (enableCors) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', '*');
            res.setHeader('Access-Control-Allow-Headers', '*');
            res.setHeader('Access-Control-Max-Age', '3600');
            if (req.method === 'OPTIONS') {
                res.statusCode = 204;
                res.end();
                return;
            }
        }

        // 2. 处理静态文件 (GET 请求)
        if (staticAbsolutePath && req.method === 'GET') {
            const parsedUrl = url.parse(req.url);
            let sanitizePath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, '');
            let pathname = path.join(staticAbsolutePath, sanitizePath);

            // 如果路径不存在，检查是否是一个目录，如果是目录则尝试 index.html
            // 如果路径直接是一个文件，则读取
            try {
                let stats = await fs.promises.stat(pathname);
                if (stats.isDirectory()) {
                    pathname = path.join(pathname, 'index.html');
                    stats = await fs.promises.stat(pathname); // 再次检查 index.html 是否存在
                }

                const ext = path.parse(pathname).ext;
                res.setHeader('Content-type', MIME_TYPES[ext] || 'text/plain');

                // 流式读取文件
                const stream = fs.createReadStream(pathname);
                stream.pipe(res);
                return;
            } catch (err) {
                // 文件未找到，对于 SPA 应用，可能需要 fallback 到 index.html (这里暂简单处理返回 404)
                // 除非是请求 RPC 接口，否则返回 404
                if (req.url !== '/' && req.url !== '/rpc') { // 假设 RPC 可以挂载在根路径或 /rpc
                    // 如果找不到静态文件，继续向下执行，看看是不是 RPC 请求
                }
            }
        }

        // 3. 处理 RPC 请求 (仅处理 POST)
        if (req.method === 'POST') {
            const ctx = {
                req,
                res,
                headers: req.headers,
                body: {},
                state: {}, // 用于中间件共享数据
            };

            try {
                // 读取 Body
                const buffers = [];
                for await (const chunk of req) {
                    buffers.push(chunk);
                }
                const data = Buffer.concat(buffers).toString();

                if (data) {
                    try {
                        ctx.body = JSON.parse(data);
                    } catch (e) {
                        throw { code: 'INVALID_JSON', message: 'Request body is not valid JSON' };
                    }
                }

                const { rpcModule, rpcAction, rpcParams = [] } = ctx.body;

                if (!rpcModule || !rpcAction) {
                    // 如果不是 RPC 格式的 POST，可能是其他普通 POST，这里简单返回 404
                    res.statusCode = 404;
                    res.end('Not Found');
                    return;
                }

                // --- Before Hook ---
                await beforeHook(ctx);

                // 加载模块
                const modulePath = path.join(apiAbsolutePath, `${rpcModule}.js`);
                if (process.env.NODE_ENV !== 'production') {
                    try { delete require.cache[require.resolve(modulePath)]; } catch (e) { }
                }

                let apiModule;
                try {
                    apiModule = require(modulePath);
                } catch (e) {
                    if (e.code === 'MODULE_NOT_FOUND') {
                        throw { code: 'MODULE_NOT_FOUND', message: `Module '${rpcModule}' not found` };
                    }
                    throw e;
                }

                const apiFunction = apiModule[rpcAction];
                if (typeof apiFunction !== 'function') {
                    throw { code: 'FUNCTION_NOT_FOUND', message: `Action '${rpcAction}' not found` };
                }

                // --- 执行业务 ---
                const result = await apiFunction.apply(ctx, rpcParams);

                // --- After Hook (Success) ---
                const responseData = await afterHook(ctx, result, null);

                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify(responseData));

            } catch (error) {
                console.error('[RPC Error]', error);
                // --- After Hook (Error) ---
                const responseData = await afterHook(ctx, null, error);

                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200; // 业务错误通常也返回 200，前端靠 success 字段判断
                res.end(JSON.stringify(responseData));
            }
            return;
        }

        // 4. 其他情况返回 404
        res.statusCode = 404;
        res.end(`Cannot ${req.method} ${req.url}`);
    };

    // 创建 Server
    let server;
    if (options.ssl && options.ssl.key && options.ssl.cert) {
        server = https.createServer(options.ssl, requestHandler);
    } else {
        server = http.createServer(requestHandler);
    }

    // 启动监听
    server.listen(port, () => {
        const protocol = options.ssl ? 'https' : 'http';
        console.log(`🚀 RPC Server running at ${protocol}://localhost:${port}`);
        if (options.staticDir) {
            console.log(`📂 Serving static files from: ${options.staticDir}`);
        }
    });

    return server; // 返回 server 实例，以便用户可以手动 close
}

module.exports = createRpcServer;
module.exports.create = createRpcServer;
module.exports.createRpcServer = createRpcServer;
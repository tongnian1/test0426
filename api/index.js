import { kv } from '@vercel/kv';
// 配置 Vercel 的请求体限制，防止 Base64 图片过大导致 413 Payload Too Large
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

// ================= 配置区域 =================
const FACE_API_KEY = 'dsO3p8rDxhBbSSAI5L8l2QYZWsWBBUNj';
const FACE_API_SECRET = '35LhwuV60Nca-fSVHGHjnriSZPqASxWE';
const ADMIN_SECRET = 'myboss123';

// 存邀请码的状态
// ⚠️ 重点提醒：在 Vercel 等 Serverless 环境中，这个内存变量在函数休眠（或多实例并发）时会清空。
// 如果你想真正在生产环境中持久化邀请码，建议后续接入 Vercel KV、Redis 或数据库。
const inviteDatabase = {};
// ============================================

export default async function handler(req, res) {
  // 1. 处理跨域 (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 获取请求意图：通过 url 参数区分，例如 /api/index?action=generate
  const action = req.query.action;

  // ==========================================
  // 业务逻辑 1: 生成邀请码 (Admin)
  // 调用方式: GET 或 POST /api/index?action=generate&secret=myboss123
  // ==========================================
  if (action === 'generate') {
    const secret = req.query.secret || (req.body && req.body.secret);
    if (secret !== ADMIN_SECRET) {
      return res.status(401).send('无权访问！密码错误。');
    }

    // 生成邀请码逻辑
    const code = 'INV_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    await kv.set(code, 'unused');

    const frontEndUrl = process.env.FRONTEND_URL || '';
    const shareLink = `${frontEndUrl}?code=${code}`;

    return res.status(200).json({
      message: '生成成功！',
      inviteCode: code,
      shareLink: shareLink
    });
  }

  // ==========================================
  // 业务逻辑 2: 人脸识别检测 (Detect)
  // 调用方式: POST /api/index?action=detect
  // ==========================================
  if (action === 'detect') {

    // 强制限制该接口只能用 POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: '图片检测接口请使用 POST 请求' });
    }

    try {
      const { image_base64, inviteCode } = req.body;

      // 校验邀请码
      const status = await kv.get(inviteCode);
      if (!status) {
        return res.status(403).json({ error: '无效的邀请链接！请向管理员索要专属链接。' });
      }
      if (status === 'used') {
        return res.status(403).json({ error: '该链接已被使用过，每条链接仅限测算一次！' });
      }
      console.log(3333333333333);

      // 构造 Face++ 参数
      const params = new URLSearchParams();
      params.append('api_key', FACE_API_KEY);
      params.append('api_secret', FACE_API_SECRET);
      params.append('image_base64', image_base64);
      params.append('return_attributes', 'beauty,age,gender,emotion,facequality');

      // 发起旷视 API 请求
      const faceRes = await fetch('https://api-cn.faceplusplus.com/facepp/v3/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      const data = await faceRes.json();

      if (!faceRes.ok) {
        throw new Error(data.error_message || '请求旷视 API 失败');
      }

      // 测算成功后，将邀请码标记为已使用
      await kv.set(inviteCode, 'used');

      return res.status(200).json(data);

    } catch (error) {
      console.error("后端请求报错:", error.response ? error.response.data : error.message);
      return res.status(500).json({ error: '接口调用失败', details: error.message });
    }
  }

  // 如果 action 都不匹配
  return res.status(404).json({ error: '无效的请求路径。请指定正确的 action 参数。' });
}
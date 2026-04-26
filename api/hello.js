export default function handler(req, res) {
  // 处理跨域 (可选：如果前后端在同一个Vercel域名下，其实不需要处理跨域)
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // 判断请求方法
  if (req.method === 'GET') {
    // 获取 URL 参数，例如 /api/hello?name=Vercel
    const name = req.query.name || 'World';
    
    // 返回 JSON 数据
    res.status(200).json({ 
      success: true, 
      message: `Hello, ${name}! 这是一条来自 Vercel Node 后端的数据。` 
    });
  } 
  else if (req.method === 'POST') {
    // 获取 POST 请求体 (Vercel 会自动解析 JSON body)
    const body = req.body;
    res.status(200).json({ 
      success: true, 
      dataReceived: body 
    });
  } 
  else {
    // 其他请求方法不被允许
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
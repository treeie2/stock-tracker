const https = require('https');

const data = JSON.stringify({ data: [] });

const options = {
  hostname: 'tracker-ltans4azu-shermanns-projects.vercel.app',
  port: 443,
  path: '/api/data',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', responseData);
    if (res.statusCode === 200) {
      console.log('✅ 数据清空成功！');
    } else {
      console.log('❌ 请求失败，状态码:', res.statusCode);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ 错误:', e.message);
});

req.write(data);
req.end();

// Vercel API 路由 - 接收微信公众号研报数据
// 路径: /api/wechat-reports

import { NextResponse } from 'next/server';

// 模拟数据存储
let reports = [];

export async function POST(request) {
  try {
    const data = await request.json();
    console.log('接收到微信公众号研报数据:', data);
    
    // 验证数据格式
    if (!data || !Array.isArray(data.stocks)) {
      return NextResponse.json(
        { error: '数据格式不正确，需要包含stocks数组' },
        { status: 400 }
      );
    }
    
    // 存储数据
    reports = data.stocks;
    
    console.log(`成功接收 ${data.stocks.length} 条研报数据`);
    
    return NextResponse.json({
      success: true,
      message: `成功接收 ${data.stocks.length} 条研报数据`,
      count: data.stocks.length
    });
  } catch (error) {
    console.error('处理微信公众号研报数据失败:', error);
    return NextResponse.json(
      { error: '处理数据失败' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      reports: reports,
      count: reports.length
    });
  } catch (error) {
    console.error('获取微信公众号研报数据失败:', error);
    return NextResponse.json(
      { error: '获取数据失败' },
      { status: 500 }
    );
  }
}

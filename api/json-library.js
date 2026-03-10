// Vercel API 路由 - 访问JSON库中的数据
// 路径: /api/json-library

import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const JSON_LIBRARY_PATH = path.join(process.cwd(), 'scripts', 'json_library');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';
    
    switch (action) {
      case 'stats':
        return await getStats();
      case 'articles':
        return await getArticles(searchParams);
      case 'search':
        return await searchArticles(searchParams);
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('访问JSON库失败:', error);
    return NextResponse.json(
      { error: '访问JSON库失败' },
      { status: 500 }
    );
  }
}

async function getStats() {
  try {
    const indexPath = path.join(JSON_LIBRARY_PATH, 'library_index.json');
    const indexData = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexData);
    
    return NextResponse.json({
      success: true,
      stats: index
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    return NextResponse.json(
      { error: '获取统计信息失败' },
      { status: 500 }
    );
  }
}

async function getArticles(searchParams) {
  try {
    const date = searchParams.get('date');
    const source = searchParams.get('source');
    
    let articles = [];
    
    if (date) {
      // 按日期获取文章
      const filePath = path.join(JSON_LIBRARY_PATH, `articles_${date}.json`);
      const fileData = await fs.readFile(filePath, 'utf-8');
      articles = JSON.parse(fileData);
    } else {
      // 获取所有文章
      const files = await fs.readdir(JSON_LIBRARY_PATH);
      
      for (const file of files) {
        if (file.startsWith('articles_') && file.endsWith('.json')) {
          const filePath = path.join(JSON_LIBRARY_PATH, file);
          const fileData = await fs.readFile(filePath, 'utf-8');
          const fileArticles = JSON.parse(fileData);
          articles = articles.concat(fileArticles);
        }
      }
    }
    
    // 按来源过滤
    if (source) {
      articles = articles.filter(article => article.source === source);
    }
    
    return NextResponse.json({
      success: true,
      articles: articles,
      count: articles.length
    });
  } catch (error) {
    console.error('获取文章失败:', error);
    return NextResponse.json(
      { error: '获取文章失败' },
      { status: 500 }
    );
  }
}

async function searchArticles(searchParams) {
  try {
    const keyword = searchParams.get('keyword');
    
    if (!keyword) {
      return NextResponse.json(
        { error: '缺少搜索关键词' },
        { status: 400 }
      );
    }
    
    // 获取所有文章
    const files = await fs.readdir(JSON_LIBRARY_PATH);
    let allArticles = [];
    
    for (const file of files) {
      if (file.startsWith('articles_') && file.endsWith('.json')) {
        const filePath = path.join(JSON_LIBRARY_PATH, file);
        const fileData = await fs.readFile(filePath, 'utf-8');
        const fileArticles = JSON.parse(fileData);
        allArticles = allArticles.concat(fileArticles);
      }
    }
    
    // 搜索文章
    const results = allArticles.filter(article => {
      const title = article.title?.toLowerCase() || '';
      const description = article.description?.toLowerCase() || '';
      return title.includes(keyword.toLowerCase()) || description.includes(keyword.toLowerCase());
    });
    
    return NextResponse.json({
      success: true,
      articles: results,
      count: results.length,
      keyword: keyword
    });
  } catch (error) {
    console.error('搜索文章失败:', error);
    return NextResponse.json(
      { error: '搜索文章失败' },
      { status: 500 }
    );
  }
}

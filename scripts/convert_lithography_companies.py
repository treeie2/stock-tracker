#!/usr/bin/env python3
"""
将光刻胶相关公司信息转换为系统兼容的JSON格式
"""
import json
import re

def parse_company_info(text):
    """解析公司信息文本"""
    companies = []
    
    # 分割文本为公司条目
    lines = text.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # 提取公司名称（冒号前的部分）
        match = re.match(r'^(.*?)：', line)
        if not match:
            continue
        
        company_name = match.group(1).strip()
        
        # 提取标签（#开头的部分）
        tags = re.findall(r'#([^\s]+)', line)
        
        # 提取描述（标签后的部分）
        description = re.sub(r'^.*?：', '', line)
        description = re.sub(r'#([^\s]+)', '', description).strip()
        
        # 构建概念标签
        concepts = []
        for tag in tags:
            if tag == '树脂':
                concepts.append('光刻胶树脂')
            elif tag == '国产替代':
                concepts.append('国产替代')
            elif tag == '光刻胶单体':
                concepts.append('光刻胶单体')
            elif tag == '光引发剂':
                concepts.append('光引发剂')
            elif tag == '溶剂及配套试剂':
                concepts.append('光刻胶溶剂')
            elif tag == '光敏性聚酰亚胺（PSPI）':
                concepts.append('PSPI光刻胶')
            elif tag == '半导体光刻胶产品':
                concepts.append('半导体光刻胶')
        
        # 构建公司信息
        company = {
            "name": company_name,
            "code": f"待补充_{company_name}",  # 代码待补充
            "concepts": concepts,
            "sector": "半导体材料",
            "targetValuation": "",
            "earningsForecast": "",
            "records": [
                {
                    "id": f"rec_{company_name}_{len(companies)}",
                    "stockId": f"s_{company_name}",
                    "timestamp": "2026-03-10",
                    "customDate": "2026-03-10",
                    "title": f"{company_name} - 光刻胶相关业务",
                    "content": description,
                    "logic": description,
                    "dataPoints": [],
                    "rawText": line
                }
            ],
            "price": "---",
            "dailyChange": "0%",
            "marketCap": "---",
            "peRatio": "---",
            "revenue": "---",
            "products": [],
            "lastUpdated": "2026-03-10"
        }
        
        companies.append(company)
    
    return companies

def main():
    # 用户提供的光刻胶相关公司信息
    text = '''圣泉集团：#树脂，#国产替代 生产的ppb级的高纯线性酚醛树脂可作为光刻胶中的主成膜物。 
 兴业股份：#树脂，#国产替代 已研发成功半导体光刻胶用酚醛树脂等新材料。 
 泰和科技：#树脂，#国产替代 酚醛树脂产品主要用于配套G线和I线光刻胶。 
 华懋科技：#光刻胶单体 #国产替代 持有徐州博康29.704%股权，可生产中高端光刻胶单体。 
 东材科技：#光刻胶单体 #国产替代 与韩企共同投资的成都东凯芯半导体已开展高端光刻胶单体。 
 万润股份：#光刻胶单体 #国产替代 已销售的半导体光刻胶材料主要包括光刻胶单体、树脂、光酸。 
 瑞联新材：#光刻胶单体 #国产替代 产品涵盖半导体光刻胶单体、聚酰亚胺单体、膜材料单体等。 
 强力新材：#光引发剂 #国产替代 主营业务是各类光刻胶专用电子化学品的研发、生产和销售。 
 扬帆新材：#光引发剂 #国产替代 主要从事光引发剂的研发、生产和销售。 
 久日新材：#光引发剂 #国产替代 主营业务是光引发剂、光刻胶的研发、生产和销售。 
 兴福电子：#光引发剂 #国产替代 拟收购光刻胶用光引发剂制备专有技术及相关实验设备的所有权。 
 华融化学：#溶剂及配套试剂 #国产替代 从事湿电子化学品业务，包括光刻胶配套试剂等。 
 格林达：#溶剂及配套试剂 #国产替代产品主要用于光刻胶的显影和剥离、电极的蚀刻等。 
 安集科技：#溶剂及配套试剂 #国产替代 光刻胶去除剂包括集成电路制造用、晶圆级封装用等系列产品。 
 江化微：#溶剂及配套试剂 #国产替代 湿电子化学品龙头企业，产品涵盖光刻胶配套试剂。 
 国风新材：#光敏性聚酰亚胺（PSPI）#国产替代 公司在研产品包括光敏聚酰亚胺光刻胶，湿电子化学 
 鼎龙股份：#光敏性聚酰亚胺（PSPI）#国产替代 已布局20余款KrFIArF光刻胶产品。 
 广信材料：#光敏性聚酰亚胺（PSPI）#国产替代 主营业务是光刻胶的研发、生产和销售。 
 中游：半导体光刻胶产品 
 彤程新材：#半导体光刻胶产品 #国产替代 公司krf光刻胶和arf光刻胶在国内技术水平领先。 
 南大光电：#半导体光刻胶产品 #国产替代 通过控股子公司专注ArF光刻胶的研发与生产。 
 容大感光：#半导体光刻胶产品 #国产替代 在半导体用g/i线光刻胶上已量产，并积极研发ArF光刻胶。 
 上海新阳：#半导体光刻胶产品 #国产替代 产品已获得收入，在高端光刻胶领域持续投入。 
 晶瑞新材：#半导体光刻胶产品 #国产替代 KrF光刻胶量产并实现数倍增长，ArF光刻胶小批量出货。 
 飞凯材料：#半导体光刻胶产品 #国产替代 应用于半导体领域的i-line光刻胶及KrF光刻配套Barc材料光刻胶。 
 艾森股份：#半导体光刻胶产品 #国产替代 产品涵盖电镀液及配套试剂、光刻胶及配套试剂等。 
 高盟新材：#半导体光刻胶产品 #国产替代 参股的公司KrF/ArF 已供货中芯国际等头部晶圆厂。 
 雅克科技：#半导体光刻胶产品 #国产替代 产品涵盖光刻胶及配套试剂、电子特种气体等。 
 恒坤新材：#半导体光刻胶产品 #国产替代 产品有光刻胶如Krf光刻胶、I-line光刻胶、Arf光刻胶等。 
 华特气体：#半导体光刻胶产品 #国产替代 光刻气产品包括A/F/Ne、G/e、Ar/Ne和K/任F/Ne混合气等。 
 凯美特气：#半导体光刻胶产品 #国产替代 超高纯气体和光刻气产品具有较高的品质。'''
    
    # 解析公司信息
    companies = parse_company_info(text)
    
    # 构建输出数据
    output_data = {
        "stocks": companies,
        "exportedAt": "2026-03-10",
        "date": "2026-03-10"
    }
    
    # 保存为JSON文件
    output_file = "e:\\web\\imi\\app\\lithography-companies-2026-03-10.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"成功生成JSON文件: {output_file}")
    print(f"共解析 {len(companies)} 家光刻胶相关公司")

if __name__ == "__main__":
    main()

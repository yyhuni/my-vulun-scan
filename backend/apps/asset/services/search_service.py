"""
资产搜索服务

提供资产搜索的核心业务逻辑：
- 从物化视图查询数据
- 支持多条件组合过滤
- 支持模糊匹配
"""

import logging
from typing import Optional, List, Dict, Any

from django.db import connection

logger = logging.getLogger(__name__)


class AssetSearchService:
    """资产搜索服务"""
    
    def search(
        self,
        host: Optional[str] = None,
        title: Optional[str] = None,
        tech: Optional[str] = None,
        status: Optional[str] = None,
        body: Optional[str] = None,
        header: Optional[str] = None,
        url: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        搜索资产
        
        Args:
            host: 主机名模糊匹配
            title: 标题模糊匹配
            tech: 技术栈匹配
            status: 状态码匹配（支持逗号分隔多值）
            body: 响应体模糊匹配
            header: 响应头模糊匹配
            url: URL 模糊匹配
        
        Returns:
            List[Dict]: 搜索结果列表
        """
        # 构建查询条件
        conditions = []
        params = []
        
        if host:
            conditions.append("host ILIKE %s")
            params.append(f"%{host}%")
        
        if title:
            conditions.append("title ILIKE %s")
            params.append(f"%{title}%")
        
        if tech:
            # 技术栈数组模糊匹配（数组中任意元素包含搜索词）
            conditions.append("EXISTS (SELECT 1 FROM unnest(tech) AS t WHERE t ILIKE %s)")
            params.append(f"%{tech}%")
        
        if status:
            # 支持多状态码，逗号分隔
            status_codes = [s.strip() for s in status.split(',') if s.strip().isdigit()]
            if status_codes:
                placeholders = ','.join(['%s'] * len(status_codes))
                conditions.append(f"status_code IN ({placeholders})")
                params.extend([int(s) for s in status_codes])
        
        if body:
            conditions.append("response_body ILIKE %s")
            params.append(f"%{body}%")
        
        if header:
            conditions.append("response_headers ILIKE %s")
            params.append(f"%{header}%")
        
        if url:
            conditions.append("url ILIKE %s")
            params.append(f"%{url}%")
        
        # 构建 SQL
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        sql = f"""
            SELECT 
                id,
                url,
                host,
                title,
                tech,
                status_code,
                webserver,
                response_headers,
                response_body,
                content_type,
                created_at,
                target_id,
                vulnerabilities
            FROM asset_search_view
            WHERE {where_clause}
            ORDER BY created_at DESC
        """
        
        try:
            with connection.cursor() as cursor:
                cursor.execute(sql, params)
                columns = [col[0] for col in cursor.description]
                results = []
                
                for row in cursor.fetchall():
                    result = dict(zip(columns, row))
                    results.append(result)
                
                return results
        except Exception as e:
            logger.error(f"搜索查询失败: {e}")
            raise
    
    def count(
        self,
        host: Optional[str] = None,
        title: Optional[str] = None,
        tech: Optional[str] = None,
        status: Optional[str] = None,
        body: Optional[str] = None,
        header: Optional[str] = None,
        url: Optional[str] = None,
    ) -> int:
        """
        统计搜索结果数量
        
        Args:
            与 search 方法相同
        
        Returns:
            int: 结果总数
        """
        # 构建查询条件
        conditions = []
        params = []
        
        if host:
            conditions.append("host ILIKE %s")
            params.append(f"%{host}%")
        
        if title:
            conditions.append("title ILIKE %s")
            params.append(f"%{title}%")
        
        if tech:
            # 技术栈数组模糊匹配
            conditions.append("EXISTS (SELECT 1 FROM unnest(tech) AS t WHERE t ILIKE %s)")
            params.append(f"%{tech}%")
        
        if status:
            status_codes = [s.strip() for s in status.split(',') if s.strip().isdigit()]
            if status_codes:
                placeholders = ','.join(['%s'] * len(status_codes))
                conditions.append(f"status_code IN ({placeholders})")
                params.extend([int(s) for s in status_codes])
        
        if body:
            conditions.append("response_body ILIKE %s")
            params.append(f"%{body}%")
        
        if header:
            conditions.append("response_headers ILIKE %s")
            params.append(f"%{header}%")
        
        if url:
            conditions.append("url ILIKE %s")
            params.append(f"%{url}%")
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        sql = f"SELECT COUNT(*) FROM asset_search_view WHERE {where_clause}"
        
        try:
            with connection.cursor() as cursor:
                cursor.execute(sql, params)
                return cursor.fetchone()[0]
        except Exception as e:
            logger.error(f"统计查询失败: {e}")
            raise

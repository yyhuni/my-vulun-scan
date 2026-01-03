"""
资产搜索服务

提供资产搜索的核心业务逻辑：
- 从物化视图查询数据
- 支持表达式语法解析
- 支持 =（模糊）、==（精确）、!=（不等于）操作符
- 支持 && (AND) 和 || (OR) 逻辑组合
- 支持 Website 和 Endpoint 两种资产类型
"""

import logging
import re
from typing import Optional, List, Dict, Any, Tuple, Literal

from django.db import connection

logger = logging.getLogger(__name__)

# 支持的字段映射（前端字段名 -> 数据库字段名）
FIELD_MAPPING = {
    'host': 'host',
    'url': 'url',
    'title': 'title',
    'tech': 'tech',
    'status': 'status_code',
    'body': 'response_body',
    'header': 'response_headers',
}

# 数组类型字段
ARRAY_FIELDS = {'tech'}

# 资产类型到视图名的映射
VIEW_MAPPING = {
    'website': 'asset_search_view',
    'endpoint': 'endpoint_search_view',
}

# 有效的资产类型
VALID_ASSET_TYPES = {'website', 'endpoint'}

# Website 查询字段
WEBSITE_SELECT_FIELDS = """
    id,
    url,
    host,
    title,
    tech,
    status_code,
    response_headers,
    response_body,
    content_type,
    content_length,
    webserver,
    location,
    vhost,
    created_at,
    target_id
"""

# Endpoint 查询字段（包含 matched_gf_patterns）
ENDPOINT_SELECT_FIELDS = """
    id,
    url,
    host,
    title,
    tech,
    status_code,
    response_headers,
    response_body,
    content_type,
    content_length,
    webserver,
    location,
    vhost,
    matched_gf_patterns,
    created_at,
    target_id
"""


class SearchQueryParser:
    """
    搜索查询解析器
    
    支持语法：
    - field="value"     模糊匹配（ILIKE %value%）
    - field=="value"    精确匹配
    - field!="value"    不等于
    - &&                AND 连接
    - ||                OR 连接
    - ()                分组（暂不支持嵌套）
    
    示例：
    - host="api" && tech="nginx"
    - tech="vue" || tech="react"
    - status=="200" && host!="test"
    """
    
    # 匹配单个条件: field="value" 或 field=="value" 或 field!="value"
    CONDITION_PATTERN = re.compile(r'(\w+)\s*(==|!=|=)\s*"([^"]*)"')
    
    @classmethod
    def parse(cls, query: str) -> Tuple[str, List[Any]]:
        """
        解析查询字符串，返回 SQL WHERE 子句和参数
        
        Args:
            query: 搜索查询字符串
        
        Returns:
            (where_clause, params) 元组
        """
        if not query or not query.strip():
            return "1=1", []
        
        query = query.strip()
        
        # 检查是否包含操作符语法，如果不包含则作为 host 模糊搜索
        if not cls.CONDITION_PATTERN.search(query):
            # 裸文本，默认作为 host 模糊搜索
            return "host ILIKE %s", [f"%{query}%"]
        
        # 按 || 分割为 OR 组
        or_groups = cls._split_by_or(query)
        
        if len(or_groups) == 1:
            # 没有 OR，直接解析 AND 条件
            return cls._parse_and_group(or_groups[0])
        
        # 多个 OR 组
        or_clauses = []
        all_params = []
        
        for group in or_groups:
            clause, params = cls._parse_and_group(group)
            if clause and clause != "1=1":
                or_clauses.append(f"({clause})")
                all_params.extend(params)
        
        if not or_clauses:
            return "1=1", []
        
        return " OR ".join(or_clauses), all_params
    
    @classmethod
    def _split_by_or(cls, query: str) -> List[str]:
        """按 || 分割查询，但忽略引号内的 ||"""
        parts = []
        current = ""
        in_quotes = False
        i = 0
        
        while i < len(query):
            char = query[i]
            
            if char == '"':
                in_quotes = not in_quotes
                current += char
            elif not in_quotes and i + 1 < len(query) and query[i:i+2] == '||':
                if current.strip():
                    parts.append(current.strip())
                current = ""
                i += 1  # 跳过第二个 |
            else:
                current += char
            
            i += 1
        
        if current.strip():
            parts.append(current.strip())
        
        return parts if parts else [query]
    
    @classmethod
    def _parse_and_group(cls, group: str) -> Tuple[str, List[Any]]:
        """解析 AND 组（用 && 连接的条件）"""
        # 移除外层括号
        group = group.strip()
        if group.startswith('(') and group.endswith(')'):
            group = group[1:-1].strip()
        
        # 按 && 分割
        parts = cls._split_by_and(group)
        
        and_clauses = []
        all_params = []
        
        for part in parts:
            clause, params = cls._parse_condition(part.strip())
            if clause:
                and_clauses.append(clause)
                all_params.extend(params)
        
        if not and_clauses:
            return "1=1", []
        
        return " AND ".join(and_clauses), all_params
    
    @classmethod
    def _split_by_and(cls, query: str) -> List[str]:
        """按 && 分割查询，但忽略引号内的 &&"""
        parts = []
        current = ""
        in_quotes = False
        i = 0
        
        while i < len(query):
            char = query[i]
            
            if char == '"':
                in_quotes = not in_quotes
                current += char
            elif not in_quotes and i + 1 < len(query) and query[i:i+2] == '&&':
                if current.strip():
                    parts.append(current.strip())
                current = ""
                i += 1  # 跳过第二个 &
            else:
                current += char
            
            i += 1
        
        if current.strip():
            parts.append(current.strip())
        
        return parts if parts else [query]
    
    @classmethod
    def _parse_condition(cls, condition: str) -> Tuple[Optional[str], List[Any]]:
        """
        解析单个条件
        
        Returns:
            (sql_clause, params) 或 (None, []) 如果解析失败
        """
        # 移除括号
        condition = condition.strip()
        if condition.startswith('(') and condition.endswith(')'):
            condition = condition[1:-1].strip()
        
        match = cls.CONDITION_PATTERN.match(condition)
        if not match:
            logger.warning(f"无法解析条件: {condition}")
            return None, []
        
        field, operator, value = match.groups()
        field = field.lower()
        
        # 验证字段
        if field not in FIELD_MAPPING:
            logger.warning(f"未知字段: {field}")
            return None, []
        
        db_field = FIELD_MAPPING[field]
        is_array = field in ARRAY_FIELDS
        
        # 根据操作符生成 SQL
        if operator == '=':
            # 模糊匹配
            return cls._build_like_condition(db_field, value, is_array)
        elif operator == '==':
            # 精确匹配
            return cls._build_exact_condition(db_field, value, is_array)
        elif operator == '!=':
            # 不等于
            return cls._build_not_equal_condition(db_field, value, is_array)
        
        return None, []
    
    @classmethod
    def _build_like_condition(cls, field: str, value: str, is_array: bool) -> Tuple[str, List[Any]]:
        """构建模糊匹配条件"""
        if is_array:
            # 数组字段：检查数组中是否有元素包含该值
            return f"EXISTS (SELECT 1 FROM unnest({field}) AS t WHERE t ILIKE %s)", [f"%{value}%"]
        elif field == 'status_code':
            # 状态码是整数，模糊匹配转为精确匹配
            try:
                return f"{field} = %s", [int(value)]
            except ValueError:
                return f"{field}::text ILIKE %s", [f"%{value}%"]
        else:
            return f"{field} ILIKE %s", [f"%{value}%"]
    
    @classmethod
    def _build_exact_condition(cls, field: str, value: str, is_array: bool) -> Tuple[str, List[Any]]:
        """构建精确匹配条件"""
        if is_array:
            # 数组字段：检查数组中是否包含该精确值
            return f"%s = ANY({field})", [value]
        elif field == 'status_code':
            # 状态码是整数
            try:
                return f"{field} = %s", [int(value)]
            except ValueError:
                return f"{field}::text = %s", [value]
        else:
            return f"{field} = %s", [value]
    
    @classmethod
    def _build_not_equal_condition(cls, field: str, value: str, is_array: bool) -> Tuple[str, List[Any]]:
        """构建不等于条件"""
        if is_array:
            # 数组字段：检查数组中不包含该值
            return f"NOT (%s = ANY({field}))", [value]
        elif field == 'status_code':
            try:
                return f"({field} IS NULL OR {field} != %s)", [int(value)]
            except ValueError:
                return f"({field} IS NULL OR {field}::text != %s)", [value]
        else:
            return f"({field} IS NULL OR {field} != %s)", [value]


AssetType = Literal['website', 'endpoint']


class AssetSearchService:
    """资产搜索服务"""
    
    def search(
        self, 
        query: str, 
        asset_type: AssetType = 'website',
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        搜索资产
        
        Args:
            query: 搜索查询字符串
            asset_type: 资产类型 ('website' 或 'endpoint')
            limit: 最大返回数量（可选）
        
        Returns:
            List[Dict]: 搜索结果列表
        """
        where_clause, params = SearchQueryParser.parse(query)
        
        # 根据资产类型选择视图和字段
        view_name = VIEW_MAPPING.get(asset_type, 'asset_search_view')
        select_fields = ENDPOINT_SELECT_FIELDS if asset_type == 'endpoint' else WEBSITE_SELECT_FIELDS
        
        sql = f"""
            SELECT {select_fields}
            FROM {view_name}
            WHERE {where_clause}
            ORDER BY created_at DESC
        """
        
        # 添加 LIMIT
        if limit is not None and limit > 0:
            sql += f" LIMIT {int(limit)}"
        
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
            logger.error(f"搜索查询失败: {e}, SQL: {sql}, params: {params}")
            raise
    
    def count(self, query: str, asset_type: AssetType = 'website') -> int:
        """
        统计搜索结果数量
        
        Args:
            query: 搜索查询字符串
            asset_type: 资产类型 ('website' 或 'endpoint')
        
        Returns:
            int: 结果总数
        """
        where_clause, params = SearchQueryParser.parse(query)
        
        # 根据资产类型选择视图
        view_name = VIEW_MAPPING.get(asset_type, 'asset_search_view')
        
        sql = f"SELECT COUNT(*) FROM {view_name} WHERE {where_clause}"
        
        try:
            with connection.cursor() as cursor:
                cursor.execute(sql, params)
                return cursor.fetchone()[0]
        except Exception as e:
            logger.error(f"统计查询失败: {e}")
            raise
    
    def search_iter(
        self, 
        query: str, 
        asset_type: AssetType = 'website',
        batch_size: int = 1000
    ):
        """
        流式搜索资产（使用服务端游标，内存友好）
        
        Args:
            query: 搜索查询字符串
            asset_type: 资产类型 ('website' 或 'endpoint')
            batch_size: 每批获取的数量
        
        Yields:
            Dict: 单条搜索结果
        """
        where_clause, params = SearchQueryParser.parse(query)
        
        # 根据资产类型选择视图和字段
        view_name = VIEW_MAPPING.get(asset_type, 'asset_search_view')
        select_fields = ENDPOINT_SELECT_FIELDS if asset_type == 'endpoint' else WEBSITE_SELECT_FIELDS
        
        sql = f"""
            SELECT {select_fields}
            FROM {view_name}
            WHERE {where_clause}
            ORDER BY created_at DESC
        """
        
        try:
            # 使用服务端游标，避免一次性加载所有数据到内存
            with connection.cursor(name='export_cursor') as cursor:
                cursor.itersize = batch_size
                cursor.execute(sql, params)
                columns = [col[0] for col in cursor.description]
                
                for row in cursor:
                    yield dict(zip(columns, row))
        except Exception as e:
            logger.error(f"流式搜索查询失败: {e}, SQL: {sql}, params: {params}")
            raise

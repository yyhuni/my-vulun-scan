"""CSV 导出工具模块

提供流式 CSV 生成功能，支持：
- UTF-8 BOM（Excel 兼容）
- RFC 4180 规范转义
- 流式生成（内存友好）
"""

import csv
import io
from datetime import datetime
from typing import Iterator, Dict, Any, List, Callable, Optional

# UTF-8 BOM，确保 Excel 正确识别编码
UTF8_BOM = '\ufeff'


def generate_csv_rows(
    data_iterator: Iterator[Dict[str, Any]],
    headers: List[str],
    field_formatters: Optional[Dict[str, Callable]] = None
) -> Iterator[str]:
    """
    流式生成 CSV 行
    
    Args:
        data_iterator: 数据迭代器，每个元素是一个字典
        headers: CSV 表头列表
        field_formatters: 字段格式化函数字典，key 为字段名，value 为格式化函数
    
    Yields:
        CSV 行字符串（包含换行符）
    
    Example:
        >>> data = [{'ip': '192.168.1.1', 'hosts': ['a.com', 'b.com']}]
        >>> headers = ['ip', 'hosts']
        >>> formatters = {'hosts': format_list_field}
        >>> for row in generate_csv_rows(iter(data), headers, formatters):
        ...     print(row, end='')
    """
    # 输出 BOM + 表头
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(headers)
    yield UTF8_BOM + output.getvalue()
    
    # 输出数据行
    for row_data in data_iterator:
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
        
        row = []
        for header in headers:
            value = row_data.get(header, '')
            if field_formatters and header in field_formatters:
                value = field_formatters[header](value)
            row.append(value if value is not None else '')
        
        writer.writerow(row)
        yield output.getvalue()


def format_list_field(values: List, separator: str = ';') -> str:
    """
    将列表字段格式化为分号分隔的字符串
    
    Args:
        values: 值列表
        separator: 分隔符，默认为分号
    
    Returns:
        分隔符连接的字符串
    
    Example:
        >>> format_list_field(['a.com', 'b.com'])
        'a.com;b.com'
        >>> format_list_field([80, 443])
        '80;443'
        >>> format_list_field([])
        ''
        >>> format_list_field(None)
        ''
    """
    if not values:
        return ''
    return separator.join(str(v) for v in values)


def format_datetime(dt: Optional[datetime]) -> str:
    """
    格式化日期时间为字符串（转换为本地时区）
    
    Args:
        dt: datetime 对象或 None
    
    Returns:
        格式化的日期时间字符串，格式为 YYYY-MM-DD HH:MM:SS（本地时区）
    
    Example:
        >>> from datetime import datetime
        >>> format_datetime(datetime(2024, 1, 15, 10, 30, 0))
        '2024-01-15 10:30:00'
        >>> format_datetime(None)
        ''
    """
    if dt is None:
        return ''
    if isinstance(dt, str):
        return dt
    
    # 转换为本地时区（从 Django settings 获取）
    from django.utils import timezone
    if timezone.is_aware(dt):
        dt = timezone.localtime(dt)
    
    return dt.strftime('%Y-%m-%d %H:%M:%S')

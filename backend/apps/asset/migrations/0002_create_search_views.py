"""
创建资产搜索物化视图（使用 pg_ivm 增量维护）

这些视图用于资产搜索功能，提供高性能的全文搜索能力。
"""

from django.db import migrations


class Migration(migrations.Migration):
    """创建资产搜索所需的增量物化视图"""

    dependencies = [
        ('asset', '0001_initial'),
    ]

    operations = [
        # 1. 确保 pg_ivm 扩展已安装
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS pg_ivm;",
            reverse_sql="DROP EXTENSION IF EXISTS pg_ivm;",
        ),
        
        # 2. 创建 Website 搜索视图
        # 注意：pg_ivm 不支持 ArrayField，所以 tech 字段需要从原表 JOIN 获取
        migrations.RunSQL(
            sql="""
                SELECT pgivm.create_immv('asset_search_view', $$
                    SELECT 
                        w.id,
                        w.url,
                        w.host,
                        w.title,
                        w.status_code,
                        w.response_headers,
                        w.response_body,
                        w.content_type,
                        w.content_length,
                        w.webserver,
                        w.location,
                        w.vhost,
                        w.created_at,
                        w.target_id
                    FROM website w
                $$);
            """,
            reverse_sql="DROP TABLE IF EXISTS asset_search_view CASCADE;",
        ),
        
        # 3. 创建 Endpoint 搜索视图
        migrations.RunSQL(
            sql="""
                SELECT pgivm.create_immv('endpoint_search_view', $$
                    SELECT 
                        e.id,
                        e.url,
                        e.host,
                        e.title,
                        e.status_code,
                        e.response_headers,
                        e.response_body,
                        e.content_type,
                        e.content_length,
                        e.webserver,
                        e.location,
                        e.vhost,
                        e.created_at,
                        e.target_id
                    FROM endpoint e
                $$);
            """,
            reverse_sql="DROP TABLE IF EXISTS endpoint_search_view CASCADE;",
        ),
        
        # 4. 为搜索视图创建索引（加速查询）
        migrations.RunSQL(
            sql=[
                # Website 搜索视图索引
                "CREATE INDEX IF NOT EXISTS asset_search_view_host_idx ON asset_search_view (host);",
                "CREATE INDEX IF NOT EXISTS asset_search_view_url_idx ON asset_search_view (url);",
                "CREATE INDEX IF NOT EXISTS asset_search_view_title_idx ON asset_search_view (title);",
                "CREATE INDEX IF NOT EXISTS asset_search_view_status_idx ON asset_search_view (status_code);",
                "CREATE INDEX IF NOT EXISTS asset_search_view_created_idx ON asset_search_view (created_at DESC);",
                # Endpoint 搜索视图索引
                "CREATE INDEX IF NOT EXISTS endpoint_search_view_host_idx ON endpoint_search_view (host);",
                "CREATE INDEX IF NOT EXISTS endpoint_search_view_url_idx ON endpoint_search_view (url);",
                "CREATE INDEX IF NOT EXISTS endpoint_search_view_title_idx ON endpoint_search_view (title);",
                "CREATE INDEX IF NOT EXISTS endpoint_search_view_status_idx ON endpoint_search_view (status_code);",
                "CREATE INDEX IF NOT EXISTS endpoint_search_view_created_idx ON endpoint_search_view (created_at DESC);",
            ],
            reverse_sql=[
                "DROP INDEX IF EXISTS asset_search_view_host_idx;",
                "DROP INDEX IF EXISTS asset_search_view_url_idx;",
                "DROP INDEX IF EXISTS asset_search_view_title_idx;",
                "DROP INDEX IF EXISTS asset_search_view_status_idx;",
                "DROP INDEX IF EXISTS asset_search_view_created_idx;",
                "DROP INDEX IF EXISTS endpoint_search_view_host_idx;",
                "DROP INDEX IF EXISTS endpoint_search_view_url_idx;",
                "DROP INDEX IF EXISTS endpoint_search_view_title_idx;",
                "DROP INDEX IF EXISTS endpoint_search_view_status_idx;",
                "DROP INDEX IF EXISTS endpoint_search_view_created_idx;",
            ],
        ),
    ]

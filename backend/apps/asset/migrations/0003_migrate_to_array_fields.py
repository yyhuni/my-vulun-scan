# Generated manually for data migration
# 将逗号分隔的字符串字段转换为 PostgreSQL ArrayField

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('asset', '0002_initial'),
    ]

    operations = [
        # 一步完成：修改字段类型为 ArrayField，在 USING 子句中处理所有情况
        migrations.RunSQL(
            sql=[
                """
                ALTER TABLE subdomain 
                ALTER COLUMN cname TYPE varchar(255)[] 
                USING CASE 
                    WHEN cname IS NULL OR cname = '' THEN '{}'::varchar[]
                    ELSE string_to_array(cname, ',')
                END,
                ALTER COLUMN cname SET DEFAULT '{}';
                """,
                """
                ALTER TABLE endpoint 
                ALTER COLUMN matched_gf_patterns TYPE varchar(100)[] 
                USING CASE 
                    WHEN matched_gf_patterns IS NULL OR matched_gf_patterns = '' THEN '{}'::varchar[]
                    ELSE string_to_array(matched_gf_patterns, ',')
                END,
                ALTER COLUMN matched_gf_patterns SET DEFAULT '{}';
                """,
            ],
            reverse_sql=[
                """
                ALTER TABLE subdomain 
                ALTER COLUMN cname TYPE varchar(5000) 
                USING CASE 
                    WHEN cname IS NULL OR array_length(cname, 1) IS NULL THEN ''
                    ELSE array_to_string(cname, ',')
                END,
                ALTER COLUMN cname SET DEFAULT '';
                """,
                """
                ALTER TABLE endpoint 
                ALTER COLUMN matched_gf_patterns TYPE varchar(10000) 
                USING CASE 
                    WHEN matched_gf_patterns IS NULL OR array_length(matched_gf_patterns, 1) IS NULL THEN ''
                    ELSE array_to_string(matched_gf_patterns, ',')
                END,
                ALTER COLUMN matched_gf_patterns SET DEFAULT '';
                """,
            ]
        ),
    ]


#!/bin/bash
set -e

# 创建应用数据库和 Prefect 数据库
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
	CREATE DATABASE xingrin;
	CREATE DATABASE prefect;
	GRANT ALL PRIVILEGES ON DATABASE xingrin TO "$POSTGRES_USER";
	GRANT ALL PRIVILEGES ON DATABASE prefect TO "$POSTGRES_USER";
EOSQL



from prefect import flow


@flow(
    name="site_scan", 
    log_prints=True,
    on_running=[on_scan_flow_running],
    on_completion=[on_scan_flow_completed],
    on_failure=[on_scan_flow_failed],
    on_cancellation=[on_scan_flow_cancelled],
    on_crashed=[on_scan_flow_crashed]
)
def site_scan_flow(
    scan_id: int,
    target_name: str,
    target_id: int,
    scan_workspace_dir: str,
    engine_config: str = None
) -> dict:
    # 1. 从target获取所有子域名与其子域名下对应的端口号
    # 2. 拼接成 http://<子域名>:<端口>，https://<子域名>:<端口>  写入文件中
    # 3. 用httpx进行批量请求，获取响应状态码，结果写入文件
    # 4. 解析httpx的结果，写入数据库
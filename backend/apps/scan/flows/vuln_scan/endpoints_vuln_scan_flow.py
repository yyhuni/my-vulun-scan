from apps.common.prefect_django_setup import setup_django_for_prefect

import logging
from datetime import datetime
from pathlib import Path
from typing import Dict

from prefect import flow

from apps.scan.handlers.scan_flow_handlers import (
    on_scan_flow_running,
    on_scan_flow_completed,
    on_scan_flow_failed,
    on_scan_flow_cancelled,
    on_scan_flow_crashed,
)
from apps.scan.utils import build_scan_command
from apps.scan.tasks.vuln_scan import export_endpoints_task, run_vuln_tool_task
from .utils import calculate_timeout_by_line_count


logger = logging.getLogger(__name__)


def _setup_vuln_scan_directory(scan_workspace_dir: str) -> Path:
    vuln_scan_dir = Path(scan_workspace_dir) / "vuln_scan"
    vuln_scan_dir.mkdir(parents=True, exist_ok=True)
    return vuln_scan_dir


@flow(
    name="endpoints_vuln_scan_flow",
    log_prints=True,
)
def endpoints_vuln_scan_flow(
    scan_id: int,
    target_name: str,
    target_id: int,
    scan_workspace_dir: str,
    enabled_tools: Dict[str, dict],
) -> dict:
    """基于 Endpoint 的漏洞扫描 Flow（串行执行 Dalfox 等工具）。"""
    try:
        if scan_id is None:
            raise ValueError("scan_id 不能为空")
        if not target_name:
            raise ValueError("target_name 不能为空")
        if target_id is None:
            raise ValueError("target_id 不能为空")
        if not scan_workspace_dir:
            raise ValueError("scan_workspace_dir 不能为空")
        if not enabled_tools:
            raise ValueError("enabled_tools 不能为空")

        vuln_scan_dir = _setup_vuln_scan_directory(scan_workspace_dir)
        endpoints_file = vuln_scan_dir / "input_endpoints_dalfox_xss.txt"

        # Step 1: 导出 Endpoint URL
        export_result = export_endpoints_task(
            target_id=target_id,
            output_file=str(endpoints_file),
        )
        total_endpoints = export_result.get("total_count", 0)

        if total_endpoints == 0 or not endpoints_file.exists() or endpoints_file.stat().st_size == 0:
            logger.warning("目标下没有可用 Endpoint，跳过漏洞扫描")
            return {
                "success": True,
                "scan_id": scan_id,
                "target": target_name,
                "scan_workspace_dir": scan_workspace_dir,
                "endpoints_file": str(endpoints_file),
                "endpoint_count": 0,
                "executed_tools": [],
                "tool_results": {},
            }

        logger.info("Endpoint 导出完成，共 %d 条，开始执行漏洞扫描", total_endpoints)

        tool_results: Dict[str, dict] = {}

        # Step 2: 串行执行每个漏洞扫描工具（目前主要是 Dalfox）
        for tool_name, tool_config in enabled_tools.items():
            command = build_scan_command(
                tool_name=tool_name,
                scan_type="vuln_scan",
                command_params={"endpoints_file": str(endpoints_file)},
                tool_config=tool_config,
            )

            raw_timeout = tool_config.get("timeout", 600)
            timeout = 600

            if isinstance(raw_timeout, str) and raw_timeout == "auto":
                timeout = calculate_timeout_by_line_count(
                    tool_config=tool_config,
                    file_path=str(endpoints_file),
                    base_per_time=1,
                )
            else:
                try:
                    timeout = int(raw_timeout)
                except (TypeError, ValueError):
                    logger.warning(
                        "工具 %s 的 timeout 配置无效(%s)，将使用默认 600 秒",
                        tool_name,
                        raw_timeout,
                    )
                    timeout = 600

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_file = vuln_scan_dir / f"{tool_name}_{timestamp}.log"

            logger.info("开始执行漏洞扫描工具 %s", tool_name)
            future = run_vuln_tool_task.submit(
                tool_name=tool_name,
                command=command,
                timeout=timeout,
                log_file=str(log_file),
            )
            result = future.result()

            tool_results[tool_name] = {
                "command": command,
                "timeout": timeout,
                "duration": result.get("duration"),
                "returncode": result.get("returncode"),
                "command_log_file": result.get("command_log_file"),
            }

        return {
            "success": True,
            "scan_id": scan_id,
            "target": target_name,
            "scan_workspace_dir": scan_workspace_dir,
            "endpoints_file": str(endpoints_file),
            "endpoint_count": total_endpoints,
            "executed_tools": list(enabled_tools.keys()),
            "tool_results": tool_results,
        }

    except Exception as e:
        logger.exception("Endpoint 漏洞扫描失败: %s", e)
        raise

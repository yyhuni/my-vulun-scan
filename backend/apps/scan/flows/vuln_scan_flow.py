from apps.common.prefect_django_setup import setup_django_for_prefect

import logging
from datetime import datetime
from pathlib import Path

from prefect import flow

from apps.scan.handlers.scan_flow_handlers import (
    on_scan_flow_running,
    on_scan_flow_completed,
    on_scan_flow_failed,
    on_scan_flow_cancelled,
    on_scan_flow_crashed,
)
from apps.scan.utils import build_scan_command, execute_and_wait
from apps.scan.configs.command_templates import get_command_template


logger = logging.getLogger(__name__)


def _setup_vuln_scan_directory(scan_workspace_dir: str) -> Path:
    vuln_scan_dir = Path(scan_workspace_dir) / "vuln_scan"
    vuln_scan_dir.mkdir(parents=True, exist_ok=True)
    return vuln_scan_dir


def _classify_vuln_tools(enabled_tools: dict) -> tuple[dict, dict]:
    """根据命令模板中的 input_type 对漏洞扫描工具进行分类。

    当前支持：
    - endpoints_file: 以端点列表文件为输入（例如 Dalfox XSS）
    预留：
    - 其他 input_type 将被归类到 other_tools，暂不处理。
    """
    endpoints_tools: dict[str, dict] = {}
    other_tools: dict[str, dict] = {}

    for tool_name, tool_config in enabled_tools.items():
        template = get_command_template("vuln_scan", tool_name) or {}
        input_type = template.get("input_type", "endpoints_file")

        if input_type == "endpoints_file":
            endpoints_tools[tool_name] = tool_config
        else:
            other_tools[tool_name] = tool_config

    return endpoints_tools, other_tools


@flow(
    name="vuln_scan",
    log_prints=True,
    on_running=[on_scan_flow_running],
    on_completion=[on_scan_flow_completed],
    on_failure=[on_scan_flow_failed],
    on_cancellation=[on_scan_flow_cancelled],
    on_crashed=[on_scan_flow_crashed],
)
def vuln_scan_flow(
    scan_id: int,
    target_name: str,
    target_id: int,
    scan_workspace_dir: str,
    enabled_tools: dict,
) -> dict:
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

        # 分类工具（目前只处理以 endpoints_file 为输入的工具）
        endpoints_tools, other_tools = _classify_vuln_tools(enabled_tools)

        logger.info(
            "漏洞扫描工具分类 - endpoints_file: %s, 其他: %s",
            list(endpoints_tools.keys()) or "无",
            list(other_tools.keys()) or "无",
        )

        if other_tools:
            logger.warning(
                "存在暂不支持输入类型的漏洞扫描工具，将被忽略: %s",
                list(other_tools.keys()),
            )

        if not endpoints_tools:
            raise ValueError("漏洞扫描需要至少启用一个以 endpoints_file 为输入的工具（如 dalfox_xss）。")

        if not endpoints_file.exists() or endpoints_file.stat().st_size == 0:
            return {
                "success": True,
                "scan_id": scan_id,
                "target": target_name,
                "scan_workspace_dir": scan_workspace_dir,
                "endpoints_file": str(endpoints_file),
                "executed_tools": [],
                "tool_results": {},
            }

        tool_results: dict[str, dict] = {}

        for tool_name, tool_config in endpoints_tools.items():
            # 根据模板获取 input_type（默认为 endpoints_file）
            template = get_command_template("vuln_scan", tool_name) or {}
            input_type = template.get("input_type", "endpoints_file")

            if input_type == "endpoints_file":
                command_params = {"endpoints_file": str(endpoints_file)}
            else:
                logger.warning(
                    "工具 %s 使用了暂不支持的 input_type=%s，将跳过",
                    tool_name,
                    input_type,
                )
                continue

            command = build_scan_command(
                tool_name=tool_name,
                scan_type="vuln_scan",
                command_params=command_params,
                tool_config=tool_config,
            )

            raw_timeout = tool_config.get("timeout", 600)
            try:
                timeout = int(raw_timeout)
            except (TypeError, ValueError):
                timeout = 600

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            log_file = vuln_scan_dir / f"{tool_name}_{timestamp}.log"

            result = execute_and_wait(
                tool_name=tool_name,
                command=command,
                timeout=timeout,
                log_file=str(log_file),
            )

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
            "executed_tools": list(endpoints_tools.keys()),
            "tool_results": tool_results,
        }

    except Exception as e:
        logger.exception("漏洞扫描失败: %s", e)
        raise

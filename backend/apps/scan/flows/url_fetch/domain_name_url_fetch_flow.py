"""
基于 Target 根域名的 URL 被动收集 Flow

用于 waymore 等被动收集工具：
- 输入：Target 的根域名（target_name，如 example.com）
- 工具会自动从第三方源（Wayback Machine、Common Crawl 等）查询该域名及其子域名的历史 URL
- 不需要遍历子域名列表，工具内部会处理 *.example.com

注意：
- 此 Flow 只对 DOMAIN 类型 Target 有效
- IP 和 CIDR 类型会自动跳过（被动收集工具不支持）
"""

# Django 环境初始化
from apps.common.prefect_django_setup import setup_django_for_prefect

import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict

from prefect import flow

from apps.common.validators import validate_domain
from apps.scan.tasks.url_fetch import run_url_fetcher_task
from apps.scan.utils import build_scan_command


logger = logging.getLogger(__name__)


@flow(name="domain_name_url_fetch_flow", log_prints=True)
def domain_name_url_fetch_flow(
    scan_id: int,
    target_id: int,
    output_dir: str,
    domain_name_tools: Dict[str, dict],
    provider,
) -> dict:
    """
    基于 Target 根域名执行 URL 被动收集（当前主要用于 waymore）

    执行流程：
    1. 校验 Target 类型（IP/CIDR 类型跳过）
    2. 使用传入的工具列表对根域名执行被动收集
    3. 工具内部会自动查询该域名及其子域名的历史 URL
    4. 汇总结果文件列表

    Args:
        scan_id: 扫描 ID
        target_id: 目标 ID
        output_dir: 输出目录
        domain_name_tools: 被动收集工具配置（如 waymore）
        provider: TargetProvider 实例

    注意：
    - 此 Flow 只对 DOMAIN 类型 Target 有效
    - IP 和 CIDR 类型会自动跳过（waymore 等工具不支持）
    - 工具会自动收集 *.target_name 的所有历史 URL，无需遍历子域名
    """
    from apps.scan.utils import user_log

    try:
        # 从 provider 获取 target_name
        target_name = provider.get_target_name()

        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # 检查 Target 类型，IP/CIDR 类型跳过
        from apps.targets.services import TargetService
        from apps.targets.models import Target

        target_service = TargetService()
        target = target_service.get_target(target_id)

        if target and target.type != Target.TargetType.DOMAIN:
            logger.info(
                "跳过 domain_name URL 获取: Target 类型为 %s (ID=%d, Name=%s)，waymore 等工具仅适用于域名类型",
                target.type, target_id, target_name
            )
            return {
                "success": True,
                "result_files": [],
                "failed_tools": [],
                "successful_tools": [],
            }

        # 复用公共域名校验逻辑，确保 target_name 是合法域名
        validate_domain(target_name)

        logger.info(
            "开始基于 domain_name 的 URL 获取 - Target: %s, Tools: %s",
            target_name,
            ", ".join(domain_name_tools.keys()) if domain_name_tools else "无",
        )

        futures: dict[str, object] = {}
        failed_tools: list[dict] = []

        # 提交所有基于域名的 URL 获取任务
        for tool_name, tool_config in domain_name_tools.items():
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            short_uuid = uuid.uuid4().hex[:4]
            output_file = str(output_path / f"{tool_name}_{timestamp}_{short_uuid}.txt")

            command_params = {
                "domain_name": target_name,
                "output_file": output_file,
            }

            try:
                command = build_scan_command(
                    tool_name=tool_name,
                    scan_type="url_fetch",
                    command_params=command_params,
                    tool_config=tool_config,
                )
            except Exception as e:
                logger.error("构建 %s 命令失败: %s", tool_name, e)
                failed_tools.append({"tool": tool_name, "reason": f"命令构建失败: {e}"})
                continue

            # 计算超时时间：domain_name 模式下，没有行数统计，auto 使用固定超时
            raw_timeout = tool_config.get("timeout", 3600)
            timeout = 3600
            if isinstance(raw_timeout, str) and raw_timeout == "auto":
                timeout = 3600
                logger.info(
                    "工具 %s 使用固定自动超时: %d 秒 (domain_name 模式)",
                    tool_name,
                    timeout,
                )
            else:
                try:
                    timeout = int(raw_timeout)
                except (TypeError, ValueError):
                    logger.warning(
                        "工具 %s 的 timeout 配置无效(%s)，将使用默认 3600 秒",
                        tool_name,
                        raw_timeout,
                    )
                    timeout = 3600

            logger.info(
                "提交任务 - 工具: %s, domain_name: %s, 超时: %d秒",
                tool_name,
                target_name,
                timeout,
            )

            # 记录工具开始执行日志
            user_log(scan_id, "url_fetch", f"Running {tool_name}: {command}")

            future = run_url_fetcher_task.submit(
                tool_name=tool_name,
                command=command,
                timeout=timeout,
                output_file=output_file,
            )
            futures[tool_name] = future

        result_files: list[str] = []
        successful_tools: list[str] = []

        # 收集执行结果
        for tool_name, future in futures.items():
            try:
                result = future.result()
                if result and result.get("success"):
                    result_files.append(result["output_file"])
                    successful_tools.append(tool_name)
                    url_count = result.get("url_count", 0)
                    logger.info(
                        "✓ 工具 %s 执行成功 - 发现 URL: %d",
                        tool_name,
                        url_count,
                    )
                    user_log(scan_id, "url_fetch", f"{tool_name} completed: found {url_count} urls")
                else:
                    reason = "未生成结果或无有效 URL"
                    failed_tools.append(
                        {
                            "tool": tool_name,
                            "reason": reason,
                        }
                    )
                    logger.warning("⚠️ 工具 %s 未生成有效结果", tool_name)
                    user_log(scan_id, "url_fetch", f"{tool_name} failed: {reason}", "error")
            except Exception as e:
                reason = str(e)
                failed_tools.append({"tool": tool_name, "reason": reason})
                logger.warning("⚠️ 工具 %s 执行失败: %s", tool_name, e)
                user_log(scan_id, "url_fetch", f"{tool_name} failed: {reason}", "error")

        logger.info(
            "基于 domain_name 的 URL 获取完成 - 成功工具: %s, 失败工具: %s",
            successful_tools or "无",
            [f["tool"] for f in failed_tools] or "无",
        )

        return {
            "success": True,
            "result_files": result_files,
            "failed_tools": failed_tools,
            "successful_tools": successful_tools,
        }

    except Exception as e:
        logger.error("domain_name URL 获取失败: %s", e, exc_info=True)
        return {
            "success": False,
            "result_files": [],
            "failed_tools": [
                {"tool": "domain_name_url_fetch_flow", "reason": str(e)},
            ],
            "successful_tools": [],
        }

"""
子域名发现扫描 Flow

负责编排子域名发现扫描的完整流程

架构：
- Flow 负责编排多个原子 Task
- 支持并行执行扫描工具
- 每个 Task 可独立重试
- 配置由 YAML 解析

增强流程（4 阶段）：
    Stage 1: 被动收集（并行） - 必选
    Stage 2: 字典爆破（可选） - 子域名字典爆破
    Stage 3: 变异生成 + 验证（可选） - dnsgen + 通用存活验证
    Stage 4: DNS 存活验证（可选） - 通用存活验证

各阶段可灵活开关，最终结果根据实际执行的阶段动态决定
"""

import logging
import subprocess
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

from prefect import flow

# Django 环境初始化（导入即生效，pylint: disable=unused-import）
from apps.common.prefect_django_setup import setup_django_for_prefect  # noqa: F401
from apps.common.normalizer import normalize_domain
from apps.common.validators import validate_domain
from apps.engine.services.wordlist_service import WordlistService
from apps.scan.handlers.scan_flow_handlers import (
    on_scan_flow_completed,
    on_scan_flow_failed,
    on_scan_flow_running,
)
from apps.scan.utils import (
    build_scan_command,
    ensure_wordlist_local,
    user_log,
    wait_for_system_load,
)

logger = logging.getLogger(__name__)

# 泛解析检测配置
_SAMPLE_MULTIPLIER = 100  # 采样数量 = 原文件 × 100
_EXPANSION_THRESHOLD = 50  # 膨胀阈值 = 原文件 × 50
_SAMPLE_TIMEOUT = 7200  # 采样超时 2 小时


@dataclass
class ScanContext:
    """扫描上下文，用于在各阶段间传递状态"""
    scan_id: int
    target_id: int
    domain_name: str
    result_dir: Path
    timestamp: str
    current_result: str = ""
    executed_tasks: list = field(default_factory=list)
    failed_tools: list = field(default_factory=list)
    successful_tools: list = field(default_factory=list)


def _validate_and_normalize_target(target_name: str) -> str:
    """验证并规范化目标域名"""
    try:
        normalized_target = normalize_domain(target_name)
        validate_domain(normalized_target)
        logger.debug("域名验证通过: %s -> %s", target_name, normalized_target)
        return normalized_target
    except ValueError as e:
        raise ValueError(f"无效的目标域名: {target_name} - {e}") from e


def _count_lines(file_path: str) -> int:
    """统计文件非空行数"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return sum(1 for line in f if line.strip())
    except OSError as e:
        logger.warning("统计文件行数失败: %s - %s", file_path, e)
        return 0


def _merge_files(file_list: list, output_file: str) -> str:
    """合并多个文件并去重"""
    domains = set()
    for f in file_list:
        if f and Path(f).exists():
            with open(f, 'r', encoding='utf-8', errors='ignore') as fp:
                for line in fp:
                    line = line.strip()
                    if line:
                        domains.add(line)

    with open(output_file, 'w', encoding='utf-8') as fp:
        for domain in sorted(domains):
            fp.write(domain + '\n')

    logger.info("合并完成: %d 个域名 -> %s", len(domains), output_file)
    return output_file


def _calculate_auto_timeout(file_path: str, multiplier: int = 3, default: int = 3600) -> int:
    """根据文件行数计算超时时间"""
    try:
        with open(file_path, 'rb') as f:
            line_count = sum(1 for _ in f)
        return line_count * multiplier if line_count > 0 else default
    except OSError:
        return default


def _run_single_tool(
    tool_name: str,
    tool_config: dict,
    command_params: dict,
    result_dir: Path,
    scan_id: Optional[int] = None,
    scan_type: str = 'subdomain_discovery'
) -> str:
    """运行单个扫描工具，返回输出文件路径，失败返回空字符串"""
    from apps.scan.tasks.subdomain_discovery import run_subdomain_discovery_task

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    short_uuid = uuid.uuid4().hex[:4]
    output_file = str(result_dir / f"{tool_name}_{timestamp}_{short_uuid}.txt")
    command_params['output_file'] = output_file

    try:
        command = build_scan_command(
            tool_name=tool_name,
            scan_type=scan_type,
            command_params=command_params,
            tool_config=tool_config
        )
    except (ValueError, KeyError) as e:
        logger.error("构建 %s 命令失败: %s", tool_name, e)
        return ""

    timeout = tool_config.get('timeout', 3600)
    if timeout == 'auto':
        timeout = 3600

    logger.info("执行 %s: %s", tool_name, command)
    if scan_id:
        user_log(scan_id, scan_type, f"Running {tool_name}: {command}")

    try:
        result = run_subdomain_discovery_task(
            tool=tool_name,
            command=command,
            timeout=timeout,
            output_file=output_file
        )
        return result if result else ""
    except (subprocess.TimeoutExpired, OSError) as e:
        logger.warning("%s 执行失败: %s", tool_name, e)
        return ""


def _run_scans_parallel(
    enabled_tools: dict,
    domain_name: str,
    result_dir: Path,
    scan_id: int,
    provider_config_path: Optional[str] = None
) -> tuple[list, list, list]:
    """并行运行所有启用的子域名扫描工具"""
    from apps.scan.tasks.subdomain_discovery import run_subdomain_discovery_task

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    futures = {}
    failed_tools = []

    for tool_name, tool_config in enabled_tools.items():
        short_uuid = uuid.uuid4().hex[:4]
        output_file = str(result_dir / f"{tool_name}_{timestamp}_{short_uuid}.txt")

        command_params = {'domain': domain_name, 'output_file': output_file}
        if tool_name == 'subfinder' and provider_config_path:
            command_params['provider_config'] = provider_config_path

        try:
            command = build_scan_command(
                tool_name=tool_name,
                scan_type='subdomain_discovery',
                command_params=command_params,
                tool_config=tool_config
            )
        except (ValueError, KeyError) as e:
            logger.error("构建 %s 命令失败: %s", tool_name, e)
            failed_tools.append({'tool': tool_name, 'reason': f'命令构建失败: {e}'})
            continue

        timeout = tool_config.get('timeout', 600)
        if timeout == 'auto':
            timeout = 600
            logger.info("✓ 工具 %s 使用默认 timeout: %d秒", tool_name, timeout)

        logger.debug("提交任务 - 工具: %s, 超时: %ds, 输出: %s", tool_name, timeout, output_file)
        user_log(scan_id, "subdomain_discovery", f"Running {tool_name}: {command}")

        future = run_subdomain_discovery_task.submit(
            tool=tool_name,
            command=command,
            timeout=timeout,
            output_file=output_file
        )
        futures[tool_name] = future

    if not futures:
        logger.warning("所有扫描工具均无法启动 - 目标: %s", domain_name)
        return [], [{'tool': 'all', 'reason': '所有工具均无法启动'}], []

    result_files = []
    for tool_name, future in futures.items():
        try:
            result = future.result()
            if result:
                result_files.append(result)
                logger.info("✓ 扫描工具 %s 执行成功: %s", tool_name, result)
                user_log(scan_id, "subdomain_discovery", f"{tool_name} completed")
            else:
                failed_tools.append({'tool': tool_name, 'reason': '未生成结果文件'})
                logger.warning("⚠️ 扫描工具 %s 未生成结果文件", tool_name)
                user_log(scan_id, "subdomain_discovery", f"{tool_name} failed: no output", "error")
        except (subprocess.TimeoutExpired, OSError) as e:
            failed_tools.append({'tool': tool_name, 'reason': str(e)})
            logger.warning("⚠️ 扫描工具 %s 执行失败: %s", tool_name, e)
            user_log(scan_id, "subdomain_discovery", f"{tool_name} failed: {e}", "error")

    successful_tools = [name for name in futures if name not in [f['tool'] for f in failed_tools]]

    logger.info(
        "✓ 扫描工具并行执行完成 - 成功: %d/%d",
        len(result_files), len(futures)
    )

    return result_files, failed_tools, successful_tools


def _generate_provider_config(result_dir: Path, scan_id: int) -> Optional[str]:
    """为 subfinder 生成第三方数据源配置"""
    try:
        from apps.scan.services.subfinder_provider_config_service import (
            SubfinderProviderConfigService,
        )
        config_path = SubfinderProviderConfigService().generate(str(result_dir))
        if config_path:
            logger.info("Provider 配置文件已生成: %s", config_path)
            user_log(scan_id, "subdomain_discovery", "Provider config generated for subfinder")
        return config_path
    except (ImportError, OSError) as e:
        logger.warning("生成 Provider 配置文件失败: %s", e)
        return None


def _run_stage1_passive(ctx: ScanContext, enabled_tools: dict, provider_config: Optional[str]):
    """Stage 1: 被动收集（并行）"""
    if not enabled_tools:
        return

    logger.info("=" * 40)
    logger.info("Stage 1: 被动收集（并行）")
    logger.info("=" * 40)
    logger.info("启用工具: %s", ', '.join(enabled_tools.keys()))
    user_log(
        ctx.scan_id, "subdomain_discovery",
        f"Stage 1: passive collection ({', '.join(enabled_tools.keys())})"
    )

    result_files, failed, successful = _run_scans_parallel(
        enabled_tools=enabled_tools,
        domain_name=ctx.domain_name,
        result_dir=ctx.result_dir,
        scan_id=ctx.scan_id,
        provider_config_path=provider_config
    )

    ctx.failed_tools.extend(failed)
    ctx.successful_tools.extend(successful)
    ctx.executed_tasks.extend([f'passive ({tool})' for tool in successful])

    # 合并结果
    ctx.current_result = str(ctx.result_dir / f"subs_passive_{ctx.timestamp}.txt")
    if result_files:
        ctx.current_result = _merge_files(result_files, ctx.current_result)
        ctx.executed_tasks.append('merge_passive')
    else:
        Path(ctx.current_result).touch()


def _run_stage2_bruteforce(ctx: ScanContext, bruteforce_config: dict):
    """Stage 2: 字典爆破（可选）"""
    if not bruteforce_config.get('enabled', False):
        return

    logger.info("=" * 40)
    logger.info("Stage 2: 字典爆破")
    logger.info("=" * 40)
    user_log(ctx.scan_id, "subdomain_discovery", "Stage 2: bruteforce")

    tool_config = bruteforce_config.get('subdomain_bruteforce', {})
    wordlist_name = tool_config.get('wordlist_name', 'dns_wordlist.txt')

    try:
        local_wordlist_path = ensure_wordlist_local(wordlist_name)

        # 计算 timeout
        timeout_value = tool_config.get('timeout', 3600)
        if timeout_value == 'auto':
            wordlist = WordlistService().get_wordlist_by_name(wordlist_name)
            line_count = getattr(wordlist, 'line_count', None) if wordlist else None
            if line_count is None:
                line_count = _calculate_auto_timeout(local_wordlist_path, 1, 0)
            timeout_value = int(line_count) * 3 if line_count else 3600
            tool_config = {**tool_config, 'timeout': timeout_value}

        result = _run_single_tool(
            tool_name='subdomain_bruteforce',
            tool_config=tool_config,
            command_params={'domain': ctx.domain_name, 'wordlist': local_wordlist_path},
            result_dir=ctx.result_dir,
            scan_id=ctx.scan_id
        )

        if result:
            ctx.current_result = _merge_files(
                [ctx.current_result, result],
                str(ctx.result_dir / f"subs_merged_{ctx.timestamp}.txt")
            )
            ctx.successful_tools.append('subdomain_bruteforce')
            ctx.executed_tasks.append('bruteforce')
            logger.info("✓ subdomain_bruteforce 执行完成")
            user_log(ctx.scan_id, "subdomain_discovery", "subdomain_bruteforce completed")
        else:
            ctx.failed_tools.append({'tool': 'subdomain_bruteforce', 'reason': '执行失败'})
            logger.warning("⚠️ subdomain_bruteforce 执行失败")
            user_log(ctx.scan_id, "subdomain_discovery", "subdomain_bruteforce failed", "error")

    except (ValueError, OSError) as exc:
        ctx.failed_tools.append({'tool': 'subdomain_bruteforce', 'reason': str(exc)})
        logger.warning("字典准备失败，跳过字典爆破: %s", exc)
        user_log(ctx.scan_id, "subdomain_discovery", f"subdomain_bruteforce failed: {exc}", "error")


def _run_stage3_permutation(ctx: ScanContext, permutation_config: dict):
    """Stage 3: 变异生成 + 验证（可选）"""
    if not permutation_config.get('enabled', False):
        return

    logger.info("=" * 40)
    logger.info("Stage 3: 变异生成 + 存活验证（流式管道）")
    logger.info("=" * 40)
    user_log(ctx.scan_id, "subdomain_discovery", "Stage 3: permutation + resolve")

    tool_config = permutation_config.get('subdomain_permutation_resolve', {})
    before_count = _count_lines(ctx.current_result)

    sample_size = before_count * _SAMPLE_MULTIPLIER
    max_allowed = before_count * _EXPANSION_THRESHOLD
    sample_output = str(ctx.result_dir / f"subs_permuted_sample_{ctx.timestamp}.txt")

    sample_cmd = (
        f"cat {ctx.current_result} | dnsgen - | head -n {sample_size} | "
        f"puredns resolve -r /app/backend/resources/resolvers.txt "
        f"--write {sample_output} --wildcard-tests 50 --wildcard-batch 1000000 --quiet"
    )

    logger.info(
        "泛解析采样检测: 原文件 %d 个, 采样 %d 个, 阈值 %d 个",
        before_count, sample_size, max_allowed
    )

    try:
        subprocess.run(
            sample_cmd,
            shell=True,  # noqa: S602
            timeout=_SAMPLE_TIMEOUT,
            check=False,
            capture_output=True
        )
        sample_count = _count_lines(sample_output) if Path(sample_output).exists() else 0

        logger.info(
            "采样结果: %d 个域名存活 (原文件: %d, 阈值: %d)",
            sample_count, before_count, max_allowed
        )

        if sample_count > max_allowed:
            ratio = sample_count / before_count if before_count > 0 else sample_count
            logger.warning(
                "跳过变异: 采样检测到泛解析 (%d > %d, 膨胀率 %.1fx)",
                sample_count, max_allowed, ratio
            )
            ctx.failed_tools.append({
                'tool': 'subdomain_permutation_resolve',
                'reason': f"采样检测到泛解析 (膨胀率 {ratio:.1f}x)"
            })
            user_log(
                ctx.scan_id, "subdomain_discovery",
                f"subdomain_permutation_resolve skipped: wildcard (ratio {ratio:.1f}x)",
                "warning"
            )
            return

        # 采样通过，执行完整变异
        logger.info("采样检测通过，执行完整变异...")
        result = _run_single_tool(
            tool_name='subdomain_permutation_resolve',
            tool_config=tool_config,
            command_params={'input_file': ctx.current_result},
            result_dir=ctx.result_dir,
            scan_id=ctx.scan_id
        )

        if result:
            ctx.current_result = _merge_files(
                [ctx.current_result, result],
                str(ctx.result_dir / f"subs_with_permuted_{ctx.timestamp}.txt")
            )
            ctx.successful_tools.append('subdomain_permutation_resolve')
            ctx.executed_tasks.append('permutation')
            logger.info("✓ subdomain_permutation_resolve 执行完成")
            user_log(ctx.scan_id, "subdomain_discovery", "subdomain_permutation_resolve completed")
        else:
            ctx.failed_tools.append({'tool': 'subdomain_permutation_resolve', 'reason': '执行失败'})
            logger.warning("⚠️ subdomain_permutation_resolve 执行失败")
            user_log(
                ctx.scan_id, "subdomain_discovery",
                "subdomain_permutation_resolve failed", "error"
            )

    except subprocess.TimeoutExpired:
        ctx.failed_tools.append({'tool': 'subdomain_permutation_resolve', 'reason': '采样检测超时'})
        logger.warning("采样检测超时 (%d秒)，跳过变异", _SAMPLE_TIMEOUT)
        user_log(
            ctx.scan_id, "subdomain_discovery",
            "subdomain_permutation_resolve failed: timeout", "error"
        )
    except OSError as e:
        ctx.failed_tools.append({'tool': 'subdomain_permutation_resolve', 'reason': f'采样检测失败: {e}'})
        logger.warning("采样检测失败: %s，跳过变异", e)
        user_log(ctx.scan_id, "subdomain_discovery", f"subdomain_permutation_resolve failed: {e}", "error")


def _run_stage4_resolve(ctx: ScanContext, resolve_config: dict):
    """Stage 4: DNS 存活验证（可选）"""
    if not resolve_config.get('enabled', False):
        return

    logger.info("=" * 40)
    logger.info("Stage 4: DNS 存活验证")
    logger.info("=" * 40)
    user_log(ctx.scan_id, "subdomain_discovery", "Stage 4: DNS resolve")

    tool_config = resolve_config.get('subdomain_resolve', {})

    # 动态计算 timeout
    timeout_value = tool_config.get('timeout', 3600)
    if timeout_value == 'auto':
        timeout_value = _calculate_auto_timeout(ctx.current_result, 3, 3600)
        tool_config = {**tool_config, 'timeout': timeout_value}

    result = _run_single_tool(
        tool_name='subdomain_resolve',
        tool_config=tool_config,
        command_params={'input_file': ctx.current_result},
        result_dir=ctx.result_dir,
        scan_id=ctx.scan_id
    )

    if result:
        ctx.current_result = result
        ctx.successful_tools.append('subdomain_resolve')
        ctx.executed_tasks.append('resolve')
        logger.info("✓ subdomain_resolve 执行完成")
        user_log(ctx.scan_id, "subdomain_discovery", "subdomain_resolve completed")
    else:
        ctx.failed_tools.append({'tool': 'subdomain_resolve', 'reason': '执行失败'})
        logger.warning("⚠️ subdomain_resolve 执行失败")
        user_log(ctx.scan_id, "subdomain_discovery", "subdomain_resolve failed", "error")


def _save_to_database(ctx: ScanContext) -> int:
    """Final: 保存到数据库"""
    from apps.scan.tasks.subdomain_discovery import merge_and_validate_task, save_domains_task

    logger.info("=" * 40)
    logger.info("Final: 保存到数据库")
    logger.info("=" * 40)

    final_file = merge_and_validate_task(
        result_files=[ctx.current_result],
        result_dir=str(ctx.result_dir)
    )

    save_result = save_domains_task(
        domains_file=final_file,
        scan_id=ctx.scan_id,
        target_id=ctx.target_id
    )

    ctx.executed_tasks.append('save_domains')
    return save_result.get('processed_records', 0)


def _empty_result(scan_id: int, target: str, scan_workspace_dir: str) -> dict:
    """返回空结果"""
    return {
        'success': True,
        'scan_id': scan_id,
        'target': target,
        'scan_workspace_dir': scan_workspace_dir,
        'total': 0,
        'executed_tasks': [],
        'tool_stats': {
            'total': 0,
            'successful': 0,
            'failed': 0,
            'successful_tools': [],
            'failed_tools': []
        }
    }


@flow(
    name="subdomain_discovery",
    log_prints=True,
    on_running=[on_scan_flow_running],
    on_completion=[on_scan_flow_completed],
    on_failure=[on_scan_flow_failed],
)
def subdomain_discovery_flow(
    scan_id: int,
    target_name: str,
    target_id: int,
    scan_workspace_dir: str,
    enabled_tools: dict,
) -> dict:
    """子域名发现扫描流程

    工作流程（4 阶段）：
        Stage 1: 被动收集（并行） - 必选
        Stage 2: 字典爆破（可选） - 子域名字典爆破
        Stage 3: 变异生成 + 验证（可选） - dnsgen + 通用存活验证
        Stage 4: DNS 存活验证（可选） - 通用存活验证
        Final: 保存到数据库

    注意：
        - 子域名发现只对 DOMAIN 类型目标有意义
        - IP 和 CIDR 类型目标会自动跳过
    """
    try:
        wait_for_system_load(context="subdomain_discovery_flow")

        # 参数验证
        if scan_id is None:
            raise ValueError("scan_id 不能为空")
        if target_id is None:
            raise ValueError("target_id 不能为空")
        if not scan_workspace_dir:
            raise ValueError("scan_workspace_dir 不能为空")
        if enabled_tools is None:
            raise ValueError("enabled_tools 不能为空")

        if not target_name:
            logger.warning("未提供目标域名，跳过子域名发现扫描")
            return _empty_result(scan_id, '', scan_workspace_dir)

        # 检查 Target 类型
        from apps.targets.models import Target
        from apps.targets.services import TargetService

        target = TargetService().get_target(target_id)
        if target and target.type != Target.TargetType.DOMAIN:
            logger.info(
                "跳过子域名发现扫描: Target 类型为 %s (ID=%d)，仅适用于域名类型",
                target.type, target_id
            )
            return _empty_result(scan_id, target_name, scan_workspace_dir)

        # 验证并规范化目标域名
        try:
            domain_name = _validate_and_normalize_target(target_name)
        except ValueError as e:
            logger.warning("目标域名无效，跳过子域名发现扫描: %s", e)
            return _empty_result(scan_id, target_name, scan_workspace_dir)

        # 准备工作目录
        from apps.scan.utils import setup_scan_directory
        result_dir = setup_scan_directory(scan_workspace_dir, 'subdomain_discovery')

        logger.info(
            "开始子域名发现扫描 - Scan ID: %s, Domain: %s, Workspace: %s",
            scan_id, domain_name, scan_workspace_dir
        )
        user_log(scan_id, "subdomain_discovery", f"Starting subdomain discovery for {domain_name}")

        # 解析配置
        scan_config = enabled_tools
        passive_tools = scan_config.get('passive_tools', {})
        bruteforce_config = scan_config.get('bruteforce', {})
        permutation_config = scan_config.get('permutation', {})
        resolve_config = scan_config.get('resolve', {})

        enabled_passive_tools = {
            k: v for k, v in passive_tools.items()
            if v.get('enabled', True)
        }

        # 创建扫描上下文
        ctx = ScanContext(
            scan_id=scan_id,
            target_id=target_id,
            domain_name=domain_name,
            result_dir=result_dir,
            timestamp=datetime.now().strftime('%Y%m%d_%H%M%S')
        )

        # 生成 Provider 配置
        provider_config = _generate_provider_config(result_dir, scan_id)

        # 执行各阶段
        _run_stage1_passive(ctx, enabled_passive_tools, provider_config)
        _run_stage2_bruteforce(ctx, bruteforce_config)
        _run_stage3_permutation(ctx, permutation_config)
        _run_stage4_resolve(ctx, resolve_config)

        # 保存到数据库
        processed_domains = _save_to_database(ctx)

        logger.info("✓ 子域名发现扫描完成")
        user_log(
            scan_id, "subdomain_discovery",
            f"subdomain_discovery completed: found {processed_domains} subdomains"
        )

        # 计算工具总数
        total_tools = len(enabled_passive_tools)
        if bruteforce_config.get('enabled', False):
            total_tools += 1
        if permutation_config.get('enabled', False):
            total_tools += 1
        if resolve_config.get('enabled', False):
            total_tools += 1

        return {
            'success': True,
            'scan_id': scan_id,
            'target': domain_name,
            'scan_workspace_dir': scan_workspace_dir,
            'total': processed_domains,
            'executed_tasks': ctx.executed_tasks,
            'tool_stats': {
                'total': total_tools,
                'successful': len(ctx.successful_tools),
                'failed': len(ctx.failed_tools),
                'successful_tools': ctx.successful_tools,
                'failed_tools': ctx.failed_tools
            }
        }

    except ValueError as e:
        logger.error("配置错误: %s", e)
        raise
    except RuntimeError as e:
        logger.error("运行时错误: %s", e)
        raise

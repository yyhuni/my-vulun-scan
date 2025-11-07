"""
命令池执行管理器使用示例

演示如何使用 CommandPoolExecutor 并行执行扫描命令
"""

import logging
from pathlib import Path

from apps.scan.utils.command_pool_executor import (
    get_command_pool,
    CommandTask,
    CommandResult
)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def example_1_basic_usage():
    """
    示例 1: 基本用法 - 并行执行多个命令（简化接口）
    """
    logger.info("=" * 60)
    logger.info("示例 1: 基本用法 - 简化接口")
    logger.info("=" * 60)
    
    # 获取命令池管理器（单例，配置通过 Django settings 管理）
    pool = get_command_pool()
    
    # 准备输出目录
    output_dir = Path('/tmp/scan_results')
    output_dir.mkdir(exist_ok=True)
    
    # 创建任务列表
    tasks = [
        CommandTask(
            name='echo_test_1',
            command='echo "Test 1" > /tmp/scan_results/test1.txt',
            output_file=output_dir / 'test1.txt',
            validate_output=True
        ),
        CommandTask(
            name='echo_test_2',
            command='echo "Test 2" > /tmp/scan_results/test2.txt',
            output_file=output_dir / 'test2.txt',
            validate_output=True
        ),
        CommandTask(
            name='echo_test_3',
            command='echo "Test 3" > /tmp/scan_results/test3.txt',
            output_file=output_dir / 'test3.txt',
            validate_output=True
        ),
    ]
    
    # 并行执行所有任务
    results = pool.execute_tasks(tasks)
    
    # 处理结果
    success_count = sum(1 for r in results if r.success)
    logger.info(f"执行完成: 成功 {success_count}/{len(results)} 个任务")
    
    for result in results:
        if result.success:
            logger.info(f"✓ {result.task.name}: 成功 (耗时: {result.duration:.2f}秒)")
        else:
            logger.error(f"✗ {result.task.name}: 失败 - {result.error}")


def example_2_with_progress_callback():
    """
    示例 2: 使用进度回调
    """
    logger.info("=" * 60)
    logger.info("示例 2: 使用进度回调")
    logger.info("=" * 60)
    
    pool = get_command_pool()
    output_dir = Path('/tmp/scan_results')
    
    tasks = [
        CommandTask(
            name=f'sleep_test_{i}',
            command=f'sleep {i} && echo "Done {i}" > /tmp/scan_results/sleep{i}.txt',
            output_file=output_dir / f'sleep{i}.txt'
        )
        for i in range(1, 4)
    ]
    
    # 定义进度回调
    def on_progress(result: CommandResult):
        status = "✓" if result.success else "✗"
        logger.info(
            f"[进度回调] {status} {result.task.name} - "
            f"耗时 {result.duration:.2f}秒"
        )
    
    # 执行任务
    results = pool.execute_tasks(tasks, progress_callback=on_progress)
    
    logger.info(f"所有任务完成: {len(results)} 个")


def example_3_handle_failures():
    """
    示例 3: 处理失败的任务
    """
    logger.info("=" * 60)
    logger.info("示例 3: 处理失败的任务")
    logger.info("=" * 60)
    
    pool = get_command_pool()
    output_dir = Path('/tmp/scan_results')
    
    # 创建一些会失败的任务
    tasks = [
        CommandTask(
            name='success_task',
            command='echo "Success" > /tmp/scan_results/success.txt',
            output_file=output_dir / 'success.txt'
        ),
        CommandTask(
            name='fail_task',
            command='false',  # 这个命令会失败
            output_file=output_dir / 'fail.txt'
        ),
        CommandTask(
            name='timeout_task',
            command='sleep 100',  # 这个会超时（使用全局默认超时）
            output_file=output_dir / 'timeout.txt'
        ),
    ]
    
    # 执行任务
    results = pool.execute_tasks(tasks)
    
    # 分类处理结果
    for result in results:
        if result.success:
            logger.info(f"✓ {result.task.name}: 成功")
        else:
            logger.warning(f"✗ {result.task.name}: {result.error}")




def example_5_single_command():
    """
    示例 5: 执行单个命令
    """
    logger.info("=" * 60)
    logger.info("示例 5: 执行单个命令")
    logger.info("=" * 60)
    
    pool = get_command_pool()
    output_file = Path('/tmp/scan_results/single.txt')
    
    # 执行单个命令（使用全局默认超时）
    result = pool.execute_single_command(
        name='single_test',
        command='echo "Single command test" > /tmp/scan_results/single.txt',
        output_file=output_file
    )
    
    if result.success:
        logger.info(f"✓ 命令执行成功: {result.output_file}")
    else:
        logger.error(f"✗ 命令执行失败: {result.error}")


def main():
    """
    运行所有示例
    """
    try:
        # 准备输出目录
        output_dir = Path('/tmp/scan_results')
        output_dir.mkdir(exist_ok=True)
        
        # 运行示例
        example_1_basic_usage()
        print()
        
        example_2_with_progress_callback()
        print()
        
        example_3_handle_failures()
        print()
        
        example_5_single_command()
        print()
        
        example_4_get_statistics()
        
        logger.info("=" * 60)
        logger.info("所有示例执行完成！")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"示例执行失败: {e}", exc_info=True)


if __name__ == '__main__':
    main()


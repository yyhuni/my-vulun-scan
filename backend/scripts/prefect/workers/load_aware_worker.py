"""基于本机 CPU/内存负载控制 Prefect Work Pool 暂停/恢复的简单包装脚本。

运行流程：
- 启动一个普通的 Prefect Worker 进程（受 WORKER_LIMIT 控制并发）
- 周期性读取当前机器 CPU / 内存 使用率
- 负载过高时：对当前 Work Pool 调用 `prefect work-pool pause`，阻止继续分发新任务
- 负载恢复时：调用 `prefect work-pool resume`，恢复任务分发
"""

import os
import subprocess
import time

import psutil


def _float_env(name: str, default: float) -> float:
    value = os.environ.get(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def _int_env(name: str, default: int) -> int:
    value = os.environ.get(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def main() -> int:
    pool_name = os.environ.get("PREFECT_WORK_POOL_NAME")
    if not pool_name:
        print("PREFECT_WORK_POOL_NAME is not set", flush=True)
        return 1

    # Worker 自身的最大并发（对应 `prefect worker start --limit`，即单机最多同时跑几个任务）
    limit = os.environ.get("WORKER_LIMIT", "10")

    # 以下阈值都可以通过环境变量覆盖，不配置则使用默认值
    # CPU 高水位：超过该百分比则认为“负载过高”，触发暂停接任务
    cpu_high = _float_env("WORKER_CPU_HIGH", 80.0)
    # CPU 低水位：降到该百分比以下认为“负载恢复”，触发恢复接任务
    cpu_low = _float_env("WORKER_CPU_LOW", 60.0)
    # 内存高水位：超过该百分比也会触发暂停
    mem_high = _float_env("WORKER_MEM_HIGH", 85.0)
    # 负载检查间隔（秒）
    check_interval = _int_env("WORKER_LOAD_CHECK_INTERVAL", 30)

    print(
        f"Starting load-aware worker for pool='{pool_name}', limit={limit}, "
        f"cpu_high={cpu_high}, cpu_low={cpu_low}, mem_high={mem_high}, "
        f"interval={check_interval}s",
        flush=True,
    )

    cmd = [
        "prefect",
        "worker",
        "start",
        "--pool",
        pool_name,
        "--limit",
        str(limit),
    ]

    worker_proc = subprocess.Popen(cmd)
    is_paused = False

    try:
        while True:
            if worker_proc.poll() is not None:
                break

            cpu = psutil.cpu_percent(interval=1.0)
            mem = psutil.virtual_memory().percent

            # 未暂停且负载超过高水位 → 暂停整个 Work Pool 的任务分发
            if not is_paused and (cpu >= cpu_high or mem >= mem_high):
                print(
                    f"High load detected: cpu={cpu:.1f}%, mem={mem:.1f}%. "
                    f"Pausing work pool '{pool_name}'.",
                    flush=True,
                )
                subprocess.run(
                    ["prefect", "work-pool", "pause", pool_name],
                    check=False,
                )
                is_paused = True

            # 已暂停且 CPU 回落到低水位以下 → 恢复 Work Pool，继续分发任务
            elif is_paused and cpu <= cpu_low:
                print(
                    f"Load recovered: cpu={cpu:.1f}%, mem={mem:.1f}%. "
                    f"Resuming work pool '{pool_name}'.",
                    flush=True,
                )
                subprocess.run(
                    ["prefect", "work-pool", "resume", pool_name],
                    check=False,
                )
                is_paused = False

            time.sleep(check_interval)
    finally:
        if worker_proc.poll() is None:
            worker_proc.terminate()
            try:
                worker_proc.wait(timeout=30)
            except subprocess.TimeoutExpired:
                worker_proc.kill()

    return worker_proc.returncode or 0


if __name__ == "__main__":
    raise SystemExit(main())

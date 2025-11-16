### 🟡 问题1: 生成器清理逻辑可能不够健壮

**位置**：`run_and_stream_save_ports_task.py#682-687`

```python
if data_generator is not None:
    try:
        data_generator.close()
        logger.debug("已关闭数据生成器")
    except Exception as gen_close_error:
        logger.error("关闭生成器时出错: %s", gen_close_error)

```

**问题**：

1. 只在`finally`块中清理，但如果生成器**从未创建**（如参数验证失败），会访问未定义变量
2. `data_generator = None`在try块内，初始化失败时不会执行

**修复建议**：

```python
def run_and_stream_save_ports_task(...):
    data_generator = None  # 移到函数顶部

    try:
        # 原有逻辑
        ...
    finally:
        _cleanup_resources(data_generator)

```# 错误处理改进总结

## 日期
2025-11-16

## 改进项目

---

### 1. ⚠️ 命令执行器 - 日志读取异常处理

**文件**: `backend/apps/scan/utils/command_executor.py`

**修改前**：
```python
try:
    with open(log_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        return ''.join(lines[-max_lines:] if len(lines) > max_lines else lines)
except Exception:
    return "(无法读取日志文件)"
```

**问题**：
- ❌ 静默失败，不记录日志
- ❌ 无法判断失败原因
- ❌ 隐藏重要错误信息

**修改后**：
```python
if not log_file.exists():
    logger.debug("日志文件不存在: %s", log_file)
    return ""

if log_file.stat().st_size == 0:
    logger.debug("日志文件为空: %s", log_file)
    return ""

try:
    with open(log_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        return ''.join(lines[-max_lines:] if len(lines) > max_lines else lines)
except UnicodeDecodeError as e:
    logger.warning("日志文件编码错误 (%s): %s", log_file, e)
    return f"(无法读取日志文件: 编码错误 - {e})"
except PermissionError as e:
    logger.warning("日志文件权限不足 (%s): %s", log_file, e)
    return f"(无法读取日志文件: 权限不足)"
except IOError as e:
    logger.warning("日志文件读取IO错误 (%s): %s", log_file, e)
    return f"(无法读取日志文件: IO错误 - {e})"
except Exception as e:
    logger.warning("读取日志文件失败 (%s): %s", log_file, e, exc_info=True)
    return f"(无法读取日志文件: {type(e).__name__} - {e})"
```

**改进效果**：
- ✅ 针对不同异常类型分类处理
- ✅ 详细的错误日志记录（包含文件路径和具体错误）
- ✅ 返回值包含错误类型和原因，便于问题排查
- ✅ 正常情况（文件不存在/为空）使用 debug 级别，避免日志噪音

---

### 2. ⚠️ 流式解析 - 异常处理细化

**文件**: `backend/apps/scan/tasks/port_scan/run_and_stream_save_ports_task.py`

**修改前**：
```python
try:
    for line in execute_stream(cmd=cmd, cwd=cwd, shell=shell, timeout=timeout):
        total_lines += 1
        
        record = _parse_and_validate_line(line)
        if record is None:
            error_lines += 1
            continue
        
        yield record
            
except subprocess.TimeoutExpired as e:
    error_msg = f"流式解析命令输出超时 - 命令执行超过 {timeout} 秒"
    logger.error(error_msg)
    raise RuntimeError(error_msg) from e
except Exception as e:
    logger.error("流式解析命令输出失败: %s", e, exc_info=True)
    raise
```

**问题**：
- ❌ 单条数据解析失败会导致整个任务失败
- ❌ 没有区分可恢复错误和致命错误
- ❌ 部分解析成功的数据可能丢失

**修改后**：
```python
try:
    for line in execute_stream(cmd=cmd, cwd=cwd, shell=shell, timeout=timeout):
        total_lines += 1
        
        try:
            record = _parse_and_validate_line(line)
            if record is None:
                error_lines += 1
                continue
            
            yield record
        
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            # 可恢复错误：记录警告，跳过该条数据，继续处理
            error_lines += 1
            logger.warning(
                "数据解析错误，跳过此行 (行号: %d) - 错误: %s, 原始数据: %s",
                total_lines, e, line[:100]
            )
            continue
            
except subprocess.TimeoutExpired as e:
    error_msg = f"流式解析命令输出超时 - 命令执行超过 {timeout} 秒"
    logger.error(error_msg)
    raise RuntimeError(error_msg) from e

except (IOError, OSError) as e:
    # 致命错误：无法继续读取数据流
    logger.error("流式解析IO错误: %s", e, exc_info=True)
    raise RuntimeError(f"流式解析IO错误: {e}") from e

except (BrokenPipeError, ConnectionError) as e:
    # 致命错误：进程异常终止
    logger.error("流式解析连接错误（进程可能异常终止）: %s", e, exc_info=True)
    raise RuntimeError(f"流式解析连接错误: {e}") from e

except Exception as e:
    # 未预期的异常
    logger.error("流式解析命令输出失败（未预期的异常）: %s", e, exc_info=True)
    raise
```

**改进效果**：
- ✅ **可恢复错误** (JSONDecodeError, ValueError, KeyError)：
  - 记录警告日志（包含行号和原始数据）
  - 跳过该条数据
  - 继续处理后续数据
  - 不影响整体任务执行
  
- ✅ **致命错误** (IOError, OSError, BrokenPipeError, ConnectionError)：
  - 记录详细错误日志（包含堆栈）
  - 抛出 RuntimeError
  - 终止流式处理
  - 保留已处理的数据

- ✅ **超时错误**：
  - 记录错误日志
  - 抛出 RuntimeError
  - 已处理的数据已保存（流式处理特性）

---

## 异常处理策略总结

### 分类原则

#### 1. **可恢复错误** (Recoverable Errors)
- **定义**: 不影响后续处理的局部错误
- **处理**: 记录警告，跳过，继续
- **日志级别**: WARNING
- **示例**: 
  - JSON 解析失败
  - 单条数据验证失败
  - 数据格式错误

#### 2. **致命错误** (Fatal Errors)
- **定义**: 无法继续处理的系统级错误
- **处理**: 记录错误，抛出异常，终止
- **日志级别**: ERROR (with exc_info=True)
- **示例**:
  - IO 错误
  - 进程通信错误
  - 文件权限错误

#### 3. **预期错误** (Expected Errors)
- **定义**: 业务逻辑中可能出现的正常情况
- **处理**: 记录调试信息，优雅处理
- **日志级别**: DEBUG
- **示例**:
  - 文件不存在
  - 空数据
  - 缓存未命中

---

## 最佳实践

### 1. 日志记录原则
```python
# ✅ 好的实践
except PermissionError as e:
    logger.warning("日志文件权限不足 (%s): %s", log_file, e)
    return f"(无法读取日志文件: 权限不足)"

# ❌ 不好的实践  
except Exception:
    return "(无法读取日志文件)"
```

### 2. 异常分类处理
```python
# ✅ 好的实践
except (json.JSONDecodeError, ValueError) as e:
    # 可恢复错误
    logger.warning("数据解析错误，跳过: %s", e)
    continue
except (IOError, OSError) as e:
    # 致命错误
    logger.error("IO错误: %s", e, exc_info=True)
    raise RuntimeError(f"IO错误: {e}") from e

# ❌ 不好的实践
except Exception as e:
    logger.error("错误: %s", e)
    raise
```

### 3. 返回值设计
```python
# ✅ 好的实践
return f"(无法读取日志文件: {type(e).__name__} - {e})"

# ❌ 不好的实践
return "(无法读取日志文件)"
```

---

## 性能影响

### 日志读取异常处理
- **额外开销**: 最小（仅增加异常分类判断）
- **日志量**: 正常情况不增加（debug级别）
- **问题排查**: 显著提升（详细错误信息）

### 流式解析异常处理
- **额外开销**: 最小（try-except 在循环内）
- **数据完整性**: 显著提升（单条错误不影响整体）
- **任务成功率**: 提升（容错性增强）

---

## 测试场景

### 1. 日志文件读取
```bash
# 场景1: 文件不存在
# 预期: debug日志，返回空字符串

# 场景2: 编码错误
# 预期: warning日志，返回 "(无法读取日志文件: 编码错误 - ...)"

# 场景3: 权限不足
# 预期: warning日志，返回 "(无法读取日志文件: 权限不足)"
```

### 2. 流式数据解析
```bash
# 场景1: 单条JSON格式错误
# 预期: warning日志，跳过该条，继续处理后续数据

# 场景2: 进程异常终止
# 预期: error日志，抛出RuntimeError，保留已处理数据

# 场景3: 命令执行超时
# 预期: error日志，抛出RuntimeError，保留已处理数据
```

---

## 相关文件

### 修改的文件
- `backend/apps/scan/utils/command_executor.py`
- `backend/apps/scan/tasks/port_scan/run_and_stream_save_ports_task.py`

### 相关文档
- `/docs/code-review-summary.md` - 代码审查总结
- `/docs/error-handling-improvements.md` - 本文档

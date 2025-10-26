/**
 * MSW Mock 入口文件
 * 在开发环境中启动 MSW
 */

export async function enableMocking() {
  console.log("🚀 [enableMocking] 检查环境...")
  
  // 仅在浏览器环境且开发模式下启用
  if (typeof window === "undefined") {
    console.log("⚠️ [enableMocking] 非浏览器环境，跳过")
    return
  }

  console.log("🌐 [enableMocking] 浏览器环境，加载 worker...")

  const { worker } = await import("./browser")
  console.log("✅ [enableMocking] Worker 加载成功，开始启动...")

  // 启动 worker
  await worker.start({
    onUnhandledRequest: "bypass", // 未处理的请求直接通过
  })
  
  console.log("🎉 [enableMocking] Worker 启动完成！")
}

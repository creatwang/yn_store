/**
 * dispatchRollbackProcess — 非 Workflow 场景下的业务回滚
 *
 * 用法：
 *   await dispatchRollbackProcess(
 *     async () => {
 *       // DB 写操作
 *       return result
 *     },
 *     async (result, error) => {
 *       // 如果 action 失败，执行业务回滚
 *     },
 *   )
 *
 * 与 Workflow 引擎的区别：
 *   - 引擎处理多步编排 + 外部服务调用
 *   - dispatchRollbackProcess 处理单步内的业务回滚
 */
export async function dispatchRollbackProcess<T>(
  action: () => Promise<T>,
  rollback: (result: T | null, error: Error) => Promise<void>,
): Promise<T> {
  let result: T | null = null
  try {
    result = await action()
    return result
  } catch (err) {
    await rollback(result, err as Error)
    throw err
  }
}

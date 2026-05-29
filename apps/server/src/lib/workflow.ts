/**
 * 轻量 Workflow 引擎 — 对齐 Medusa @medusajs/core-flows 模式
 *
 * 官方：createWorkflow(name, fn) + createStep({ name, handler, compensate })
 * 我们：createWorkflow(name, steps[])    + step(name, handler, compensate)
 *
 * 区别：官方用函数闭包传递数据，我们用显式的 input 和 ctx
 * 原因：JS 无法在不 eval 的情况下重新绑定箭头函数闭包
 */

export type StepHandler<I, O> = (ctx: { input: I }) => Promise<O>
export type StepCompensate<I> = (ctx: { input: I }) => Promise<void>

export type StepDef<I, O> = {
  name: string
  handler: StepHandler<I, O>
  compensate?: StepCompensate<I>
}

export type WorkflowDef<I, O> = {
  name: string
  run: (input: I) => Promise<O>
}

export function step<I, O>(
  name: string,
  handler: StepHandler<I, O>,
  compensate?: StepCompensate<I>
): StepDef<I, O> {
  return { name, handler, compensate }
}

export function createWorkflow<I, O>(name: string, steps: StepDef[]): WorkflowDef<I, O> {
  return {
    name,
    async run(input: I): Promise<O> {
      const ctx: Record<string, any> = {}

      for (const s of steps) {
        try {
          const result = await s.handler({ input })
          ctx[s.name] = result
        } catch (err) {
          // 补偿：逆序执行已完成步骤
          const completed = steps.filter((st) => ctx[st.name] !== undefined).reverse()
          for (const done of completed) {
            if (done.compensate) {
              try {
                await done.compensate({ input })
              } catch { /* 补偿失败不阻断 */ }
            }
          }
          throw err
        }
      }

      // 返回最后一个 step 的结果
      return ctx[steps[steps.length - 1]?.name] as O
    },
  }
}

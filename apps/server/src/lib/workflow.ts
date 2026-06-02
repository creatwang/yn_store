/**
 * 轻量 Workflow 引擎 — 对齐 Medusa @medusajs/core-flows 模式
 *
 * 升级（2026-06-02）：
 *   - step handler 可访问前序 step 的输出 (ctx.output)
 *   - step handler 可访问 Provider 注册表 (ctx.providers)
 *   - compensate 可访问 step 已产生的数据
 *   - createWorkflow 接受可选的 provider 配置
 */

import type { ProviderRegistry } from "./providers/types"

// ── Types ──────────────────────────────────────────────────

export interface StepContext<I> {
  input: I
  /** 前序所有 step 的输出，按 step name 索引 */
  output: Record<string, any>
  /** Provider 注册表（来自 createWorkflow 的配置或全局 providers） */
  providers: ProviderRegistry
}

export type StepHandler<I, O> = (ctx: StepContext<I>) => Promise<O>
export type StepCompensate<I> = (ctx: StepContext<I>) => Promise<void>

export interface StepDef<I, O> {
  name: string
  handler: StepHandler<I, O>
  compensate?: StepCompensate<I>
}

export interface WorkflowDef<I, O> {
  name: string
  run: (input: I) => Promise<O>
}

// ── API ────────────────────────────────────────────────────

export function step<I, O>(
  name: string,
  handler: StepHandler<I, O>,
  compensate?: StepCompensate<I>,
): StepDef<I, O> {
  return { name, handler, compensate }
}

export function createWorkflow<I, O>(
  name: string,
  steps: StepDef<any, any>[],
  options?: { providers?: ProviderRegistry },
): WorkflowDef<I, O> {
  const effectiveProviders = options?.providers

  return {
    name,
    async run(input: I): Promise<O> {
      const output: Record<string, any> = {}

      for (const s of steps) {
        const ctx: StepContext<I> = {
          input,
          output,
          providers: effectiveProviders!,
        }
        try {
          const result = await s.handler(ctx)
          output[s.name] = result
        } catch (err) {
          // 补偿：逆序执行已完成步骤的 compensate
          const completed = steps.filter((st) => output[st.name] !== undefined).reverse()
          for (const done of completed) {
            if (done.compensate) {
              try {
                const compCtx: StepContext<I> = {
                  input,
                  output: { ...output },
                  providers: effectiveProviders!,
                }
                await done.compensate(compCtx)
              } catch {
                // 补偿失败不阻断后续补偿
              }
            }
          }
          throw err
        }
      }

      return output[steps[steps.length - 1]?.name] as O
    },
  }
}

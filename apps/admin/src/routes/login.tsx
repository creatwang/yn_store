import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Heading, Input, Label, Text } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { loginSchema, type LoginInput } from "@my-store/validators"
import { useLogin } from "@/hooks/use-auth"
import { toast } from "@medusajs/ui"

export function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      await login.mutateAsync(data)
      toast.success("登录成功")
      navigate("/")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "登录失败")
    }
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-ui-bg-subtle">
      <div className="w-full max-w-md rounded-lg border border-ui-border-base bg-ui-bg-base p-8 shadow-elevation-card-rest">
        <Heading level="h1" className="mb-2">
          登录管理后台
        </Heading>
        <Text className="text-ui-fg-subtle mb-6">
          使用 Medusa 管理员账号登录
        </Text>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <Text className="text-ui-fg-error mt-1 text-sm">
                {errors.email.message}
              </Text>
            )}
          </div>
          <div>
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <Text className="text-ui-fg-error mt-1 text-sm">
                {errors.password.message}
              </Text>
            )}
          </div>
          <Button type="submit" isLoading={isSubmitting || login.isPending}>
            登录
          </Button>
        </form>
      </div>
    </div>
  )
}

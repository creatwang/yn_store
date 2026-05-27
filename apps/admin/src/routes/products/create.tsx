import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Input, Label, Textarea } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router-dom"
import { createProductSchema, type CreateProductInput } from "@my-store/validators"
import { PageContainer, PageHeader } from "@/components/layout/shell"
import { useCreateProduct } from "@/hooks/use-products"
import { toast } from "@medusajs/ui"

export function ProductCreatePage() {
  const navigate = useNavigate()
  const createProduct = useCreateProduct()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: { status: "draft", discountable: true },
  })

  const onSubmit = handleSubmit(async (data) => {
    try {
      const result = await createProduct.mutateAsync(data)
      toast.success("商品已创建")
      navigate(`/products/${result.product.id}`)
    } catch {
      toast.error("创建失败")
    }
  })

  return (
    <PageContainer>
      <PageHeader
        title="新建商品"
        actions={
          <Button variant="secondary" asChild>
            <Link to="/products">返回列表</Link>
          </Button>
        }
      />
      <form
        onSubmit={onSubmit}
        className="max-w-xl flex flex-col gap-4 rounded-lg border border-ui-border-base bg-ui-bg-base p-6"
      >
        <div>
          <Label htmlFor="title">标题 *</Label>
          <Input id="title" {...register("title")} />
          {errors.title && (
            <p className="text-ui-fg-error text-sm">{errors.title.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="handle">Handle（URL 标识）</Label>
          <Input id="handle" placeholder="留空自动生成" {...register("handle")} />
        </div>
        <div>
          <Label htmlFor="subtitle">副标题</Label>
          <Input id="subtitle" {...register("subtitle")} />
        </div>
        <div>
          <Label htmlFor="description">描述</Label>
          <Textarea id="description" rows={4} {...register("description")} />
        </div>
        <div>
          <Label htmlFor="status">状态</Label>
          <select
            id="status"
            className="w-full rounded-md border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm"
            {...register("status")}
          >
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
            <option value="proposed">待审</option>
            <option value="rejected">已拒绝</option>
          </select>
        </div>
        <Button type="submit" isLoading={isSubmitting || createProduct.isPending}>
          创建
        </Button>
      </form>
    </PageContainer>
  )
}

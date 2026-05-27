import { zodResolver } from "@hookform/resolvers/zod"
import { Badge, Button, Input, Label, Text, Textarea } from "@medusajs/ui"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { Link, useParams } from "react-router-dom"
import {
  updateProductSchema,
  type UpdateProductInput,
} from "@my-store/validators"
import { PageContainer, PageHeader } from "@/components/layout/shell"
import { useProduct, useUpdateProduct } from "@/hooks/use-products"
import { toast } from "@medusajs/ui"

export function ProductDetailPage() {
  const { id = "" } = useParams()
  const { data, isLoading } = useProduct(id)
  const updateProduct = useUpdateProduct(id)

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<UpdateProductInput>({
    resolver: zodResolver(updateProductSchema),
  })

  useEffect(() => {
    if (data?.product) {
      reset({
        title: data.product.title,
        handle: data.product.handle,
        subtitle: data.product.subtitle ?? undefined,
        description: data.product.description ?? undefined,
        status: data.product.status as UpdateProductInput["status"],
        thumbnail: data.product.thumbnail ?? undefined,
      })
    }
  }, [data, reset])

  const onSubmit = handleSubmit(async (formData) => {
    try {
      await updateProduct.mutateAsync(formData)
      toast.success("已保存")
    } catch {
      toast.error("保存失败")
    }
  })

  if (isLoading) return <Text>加载中...</Text>
  if (!data?.product) return <Text>商品不存在</Text>

  const p = data.product

  return (
    <PageContainer>
      <PageHeader
        title={p.title}
        subtitle={p.id}
        actions={
          <Button variant="secondary" asChild>
            <Link to="/products">返回列表</Link>
          </Button>
        }
      />
      <div className="mb-4">
        <Badge>{p.status}</Badge>
        <Text className="text-ui-fg-subtle mt-2">
          变体数量: {p.variants?.length ?? 0}
        </Text>
      </div>
      <form
        onSubmit={onSubmit}
        className="max-w-xl flex flex-col gap-4 rounded-lg border border-ui-border-base bg-ui-bg-base p-6"
      >
        <div>
          <Label htmlFor="title">标题</Label>
          <Input id="title" {...register("title")} />
        </div>
        <div>
          <Label htmlFor="handle">Handle</Label>
          <Input id="handle" {...register("handle")} />
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
        <Button type="submit" isLoading={isSubmitting || updateProduct.isPending}>
          保存
        </Button>
      </form>
    </PageContainer>
  )
}

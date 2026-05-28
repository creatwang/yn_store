// @ts-nocheck
import { zodResolver } from "@hookform/resolvers/zod"
import { FieldValues, useForm, UseFormProps } from "react-hook-form"
import { z, ZodObject } from "zod"

interface UseExtendableFormProps<
  TSchema extends ZodObject<any>,
  TContext = any,
> extends Omit<UseFormProps<z.infer<TSchema>, TContext>, "resolver"> {
  schema: TSchema | z.ZodPipe<TSchema, z.ZodType>
  configs: any[]
  data?: any
}

export const useExtendableForm = <
  TSchema extends ZodObject<any>,
  TContext = any,
  TTransformedValues extends FieldValues | undefined = undefined
>({
  schema,
  configs,
  data,
  ...props
}: UseExtendableFormProps<TSchema, TContext>) => {
  return useForm<z.infer<TSchema>, TContext, TTransformedValues>({
    resolver: zodResolver(schema),
    ...props,
  })
}

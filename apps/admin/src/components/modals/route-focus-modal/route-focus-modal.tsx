import { FocusModal, clx } from "@medusajs/ui"
import { PropsWithChildren, useEffect, useState } from "react"
import { Path, useNavigate } from "react-router-dom"
import { useStateAwareTo } from "../hooks/use-state-aware-to"
import { RouteModalForm } from "../route-modal-form"
import { useRouteModal } from "../route-modal-provider"
import { RouteModalProvider } from "../route-modal-provider/route-provider"
import { StackedModalProvider } from "../stacked-modal-provider"

type RouteFocusModalProps = PropsWithChildren<{
  prev?: string | Partial<Path> | number
  onClose?: () => Promise<boolean> | boolean | void
}>

const Root = ({ prev = "..", onClose, children }: RouteFocusModalProps) => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [stackedModalOpen, onStackedModalOpen] = useState(false)

  const to: string | Partial<Path> | number =
    // eslint-disable-next-line react-hooks/rules-of-hooks
    typeof prev === "number" ? prev : useStateAwareTo(prev)

  /**
   * Open the modal when the component mounts. This
   * ensures that the entry animation is played.
   */
  useEffect(() => {
    setOpen(true)

    return () => {
      setOpen(false)
      onStackedModalOpen(false)
    }
  }, [])

  const handleOpenChange = async (open: boolean) => {
    if (!open) {
      document.body.style.pointerEvents = "auto"
      if (onClose) {
        const canClose = await onClose()
        if (canClose === false) {
          return
        }
      }
      if (typeof to === "number") {
        navigate(to)
      } else {
        navigate(to, { replace: true })
      }
      return
    }

    setOpen(open)
  }

  return (
    <FocusModal open={open} onOpenChange={handleOpenChange}>
      <RouteModalProvider prev={to}>
        <StackedModalProvider onOpenChange={onStackedModalOpen}>
          <Content stackedModalOpen={stackedModalOpen}>{children}</Content>
        </StackedModalProvider>
      </RouteModalProvider>
    </FocusModal>
  )
}

type ContentProps = PropsWithChildren<{
  stackedModalOpen: boolean
}>

const Content = ({ stackedModalOpen, children }: ContentProps) => {
  const { __internal } = useRouteModal()

  const shouldPreventClose = !__internal.closeOnEscape

  return (
    <FocusModal.Content
      onEscapeKeyDown={
        shouldPreventClose
          ? (e) => {
              e.preventDefault()
            }
          : undefined
      }
      className={clx({
        "!bg-ui-bg-disabled !inset-x-5 !inset-y-3": stackedModalOpen,
      })}
    >
      {/* Radix DialogContent 要求存在 DialogTitle；加载中 children 为空时也需要 */}
      <FocusModal.Title asChild>
        <span className="absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]">
          Modal
        </span>
      </FocusModal.Title>
      {children}
    </FocusModal.Content>
  )
}

const Header = FocusModal.Header
const Title = FocusModal.Title
const Description = FocusModal.Description
const Footer = FocusModal.Footer
const Body = FocusModal.Body
const Close = FocusModal.Close
const Form = RouteModalForm

/**
 * FocusModal that is used to render a form on a separate route.
 *
 * Typically used for forms creating a resource or forms that require
 * a lot of space.
 */
export const RouteFocusModal = Object.assign(Root, {
  Header,
  Title,
  Body,
  Description,
  Footer,
  Close,
  Form,
})

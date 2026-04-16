import { useRef, useEffect } from "react"
import styled from "@emotion/styled"
import useOnClickOutside from "@/hooks/useOnClickOutside"
import Portal from "./portal"

interface ModalProps {
  open: boolean
  setOpen: (_open: boolean) => void
  isOverflow?: boolean
  position?:
    | "center"
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
  children: React.ReactNode
}

const Modal = ({
  open: isOpen,
  setOpen,
  isOverflow = true,
  position = "center",
  children,
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const modalContantref = useRef<HTMLDivElement>(null)

  useOnClickOutside({
    inRef: modalRef,
    exceptRef: modalContantref,
    handler: () => setOpen(false),
  })

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset"

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  return (
    <Portal>
      <Frame
        className={isOpen ? "slideUp" : "slideDown"}
        role="dialog"
        aria-modal="true">
        <DialogFrame
          ref={modalRef}
          className={isOpen ? "slideUp" : "slideDown"}
          isOverflow={isOverflow}
          position={position}>
          {children}
        </DialogFrame>
      </Frame>
    </Portal>
  )
}

export default Modal

const Frame = styled.div`
  position: fixed;
  inset: 0;

  display: flex;
  align-items: center;
  justify-content: center;
  visibility: hidden;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  z-index: 400;
  transition: all 0.2s ease-in-out;

  &.slideUp {
    visibility: visible;
    opacity: 1;
  }

  &.slideDown {
    opacity: 0;
  }
`

interface DialogFrameProps {
  isOverflow: boolean
  position: string
}

const getPositionStyles = (position: string) => {
  switch (position) {
    case "top":
      return `
        top: 0;
        left: 50%;
        transform: translateX(-50%);
      `
    case "bottom":
      return `
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
      `
    case "left":
      return `
        left: 0;
        top: 50%;
        transform: translateY(-50%);
      `
    case "right":
      return `
        right: 0;
        top: 50%;
        transform: translateY(-50%);
      `
    case "top-left":
      return `
        top: 0;
        left: 0;
      `
    case "top-right":
      return `
        top: 0;
        right: 0;
      `
    case "bottom-left":
      return `
        bottom: 0;
        left: 0;
      `
    case "bottom-right":
      return `
        bottom: 0;
        right: 0;
      `
    default: // center
      return `
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      `
  }
}

const DialogFrame = styled.div<DialogFrameProps>`
  position: fixed;

  min-width: 280px;
  overflow-y: hidden;

  background-color: #fff;
  border-radius: 0.5rem;

  display: flex;
  flex-direction: column;
  transition: all 0.2s ease-in-out;
  box-sizing: border-box;

  ${(props) => getPositionStyles(props.position)}

  &.slideUp {
    visibility: visible;
    opacity: 1;
  }

  &.slideDown {
    opacity: 0;
  }

  @media (max-width: 1920px) {
    width: 600px;
    max-height: 80vh;
  }
  @media (max-width: 600px) {
    width: min(100%, 100vw);
    max-width: 100vw;
    max-height: min(90vh, 100dvh);
    margin-left: env(safe-area-inset-left);
    margin-right: env(safe-area-inset-right);
  }
  @media (max-width: 450px) {
    ${(props) =>
      props.position === "bottom"
        ? `
      left: max(0.5rem, env(safe-area-inset-left));
      right: max(0.5rem, env(safe-area-inset-right));
      bottom: max(0.5rem, env(safe-area-inset-bottom));
      top: auto;
      width: auto;
      max-width: none;
      height: auto;
      max-height: min(90vh, calc(100dvh - env(safe-area-inset-top) - 1rem));
      min-height: 0;
      transform: none;
      border-radius: 16px;
      padding: 0;
    `
        : `
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      max-width: none;
      height: 100%;
      max-height: none;
      min-height: 0;
      transform: none;
      border-radius: 0;
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
    `}
  }
`

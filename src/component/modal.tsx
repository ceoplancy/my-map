import { useRef, useEffect } from "react"
import styled from "styled-components"
import useOnClickOutside from "@/hooks/useOnClickOutside"
import Portal from "./portal"

interface ModalProps {
  open: boolean
  setOpen: (open: boolean) => void
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
  open,
  setOpen,
  isOverflow = true,
  position = "center",
  children,
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const modalContentRef = useRef<HTMLDivElement>(null)

  useOnClickOutside({
    inRef: modalRef,
    exceptRef: modalContentRef,
    handler: () => setOpen(false),
  })

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "unset"

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [open])

  return (
    <Portal>
      <Frame
        className={open ? "slideUp" : "slideDown"}
        role="dialog"
        aria-modal="true">
        <DialogFrame
          ref={modalRef}
          className={open ? "slideUp" : "slideDown"}
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
  z-index: 1000;
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
  width: 100%;
  max-width: 600px;
  min-height: 6rem;
  max-height: 90vh;
  padding: 1.5rem;
  background-color: #fff;
  border-radius: 0.5rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease-in-out;
  box-sizing: border-box;
  z-index: 999;
  overflow-x: ${(props) => (props.isOverflow ? "auto" : "")};
  overflow-y: auto;
  ${(props) => getPositionStyles(props.position)}

  &.slideUp {
    visibility: visible;
    opacity: 1;
  }

  &.slideDown {
    opacity: 0;
  }
`

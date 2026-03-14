import { FC, PropsWithChildren } from "react"
import ReactDOM from "react-dom"

const Portal: FC<PropsWithChildren> = ({ children }) => {
  const element =
    typeof window !== "undefined" && document.querySelector(`#portal`)

  return element && children
    ? ReactDOM.createPortal(<>{children}</>, element)
    : null
}

export default Portal

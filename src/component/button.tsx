import styled from "@emotion/styled"

interface ButtonProps {
  type?: "button" | "submit"
  margin?: string
  width?: string
  fontSize?: string
  border?: string
  padding?: string
  borderRadius?: string
  backgroundColor?: string
  cursor?: string
  color?: string
  lineHeight?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  children?: React.ReactNode
}

const Button = ({ children, ...props }: ButtonProps) => {
  return (
    <ButtonComp type="button" {...props}>
      {children}
    </ButtonComp>
  )
}

interface ButtonCompProps extends ButtonProps {
  fontWeight?: number
}

const ButtonComp = styled.button<ButtonCompProps>`
  font-size: ${(props) => (props.fontSize ? props.fontSize : "1.6rem")};
  width: ${(props) => (props.width ? props.width : "fit-content")};
  margin: ${(props) => props.margin && props.margin};
  border: ${(props) => (props.border ? props.border : "1px solid #000")};
  border-radius: ${(props) =>
    props.borderRadius ? props.borderRadius : "5px"};
  padding: ${(props) => (props.padding ? props.padding : "10px")};
  background-color: ${(props) =>
    props.backgroundColor ? props.backgroundColor : "#fff"};
  color: ${(props) => (props.color ? props.color : "#000")};
  line-height: ${(props) => (props.lineHeight ? props.lineHeight : 1.2)};
  font-weight: ${(props) => (props.fontWeight ? props.fontWeight : 400)};
  cursor: pointer;
`

export default Button

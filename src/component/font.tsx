import styled from "styled-components"

interface StyledFontProps extends React.HTMLAttributes<HTMLSpanElement> {
  $size?: number
  $color?: string
  $margin?: string
  letterSpacing?: number
  lineHeight?: string
  whiteSpace?: string
  fontWeight?: number
  textAlign?: string
  textDecoration?: string
  cursor?: string
  translateY?: number
  fontSize?: string
}

const StyledFont = styled.span<StyledFontProps>`
  font-size: ${({ $size }) => ($size ? `${$size}px` : "16px")};
  color: ${({ $color }) => $color || "#000"};
  margin: ${({ $margin }) => $margin || "0"};
  letter-spacing: ${(props) => (props.letterSpacing ? props.letterSpacing : 0)};
  line-height: ${(props) => (props.lineHeight ? props.lineHeight : "")};
  white-space: ${(props) => (props.whiteSpace ? props.whiteSpace : "")};
  word-break: break-all;
  font-weight: ${(props) => (props.fontWeight ? props.fontWeight : 400)};
  text-align: ${(props) => (props.textAlign ? props.textAlign : "")};
  text-decoration: ${(props) =>
    props.textDecoration ? props.textDecoration : ""};
  cursor: ${(props) => (props.cursor ? props.cursor : "")};
  transform: translateY(
    ${(props) => {
      return props.translateY ? `${props.translateY}px` : "0px"
    }}
  );
`

interface FontProps extends StyledFontProps {
  children: React.ReactNode
  size?: number
  color?: string
  margin?: string
}

const Font = ({ children, size, color, margin, ...props }: FontProps) => {
  return (
    <StyledFont $size={size} $color={color} $margin={margin} {...props}>
      {children}
    </StyledFont>
  )
}

export default Font

import styled from "@emotion/styled"

interface LineProps {
  margin?: string
  width?: string
  border?: string
}

const Line = (props: LineProps) => {
  return <LineComp {...props} />
}

const LineComp = styled.div<LineProps>`
  width: ${(props) => (props.width ? props.width : "100%")};
  margin: ${(props) => props.margin && props.margin};
  border: ${(props) => (props.border ? props.border : "0.5px solid #ccc")};
`

export default Line

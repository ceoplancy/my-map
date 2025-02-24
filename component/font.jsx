import styled from 'styled-components';

const StyledFont = styled.span`
  font-size: ${({ $size }) => ($size ? `${$size}px` : '16px')};
  color: ${({ $color }) => $color || '#000'};
  margin: ${({ $margin }) => $margin || '0'};
  letter-spacing: ${(props) => (props.letterSpacing ? props.letterSpacing : 0)};
  line-height: ${(props) => (props.lineHeight ? props.lineHeight : '')};
  white-space: ${(props) => (props.whiteSpace ? props.whiteSpace : '')};
  word-break: break-all;
  font-weight: ${(props) => (props.fontWeight ? props.fontWeight : 400)};
  text-align: ${(props) => (props.textAlign ? props.textAlign : '')};
  text-decoration: ${(props) =>
    props.textDecoration ? props.textDecoration : ''};
  cursor: ${(props) => (props.cursor ? props.cursor : '')};
  transform: translateY(
    ${(props) => {
      return props.translateY ? `${props.translateY}px` : '0px';
    }}
  );
`;

const Font = ({ children, size, color, margin, ...props }) => {
  return (
    <StyledFont $size={size} $color={color} $margin={margin} {...props}>
      {children}
    </StyledFont>
  );
};

export default Font;

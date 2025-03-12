import styled from "styled-components"

interface DotSpinnerProps {
  width?: string
  height?: string
  dotColor?: string
  marginRight?: string
}

const DotSpinner = (props: DotSpinnerProps) => {
  return (
    <SpinnerFrame>
      <Spinner {...props}>
        <div className="bounce1"></div>
        <div className="bounce2"></div>
        <div className="bounce3"></div>
      </Spinner>
    </SpinnerFrame>
  )
}

export default DotSpinner

const SpinnerFrame = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;

  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.5);
`

const Spinner = styled.div<DotSpinnerProps>`
  margin: 0 auto;
  text-align: center;

  div {
    width: ${(props) => (props.width ? props.width : "3rem")};
    height: ${(props) => (props.height ? props.height : "3rem")};
    background-color: ${({ dotColor }) => (dotColor ? dotColor : "#114784")};
    &:not(&:last-child) {
      margin-right: ${(props) => (props.marginRight ? props.marginRight : "0")};
    }

    border-radius: 100%;
    display: inline-block;
    -webkit-animation: sk-bouncedelay 1.4s infinite ease-in-out both;
    animation: sk-bouncedelay 1.4s infinite ease-in-out both;
  }

  .bounce1 {
    -webkit-animation-delay: -0.32s;
    animation-delay: -0.32s;
  }

  .bounce2 {
    -webkit-animation-delay: -0.16s;
    animation-delay: -0.16s;
  }

  @-webkit-keyframes sk-bouncedelay {
    0%,
    80%,
    100% {
      -webkit-transform: scale(0);
    }
    40% {
      -webkit-transform: scale(1);
    }
  }

  @keyframes sk-bouncedelay {
    0%,
    80%,
    100% {
      -webkit-transform: scale(0);
      transform: scale(0);
    }
    40% {
      -webkit-transform: scale(1);
      transform: scale(1);
    }
  }
`

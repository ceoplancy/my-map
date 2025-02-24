import { useRecoilState } from 'recoil';
import { toastStateAtom } from 'atoms/index';
import styled from 'styled-components';
import Font from './font';
import { useEffect } from 'react';

const ToastContainer = styled.div`
  position: fixed;
  bottom: ${({ $active }) => ($active ? '20px' : '-100px')};
  left: 0;
  right: 0;
  width: max-content;
  padding: 3rem 5rem;
  margin: 0 auto;
  transition: all 0.3s;

  display: flex;
  justify-content: center;
  align-items: center;

  background-color: #000;
  border-radius: 5px;
`;

const Toast = () => {
  const [toastState, setToastState] = useRecoilState(toastStateAtom);

  useEffect(() => {
    const handler = setTimeout(() => {
      setToastState((prev) => {
        return {
          ...prev,
          isOpen: false,
        };
      });
    }, 3000);

    return () => {
      clearTimeout(handler);
    };
  }, [toastState]);

  return (
    <ToastContainer $active={toastState.isOpen}>
      <Font size={16} color="#fff">
        {toastState.value}
      </Font>
    </ToastContainer>
  );
};

export default Toast;

import { useRouter } from "next/router";
import { toastStateAtom } from "atoms";
import { useRecoilState } from "recoil";
import { useGetUserData } from "@/api/auth";
import DotSpinner from "@/component/dot-spinner";

const withAuth = (WrappedComponent) => {
  const AuthComponent = (props) => {
    const router = useRouter();
    const [toastState, setToastState] = useRecoilState(toastStateAtom);

    const { isLoading } = useGetUserData(setToastState, router);

    if (isLoading) return <DotSpinner />;

    return <WrappedComponent {...props} />;
  };

  return AuthComponent;
};

export default withAuth;

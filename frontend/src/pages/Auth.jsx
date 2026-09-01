import { Outlet } from "react-router-dom";

const Auth = () => {
  return (
    <div className="w-full min-h-screen">
      <Outlet />
    </div>
  );
};

export default Auth;

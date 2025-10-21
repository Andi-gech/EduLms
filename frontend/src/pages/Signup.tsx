import { SignupForm } from "@/components/signup-form";
import login from "@/assets/login.png";
import logo from "@/assets/logo.jpg";

const Signup = () => {
  return (
    <div className="max-w-screen min-h-screen h-screen overflow-x-hidden overflow-y-auto grid grid-cols-1 lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-bold">
            <div className="text-primary-foreground flex items-center justify-center rounded-md">
              <img src={logo} alt="Logo" className="w-[30px] h-[30px] rounded-full" />
            </div>
            Ethiopian Defence University
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <SignupForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <div className="absolute inset-0 bg-zinc-900/50 z-10" />
        <img
          src={login}
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
};

export default Signup;

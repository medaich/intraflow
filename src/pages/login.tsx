import FormField from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { emailReg, pwReg, errorMessages } from "@/lib/consts";

export interface InputErrors {
  email: boolean;
  password: boolean;
}

const inputErrorsDefault = {
  email: false,
  password: false,
};

const Login = () => {
  const API_URL = import.meta.env.VITE_API_URL;

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  const [inputErrors, setInputErrors] =
    useState<InputErrors>(inputErrorsDefault);

  const handleReset = () => {
    setEmail("");
    setPassword("");
    setInputErrors(inputErrorsDefault);

    navigate(-1);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inputErrors.email || inputErrors.password) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/auth/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!res.ok) throw new Error(res.status.toString());

      const data = await res.json();
      setUser(data);
    } catch (error: unknown) {
      if (error instanceof Error) {
        let userErr: string;
        const httpStatus = Number(error.message);
        switch (httpStatus) {
          case 400:
          case 404:
            userErr =
              "Invalid email or password. Double-check your credentials.";
            break;
          case 500:
            userErr =
              "Something went wrong on our end. Please try again shortly.";
            break;
          default:
            userErr =
              "An unexpected error occurred. Please check your internet and try again.";
        }
        toast.error(userErr.split(".")[0], {
          description: userErr.split(".")[1]?.trim(),
        });
        console.error("Failed to login with status: ");
      }

      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex justify-center items-center w-screen h-screen">
      <form
        onSubmit={handleSubmit}
        onReset={handleReset}
        className="shadow p-8 space-y-12 w-full max-w-xl m-4 sm:m-8"
      >
        <div className="space-y-8 *:block">
          <FormField
            type="email"
            name="email"
            placeholder="e.g. sarah@example.com"
            val={email}
            setVal={setEmail}
            isLoad={isLoading}
            validate={{
              validateRegex: emailReg,
              key: "email",
              inputErrs: inputErrors,
              message: errorMessages.email,
              setInputErrs: setInputErrors,
            }}
          />
          <FormField
            type="password"
            name="password"
            placeholder="Enter your password"
            val={password}
            setVal={setPassword}
            isLoad={isLoading}
            validate={{
              validateRegex: pwReg,
              key: "password",
              inputErrs: inputErrors,
              message: errorMessages.password,
              setInputErrs: setInputErrors,
            }}
          />
        </div>

        <div className="!flex items-center justify-end gap-2">
          <Button type="reset" variant={"ghost"}>
            Cancel
          </Button>
          <Button
            className=""
            type="submit"
            disabled={isLoading}
            variant={"default"}
          >
            Login
          </Button>
        </div>
      </form>
    </main>
  );
};

export default Login;

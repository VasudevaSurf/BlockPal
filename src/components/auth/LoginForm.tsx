"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { loginSuccess } from "@/store/slices/authSlice";

export default function LoginForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dispatch = useDispatch();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      // Simulate login
      const user = {
        id: "1",
        name: "User",
        email: formData.email,
      };

      dispatch(loginSuccess(user));
      router.push("/dashboard");
    }
  };

  const handleGoogleLogin = () => {
    // Simulate Google login
    const user = {
      id: "1",
      name: "Google User",
      email: "user@gmail.com",
    };

    dispatch(loginSuccess(user));
    router.push("/dashboard");
  };

  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2 font-mayeka">
          Login into your Account
        </h1>
        <p className="text-gray-400 font-satoshi">
          Welcome back! Select method to login
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Button
          type="button"
          variant="secondary"
          className="w-full flex items-center justify-center py-3 font-satoshi"
          onClick={handleGoogleLogin}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Login with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#2C2C2C]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 text-gray-400 bg-black font-satoshi">OR</span>
          </div>
        </div>

        <Input
          type="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email}
          icon={<Mail size={20} />}
          className="font-satoshi"
        />

        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            error={errors.password}
            icon={<Lock size={20} />}
            className="font-satoshi"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 rounded focus:ring-2 bg-black border border-[#2C2C2C] text-[#E2AF19] focus:ring-[#E2AF19]"
              style={{ accentColor: "#E2AF19" }}
            />
            <label
              htmlFor="remember-me"
              className="ml-2 block text-sm text-gray-400 font-satoshi"
            >
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <button
              type="button"
              className="font-medium hover:opacity-80 text-[#E2AF19] font-satoshi"
            >
              Forgotten Password?
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full py-3 text-base font-semibold font-satoshi"
        >
          Login
        </Button>
      </form>
    </div>
  );
}

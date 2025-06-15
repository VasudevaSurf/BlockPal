"use client";

import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  CreditCard,
  MessageCircle,
  Users,
  User,
  ExternalLink,
  Moon,
  LogOut,
} from "lucide-react";
import { RootState } from "@/store";
import { toggleTheme } from "@/store/slices/uiSlice";
import { logout } from "@/store/slices/authSlice";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Calendar, label: "Schedule Payments", active: false },
  { icon: CreditCard, label: "Batch Payments", active: false },
  { icon: MessageCircle, label: "AI Chat", active: false },
  { icon: Users, label: "Friends", active: false },
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    router.push("/auth");
  };

  return (
    <div
      className="relative w-64 flex flex-col bg-black border border-[#2C2C2C] h-full overflow-hidden"
      style={{ borderRadius: "20px" }}
    >
      {/* Top Gradient Blur - Enhanced */}
      <div
        className="absolute -top-5 -left-5 -right-5 h-80 pointer-events-none z-10"
        style={{
          borderRadius: "898px",
          background:
            "linear-gradient(180deg, rgba(226, 175, 25, 0.85) 0%, rgba(226, 175, 25, 0.65) 25%, rgba(226, 175, 25, 0.30) 50%, rgba(226, 175, 25, 0.00) 75%)",
          filter: "blur(70px)",
        }}
      />

      {/* Bottom Gradient Blur - Enhanced */}
      <div
        className="absolute -bottom-5 -left-5 -right-5 h-80 pointer-events-none z-10"
        style={{
          borderRadius: "898px",
          background:
            "linear-gradient(0deg, rgba(226, 175, 25, 0.85) 0%, rgba(226, 175, 25, 0.65) 25%, rgba(226, 175, 25, 0.30) 50%, rgba(226, 175, 25, 0.00) 75%)",
          filter: "blur(70px)",
        }}
      />

      {/* Additional Middle Fade Gradient */}
      <div
        className="absolute top-1/3 bottom-1/3 -left-5 -right-5 pointer-events-none z-15"
        style={{
          background:
            "linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.9) 50%, rgba(0, 0, 0, 0.2) 100%)",
          filter: "blur(40px)",
        }}
      />

      {/* Logo Section */}
      <div className="p-6 flex-shrink-0 relative z-20">
        <div className="flex items-center mb-8">
          <div className="w-8 h-8 rounded-full mr-3 bg-[#E2AF19]"></div>
          <span className="text-xl font-bold text-white font-satoshi">
            Block<span className="text-[#E2AF19]">pal</span>
          </span>
        </div>

        {/* Navigations Section with Lines */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <div className="flex-1 h-px bg-gray-600"></div>
            <span className="px-4 text-sm font-medium text-gray-300 font-satoshi">
              Navigations
            </span>
            <div className="flex-1 h-px bg-gray-600"></div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 px-4 overflow-y-auto relative z-20">
        <nav className="space-y-3 mb-8">
          {menuItems.slice(0, 4).map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-left transition-all duration-200 font-satoshi ${
                item.active
                  ? "bg-[#E2AF19] text-black font-medium"
                  : "text-gray-300 hover:bg-[#2C2C2C] hover:text-white"
              }`}
            >
              <item.icon size={20} className="mr-3" />
              <span className={item.active ? "font-medium" : ""}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Others Section - Fixed at bottom */}
      <div className="p-4 flex-shrink-0 relative z-20">
        {/* Others Section with Lines */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <div className="flex-1 h-px bg-gray-600"></div>
            <span className="px-4 text-sm font-medium text-gray-300 font-satoshi">
              Others
            </span>
            <div className="flex-1 h-px bg-gray-600"></div>
          </div>
        </div>

        <div className="space-y-3">
          <button className="w-full flex items-center px-4 py-3 rounded-xl text-gray-300 hover:bg-[#2C2C2C] hover:text-white transition-all duration-200 font-satoshi">
            <User size={20} className="mr-3" />
            <span>User profile</span>
            <div className="ml-auto">
              <LogOut size={16} className="text-red-500" />
            </div>
          </button>

          <button className="w-full flex items-center px-4 py-3 rounded-xl text-gray-300 hover:bg-[#2C2C2C] hover:text-white transition-all duration-200 font-satoshi">
            <ExternalLink size={20} className="mr-3" />
            <span>Go to website</span>
            <div className="ml-auto">
              <ExternalLink size={16} className="text-gray-400" />
            </div>
          </button>

          <button
            onClick={() => dispatch(toggleTheme())}
            className="w-full flex items-center px-4 py-3 rounded-xl text-gray-300 hover:bg-[#2C2C2C] hover:text-white transition-all duration-200 font-satoshi"
          >
            <Moon size={20} className="mr-3" />
            <span>Dark Mode</span>
            <div className="ml-auto">
              <div className="w-10 h-6 rounded-full relative bg-[#E2AF19]">
                <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1"></div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

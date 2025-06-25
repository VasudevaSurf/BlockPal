// src/components/profile/UserProfilePage.tsx (UPDATED - with 2FA Modal Integration)
"use client";

import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Bell,
  HelpCircle,
  User,
  Mail,
  Calendar,
  Wallet as WalletIcon,
  Users,
  CreditCard,
  Edit3,
  Save,
  X,
  Shield,
  Globe,
  MessageSquare,
  LogOut,
  Eye,
  EyeOff,
  Copy,
  Smartphone,
  AtSign,
  UserPlus,
  Settings,
  Lock,
} from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { logoutUser } from "@/store/slices/authSlice";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TwoFactorSetupModal from "./TwoFactorSetupModal";

interface UserProfile {
  username: string;
  displayName: string;
  gmail: string;
  avatar: string;
  walletAddress?: string;
  accountCreated: string;
  totalTransactions: number;
  scheduledPayments: number;
  friendsCount: number;
  preferences: {
    notifications: boolean;
    pushNotifications: boolean;
    emailNotifications: boolean;
    friendRequests: "everyone" | "none";
    currency: "USD" | "INR" | "EUR";
  };
  twoFactorEnabled: boolean;
}

export default function UserProfilePage() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { wallets, activeWallet } = useSelector(
    (state: RootState) => state.wallet
  );

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [is2FAEnabling, setIs2FAEnabling] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [copied, setCopied] = useState<string>("");

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/profile", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedProfile),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setEditing(false);
        setEditedProfile({});
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("New passwords don't match");
      return;
    }

    try {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
        credentials: "include",
      });

      if (response.ok) {
        setShowPasswordModal(false);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        alert("Password updated successfully");
      } else {
        alert("Failed to update password");
      }
    } catch (error) {
      console.error("Error updating password:", error);
    }
  };

  const handleToggle2FA = async () => {
    if (!profile) return;

    // Open the 2FA setup modal
    setIs2FAEnabling(!profile.twoFactorEnabled);
    setShow2FAModal(true);
  };

  const handle2FAComplete = async () => {
    // Refresh profile to get updated 2FA status
    await fetchUserProfile();
  };

  const handleNotificationToggle = async (type: string, value: boolean) => {
    try {
      const response = await fetch("/api/profile/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [type]: value }),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setProfile((prev) =>
          prev ? { ...prev, preferences: data.preferences } : null
        );
      }
    } catch (error) {
      console.error("Error updating notifications:", error);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
  };

  if (loading) {
    return (
      <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E2AF19]"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            Profile not found
          </h2>
          <p className="text-gray-400">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 flex-shrink-0 gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-mayeka">
            👤 User Profile
          </h1>
          <p className="text-gray-400 text-sm font-satoshi mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-6">
          {/* Wallet Selector */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-3 lg:px-4 py-2 lg:py-3 w-full sm:w-auto">
            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full mr-2 lg:mr-3 flex items-center justify-center relative flex-shrink-0">
              <div
                className="absolute inset-0 rounded-full opacity-30"
                style={{
                  backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent), 
                                 linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent)`,
                  backgroundSize: "6px 6px lg:8px 8px",
                }}
              ></div>
            </div>
            <span className="text-white text-xs sm:text-sm font-satoshi mr-2 min-w-0 truncate">
              {activeWallet?.name || "Wallet"}
            </span>
            <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mr-2 lg:mr-3 hidden sm:block"></div>
            <span className="text-gray-400 text-xs sm:text-sm font-satoshi mr-2 lg:mr-3 hidden sm:block truncate">
              {activeWallet?.address
                ? `${activeWallet.address.slice(
                    0,
                    6
                  )}...${activeWallet.address.slice(-4)}`
                : "No wallet"}
            </span>
          </div>

          {/* Icons Container */}
          <div className="flex items-center bg-black border border-[#2C2C2C] rounded-full px-2 lg:px-3 py-2 lg:py-3">
            <button className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <Bell size={16} className="text-gray-400 lg:w-5 lg:h-5" />
            </button>
            <div className="w-px h-3 lg:h-4 bg-[#2C2C2C] mx-1 lg:mx-2"></div>
            <button className="p-1.5 lg:p-2 transition-colors hover:bg-[#2C2C2C] rounded-full">
              <HelpCircle size={16} className="text-gray-400 lg:w-5 lg:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="flex flex-col xl:hidden gap-4 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {/* Profile Header */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white font-satoshi">
              Profile Information
            </h2>
            <button
              onClick={() => (editing ? handleSaveProfile() : setEditing(true))}
              className="bg-[#E2AF19] text-black px-3 py-1.5 rounded-lg text-sm font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center"
            >
              {editing ? (
                <Save size={14} className="mr-1" />
              ) : (
                <Edit3 size={14} className="mr-1" />
              )}
              {editing ? "Save" : "Edit"}
            </button>
          </div>

          <div className="flex items-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full mr-4 flex items-center justify-center relative">
              <div
                className="absolute inset-0 rounded-full opacity-30"
                style={{
                  backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent), 
                                 linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent)`,
                  backgroundSize: "8px 8px",
                }}
              ></div>
              <span className="text-white text-xl font-bold">
                {profile.displayName?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <div>
              {editing ? (
                <Input
                  type="text"
                  value={editedProfile.displayName || profile.displayName}
                  onChange={(e) =>
                    setEditedProfile({
                      ...editedProfile,
                      displayName: e.target.value,
                    })
                  }
                  className="mb-2 font-satoshi"
                  placeholder="Display Name"
                />
              ) : (
                <h3 className="text-xl font-bold text-white font-satoshi">
                  {profile.displayName}
                </h3>
              )}
              <p className="text-gray-400 text-sm font-satoshi">
                @{profile.username}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm font-satoshi">Gmail:</span>
              <span className="text-white text-sm font-satoshi">
                {profile.gmail}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm font-satoshi">
                Member Since:
              </span>
              <span className="text-white text-sm font-satoshi">
                {profile.accountCreated}
              </span>
            </div>
          </div>
        </div>

        {/* Account Statistics */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
            Account Statistics
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
              <div className="flex items-center mb-2">
                <CreditCard size={16} className="text-[#E2AF19] mr-2" />
                <span className="text-gray-400 text-xs font-satoshi">
                  Total Transactions
                </span>
              </div>
              <div className="text-white text-lg font-bold font-satoshi">
                {profile.totalTransactions}
              </div>
            </div>

            <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
              <div className="flex items-center mb-2">
                <Calendar size={16} className="text-[#E2AF19] mr-2" />
                <span className="text-gray-400 text-xs font-satoshi">
                  Scheduled Payments
                </span>
              </div>
              <div className="text-white text-lg font-bold font-satoshi">
                {profile.scheduledPayments}
              </div>
            </div>

            <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
              <div className="flex items-center mb-2">
                <Users size={16} className="text-[#E2AF19] mr-2" />
                <span className="text-gray-400 text-xs font-satoshi">
                  Friends
                </span>
              </div>
              <div className="text-white text-lg font-bold font-satoshi">
                {profile.friendsCount}
              </div>
            </div>

            <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
              <div className="flex items-center mb-2">
                <WalletIcon size={16} className="text-[#E2AF19] mr-2" />
                <span className="text-gray-400 text-xs font-satoshi">
                  Wallets
                </span>
              </div>
              <div className="text-white text-lg font-bold font-satoshi">
                {wallets.length}
              </div>
            </div>
          </div>
        </div>

        {/* Account & Security */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
            Account & Security
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Lock size={16} className="text-gray-400 mr-3" />
                <span className="text-white font-satoshi">Change Password</span>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="bg-[#E2AF19] text-black px-3 py-1.5 rounded-lg text-sm font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
              >
                Change
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield size={16} className="text-gray-400 mr-3" />
                <div>
                  <span className="text-white font-satoshi">
                    Two-Factor Authentication
                  </span>
                  {profile.twoFactorEnabled && (
                    <div className="text-green-400 text-xs font-satoshi">
                      Enabled
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleToggle2FA}
                className={`px-3 py-1.5 rounded-lg text-sm font-satoshi font-medium transition-colors ${
                  profile.twoFactorEnabled
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-[#E2AF19] hover:bg-[#D4A853] text-black"
                }`}
              >
                {profile.twoFactorEnabled ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
            Notifications
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Smartphone size={16} className="text-gray-400 mr-3" />
                <span className="text-white font-satoshi">
                  Push Notifications
                </span>
              </div>
              <button
                onClick={() =>
                  handleNotificationToggle(
                    "pushNotifications",
                    !profile.preferences.pushNotifications
                  )
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  profile.preferences.pushNotifications
                    ? "bg-[#E2AF19]"
                    : "bg-gray-600"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    profile.preferences.pushNotifications
                      ? "translate-x-7"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Mail size={16} className="text-gray-400 mr-3" />
                <span className="text-white font-satoshi">
                  Email Notifications
                </span>
              </div>
              <button
                onClick={() =>
                  handleNotificationToggle(
                    "emailNotifications",
                    !profile.preferences.emailNotifications
                  )
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  profile.preferences.emailNotifications
                    ? "bg-[#E2AF19]"
                    : "bg-gray-600"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    profile.preferences.emailNotifications
                      ? "translate-x-7"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <UserPlus size={16} className="text-gray-400 mr-3" />
                <span className="text-white font-satoshi">Friend Requests</span>
              </div>
              <select
                value={profile.preferences.friendRequests}
                onChange={(e) =>
                  handleNotificationToggle("friendRequests", e.target.value)
                }
                className="bg-[#2C2C2C] text-white px-3 py-1.5 rounded-lg text-sm font-satoshi border border-[#2C2C2C] focus:border-[#E2AF19] outline-none"
              >
                <option value="everyone">Everyone</option>
                <option value="none">No One</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Globe size={16} className="text-gray-400 mr-3" />
                <span className="text-white font-satoshi">
                  Currency Display
                </span>
              </div>
              <select
                value={profile.preferences.currency}
                onChange={(e) =>
                  handleNotificationToggle("currency", e.target.value)
                }
                className="bg-[#2C2C2C] text-white px-3 py-1.5 rounded-lg text-sm font-satoshi border border-[#2C2C2C] focus:border-[#E2AF19] outline-none"
              >
                <option value="USD">USD</option>
                <option value="INR">INR</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
        </div>

        {/* Support & Feedback */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
            Support & Feedback
          </h3>

          <div className="space-y-3">
            <button
              onClick={() => setShowContactModal(true)}
              className="w-full flex items-center justify-between p-3 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] hover:border-[#E2AF19] transition-colors"
            >
              <div className="flex items-center">
                <MessageSquare size={16} className="text-gray-400 mr-3" />
                <span className="text-white font-satoshi">Contact Support</span>
              </div>
              <span className="text-gray-400">→</span>
            </button>

            <button className="w-full flex items-center justify-between p-3 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] hover:border-[#E2AF19] transition-colors">
              <div className="flex items-center">
                <Settings size={16} className="text-gray-400 mr-3" />
                <span className="text-white font-satoshi">Report a Bug</span>
              </div>
              <span className="text-gray-400">→</span>
            </button>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
            Account Actions
          </h3>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <LogOut size={16} className="text-white mr-2" />
            <span className="text-white font-satoshi font-medium">
              Log Out of All Devices
            </span>
          </button>
        </div>
      </div>

      {/* Desktop Layout - Similar structure to mobile but in columns */}
      <div className="hidden xl:flex gap-6 flex-1 min-h-0">
        {/* Left Column */}
        <div className="flex-1 space-y-6 overflow-y-auto scrollbar-hide">
          {/* Profile Header - Desktop */}
          <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white font-satoshi">
                Profile Information
              </h2>
              <button
                onClick={() =>
                  editing ? handleSaveProfile() : setEditing(true)
                }
                className="bg-[#E2AF19] text-black px-4 py-2 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center"
              >
                {editing ? (
                  <Save size={16} className="mr-2" />
                ) : (
                  <Edit3 size={16} className="mr-2" />
                )}
                {editing ? "Save Changes" : "Edit Profile"}
              </button>
            </div>

            <div className="flex items-start space-x-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center relative">
                <div
                  className="absolute inset-0 rounded-full opacity-30"
                  style={{
                    backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent), 
                                   linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 26%, transparent 27%, transparent 74%, rgba(255,255,255,0.3) 75%, rgba(255,255,255,0.3) 76%, transparent 77%, transparent)`,
                    backgroundSize: "12px 12px",
                  }}
                ></div>
                <span className="text-white text-2xl font-bold">
                  {profile.displayName?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>

              <div className="flex-1">
                {editing ? (
                  <div className="space-y-4">
                    <Input
                      type="text"
                      value={editedProfile.displayName || profile.displayName}
                      onChange={(e) =>
                        setEditedProfile({
                          ...editedProfile,
                          displayName: e.target.value,
                        })
                      }
                      className="font-satoshi"
                      placeholder="Display Name"
                      label="Display Name"
                    />
                  </div>
                ) : (
                  <div>
                    <h3 className="text-2xl font-bold text-white font-satoshi mb-2">
                      {profile.displayName}
                    </h3>
                    <p className="text-gray-400 font-satoshi mb-4">
                      @{profile.username}
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-400 text-sm font-satoshi">
                          Email:
                        </span>
                        <p className="text-white font-satoshi">
                          {profile.gmail}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm font-satoshi">
                          Member Since:
                        </span>
                        <p className="text-white font-satoshi">
                          {profile.accountCreated}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Statistics - Desktop */}
          <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6">
            <h3 className="text-xl font-semibold text-white mb-6 font-satoshi">
              Account Statistics
            </h3>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C] text-center">
                <CreditCard size={24} className="text-[#E2AF19] mx-auto mb-2" />
                <div className="text-white text-xl font-bold font-satoshi mb-1">
                  {profile.totalTransactions}
                </div>
                <div className="text-gray-400 text-sm font-satoshi">
                  Total Transactions
                </div>
              </div>

              <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C] text-center">
                <Calendar size={24} className="text-[#E2AF19] mx-auto mb-2" />
                <div className="text-white text-xl font-bold font-satoshi mb-1">
                  {profile.scheduledPayments}
                </div>
                <div className="text-gray-400 text-sm font-satoshi">
                  Scheduled Payments
                </div>
              </div>

              <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C] text-center">
                <Users size={24} className="text-[#E2AF19] mx-auto mb-2" />
                <div className="text-white text-xl font-bold font-satoshi mb-1">
                  {profile.friendsCount}
                </div>
                <div className="text-gray-400 text-sm font-satoshi">
                  Friends
                </div>
              </div>

              <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C] text-center">
                <WalletIcon size={24} className="text-[#E2AF19] mx-auto mb-2" />
                <div className="text-white text-xl font-bold font-satoshi mb-1">
                  {wallets.length}
                </div>
                <div className="text-gray-400 text-sm font-satoshi">
                  Wallets
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="w-[400px] space-y-6 overflow-y-auto scrollbar-hide">
          {/* Account & Security - Desktop */}
          <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6">
            <h3 className="text-xl font-semibold text-white mb-6 font-satoshi">
              Account & Security
            </h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Lock size={20} className="text-gray-400 mr-3" />
                  <span className="text-white font-satoshi">
                    Change Password
                  </span>
                </div>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="bg-[#E2AF19] text-black px-4 py-2 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
                >
                  Change
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Shield size={20} className="text-gray-400 mr-3" />
                  <div>
                    <span className="text-white font-satoshi">
                      Two-Factor Authentication
                    </span>
                    {profile.twoFactorEnabled && (
                      <div className="text-green-400 text-sm font-satoshi">
                        Currently Enabled
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleToggle2FA}
                  className={`px-4 py-2 rounded-lg font-satoshi font-medium transition-colors ${
                    profile.twoFactorEnabled
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-[#E2AF19] hover:bg-[#D4A853] text-black"
                  }`}
                >
                  {profile.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                </button>
              </div>
            </div>
          </div>

          {/* Notifications - Desktop */}
          <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6">
            <h3 className="text-xl font-semibold text-white mb-6 font-satoshi">
              Notifications
            </h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Smartphone size={20} className="text-gray-400 mr-3" />
                  <span className="text-white font-satoshi">
                    Push Notifications
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleNotificationToggle(
                      "pushNotifications",
                      !profile.preferences.pushNotifications
                    )
                  }
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    profile.preferences.pushNotifications
                      ? "bg-[#E2AF19]"
                      : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      profile.preferences.pushNotifications
                        ? "translate-x-8"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Mail size={20} className="text-gray-400 mr-3" />
                  <span className="text-white font-satoshi">
                    Email Notifications
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleNotificationToggle(
                      "emailNotifications",
                      !profile.preferences.emailNotifications
                    )
                  }
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    profile.preferences.emailNotifications
                      ? "bg-[#E2AF19]"
                      : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      profile.preferences.emailNotifications
                        ? "translate-x-8"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <UserPlus size={20} className="text-gray-400 mr-3" />
                  <span className="text-white font-satoshi">
                    Friend Requests
                  </span>
                </div>
                <select
                  value={profile.preferences.friendRequests}
                  onChange={(e) =>
                    handleNotificationToggle("friendRequests", e.target.value)
                  }
                  className="bg-[#2C2C2C] text-white px-3 py-2 rounded-lg font-satoshi border border-[#2C2C2C] focus:border-[#E2AF19] outline-none"
                >
                  <option value="everyone">Everyone</option>
                  <option value="none">No One</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Globe size={20} className="text-gray-400 mr-3" />
                  <span className="text-white font-satoshi">
                    Currency Display
                  </span>
                </div>
                <select
                  value={profile.preferences.currency}
                  onChange={(e) =>
                    handleNotificationToggle("currency", e.target.value)
                  }
                  className="bg-[#2C2C2C] text-white px-3 py-2 rounded-lg font-satoshi border border-[#2C2C2C] focus:border-[#E2AF19] outline-none"
                >
                  <option value="USD">USD</option>
                  <option value="INR">INR</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
          </div>

          {/* Support & Account Actions - Desktop */}
          <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6">
            <h3 className="text-xl font-semibold text-white mb-6 font-satoshi">
              Support & Actions
            </h3>

            <div className="space-y-4">
              <button
                onClick={() => setShowContactModal(true)}
                className="w-full flex items-center justify-between p-3 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] hover:border-[#E2AF19] transition-colors"
              >
                <div className="flex items-center">
                  <MessageSquare size={18} className="text-gray-400 mr-3" />
                  <span className="text-white font-satoshi">
                    Contact Support
                  </span>
                </div>
                <span className="text-gray-400">→</span>
              </button>

              <button className="w-full flex items-center justify-between p-3 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] hover:border-[#E2AF19] transition-colors">
                <div className="flex items-center">
                  <Settings size={18} className="text-gray-400 mr-3" />
                  <span className="text-white font-satoshi">Report a Bug</span>
                </div>
                <span className="text-gray-400">→</span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center p-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors mt-6"
              >
                <LogOut size={18} className="text-white mr-2" />
                <span className="text-white font-satoshi font-medium">
                  Log Out of All Devices
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white font-satoshi">
                Change Password
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Current Password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    currentPassword: e.target.value,
                  })
                }
                className="font-satoshi"
              />
              <Input
                type="password"
                placeholder="New Password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value,
                  })
                }
                className="font-satoshi"
              />
              <Input
                type="password"
                placeholder="Confirm New Password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value,
                  })
                }
                className="font-satoshi"
              />

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2 bg-[#2C2C2C] text-white rounded-lg font-satoshi hover:bg-[#3C3C3C] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordChange}
                  className="flex-1 px-4 py-2 bg-[#E2AF19] text-black rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Support Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white font-satoshi">
                Contact Support
              </h3>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Subject"
                className="font-satoshi"
              />
              <textarea
                placeholder="Describe your issue..."
                className="w-full p-3 bg-black border border-[#2C2C2C] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#E2AF19] font-satoshi resize-none"
                rows={4}
              />

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 px-4 py-2 bg-[#2C2C2C] text-white rounded-lg font-satoshi hover:bg-[#3C3C3C] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowContactModal(false);
                    alert("Support request submitted successfully!");
                  }}
                  className="flex-1 px-4 py-2 bg-[#E2AF19] text-black rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TwoFactorSetupModal
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        onComplete={handle2FAComplete}
        isEnabling={is2FAEnabling}
      />

      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

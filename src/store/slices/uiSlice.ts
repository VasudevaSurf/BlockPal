// src/store/slices/uiSlice.ts - FIXED with reset action
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { UIState } from "@/types";

const initialState: UIState = {
  theme: "dark",
  sidebarOpen: true,
  walletSelectorOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.theme = state.theme === "light" ? "dark" : "light";
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    openWalletSelector: (state) => {
      state.walletSelectorOpen = true;
    },
    closeWalletSelector: (state) => {
      state.walletSelectorOpen = false;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    // NEW: Reset UI state to initial values
    resetUIState: (state) => {
      console.log("🧹 Resetting UI state");
      Object.assign(state, initialState);
    },
  },
});

export const {
  toggleTheme,
  toggleSidebar,
  openWalletSelector,
  closeWalletSelector,
  setSidebarOpen,
  resetUIState,
} = uiSlice.actions;

export default uiSlice.reducer;

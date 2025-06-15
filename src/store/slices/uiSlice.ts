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
  },
});

export const {
  toggleTheme,
  toggleSidebar,
  openWalletSelector,
  closeWalletSelector,
  setSidebarOpen,
} = uiSlice.actions;

export default uiSlice.reducer;

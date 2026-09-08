import { create } from 'zustand';

const useThemeStore = create((set) => ({
  theme: localStorage.getItem('auction_theme') || 'dark',
  
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('auction_theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
    return { theme: newTheme };
  }),

  setTheme: (theme) => {
    localStorage.setItem('auction_theme', theme);
    document.documentElement.classList.toggle('light', theme === 'light');
    set({ theme });
  }
}));

export default useThemeStore;

import { create } from 'zustand';
import axios from 'axios';

const getAuthHeader = () => {
  const token = localStorage.getItem('auction_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const useRoomStore = create((set, get) => ({
  currentRoom: null,
  myRooms: [],
  publicRooms: [],
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  createRoom: async (config) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await axios.post('/api/rooms/create', config, { headers: getAuthHeader() });
      set({ isLoading: false });
      return data.room;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to create room';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  joinRoom: async (roomId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await axios.post(`/api/rooms/join/${roomId}`, {}, { headers: getAuthHeader() });
      set({ isLoading: false });
      return data.room;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to join room';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  fetchRoom: async (roomId) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await axios.get(`/api/rooms/${roomId}`, { headers: getAuthHeader() });
      set({ currentRoom: data.room, isLoading: false });
      return data.room;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Room not found', isLoading: false });
      throw error;
    }
  },

  selectTeam: async (roomId, teamIndex) => {
    try {
      await axios.post(`/api/rooms/${roomId}/select-team`, { teamIndex }, { headers: getAuthHeader() });
      // Refetch room state
      return get().fetchRoom(roomId);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to select team';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  setReady: async (roomId, isReady) => {
    try {
      const { data } = await axios.post(`/api/rooms/${roomId}/ready`, { isReady }, { headers: getAuthHeader() });
      await get().fetchRoom(roomId);
      return data;
    } catch (error) {
      set({ error: error.response?.data?.message });
      throw error;
    }
  },

  setAuctioneer: async (roomId, auctioneerUserId) => {
    try {
      const { data } = await axios.post(`/api/rooms/${roomId}/auctioneer`, { auctioneerUserId }, { headers: getAuthHeader() });
      await get().fetchRoom(roomId);
      return data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update auctioneer';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  updateSettings: async (roomId, settings) => {
    try {
      const { data } = await axios.put(`/api/rooms/${roomId}/settings`, settings, { headers: getAuthHeader() });
      await get().fetchRoom(roomId);
      return data;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update settings';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  fetchMyRooms: async () => {
    try {
      const { data } = await axios.get('/api/rooms/my-rooms', { headers: getAuthHeader() });
      set({ myRooms: data.rooms });
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  },

  fetchPublicRooms: async () => {
    try {
      const { data } = await axios.get('/api/rooms/public');
      set({ publicRooms: data.rooms });
    } catch (error) {
      console.error('Failed to fetch public rooms:', error);
    }
  },

  deleteRoom: async (roomId) => {
    try {
      await axios.delete(`/api/rooms/${roomId}`, { headers: getAuthHeader() });
      set((state) => ({
        myRooms: state.myRooms.filter(r => r.roomId !== roomId),
        publicRooms: state.publicRooms.filter(r => r.roomId !== roomId)
      }));
      return true;
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to delete auction';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  setCurrentRoom: (room) => set({ currentRoom: room }),
  clearRoom: () => set({ currentRoom: null })
}));

export default useRoomStore;

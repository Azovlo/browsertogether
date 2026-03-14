import React, { useEffect } from 'react';
import { useRoomStore } from './stores/roomStore';
import LandingPage from './components/room/LandingPage';
import RoomPage from './components/room/RoomPage';
import { Toaster } from './components/ui/Toaster';

function App() {
  const { roomId } = useRoomStore();

  return (
    <div className="h-full">
      {roomId ? <RoomPage /> : <LandingPage />}
      <Toaster />
    </div>
  );
}

export default App;

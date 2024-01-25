import { useContext,  useLayoutEffect, useState } from "react";
import MusicContext from "../context/MusicContext";

const VolumeController = ({ isVolumeVisible }) => {
  const { currentSong } = useContext(MusicContext);
  const [volume, setVolume] = useState(50);

  useLayoutEffect(() => {
    if (currentSong) {
      console.log(currentSong.audio.volume);
      setVolume(currentSong.audio.volume * 100);
    }
  }, [currentSong, volume]);

  const handleVolumeChange = (e) => {
    if (currentSong) {
      const newVolume = parseFloat(e.target.value) / 100;
      currentSong.audio.volume = newVolume;
      setVolume(newVolume);
    }
  };

  return (
    <div
      className={`w-[80px] absolute -rotate-90 bottom-20 -right-3 shadow-md px-2 rounded-lg bg-white  ${
        isVolumeVisible ? " " : "hidden"
      }`}
    >
      <input
        type="range"
        min={0}
        max={100}
        step="0.1"
        value={volume}
        onChange={handleVolumeChange}
        className="h-[5px] text-green-400 range"
      />
    </div>
  );
};

export default VolumeController;

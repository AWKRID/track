import { useState } from "react";
import "./MusicLinkInput.css";

interface MusicInfo {
  title: string;
  artist: string;
  thumbnail: string;
  url: string;
}

interface Props {
  onMusicAdded: (info: MusicInfo) => void;
}

const MusicLinkInput = ({ onMusicAdded }: Props) => {
  const [link, setLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 실제 앱에서는 API를 호출하여 음악 정보를 가져오겠지만,
  // 여기서는 더미 데이터로 대체합니다.
  const handleAddLink = () => {
    if (!link.trim()) {
      setError("링크를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError("");

    // 실제 환경에서는 API 호출 대신 간단한 타이머 사용
    setTimeout(() => {
      // 음악 서비스 링크인지 확인 (실제로는 정교한 검증 필요)
      if (
        link.includes("spotify") ||
        link.includes("youtube") ||
        link.includes("apple")
      ) {
        const dummyInfo: MusicInfo = {
          title: "IU(아이유) - Blueming(블루밍)",
          artist: "IU (아이유)",
          thumbnail: "https://i.ytimg.com/vi/D1PvIWdJ8xo/hqdefault.jpg",
          url: link,
        };

        onMusicAdded(dummyInfo);
        setLink("");
      } else {
        setError(
          "지원되지 않는 링크입니다! Spotify, YouTube 또는 Apple Music 링크를 입력해주세요."
        );
      }

      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="music-link-input">
      <div className="input-group">
        <input
          type="text"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Spotify, YouTube 또는 Apple Music 링크를 붙여넣으세요"
          disabled={isLoading}
        />
        <button
          onClick={handleAddLink}
          disabled={isLoading}
          className={isLoading ? "loading" : ""}
        >
          {isLoading ? "확인 중..." : "추가하기"}
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}
    </div>
  );
};

export default MusicLinkInput;

import { useState, useEffect } from "react";
import "./App.css";
import MusicDiary from "./components/MusicDiary.tsx";
import DiaryFeed from "./components/DiaryFeed.tsx";
import DiaryCalendar from "./components/DiaryCalendar.tsx";
import AuthModal from "./components/AuthModal.tsx";
import LoginRequiredModal from "./components/LoginRequiredModal.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./contexts/useAuth";
import { supabase } from "./supabase.ts";
function AppContent() {
  const [activeTab, setActiveTab] = useState<"feed" | "write" | "calendar">(
    "feed"
  );
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLoginRequired, setShowLoginRequired] = useState(false);
  const { user, signOut } = useAuth();
  const [viewUserId, setViewUserId] = useState<string | null>(null);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!showUserMenu) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".user-menu")) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showUserMenu]);

  const handleUserIconClick = () => {
    if (user) setShowUserMenu((prev) => !prev);
    else setShowAuthModal(true);
  };

  const handleGoCalendar = () => {
    setActiveTab("calendar");
    setShowUserMenu(false);
  };

  const handleLogout = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  const handleNewPostClick = async () => {
    if (!user) {
      setShowLoginRequired(true);
      return;
    }

    // 오늘 날짜 설정
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).toISOString();
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    ).toISOString();

    try {
      // 오늘 작성한 일기가 있는지 확인
      const { error, count } = await supabase
        .from("diaries")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .gte("created_at", startOfDay)
        .lt("created_at", endOfDay);

      if (error) throw error;

      if (count && count > 0) {
        // 이미 오늘 일기를 작성한 경우
        alert("오늘 이미 일기를 작성했습니다. 내일 다시 작성해주세요.");
      } else {
        // 오늘 작성한 일기가 없으면 작성 페이지로 이동
        setActiveTab("write");
      }
    } catch (error) {
      console.error("일기 확인 중 오류 발생:", error);
      alert("일기 확인 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  const viewUserProfile = (userId: string) => {
    setViewUserId(userId);
    setActiveTab("calendar");
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <div
            className="logo"
            onClick={() => setActiveTab("feed")}
            style={{ cursor: "pointer" }}
          >
            TRACK
          </div>
          <nav className="main-nav">
            <button
              className={`nav-item ${activeTab === "feed" ? "active" : ""}`}
              onClick={() => setActiveTab("feed")}
            >
              피드
            </button>
            <button
              className={`nav-item ${activeTab === "calendar" ? "active" : ""}`}
              onClick={() => setActiveTab("calendar")}
            >
              캘린더
            </button>
          </nav>
        </div>
        <div className="header-actions">
          <button
            className={`new-post-button ${
              activeTab === "write" ? "active" : ""
            }`}
            onClick={handleNewPostClick}
          >
            <span className="plus-icon">+</span> 새 일기
          </button>
          <div className="user-menu" style={{ position: "relative" }}>
            <button
              className="user-profile-button"
              onClick={handleUserIconClick}
            >
              <span className="user-icon">👤</span>
            </button>
            {user && showUserMenu && (
              <div className="user-dropdown">
                <button className="dropdown-item" onClick={handleGoCalendar}>
                  나의 캘린더
                </button>
                <button className="dropdown-item" onClick={handleLogout}>
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="main-content">
        {activeTab === "write" &&
          (user ? (
            <MusicDiary onComplete={() => setActiveTab("feed")} />
          ) : (
            <div
              style={{
                textAlign: "center",
                marginTop: 80,
                fontSize: 18,
                color: "#888",
              }}
            >
              일기 작성은 로그인 후 이용할 수 있습니다.
            </div>
          ))}
        {activeTab === "feed" && <DiaryFeed onUserClick={viewUserProfile} />}
        {activeTab === "calendar" && (
          <DiaryCalendar
            userId={viewUserId}
            onBackToMyCalendar={() => setViewUserId(null)}
          />
        )}
      </main>
      <LoginRequiredModal
        isOpen={showLoginRequired}
        onClose={() => setShowLoginRequired(false)}
        onConfirm={() => {
          setShowLoginRequired(false);
          setShowAuthModal(true);
        }}
      />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}

// 반드시 AuthProvider로 감싸고 내부에서 useAuth 사용!
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

import { useState, useEffect } from "react";
import "./DiaryCalendar.css";
import DiaryDetail from "./DiaryDetail";
import { useAuth } from "../contexts/useAuth";
import { supabase } from "../supabase.ts";

// 날짜 관련 유틸리티 함수
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

// 감정 ID로 이모지 찾기 함수
const getEmotionEmoji = (emotionId: string) => {
  const emotions = [
    { id: "행복", emoji: "😀", label: "행복" },
    { id: "슬픔", emoji: "😢", label: "슬픔" },
    { id: "그리움", emoji: "🥺", label: "그리움" },
    { id: "설렘", emoji: "😍", label: "설렘" },
    { id: "위로", emoji: "😌", label: "위로" },
  ];

  const emotion = emotions.find((e) => e.id === emotionId);
  return emotion
    ? { emoji: emotion.emoji, label: emotion.label }
    : { emoji: "🎵", label: emotionId };
};

// 월 이름 배열
const months = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];

// 요일 이름 배열
const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

// DiaryEntry 인터페이스 정의
interface DiaryEntry {
  id: number;
  title: string | null;
  content: string;
  music_link: string;
  emotion: string;
  created_at: string;
}

// User 인터페이스 정의
interface UserProfile {
  id: string;
  username: string;
}

interface DiaryCalendarProps {
  userId?: string | null;
  onBackToMyCalendar?: () => void;
}

const DiaryCalendar = ({ userId, onBackToMyCalendar }: DiaryCalendarProps) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDiary, setSelectedDiary] = useState<DiaryEntry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [userDiaries, setUserDiaries] = useState<Record<string, DiaryEntry>>(
    {}
  );
  const [calendarOwner, setCalendarOwner] = useState<UserProfile | null>(null);
  const { user } = useAuth();

  // 캘린더 소유자 ID 결정 (전달받은 userId 또는 현재 로그인한 사용자)
  const calendarUserId = userId || user?.id || "";

  // 캘린더 소유자 정보 가져오기
  useEffect(() => {
    const fetchCalendarOwner = async () => {
      if (!calendarUserId) return;

      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, username")
          .eq("id", calendarUserId)
          .single();

        if (error) throw error;
        if (data) setCalendarOwner(data as UserProfile);
      } catch (error) {
        console.error("캘린더 소유자 정보 조회 실패:", error);
      }
    };

    fetchCalendarOwner();
  }, [calendarUserId]);

  // 이전 달로 이동
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  // 다음 달로 이동
  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  // 사용자 일기 데이터 조회 함수
  const fetchUserDiaries = async () => {
    if (!calendarUserId) return;

    try {
      // 해당 달의 시작과 끝 날짜 계산
      const startDate = new Date(currentYear, currentMonth, 1).toISOString();
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString();

      const { data, error } = await supabase
        .from("diaries")
        .select("id, title, content, music_link, emotion, created_at")
        .eq("user_id", calendarUserId)
        .gte("created_at", startDate)
        .lt("created_at", endDate);

      if (error) throw error;

      // 날짜별로 데이터 정리
      const diariesByDate: Record<string, DiaryEntry> = {};

      data?.forEach((diary: DiaryEntry) => {
        const date = diary.created_at.split("T")[0]; // YYYY-MM-DD 형식으로 추출
        diariesByDate[date] = diary;
      });

      setUserDiaries(diariesByDate);
    } catch (error) {
      console.error("일기 데이터 조회 실패:", error);
    }
  };

  // 월이 변경될 때마다 데이터 다시 가져오기
  useEffect(() => {
    fetchUserDiaries();
  }, [currentMonth, currentYear, calendarUserId]);

  // 날짜 선택 처리
  const handleDateClick = (dateStr: string) => {
    if (dateStr in userDiaries) {
      setSelectedDate(dateStr);
      setSelectedDiary(userDiaries[dateStr]);
      setShowDetailModal(true); // 바로 상세 모달 열기
    } else {
      setSelectedDate(null);
      setSelectedDiary(null);
    }
  };

  // 일기 상세 보기 모달 닫기
  const closeDiaryDetail = () => {
    setShowDetailModal(false);
  };

  // 캘린더 그리드 렌더링
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

    const calendarDays = [];

    // 이전 달의 날짜 채우기
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(
        <div key={`empty-${i}`} className="calendar-day empty"></div>
      );
    }

    // 현재 달의 날짜 채우기
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;
      const isToday =
        today.getFullYear() === currentYear &&
        today.getMonth() === currentMonth &&
        today.getDate() === day;
      const hasDiary = dateStr in userDiaries;
      const isSelected = dateStr === selectedDate;

      calendarDays.push(
        <div
          key={dateStr}
          className={`calendar-day ${isToday ? "today" : ""} ${
            hasDiary ? "has-diary" : ""
          } ${isSelected ? "selected" : ""}`}
          onClick={() => handleDateClick(dateStr)}
        >
          <span className="day-number">{day}</span>
          {hasDiary && (
            <div className="diary-indicator">
              <span className="diary-emoji">
                {getEmotionEmoji(userDiaries[dateStr].emotion).emoji}
              </span>
            </div>
          )}
        </div>
      );
    }

    return calendarDays;
  };

  return (
    <div className="calendar-page">
      <div className="calendar-header-container">
        <h1 className="calendar-title">
          {calendarOwner ? `${calendarOwner.username}님의 TRACK` : "나의 TRACK"}
        </h1>

        {userId && userId !== user?.id && onBackToMyCalendar && (
          <button
            className="back-to-my-calendar-button"
            onClick={onBackToMyCalendar}
          >
            내 캘린더로
          </button>
        )}
      </div>

      <div className="calendar-summary">
        <div className="summary-item">
          <span className="summary-label">이번 달 일기:</span>
          <span className="summary-count">
            {Object.keys(userDiaries).length}개
          </span>
        </div>

        {Object.keys(userDiaries).length > 0 && (
          <div className="summary-item">
            <span className="summary-label">자주 느낀 감정:</span>
            <span className="summary-emoji">
              {Object.values(userDiaries)
                .map((diary) => getEmotionEmoji(diary.emotion).emoji)
                .slice(0, 3)
                .join(" ")}
            </span>
          </div>
        )}
      </div>

      <div className="calendar-container">
        <div className="calendar-header">
          <div className="month-navigation">
            <button className="month-nav-button" onClick={prevMonth}>
              <span className="nav-icon">◀</span>
            </button>
            <h2 className="current-month">
              {currentYear}년 {months[currentMonth]}
            </h2>
            <button className="month-nav-button" onClick={nextMonth}>
              <span className="nav-icon">▶</span>
            </button>
          </div>

          <div className="weekdays-header">
            {weekdays.map((day, index) => (
              <div
                key={day}
                className={`weekday ${index === 0 ? "sunday" : ""} ${
                  index === 6 ? "saturday" : ""
                }`}
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        <div className="calendar-grid">{renderCalendar()}</div>
      </div>

      {showDetailModal && selectedDiary && (
        <DiaryDetail
          diaryId={selectedDiary.id}
          post={{
            username: calendarOwner?.username || "사용자",
            time: selectedDate?.split("-").join(".") || "",
            title: selectedDiary.title || "",
            musicLink: selectedDiary.music_link,
            musicInfo: selectedDiary.music_link,
            emotion: getEmotionEmoji(selectedDiary.emotion),
            content: selectedDiary.content,
            comment_count: 0,
          }}
          onClose={closeDiaryDetail}
        />
      )}
    </div>
  );
};

export default DiaryCalendar;

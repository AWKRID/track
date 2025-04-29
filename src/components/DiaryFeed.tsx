import { useState, useEffect } from "react";
import "./DiaryFeed.css";
import DiaryDetail from "./DiaryDetail";
import { getYoutubeEmbedUrl } from "../utils/youtube";
import { supabase } from "../supabase";
import { useAuth } from "../contexts/useAuth";

// emotions 배열 재사용
const emotions = [
  { id: "행복", emoji: "😀", label: "행복" },
  { id: "슬픔", emoji: "😢", label: "슬픔" },
  { id: "그리움", emoji: "🥺", label: "그리움" },
  { id: "설렘", emoji: "😍", label: "설렘" },
  { id: "위로", emoji: "😌", label: "위로" },
];

// 리액션 타입 정의
type ReactionType = "❤️" | "😢" | "😎" | "🎶";

// 감정 ID로 이모지 찾기 함수
const getEmotionEmoji = (emotionId: string) => {
  const emotion = emotions.find((e) => e.id === emotionId);
  return emotion
    ? { emoji: emotion.emoji, label: emotion.label }
    : { emoji: "🎵", label: emotionId };
};

// Supabase에서 가져온 일기 데이터의 타입 정의
interface User {
  id: string;
  username: string;
}

interface DiaryPost {
  id: number;
  user_id: string;
  title: string | null;
  music_link: string;
  emotion: string;
  content: string;
  created_at: string;
  user: User | null;
  comment_count: number;
  reactions: Record<ReactionType, number>;
  userReaction: ReactionType | null;
}

interface DiaryFeedProps {
  onUserClick?: (userId: string) => void;
}

const DiaryFeed = ({ onUserClick }: DiaryFeedProps) => {
  const [posts, setPosts] = useState<DiaryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<DiaryPost | null>(null);
  const [isReactionLoading, setIsReactionLoading] = useState<
    Record<number, boolean>
  >({});
  const { user } = useAuth();

  const fetchTodayDiaries = async () => {
    try {
      // 오늘 날짜의 시작과 끝 설정
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

      console.log("조회 시작 시간:", startOfDay);
      console.log("조회 종료 시간:", endOfDay);

      const { data: diaries, error: diariesError } = await supabase
        .from("diaries")
        .select()
        .gte("created_at", startOfDay)
        .lt("created_at", endOfDay)
        .order("created_at", { ascending: false });

      console.log("일기 데이터 응답:", diaries);

      if (diariesError) {
        console.error("일기 데이터 에러:", diariesError);
        throw diariesError;
      }

      if (!diaries || diaries.length === 0) {
        setPosts([]);
        return;
      }

      // users 테이블에서 사용자 정보 가져오기
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, username")
        .in(
          "id",
          diaries.map((d) => d.user_id)
        );

      console.log("사용자 데이터 응답:", users);

      if (usersError) throw usersError;

      // 각 일기에 대해 댓글 수를 개별적으로 가져옵니다
      const commentCounts = await Promise.all(
        diaries.map(async (diary) => {
          const { count, error } = await supabase
            .from("comments")
            .select("*", { count: "exact" })
            .eq("diary_id", diary.id);

          return {
            diary_id: diary.id,
            count: error ? 0 : count || 0,
          };
        })
      );

      // 각 일기에 대해 리액션을 가져옵니다
      const reactionTypes: ReactionType[] = ["❤️", "😢", "😎", "🎶"];
      const reactionCounts = await Promise.all(
        diaries.map(async (diary) => {
          // 각 리액션 타입별 카운트
          const typeCounts = await Promise.all(
            reactionTypes.map(async (type) => {
              const { count, error } = await supabase
                .from("reactions")
                .select("*", { count: "exact" })
                .eq("diary_id", diary.id)
                .eq("reaction_type", type);

              return {
                type,
                count: error ? 0 : count || 0,
              };
            })
          );

          // 사용자 자신의 리액션
          let userReaction = null;
          if (user) {
            const { data, error } = await supabase
              .from("reactions")
              .select("reaction_type")
              .eq("diary_id", diary.id)
              .eq("user_id", user.id)
              .single();

            if (!error && data) {
              userReaction = data.reaction_type as ReactionType;
            }
          }

          // 리액션 데이터 구성
          const reactions: Record<ReactionType, number> = {
            "❤️": 0,
            "😢": 0,
            "😎": 0,
            "🎶": 0,
          };
          typeCounts.forEach((item) => {
            reactions[item.type] = item.count;
          });

          return {
            diary_id: diary.id,
            reactions,
            userReaction,
          };
        })
      );

      // 모든 데이터 통합
      const postsWithAllData = diaries.map((diary) => {
        const commentData = commentCounts.find((c) => c.diary_id === diary.id);
        const reactionData = reactionCounts.find(
          (r) => r.diary_id === diary.id
        );

        return {
          ...diary,
          user: users?.find((u) => u.id === diary.user_id) || null,
          comment_count: commentData?.count || 0,
          reactions: reactionData?.reactions || {
            "❤️": 0,
            "😢": 0,
            "😎": 0,
            "🎶": 0,
          },
          userReaction: reactionData?.userReaction || null,
        };
      });

      setPosts(postsWithAllData);
    } catch (error) {
      console.error("일기 데이터 가져오기 실패:", error);
      alert("데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    fetchTodayDiaries();
  }, [user]);

  // 리액션 토글 함수
  const toggleReaction = async (
    e: React.MouseEvent,
    diaryId: number,
    type: ReactionType
  ) => {
    e.stopPropagation(); // 클릭 이벤트가 상위로 전파되지 않도록 방지

    if (!user || isReactionLoading[diaryId]) return;

    setIsReactionLoading((prev) => ({ ...prev, [diaryId]: true }));

    try {
      const post = posts.find((p) => p.id === diaryId);
      if (!post) return;

      const isSameReaction = post.userReaction === type;

      if (isSameReaction) {
        // 같은 리액션이면 삭제
        const { error } = await supabase
          .from("reactions")
          .delete()
          .eq("diary_id", diaryId)
          .eq("user_id", user.id);

        if (error) throw error;

        // 상태 업데이트
        setPosts((prevPosts) =>
          prevPosts.map((p) => {
            if (p.id === diaryId) {
              const updatedReactions = { ...p.reactions };
              updatedReactions[type] = Math.max(0, updatedReactions[type] - 1);
              return {
                ...p,
                userReaction: null,
                reactions: updatedReactions,
              };
            }
            return p;
          })
        );
      } else {
        // 다른 리액션이거나 처음 리액션하는 경우
        // 기존 리액션 삭제
        if (post.userReaction) {
          await supabase
            .from("reactions")
            .delete()
            .eq("diary_id", diaryId)
            .eq("user_id", user.id);
        }

        // 새 리액션 추가
        const { error } = await supabase.from("reactions").insert({
          diary_id: diaryId,
          user_id: user.id,
          reaction_type: type,
        });

        if (error) throw error;

        // 상태 업데이트
        setPosts((prevPosts) =>
          prevPosts.map((p) => {
            if (p.id === diaryId) {
              const updatedReactions = { ...p.reactions };
              // 기존 리액션이 있었다면 카운트 감소
              if (p.userReaction) {
                updatedReactions[p.userReaction] = Math.max(
                  0,
                  updatedReactions[p.userReaction] - 1
                );
              }
              // 새 리액션 카운트 증가
              updatedReactions[type] = (updatedReactions[type] || 0) + 1;

              return {
                ...p,
                userReaction: type,
                reactions: updatedReactions,
              };
            }
            return p;
          })
        );
      }
    } catch (error) {
      console.error("리액션 처리 중 오류 발생:", error);
      alert("리액션을 처리하는데 실패했습니다.");
    } finally {
      setIsReactionLoading((prev) => ({ ...prev, [diaryId]: false }));
    }
  };

  const openPostDetail = (post: DiaryPost) => {
    setSelectedPost(post);
  };

  const closePostDetail = () => {
    setSelectedPost(null);
    // 모달이 닫힐 때 최신 데이터로 업데이트
    fetchTodayDiaries();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="feed-container"
      style={{ width: "100%", maxWidth: "800px" }}
    >
      <div className="feed-content" style={{ width: "100%" }}>
        {loading ? (
          <div
            className="loading"
            style={{
              width: "100%",
              padding: "40px",
              background: "white",
              borderRadius: "16px",
            }}
          >
            데이터를 불러오는 중...
          </div>
        ) : posts.length === 0 ? (
          <div className="no-posts">오늘 작성된 일기가 없습니다.</div>
        ) : (
          posts.map((post) => {
            const emotion = getEmotionEmoji(post.emotion);
            return (
              <div
                className="diary-card"
                key={post.id}
                onClick={() => openPostDetail(post)}
              >
                <div className="card-header">
                  <div
                    className="user-info"
                    onClick={(e) => {
                      e.stopPropagation(); // 카드 클릭 이벤트 중지
                      if (onUserClick && post.user_id) {
                        onUserClick(post.user_id);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="avatar-circle">🎵</div>
                    <div className="post-info">
                      <div className="user-name">
                        {post.user?.username || "알 수 없음"}
                      </div>
                      <div className="post-time">
                        {formatTime(post.created_at)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-content">
                  {post.title && <h2 className="post-title">{post.title}</h2>}

                  <div className="music-preview">
                    <div className="music-details">
                      {getYoutubeEmbedUrl(post.music_link) ? (
                        <div
                          style={{
                            position: "relative",
                            width: "100%",
                            paddingTop: "56.25%",
                          }}
                        >
                          <iframe
                            src={getYoutubeEmbedUrl(post.music_link)!}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              borderRadius: 12,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      ) : (
                        <a
                          href={post.music_link}
                          className="music-link"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {post.music_link}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="emotion-tag">
                    {emotion.emoji} {emotion.label}
                  </div>

                  <p className="diary-content">{post.content}</p>

                  {/* 리액션 섹션 추가 */}
                  <div className="reactions-section">
                    <div className="reactions-container">
                      {(Object.keys(post.reactions) as ReactionType[]).map(
                        (type) => (
                          <button
                            key={type}
                            className={`reaction-button ${
                              post.userReaction === type ? "active" : ""
                            }`}
                            onClick={(e) => toggleReaction(e, post.id, type)}
                            disabled={isReactionLoading[post.id] || !user}
                          >
                            <span className="reaction-emoji">{type}</span>
                            <span className="reaction-count">
                              {post.reactions[type]}
                            </span>
                          </button>
                        )
                      )}
                    </div>
                    {!user && (
                      <p className="login-message">
                        로그인 후 반응을 남길 수 있습니다
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedPost && (
        <DiaryDetail
          diaryId={selectedPost.id}
          post={{
            username: selectedPost.user?.username || "알 수 없음",
            userId: selectedPost.user_id,
            time: new Date(selectedPost.created_at).toLocaleString("ko-KR"),
            title: selectedPost.title || "",
            musicLink: selectedPost.music_link,
            musicInfo: selectedPost.music_link,
            emotion: getEmotionEmoji(selectedPost.emotion),
            content: selectedPost.content,
            comment_count: selectedPost.comment_count || 0,
          }}
          onClose={closePostDetail}
          onUserClick={onUserClick}
        />
      )}
    </div>
  );
};

export default DiaryFeed;

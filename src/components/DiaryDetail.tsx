import { useState, useRef, useEffect } from "react";
import "./DiaryDetail.css";
import { getYoutubeEmbedUrl } from "../utils/youtube";
import { supabase } from "../supabase";
import { useAuth } from "../contexts/useAuth";

// 리액션 타입 정의
type ReactionType = "❤️" | "😢" | "😎" | "🎶";

// 댓글 인터페이스
interface Comment {
  id: number;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
}

export interface DiaryDetailProps {
  diaryId: number;
  onClose: () => void;
  onUserClick?: (userId: string) => void;
  post: {
    username: string;
    userId?: string;
    time: string;
    title: string;
    musicLink: string;
    musicInfo: string;
    emotion: { emoji: string; label: string };
    content: string;
    comment_count: number;
  };
}

const DiaryDetail = ({
  diaryId,
  post,
  onClose,
  onUserClick,
}: DiaryDetailProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // 리액션 상태 관리
  const [reactions, setReactions] = useState<Record<ReactionType, number>>({
    "❤️": 0,
    "😢": 0,
    "😎": 0,
    "🎶": 0,
  });
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [isReactionLoading, setIsReactionLoading] = useState(false);

  // 리액션 데이터 가져오기
  const fetchReactions = async () => {
    try {
      // 각 리액션 타입별로 개별 쿼리를 실행
      const reactionTypes: ReactionType[] = ["❤️", "😢", "😎", "🎶"];
      const newReactions = { "❤️": 0, "😢": 0, "😎": 0, "🎶": 0 };

      // 모든 리액션 타입에 대한 카운트 병렬 요청
      await Promise.all(
        reactionTypes.map(async (type) => {
          const { count, error } = await supabase
            .from("reactions")
            .select("*", { count: "exact" })
            .eq("diary_id", diaryId)
            .eq("reaction_type", type);

          if (!error && count !== null) {
            newReactions[type] = count;
          }
        })
      );

      setReactions(newReactions);

      // 로그인한 사용자의 리액션 가져오기
      if (user) {
        const { data: userReactionData, error: userError } = await supabase
          .from("reactions")
          .select("reaction_type")
          .eq("diary_id", diaryId)
          .eq("user_id", user.id)
          .single();

        if (userError && userError.code !== "PGRST116") {
          // PGRST116는 "결과 없음" 에러
          throw userError;
        }

        if (userReactionData) {
          setUserReaction(userReactionData.reaction_type as ReactionType);
        } else {
          setUserReaction(null);
        }
      }
    } catch (error) {
      console.error("리액션을 불러오는데 실패했습니다:", error);
    }
  };

  // 컴포넌트 마운트 시 리액션 데이터 로드
  useEffect(() => {
    fetchReactions();
  }, [diaryId, user]);

  // 리액션 토글 함수
  const toggleReaction = async (type: ReactionType) => {
    if (!user || isReactionLoading) return;

    setIsReactionLoading(true);

    try {
      // 현재 사용자가 이미 같은 리액션을 했는지 확인
      const isSameReaction = userReaction === type;

      if (isSameReaction) {
        // 같은 리액션이면 삭제
        const { error: deleteError } = await supabase
          .from("reactions")
          .delete()
          .eq("diary_id", diaryId)
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;

        // 상태 업데이트
        setUserReaction(null);
        setReactions((prev) => ({
          ...prev,
          [type]: Math.max(0, prev[type] - 1),
        }));
      } else {
        // 다른 리액션이거나 처음 리액션하는 경우

        // 기존 리액션이 있으면 카운트 감소
        if (userReaction) {
          setReactions((prev) => ({
            ...prev,
            [userReaction]: Math.max(0, prev[userReaction] - 1),
          }));
        }

        // 기존 리액션 삭제
        const { error: deleteError } = await supabase
          .from("reactions")
          .delete()
          .eq("diary_id", diaryId)
          .eq("user_id", user.id);

        if (deleteError) throw deleteError;

        // 새 리액션 추가
        const { error: insertError } = await supabase.from("reactions").insert({
          diary_id: diaryId,
          user_id: user.id,
          reaction_type: type,
        });

        if (insertError) throw insertError;

        // 상태 업데이트
        setUserReaction(type);
        setReactions((prev) => ({
          ...prev,
          [type]: prev[type] + 1,
        }));
      }
    } catch (error) {
      console.error("리액션 처리 중 오류 발생:", error);
      alert("리액션을 처리하는데 실패했습니다.");
    } finally {
      setIsReactionLoading(false);
    }
  };

  // 댓글 가져오기 (댓글 탭을 열 때만 실행)
  const fetchComments = async () => {
    try {
      setIsLoading(true);

      // 1. 댓글 데이터 먼저 가져오기
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id")
        .eq("diary_id", diaryId)
        .order("created_at", { ascending: false });

      if (commentsError) throw commentsError;
      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        setCommentCount(0);
        return;
      }

      // 2. 댓글 작성자 정보 가져오기
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, username")
        .in(
          "id",
          commentsData.map((comment) => comment.user_id)
        );

      if (usersError) throw usersError;

      // 3. 데이터 합치기
      const formattedComments = commentsData.map((comment) => ({
        id: comment.id,
        user_id: comment.user_id,
        username:
          usersData?.find((u) => u.id === comment.user_id)?.username ||
          "알 수 없음",
        content: comment.content,
        created_at: formatCommentDate(comment.created_at),
      }));

      setComments(formattedComments);
      setCommentCount(formattedComments.length);
    } catch (error) {
      console.error("댓글을 불러오는데 실패했습니다:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 댓글 섹션 토글
  const toggleComments = () => {
    const willShow = !showComments;
    setShowComments(willShow);

    // 댓글 섹션을 처음 열 때만 데이터 로드
    if (willShow && comments.length === 0) {
      fetchComments();
    }

    // 댓글 창 열 때 입력 필드에 자동 포커스
    if (willShow) {
      setTimeout(() => {
        commentInputRef.current?.focus();
      }, 300);
    }
  };

  // 날짜 포맷팅 함수
  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffMinutes < 1) return "방금 전";
    if (diffMinutes < 60) return `${diffMinutes}분 전`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString("ko-KR");
  };

  // 댓글 추가
  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;

    setIsLoading(true);

    try {
      // Supabase에 댓글 추가
      const { error } = await supabase.from("comments").insert({
        user_id: user.id,
        diary_id: diaryId,
        content: commentText.trim(),
      });

      if (error) throw error;

      // 댓글 목록 새로고침
      fetchComments();

      // 입력 필드 초기화
      setCommentText("");
    } catch (error) {
      console.error("댓글 작성에 실패했습니다:", error);
      alert("댓글을 작성하는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="diary-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          ×
        </button>

        <div className="modal-content">
          <div className="modal-header">
            <div
              className="user-info"
              onClick={() => {
                if (onUserClick && post.userId) {
                  onUserClick(post.userId);
                  onClose();
                }
              }}
              style={{ cursor: post.userId ? "pointer" : "default" }}
            >
              <div className="avatar-circle">🎵</div>
              <div className="post-info">
                <div className="user-name">{post.username}</div>
                <div className="post-time">{post.time}</div>
              </div>
            </div>
          </div>

          <div className="diary-content-wrapper">
            <div className="diary-content-card">
              <h3 className="diary-title">{post.title}</h3>

              <div className="music-info">
                {getYoutubeEmbedUrl(post.musicLink) ? (
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      paddingTop: "56.25%",
                    }}
                  >
                    <iframe
                      src={getYoutubeEmbedUrl(post.musicLink)!}
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
                    />
                  </div>
                ) : (
                  <div className="music-preview">
                    <div className="music-icon">🎧</div>
                    <a
                      href={post.musicLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="music-link"
                    >
                      {post.musicInfo}
                    </a>
                  </div>
                )}
              </div>

              <div className="emotion-tag">
                {post.emotion.emoji} {post.emotion.label}
              </div>

              <p className="diary-text">{post.content}</p>

              {/* 리액션 섹션 추가 */}
              <div className="reactions-section">
                <div className="reactions-container">
                  {(Object.keys(reactions) as ReactionType[]).map((type) => (
                    <button
                      key={type}
                      className={`reaction-button ${
                        userReaction === type ? "active" : ""
                      }`}
                      onClick={() => toggleReaction(type)}
                      disabled={isReactionLoading || !user}
                    >
                      <span className="reaction-emoji">{type}</span>
                      <span className="reaction-count">{reactions[type]}</span>
                    </button>
                  ))}
                </div>
                {!user && (
                  <p className="login-message">
                    로그인 후 반응을 남길 수 있습니다
                  </p>
                )}
              </div>

              <div className="comments-section">
                <button
                  className="toggle-comments-button"
                  onClick={toggleComments}
                >
                  {showComments ? "댓글 접기" : `댓글 ${commentCount}개 보기`}
                </button>

                {showComments && (
                  <div className="comments-container">
                    {isLoading && comments.length === 0 ? (
                      <div className="comments-loading">
                        댓글을 불러오는 중...
                      </div>
                    ) : (
                      <>
                        <form className="comment-form" onSubmit={addComment}>
                          <input
                            ref={commentInputRef}
                            type="text"
                            placeholder={
                              user
                                ? "응원의 한마디를 남겨보세요..."
                                : "로그인 후 댓글을 작성할 수 있습니다"
                            }
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            maxLength={500}
                            className="comment-input"
                            disabled={!user || isLoading}
                          />
                          <button
                            type="submit"
                            className="comment-submit-button"
                            disabled={!user || !commentText.trim() || isLoading}
                          >
                            {isLoading ? "등록 중..." : "등록"}
                          </button>
                        </form>

                        <div className="comments-list">
                          {comments.length > 0 ? (
                            comments.map((comment) => (
                              <div key={comment.id} className="comment-item">
                                <div
                                  className="comment-user"
                                  onClick={() => {
                                    if (onUserClick) {
                                      onUserClick(comment.user_id);
                                      onClose();
                                    }
                                  }}
                                  style={{ cursor: "pointer" }}
                                >
                                  {comment.username}
                                </div>
                                <div className="comment-content">
                                  {comment.content}
                                </div>
                                <div className="comment-date">
                                  {formatCommentDate(comment.created_at)}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="no-comments">
                              첫 번째 댓글을 남겨보세요!
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiaryDetail;

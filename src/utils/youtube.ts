export function getYoutubeEmbedUrl(url: string): string | null {
  // 유튜브 링크에서 영상 ID 추출
  const match = url.match(
    /(?:youtube\.com\/.*v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

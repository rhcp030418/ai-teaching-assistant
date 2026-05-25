import path from "node:path";

/**
 * 업로드 파일 저장 디렉터리.
 *
 * 기본값은 <프로젝트 루트>/uploads 이며, 로컬 실행에서는 별도 설정이 필요 없다.
 * 저장 위치를 옮기고 싶으면 UPLOADS_DIR 환경변수로 경로를 지정한다.
 *   예: UPLOADS_DIR="D:/data/uploads"
 */
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");

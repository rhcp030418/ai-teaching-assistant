import path from "node:path";

/**
 * 업로드 파일 저장 디렉터리.
 *
 * Railway 등 컨테이너 환경의 파일시스템은 휘발성이라, 배포·재시작 시
 * 컨테이너 로컬 디스크에 쓴 파일은 사라진다. 영구 볼륨을 마운트한 뒤
 * UPLOADS_DIR 환경변수로 그 경로를 가리키게 한다.
 *   예: 볼륨을 /data 에 마운트 → UPLOADS_DIR=/data/uploads
 *       (DB도 같은 볼륨에: DATABASE_URL=file:/data/dev.db)
 * 미설정 시 로컬 개발 기본값은 <cwd>/uploads.
 */
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");

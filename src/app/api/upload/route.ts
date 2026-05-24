import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isDemoUser } from "@/lib/auth-utils";
import { UPLOADS_DIR } from "@/lib/uploads";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (isDemoUser(session.user.email)) {
    return Response.json({ error: "데모 계정은 읽기 전용입니다." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const courseId = formData.get("courseId") as string;
  const roundId = (formData.get("roundId") as string | null) || null;

  if (!file || !courseId) {
    return Response.json({ error: "파일과 강의 ID가 필요합니다." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json({ error: "파일 크기는 10MB 이하만 가능합니다." }, { status: 400 });
  }

  // 강의 소유권 검증
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.professorId !== session.user.id) {
    return Response.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  // 라운드 소유권 검증
  if (roundId) {
    const round = await prisma.feedbackRound.findUnique({ where: { id: roundId } });
    if (!round || round.courseId !== courseId) {
      return Response.json({ error: "잘못된 라운드입니다." }, { status: 400 });
    }
  }

  const ext = path.extname(file.name).toLowerCase();
  if (![".pdf", ".txt"].includes(ext)) {
    return Response.json(
      { error: "PDF, TXT 파일만 업로드 가능합니다." },
      { status: 400 },
    );
  }

  const uploadsDir = UPLOADS_DIR;
  await fs.mkdir(uploadsDir, { recursive: true });

  // UUID 기반 파일명: 원본 파일명 노출 방지 + 경로 탐색(path traversal) 방어
  const uniqueName = `${randomUUID()}${ext}`;
  const filePath = path.join(uploadsDir, uniqueName);

  // 이중 방어: 해석된 경로가 uploads 디렉터리 밖을 가리키는지 확인
  if (!path.resolve(filePath).startsWith(path.resolve(uploadsDir))) {
    return Response.json({ error: "잘못된 파일 경로입니다." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // 매직 바이트 검증: 확장자 위장 파일 차단
  if (ext === ".pdf") {
    // PDF 시그니처: %PDF
    if (buffer.length < 4 || buffer.toString("ascii", 0, 4) !== "%PDF") {
      return Response.json({ error: "유효한 PDF 파일이 아닙니다." }, { status: 400 });
    }
  }
  await fs.writeFile(filePath, buffer);

  let material;
  try {
    material = await prisma.lectureMaterial.create({
      data: { courseId, roundId, fileName: file.name, filePath: uniqueName },
    });
  } catch {
    // DB 저장 실패 시 업로드된 파일 정리
    await fs.unlink(filePath).catch(() => {});
    return Response.json({ error: "파일 저장에 실패했습니다." }, { status: 500 });
  }

  return Response.json({ id: material.id, fileName: material.fileName });
}

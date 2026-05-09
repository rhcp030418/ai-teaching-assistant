import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import path from "node:path";
import fs from "node:fs/promises";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const courseId = formData.get("courseId") as string;

  if (!file || !courseId) {
    return Response.json({ error: "파일과 강의 ID가 필요합니다." }, { status: 400 });
  }

  // Verify course ownership
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.professorId !== session.user.id) {
    return Response.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const ext = path.extname(file.name).toLowerCase();
  if (![".pdf", ".ppt", ".pptx", ".txt"].includes(ext)) {
    return Response.json(
      { error: "PDF, PPT, TXT 파일만 업로드 가능합니다." },
      { status: 400 }
    );
  }

  const uploadsDir = path.join(process.cwd(), "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });

  const uniqueName = `${Date.now()}-${file.name}`;
  const filePath = path.join(uploadsDir, uniqueName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  const material = await prisma.lectureMaterial.create({
    data: {
      courseId,
      fileName: file.name,
      filePath: uniqueName,
    },
  });

  return Response.json({ id: material.id, fileName: material.fileName });
}

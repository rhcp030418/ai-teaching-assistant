import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth-utils";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // 로컬/자체 호스팅 실행에서 host 검증을 신뢰 (npm start 프로덕션 모드에서도 로그인 동작).
  trustHost: true,
  providers: [
    Credentials({
      name: "이메일 로그인",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) return null;

        const professor = await prisma.professor.findUnique({
          where: { email },
        });

        if (!professor) return null;

        const isValid = await verifyPassword(password, professor.password);
        if (!isValid) return null;

        return {
          id: professor.id,
          name: professor.name,
          email: professor.email,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});

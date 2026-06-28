import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" }, // Required for Credentials Provider
  providers: [
    GitHub,
    Credentials({
      name: "Test Account",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "tester" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (credentials?.username === "tester" && credentials?.password === "password123") {
          let user = await prisma.user.findUnique({ where: { email: "tester@example.com" } });
          if (!user) {
            user = await prisma.user.create({
              data: {
                name: "Test User",
                email: "tester@example.com",
              }
            });
          }
          return { id: user.id, name: user.name, email: user.email };
        }
        return null;
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare, hash } from "bcryptjs";
import { queryOne } from "./db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/signup",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await queryOne<{
          id: string;
          email: string;
          name: string | null;
          password_hash: string | null;
          role: string;
        }>(
          "SELECT id, email, name, password_hash, role FROM users WHERE email = $1",
          [credentials.email.toLowerCase()]
        );

        if (!user || !user.password_hash) return null;

        const valid = await compare(credentials.password, user.password_hash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        // Upsert user on Google sign-in
        const existing = await queryOne<{ id: string }>(
          "SELECT id FROM users WHERE email = $1",
          [user.email!.toLowerCase()]
        );

        if (existing) {
          // Link Google if not already linked
          await queryOne(
            `UPDATE users SET auth_provider = COALESCE(auth_provider, 'google'),
             auth_provider_id = COALESCE(auth_provider_id, $1),
             name = COALESCE(name, $2),
             avatar_url = COALESCE(avatar_url, $3)
             WHERE id = $4`,
            [account.providerAccountId, user.name, user.image, existing.id]
          );
          (user as any).id = existing.id;
        } else {
          // Create new user
          const newUser = await queryOne<{ id: string }>(
            `INSERT INTO users (email, name, auth_provider, auth_provider_id, avatar_url, email_verified)
             VALUES ($1, $2, 'google', $3, $4, true) RETURNING id`,
            [user.email!.toLowerCase(), user.name, account.providerAccountId, user.image]
          );
          if (newUser) (user as any).id = newUser.id;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role || "user";
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
};

export async function getServerUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as { id: string; email: string; name?: string | null; role: string };
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return compare(password, hashed);
}

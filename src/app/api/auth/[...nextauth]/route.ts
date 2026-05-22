import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GithubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectToDatabase } from '@/configs/db';
import { User } from '@/modules/auth/models/user.model';
import { UserStats } from '@/modules/gamification/models/user-stats.model';
import bcrypt from 'bcryptjs';
import { env } from '@/configs/env';

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID || '',
      clientSecret: env.GOOGLE_CLIENT_SECRET || '',
    }),
    GithubProvider({
      clientId: env.GITHUB_CLIENT_ID || '',
      clientSecret: env.GITHUB_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectToDatabase();
        const user = await User.findOne({ email: credentials.email });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile: _profile }) {
      await connectToDatabase();

      if (account?.provider === 'google' || account?.provider === 'github') {
        const providerIdField = account.provider === 'google' ? 'googleId' : 'githubId';
        const existingUser = await User.findOne({
          $or: [{ email: user.email }, { [providerIdField]: account.providerAccountId }],
        });

        if (!existingUser) {
          const nameParts = (user.name || 'User Unknown').split(' ');
          const newUser = await User.create({
            email: user.email,
            firstName: nameParts[0] || 'User',
            lastName: nameParts.slice(1).join(' ') || '',
            role: 'STUDENT',
            avatarUrl: user.image,
            [providerIdField]: account.providerAccountId,
          });

          await UserStats.create({ userId: newUser._id, xp: 0, level: 1 });
        } else if (!(existingUser as any)[providerIdField]) {
          (existingUser as any)[providerIdField] = account.providerAccountId;
          await existingUser.save();
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        await connectToDatabase();
        const dbUser = await User.findOne({ email: user.email });
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session as any).user.id = token.id;
        (session as any).user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
});

export { handler as GET, handler as POST };

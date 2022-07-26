import NextAuth from 'next-auth';
import SpotifyProvider from 'next-auth/providers/spotify';

export default NextAuth({
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      checks: ['state'],
      authorization: {
        url: `https://accounts.spotify.com/authorize`,
        params: {
          scope: [
            'streaming',
            'user-read-email',
            'user-read-private',
            'user-library-read',
            'playlist-read-private',
            'user-follow-read',
            'user-modify-playback-state',
            'user-read-playback-position',
          ].join(' '),
          response_type: 'code',
          redirect_uri: 'http://localhost:3000/api/auth/callback/spotify',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token to the token right after sign in
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Send the access token to the client, so that we can pass it to our Spotify Web Player.
      session.accessToken = token.accessToken;
      return session;
    },
  },
});

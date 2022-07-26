import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Session } from 'next-auth';
import {
  useSession,
  signIn as nextAuthSignIn,
  signOut as nextAuthSignOut,
} from 'next-auth/react';

import ViewOptions, { WINDOW_TYPE } from 'components/views';
import { useWindowContext } from 'hooks';
import * as SpotifyUtils from 'utils/spotify';

import { useSettings } from '../';

export interface SpotifySDKState {
  isMounted: boolean;
  spotifyPlayer: Spotify.Player;
  accessToken?: string;
  deviceId?: string;
}

export const SpotifySDKContext = createContext<SpotifySDKState>({} as any);

export type SpotifySDKHook = SpotifySDKState & {
  signIn: () => void;
  signOut: () => void;
};

export const useSpotifySDK = (): SpotifySDKHook => {
  const {
    isSpotifyAuthorized,
    setIsSpotifyAuthorized,
    isAppleAuthorized,
    setService,
  } = useSettings();
  const { showWindow } = useWindowContext();
  const state = useContext(SpotifySDKContext);

  /**
   * Open the Spotify OAuth login page. Once authenticated, the user will be
   * redirected back to the app.
   */
  const signIn = useCallback(() => {
    if (!state.isMounted) {
      showWindow({
        type: WINDOW_TYPE.POPUP,
        id: ViewOptions.spotifyNotSupportedPopup.id,
        title: ViewOptions.spotifyNotSupportedPopup.title,
        description: 'Spotify was unable to mount on this browser :(',
        listOptions: [
          {
            type: 'Action',
            label: 'Okay 😞',
            onSelect: () => {},
          },
        ],
      });
      return;
    }

    if (!isSpotifyAuthorized) {
      nextAuthSignIn('spotify');
    } else {
      setService('spotify');
    }
  }, [isSpotifyAuthorized, setService, showWindow, state.isMounted]);

  const signOut = useCallback(async () => {
    state.spotifyPlayer.disconnect();
    setIsSpotifyAuthorized(false);

    await nextAuthSignOut();

    // Change to apple music if available.
    if (isAppleAuthorized) {
      setService('apple');
    } else {
      setService(undefined);
    }
  }, [
    isAppleAuthorized,
    setIsSpotifyAuthorized,
    setService,
    state.spotifyPlayer,
  ]);

  return {
    ...state,
    signIn,
    signOut,
  };
};

interface Props {
  children: React.ReactNode;
}

export const SpotifySDKProvider = ({ children }: Props) => {
  const isNewRef = useRef(true);
  const session = useSession();
  const { accessToken } = session?.data as Session & { accessToken?: string };
  const { showWindow, hideWindow } = useWindowContext();
  const { setIsSpotifyAuthorized, setService } = useSettings();
  const [deviceId, setDeviceId] = useState<string>();
  const spotifyPlayerRef = useRef<Spotify.Player | undefined>();
  const [isMounted, setIsMounted] = useState(false);
  const [isSdkReady, setIsSdkReady] = useState(false);

  const handleUnsupportedAccountError = useCallback(() => {
    showWindow({
      type: WINDOW_TYPE.POPUP,
      id: ViewOptions.spotifyNonPremiumPopup.id,
      title: 'Unable to sign in',
      description:
        'Spotify requires a Premium account to play music on the web',
      listOptions: [
        {
          type: 'Action',
          label: 'Okay 😞',
          onSelect: hideWindow,
        },
      ],
    });
  }, [hideWindow, showWindow]);

  /** Fetch access tokens and, if successful, then set up the playback sdk. */
  const handleConnectToSpotify = useCallback(async () => {
    setIsMounted(true);

    if (accessToken /*&& refreshToken */) {
      const player = new window.Spotify.Player({
        name: 'iPod Classic',
        getOAuthToken: async (cb) => {
          if (!accessToken) {
            console.error("ERROR: Didn't find stored access token");
            return;
          }

          cb(accessToken);
        },
      });

      player.addListener('ready', ({ device_id }: any) => {
        console.log({ device_id });
        setDeviceId(device_id);
        setIsSpotifyAuthorized(true);
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error(`Spotify authentication error: ${message}`);
        setIsSpotifyAuthorized(false);
      });

      /** This indicates that the user is using an unsupported account tier. */
      player.addListener('account_error', () => {
        handleUnsupportedAccountError();
        setIsSpotifyAuthorized(false);
        SpotifyUtils.removeExistingTokens();
      });

      player.addListener('playback_error', ({ message }) => {
        console.error(message);
      });

      player.connect();

      spotifyPlayerRef.current = player;

      /** The user has just signed in; configure the app to use Spotify. */
      if (isNewRef.current) {
        isNewRef.current = false;
        setService('spotify');
      }
    }
  }, [
    handleUnsupportedAccountError,
    setIsSpotifyAuthorized,
    setService,
    accessToken,
  ]);

  useEffect(() => {
    if (isSdkReady && typeof accessToken === 'string') {
      handleConnectToSpotify();
    }
  }, [handleConnectToSpotify, isSdkReady, accessToken]);

  useEffect(() => {
    window.onSpotifyWebPlaybackSDKReady = () => setIsSdkReady(true);
  }, []);

  return (
    <SpotifySDKContext.Provider
      value={{
        spotifyPlayer: spotifyPlayerRef.current ?? ({} as Spotify.Player),
        accessToken,
        deviceId,
        isMounted,
      }}
    >
      {children}
    </SpotifySDKContext.Provider>
  );
};

export default memo(SpotifySDKProvider);

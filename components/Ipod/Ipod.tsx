import { memo } from 'react';
import WindowProvider from 'providers/WindowProvider';
import { ScrollWheel } from 'components';
import {
  AudioPlayerProvider,
  MusicKitProvider,
  SpotifySDKProvider,
  useSettings,
} from 'hooks';
import { WindowManager } from 'components';
import { useState } from 'react';
import {
  ScreenContainer,
  Shell,
  Sticker,
  Sticker2,
  Sticker3,
} from 'components/Ipod/Styled';

type Props = {
  appleToken: string;
};

const Ipod = ({ appleToken }: Props) => {
  const { deviceTheme } = useSettings();

  return (
    <Shell deviceTheme={deviceTheme}>
      <Sticker deviceTheme={deviceTheme} />
      <Sticker2 deviceTheme={deviceTheme} />
      <Sticker3 deviceTheme={deviceTheme} />
      <ScreenContainer>
        <WindowProvider>
          <SpotifySDKProvider>
            <MusicKitProvider token={appleToken}>
              <AudioPlayerProvider>
                <WindowManager />
              </AudioPlayerProvider>
            </MusicKitProvider>
          </SpotifySDKProvider>
        </WindowProvider>
      </ScreenContainer>
      <ScrollWheel />
    </Shell>
  );
};

export default memo(Ipod);

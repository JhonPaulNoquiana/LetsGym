import React from 'react';
import { Card, Heading, Txt } from './UI';
import { isAppleMobileBrowser } from '../utils/browserPlatform';

export function HomeScreenHint() {
  const appleDevice = isAppleMobileBrowser(navigator);
  const installed = window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true;
  if (!appleDevice || installed) return null;
  return (
    <Card style={{ gap: 10 }}>
      <Heading small>LetsGym on your Home Screen</Heading>
      <Txt muted style={{ lineHeight: 22 }}>
        Open this link in Safari, tap Share, then Add to Home Screen and Add.
        Launch LetsGym from its icon for the app experience.
      </Txt>
    </Card>
  );
}

import JSON5 from 'json5';
import { ReactiveConfig as OriginalReactiveConfig } from '@hyperzlib/node-reactive-config';

OriginalReactiveConfig.addParser(['json5', 'jsonc'], JSON5);

export const ReactiveConfig = OriginalReactiveConfig;
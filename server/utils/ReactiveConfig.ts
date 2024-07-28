import JSON5 from 'json5';
import { ReactiveConfig as OriginalReactiveConfig } from '@hyperzlib/node-reactive-config';

OriginalReactiveConfig.addParser(['json5', 'jsonc'], {
    parse: JSON5.parse,
    stringify: (data) => JSON5.stringify(data, null, 4),
});

export const ReactiveConfig = OriginalReactiveConfig;
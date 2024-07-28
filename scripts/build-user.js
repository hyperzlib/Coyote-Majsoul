const fs = require('fs');

const tampermonkeyHeader = `// ==UserScript==
// @name        雀魂郊狼监听器
// @namespace   hyperzlib
// @license     AGPL-3.0
// @match       https://game.maj-soul.com/*
// @match       https://mahjongsoul.game.yo-star.com/*
// @match       https://game.mahjongsoul.com/*
// @grant       none
// @version     1.0.4
// @author      https://github.com/Hyperzlib
// @description https://github.com/Hyperzlib/Coyote-Majsoul
// ==/UserScript==\n\n`;

const targetFile = 'dist/majsoul-analyser.user.js';

let content = fs.readFileSync(targetFile, 'utf-8');
content = tampermonkeyHeader + content;

console.log('Writing tampermonkey script to ' + targetFile);
fs.writeFileSync(targetFile, content, 'utf-8');
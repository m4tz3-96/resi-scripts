// ==UserScript==
// @name         Hide rework
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Hides the content of the rework card below the map.
// @author       M4tz3
// @match        https://rettungssimulator.online/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=rettungssimulator.online
// @updateURL    https://raw.githubusercontent.com/m4tz3-96/resi-scripts/main/hideRework.user.js
// @downloadURL  https://raw.githubusercontent.com/m4tz3-96/resi-scripts/main/hideRework.user.js
// @grant        none
// ==/UserScript==

(function() {
    document.getElementById('ad').querySelector('div').innerHTML = '';
    document.getElementById('ad').classList.remove('rework-border');
})();

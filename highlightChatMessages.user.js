// ==UserScript==
// @name         Highlight chat messages
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Highlights messages in chat that contain user specified keywords (standard is the username).
// @author       M4tz3
// @match        https://rettungssimulator.online/
// @match        https://rettungssimulator.online/script/highlightChatMessagesSettings
// @icon         https://www.google.com/s2/favicons?sz=64&domain=rettungssimulator.online
// @updateURL    https://raw.githubusercontent.com/m4tz3-96/resi-scripts/main/highlightChatMessages.user.js
// @downloadURL  https://raw.githubusercontent.com/m4tz3-96/resi-scripts/main/highlightChatMessages.user.js
// @grant        none
// ==/UserScript==

(async function () {
    const colors = {
        red: '#662B2B',
        yellow: '#D1C24D',
        blue: '#333366',
        green: '#336633',
        violet: '#4D1A4D',
        orange: '#7F4D33',
        rose: '#7F5F66',
        turquoise: '#336666',
        lime: '#8A9E33'
    };
    let keywords = [];
    const path = window.location.pathname.replace(/\d+/g, "");

    let style = document.createElement('style');
    style.innerHTML = `
        body #chat .message.highlight {
            background-color: var(--highlight-color);
            color: var(--highlight-color-text);
        }

        body #chat .message.highlight::before {
            border-top-color: var(--highlight-color);
            border-right-color: var(--highlight-color);
        }

        body #chat .message.message-own.highlight {
            background-color: var(--highlight-color);
            border-color: var(--highlight-color);
            color: var(--highlight-color-text);
        }

        body #chat .message.message-own.highlight::before {
            border-top-color: var(--highlight-color);
            border-left-color: var(--highlight-color);
        }

        #highlightMessagesSettingsGrid {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        #highlightMessagesSettingsGrid div {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }

        #highlightMessagesSettingsGrid div *{
            box-sizing: border-box;
        }

        #highlightMessagesSettingsGrid div input[type=text] {
        flex: 1 1 calc(40% - 0.5rem);
        }

        #highlightMessagesSettingsGrid div select {
        flex: 1 1 calc(25% - 0.5rem);
        }

        #highlightMessagesSettingsGrid div input[type=color] {
        flex: 1 1 calc(15% - 0.5rem);
        }

        #highlightMessagesSettingsGrid div button {
        flex: 1 1 calc(20% - 0.5rem);
        }

        @media (max-width: 768px) {
            #highlightMessagesSettingsGrid {
                display: flex;
                flex-direction: column;
            }

            #highlightMessagesSettingsGrid div {
                flex-direction: column;
                gap: 0.5rem;
            }

            #highlightMessagesSettingsGrid div * {
                flex: 1 1 100%;
            }
        }
    `;
    document.head.appendChild(style);

    /**
     * Initializes the keywords locally and in the local Storage.
     *
     * @returns {Promise} Nothing but needs to wait for initialization of the keywords.
     */
    window.initializeKeywords = async function () {
        return new Promise((resolve) => {
            keywords = JSON.parse(localStorage.getItem('resiDMKeywords'));

            if (keywords === null) {
                fetch("/api/user")
                    .then(response => {
                        if (!response.ok) {
                            throw new Error("Fehler beim Abrufen der Benutzerdaten");
                        }
                        return response.json();
                    })
                    .then(user => {
                        keywords = [[user.userName, colors.red]];
                        localStorage.setItem('resiDMKeywords', JSON.stringify(keywords));
                        resolve();
                    })
                    .catch(error => {
                        console.error(error);
                        resolve();
                    });
            } else {
                resolve();
            }
        });
    }

    /**
     * Adds a row to the settings grid. Uses the existing data as starting values.
     *
     * @param {Array} rowValues Array containg the keyword and the representing color.
     */
    function addRowToGrid(rowValues) {
        let isPredefinedColor = false;
        const gridContainer = document.getElementById('highlightMessagesSettingsGrid');

        // row
        const row = document.createElement('div');

        // text input for keyword
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = rowValues[0];
        textInput.placeholder = 'Keyword';

        // color picker for costum color
        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.value = rowValues[1];
        colorPicker.style.display = 'none';

        // select for predefined colors
        const selectElement = document.createElement('select');
        selectElement.style.flex = '1 1 calc(40% - 0.5rem)';

        for (const color in colors) {
            const option = document.createElement('option');
            option.value = colors[color];
            option.text = color.charAt(0).toUpperCase() + color.slice(1);
            if (colors[color] === rowValues[1]) {
                option.selected = true;
                isPredefinedColor = true;
            }
            selectElement.appendChild(option);
        }

        const customOption = document.createElement('option');
        customOption.text = 'Custom';
        if (!isPredefinedColor) {
            customOption.selected = true;
            colorPicker.style.display = 'flex';
            selectElement.style.flex = '1 1 calc(25% - 0.5rem)';
        }
        selectElement.appendChild(customOption);

        selectElement.addEventListener('change', function () {
            if (selectElement.value === 'Custom') {
                colorPicker.style.display = 'flex';
                selectElement.style.flex = '1 1 calc(25% - 0.5rem)';
            } else {
                colorPicker.style.display = 'none';
                selectElement.style.flex = '1 1 calc(40% - 0.5rem)';
            }
        });

        // delete row
        const trashIcon = document.createElement('i');
        trashIcon.classList = 'fa fa-trash';
        const trashButton = document.createElement('button');
        trashButton.classList = 'button button-danger button-round';
        trashButton.appendChild(trashIcon);
        trashButton.appendChild(document.createTextNode(' Löschen'));
        trashButton.onclick = function () {
            row.remove();
        };

        row.appendChild(textInput);
        row.appendChild(selectElement);
        row.appendChild(colorPicker);
        row.appendChild(trashButton);
        gridContainer.appendChild(row);
    }

    /**
     * Creates a grid to configure the keywords for highlighting.
     */
    function createSettingsGrid() {
        let settingsContainer = document.getElementsByClassName('panel-body')[0];
        settingsContainer.innerHTML = '';

        const gridContainer = document.createElement('div');
        gridContainer.id = 'highlightMessagesSettingsGrid';

        settingsContainer.appendChild(gridContainer);

        keywords.forEach(function (keyword) {
            addRowToGrid(keyword);
        });
    }

    /**
     * Saves the keywords congigured by the user and reinitializes the local variable and local storage.
     */
    async function saveKeywords() {
        const gridContainer = document.getElementById('highlightMessagesSettingsGrid');
        const rows = gridContainer.getElementsByTagName('div');
        let updatedKeywords = [];

        for (const row of rows) {
            const textInput = row.querySelector('input');
            const keyword = textInput.value.trim();

            const selectElement = row.querySelector('select');
            let color = selectElement.value;

            if (color === 'Custom') {
                color = row.querySelector('input[type=color]').value;
            }

            if (keyword) {
                updatedKeywords.push([keyword, color]);
            }
        }

        localStorage.setItem('resiDMKeywords', JSON.stringify(updatedKeywords));
        await parent.initializeKeywords();

        parent.resetMessageColors();
        parent.highlightChatMessages();

        parent.systemMessage({
            "title": "Chat Highlights",
            "message": "Einstellungen erfolgreich gespeichert!",
            "type": "success",
            "timeout": 10000
        });

        const closeSVG = document.getElementsByClassName('detail-title')[0].getElementsByTagName('svg')[0];
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        closeSVG.dispatchEvent(clickEvent);
    }

    /**
     * Calculates which color the text should have based on the current background color.
     *
     * @param {String} backgroundColor Color of the background in hex code.
     * @returns {String} black or white based on the background color.
     */
    function getContrastColor(backgroundColor) {
        let hexColor = backgroundColor.replace('#', '');

        if (hexColor.length === 3) {
            hexColor = hexColor.split('').map(function (c) { return c + c; }).join('');
        }

        const r = parseInt(hexColor.slice(0, 2), 16);
        const g = parseInt(hexColor.slice(2, 4), 16);
        const b = parseInt(hexColor.slice(4, 6), 16);

        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        return luminance > 128 ? 'black' : 'white';
    }

    /**
     * Sets all messages back to standard styling.
     */
    window.resetMessageColors = function () {
        const chatMessageList = document.getElementsByClassName('message');
        for (const message of chatMessageList) {
            message.classList.remove('highlight');
        }
    }

    /**
     * Iterates over all messages of the chat and highlights required messages.
     */
    window.highlightChatMessages = function () {
        const chatMessageList = document.getElementsByClassName('message');

        for (const message of chatMessageList) {
            highlightSingleMessage(message);
        }
    }

    /**
     * Checks for the given message if it needs to be highlighted and does it if required.
     *
     * @param {HTMLElement} messageNode the message that should be highlighted.
     */
    function highlightSingleMessage(messageNode) {
        const messageText = messageNode.getElementsByClassName('message-content')[0].textContent;

        keywords.forEach(function (keyword) {
            if (messageText.includes(keyword[0])) {
                messageNode.classList.add("highlight");
                messageNode.style.setProperty('--highlight-color', keyword[1]);
                messageNode.style.setProperty('--highlight-color-text', getContrastColor(keyword[1]));
            }
        });
    }

    /**
     * Observer for reloading of older messages to style messages only after all requested messages are loaded.
     */
    function observeOldMessagesLoading() {
        const chatContainer = document.getElementById('messages');
        let currentMessageCount = document.getElementsByClassName('message').length + document.getElementsByClassName('chat-system-message').length;
        const targetMessageCount = currentMessageCount + 200;

        const observer = new MutationObserver((mutationsList, observer) => {
            currentMessageCount = document.getElementsByClassName('message').length + document.getElementsByClassName('chat-system-message').length;

            if (currentMessageCount >= targetMessageCount) {
                observer.disconnect();
                window.highlightChatMessages();
            }
        });

        observer.observe(chatContainer, { childList: true, subtree: true });
    }

    // start of the main script - initializes the keywords
    await window.initializeKeywords();

    // differentiates the path - either show the chat with highlighting or the settings frame to manage the keywords
    if (path === '/') {
        const configIconContainer = document.createElement('div');

        const configIcon = document.createElement('i');
        configIcon.classList.add('fas', 'fa-cog', 'frame-opener');
        configIcon.style.cursor = 'pointer';
        configIcon.setAttribute('frame', '1/3/4/5');
        configIcon.setAttribute('frame-url', 'script/highlightChatMessagesSettings');
        configIcon.setAttribute('data-tooltip', 'Keywords für Hervorherbung im Chat bearbeiten.');

        configIconContainer.appendChild(configIcon);
        document.getElementsByClassName('dropdown')[0].prepend(configIconContainer);

        window.highlightChatMessages();

        const loadMoreButton = document.getElementById('load-message-button');
        loadMoreButton.addEventListener('click', () => {
            observeOldMessagesLoading();
        });

        socket.on("associationMessage", () => {
            const chatMessageList = document.getElementsByClassName('message');
            const latestMessage = chatMessageList[chatMessageList.length - 1];

            if (latestMessage) {
                highlightSingleMessage(latestMessage);
            }
        });

    } else if (path === '/script/highlightChatMessagesSettings') {
        document.getElementById('scriptTitle').textContent = 'Keyword Management';

        const addKeywordButton = document.createElement('button');
        addKeywordButton.classList.add('button', 'button-gray', 'button-round');
        addKeywordButton.id = 'addKeywordButton';
        addKeywordButton.textContent = 'Keyword hinzufügen';

        const saveKeywordButton = document.createElement('button');
        saveKeywordButton.classList.add('button', 'button-success', 'button-round');
        saveKeywordButton.id = 'saveKeywordButton';
        saveKeywordButton.style.marginLeft = '1rem';
        saveKeywordButton.textContent = 'Speichern';

        const buttonArea = document.createElement('div');
        buttonArea.style.marginTop = '0.5rem';
        buttonArea.appendChild(addKeywordButton);
        buttonArea.appendChild(saveKeywordButton);

        const frameSubtitle = document.getElementById('scriptDescription');
        frameSubtitle.textContent = 'Verwalte hier welche Keywords hervorgehoben werden sollen.'
        frameSubtitle.appendChild(buttonArea);

        createSettingsGrid();

        document.getElementById('addKeywordButton').addEventListener('click', function () {
            keywords.push(['', colors.red]);
            addRowToGrid(['', colors.red]);
        });

        document.getElementById('saveKeywordButton').addEventListener('click', function () {
            saveKeywords();
        });
    }
})();

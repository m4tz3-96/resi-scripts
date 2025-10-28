// ==UserScript==
// @name         Highlight chat messages
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Highlights messages in chat that contain user specified keywords (standard is the username).
// @author       M4tz3
// @match        https://rettungssimulator.online/
// @match        https://rettungssimulator.online/script/highlightChatMessagesSettings
// @icon         https://www.google.com/s2/favicons?sz=64&domain=rettungssimulator.online
// @updateURL    https://raw.githubusercontent.com/m4tz3-96/resi-scripts/main/highlightChatMessages.user.js
// @downloadURL  https://raw.githubusercontent.com/m4tz3-96/resi-scripts/main/highlightChatMessages.user.js
// @grant        none
// ==/UserScript==

(async function() {
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

    // TODO: Can i delete the body.dark things?
    let style = document.createElement('style');
    style.innerHTML = `
        body.dark #chat .message.highlight {
            color: inherit;
        }

        body.dark #chat .message.highlight::before {
            border-top-color: var(--highlight-border-color);
            border-right-color: var(--highlight-border-color);
        }
    `;
    document.head.appendChild(style);

    window.initializeKeywords = async function() {
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
                    keywords = [[user.userName, 'red']];
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

    function addRowToGrid(rowValues) {
        const gridContainer = document.getElementById('highlightMessagesSettingsGrid');
        const row = document.createElement('div');
        row.style.display = 'contents';

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = rowValues[0];
        textInput.placeholder = 'Keyword';

        const selectElement = document.createElement('select');
        for (const color in colors) {
            const option = document.createElement('option');
            option.value = color;
            option.text = color.charAt(0).toUpperCase() + color.slice(1);
            if (color === rowValues[1]) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        }

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
        row.appendChild(trashButton);

        gridContainer.appendChild(row);
    }

    function createSettingsGrid() {
        let settingsContainer = document.getElementsByClassName('panel-body')[0];
        settingsContainer.innerHTML = '';

        const gridContainer = document.createElement('div');
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = '4fr 3fr 1fr';
        gridContainer.style.gap = '10px';
        gridContainer.id = 'highlightMessagesSettingsGrid';

        settingsContainer.appendChild(gridContainer);

        keywords.forEach(function(keyword) {
            addRowToGrid(keyword);
        });
    }

    async function saveKeywords() {
        const gridContainer = document.getElementById('highlightMessagesSettingsGrid');
        const rows = gridContainer.getElementsByTagName('div');
        let updatedKeywords = [];

        for (const row of rows) {
            const textInput = row.querySelector('input');
            const keyword = textInput.value.trim();

            const selectElement = row.querySelector('select');
            const color = selectElement.value;

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

    window.resetMessageColors = function() {
        const chatMessageList = document.getElementsByClassName('message');
        for (const message of chatMessageList) {
            message.style.backgroundColor = '';
        }
    }

    window.highlightChatMessages = function() {
        const chatMessageList = document.getElementsByClassName('message');

        for (const message of chatMessageList) {
            highlightSingleMessage(message);
        }
    }

    function highlightSingleMessage(messageNode) {
        const messageText = messageNode.getElementsByClassName('message-content')[0].textContent;

        keywords.forEach(function(keyword) {
            if (messageText.includes(keyword[0])) {
                messageNode.classList.add("highlight");
                messageNode.style.setProperty('--highlight-border-color', colors[keyword[1]]);
                messageNode.style.backgroundColor =colors[keyword[1]];
            }
        });
    }

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

    await window.initializeKeywords();

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

        socket.on("associationMessage", () =>{
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

        document.getElementById('addKeywordButton').addEventListener('click', function() {
            keywords.push(['', 'red']);
            addRowToGrid(['', 'red']);
        });

        document.getElementById('saveKeywordButton').addEventListener('click', function() {
            saveKeywords();
        });
    }

})();

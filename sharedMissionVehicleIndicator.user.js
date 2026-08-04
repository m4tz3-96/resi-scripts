// ==UserScript==
// @name         Shared Mission Vehicle Indicator
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Create an indicator for shared missions about how many vehicles are en route and on scene.
// @author       M4tz3
// @match        https://rettungssimulator.online/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=rettungssimulator.online
// @updateURL    https://raw.githubusercontent.com/m4tz3-96/resi-scripts/main/sharedMissionVehicleIndicator.user.js
// @downloadURL  https://raw.githubusercontent.com/m4tz3-96/resi-scripts/main/sharedMissionVehicleIndicator.user.js
// @grant        none
// ==/UserScript==

/* global socket, ReSi */


(async function() {
    'use strict';

    let userVehicles = {};
    let sharedMissions = {};
    const path = window.location.pathname.replace(/\d+/g, "");
    const vehicleIgnoreList = [43, 67];
    const USER_NAME = ReSi.userName;
    const COLORS = {red: '#db1111', orange: '#f37022', green: '#28a745'};


    async function initialize() {
        // initialize sharedMissions variable
        const missions = document.querySelectorAll(`
        #missions-container-shared .mission-list-mission,
        #missions-container-own .mission-list-mission .mission-icon-box > svg.mission-participation
        `);
        missions.forEach((mission) => {
            sharedMissions[mission.getAttribute('usermissionid')] = { enRoute: 0, onScene: 0 };
        });

        // initialize userVehicles variable, updating the sharedMissions variable and set the initial styling of shared missions
        await initializeVehicles();
    }


    async function initializeVehicles() {
        try {
            const response = await fetch('/api/userVehicles');
            const fetchedVehicles = await response.json();
            for (const vehicle of fetchedVehicles) {
                updateVehicleStatusDataAndHighlighting(vehicle.userVehicleID, vehicle);
            }
            sessionStorage.setItem('indicatorMissions', JSON.stringify(sharedMissions));
        }
        catch (err) {
            console.error(err);
        }
    }


    function updateVehicleStatusDataAndHighlighting(userVehicleID, vehicleObject) {
        if (!(vehicleObject.userMissionID in sharedMissions) || vehicleIgnoreList.includes(vehicleObject.vehicleID)) {
            return;
        }

        const currentFMS = vehicleObject.fms ?? vehicleObject.userVehicleFMS;
        const oldFMS = userVehicles[vehicleObject.vehicleID]?.fms;

        if (oldFMS != null) {
            if (oldFMS === 3) {
                sharedMissions[vehicleObject.userMissionID].enRoute -= 1;
            }
            else if (oldFMS === 4) {
                sharedMissions[vehicleObject.userMissionID].onScene -= 1;
            }
        }

        if (currentFMS === 3) {
            sharedMissions[vehicleObject.userMissionID].enRoute += 1;
        }
        else if (currentFMS === 4) {
            sharedMissions[vehicleObject.userMissionID].onScene += 1;
        }

        userVehicles[userVehicleID] = {fms: currentFMS, userMissionID: vehicleObject.userMissionID, vehicleID: vehicleObject.vehicleID};
        updateVehicleStatusHighlighting(vehicleObject.userMissionID);
    }


    function updateVehicleStatusHighlighting(missionID) {
        let titleColor;
        const missionTitleDiv = document.querySelector(
            `.mission-list-mission[usermissionid="${missionID}"] .mission-list-name`
        );
        const missionSiteVehicleIndicatorSpan = document.getElementById('vehicle-indicator-span');

        if (sharedMissions[missionID].onScene >= 4) {
            titleColor = COLORS.green;
        }
        else if ((sharedMissions[missionID].onScene + sharedMissions[missionID].enRoute) >= 4) {
            titleColor = COLORS.orange;
        }
        else {
            titleColor = COLORS.red;
        }

        missionTitleDiv.style.color = titleColor;
        if (missionSiteVehicleIndicatorSpan !== null) {
            missionSiteVehicleIndicatorSpan.textContent = `Status 3: ${sharedMissions[missionID].enRoute} | Status 4: ${sharedMissions[missionID].onScene}`;
        }
    }


    if (path === '/') {
        await initialize();
    }
    else if (path.startsWith('/mission/')) {
        const subtitleDiv = document.getElementsByClassName('detail-subtitle')[0];
        const missionID = document.getElementsByClassName('detail-title')[0].getAttribute('usermissionid');
        const vehicleIndicatorSpan = document.createElement('span');

        sharedMissions = JSON.parse(sessionStorage.getItem('indicatorMissions') || '{}');
        const vehiclesEnRoute = sharedMissions[missionID].enRoute;
        const vehiclesOnScene = sharedMissions[missionID].onScene;


        vehicleIndicatorSpan.id = 'vehicle-indicator-span';
        vehicleIndicatorSpan.classList.add('label', 'label-info', 'label-round');
        vehicleIndicatorSpan.textContent = `Status 3: ${vehiclesEnRoute} | Status 4: ${vehiclesOnScene}`;
        vehicleIndicatorSpan.style.color = 'black';
        const backgroundColor = vehiclesOnScene >= 4 ? COLORS.green : (vehiclesOnScene + vehiclesEnRoute) >= 4 ? COLORS.orange : COLORS.red;
        vehicleIndicatorSpan.style.setProperty(
            'background-color',
            backgroundColor,
            'important'
        );

        subtitleDiv.insertBefore(vehicleIndicatorSpan, subtitleDiv.children[subtitleDiv.children.length - 3]);
    }


    socket.on("newMission", (missionObject) => {
        if (missionObject.isShared === true) {
            sharedMissions[missionObject.userMissionID] = { enRoute: 0, onScene: 0 };

            // only analyze vehicles when it is own mission because there could be vehicles en route/on scene before the mission is shared.
            if (missionObject.userName === USER_NAME) {
                for (const [vehicleID, vehicle] of Object.entries(userVehicles)) {
                    updateVehicleStatusDataAndHighlighting(vehicleID, vehicle);
                }
            }

            sessionStorage.setItem('indicatorMissions', JSON.stringify(sharedMissions));
        }
    });


    socket.on("vehicleFMSGrouped", (vehicleArray) => {
        if (vehicleArray[0].userName === USER_NAME) {
            for (const vehicle of vehicleArray) {
                updateVehicleStatusDataAndHighlighting(vehicle.userVehicleID, vehicle);
            }

            sessionStorage.setItem('indicatorMissions', JSON.stringify(sharedMissions));
        }
    });


    socket.on("vehicleFMS", (vehicleFMSObject) =>{
        if (vehicleFMSObject.userName === USER_NAME) {
            updateVehicleStatusDataAndHighlighting(vehicleFMSObject.userVehicleID, vehicleFMSObject);
            sessionStorage.setItem('indicatorMissions', JSON.stringify(sharedMissions));
        }
    });


    socket.on("finishMission", (missionID) => {
        // Delete mission after 30 seconds to ensure the vehicles leaving the scene can be processed first.
        setTimeout(() => {
            delete sharedMissions[missionID];
            sessionStorage.setItem('indicatorMissions', JSON.stringify(sharedMissions));
        }, 30000);
    });
})();

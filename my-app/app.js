"use strict";

const form = document.querySelector("#heat-form");
const roomNameInput = document.querySelector("#room-name");
const temperatureInput = document.querySelector("#temperature");
const humidityInput = document.querySelector("#humidity");
const formMessage = document.querySelector("#form-message");
const decision = document.querySelector("#decision");
const heatIndexOutput = document.querySelector("#heat-index");
const levelCard = document.querySelector("#level-card");
const levelName = document.querySelector("#level-name");
const levelDetail = document.querySelector("#level-detail");
const clearButton = document.querySelector("#clear-button");
const speakButton = document.querySelector("#speak-button");
const saveButton = document.querySelector("#save-button");
const offlineStatus = document.querySelector("#offline-status");
const historyStatus = document.querySelector("#history-status");
const historyList = document.querySelector("#saved-readings");
const exportButton = document.querySelector("#export-button");
const deleteHistoryButton = document.querySelector("#delete-history-button");

const STORAGE_KEY = "4h-tracker-readings-v1";
let currentReading = null;
let currentLevel = null;
let savedReadings = [];
let historyStorageAvailable = true;

const DECISION_LEVELS = [
  {
    id: "hayo",
    name: "Hayo",
    minimum: Number.NEGATIVE_INFINITY,
    description: "Below 27°C. Hold regular classes and take water breaks.",
    announcement: "Continue regular classes with water breaks."
  },
  {
    id: "hinay",
    name: "Hinay",
    minimum: 27,
    description: "27°C to below 33°C. Consider shorter or flexible classes.",
    announcement: "Consider shorter or flexible classes."
  },
  {
    id: "hinga",
    name: "Hinga",
    minimum: 33,
    description: "33°C to below 42°C. Stop in-person classes; use lighter home tasks.",
    announcement: "Stop in-person classes."
  },
  {
    id: "hinto",
    name: "Hinto",
    minimum: 42,
    description: "42°C or higher. Stop school and home learning activities.",
    announcement: "Stop school and home learning activities."
  }
];

const FEMALE_VOICE_PATTERN =
  /\b(female|zira|samantha|karen|moira|tessa|serena|ava|aria|jenny|susan|victoria|allison|salli|kendra|joanna|ivy|sara)\b/i;

function calculateHeatIndexCelsius(temperatureCelsius, humidity) {
  const temperatureFahrenheit = temperatureCelsius * (9 / 5) + 32;
  const firstEstimate =
    (temperatureFahrenheit +
      61 +
      (temperatureFahrenheit - 68) * 1.2 +
      humidity * 0.094) /
    2;
  const simpleIndex = (firstEstimate + temperatureFahrenheit) / 2;

  let heatIndexFahrenheit = simpleIndex;
  if (simpleIndex >= 80) {
    const t = temperatureFahrenheit;
    const r = humidity;
    heatIndexFahrenheit =
      -42.379 +
      2.04901523 * t +
      10.14333127 * r -
      0.22475541 * t * r -
      0.00683783 * t * t -
      0.05481717 * r * r +
      0.00122874 * t * t * r +
      0.00085282 * t * r * r -
      0.00000199 * t * t * r * r;

    if (r < 13 && t >= 80 && t <= 112) {
      heatIndexFahrenheit -=
        ((13 - r) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
    } else if (r > 85 && t >= 80 && t <= 87) {
      heatIndexFahrenheit += ((r - 85) / 10) * ((87 - t) / 5);
    }
  }

  return (heatIndexFahrenheit - 32) * (5 / 9);
}

function getDecisionLevel(heatIndexCelsius) {
  for (let index = DECISION_LEVELS.length - 1; index >= 0; index -= 1) {
    if (heatIndexCelsius >= DECISION_LEVELS[index].minimum) {
      return DECISION_LEVELS[index];
    }
  }
  return DECISION_LEVELS[0];
}

function showError(message) {
  formMessage.textContent = message;
  formMessage.hidden = false;
  decision.hidden = true;
  saveButton.hidden = true;
  currentReading = null;
  currentLevel = null;
}

function clearMessage() {
  formMessage.textContent = "";
  formMessage.hidden = true;
}

function clearReadings() {
  form.reset();
  clearMessage();
  decision.hidden = true;
  saveButton.hidden = true;
  currentReading = null;
  currentLevel = null;
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function formatReadingDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function renderHistory(message) {
  historyList.replaceChildren();

  savedReadings.forEach((reading) => {
    const item = document.createElement("li");
    item.className = "saved-reading";

    const title = document.createElement("p");
    title.className = "saved-reading-title";
    title.textContent = `${reading.level} · ${reading.heatIndex.toFixed(1)}°C`;

    const room = document.createElement("p");
    room.textContent = reading.roomName || "Room not named";

    const conditions = document.createElement("p");
    conditions.textContent =
      `${reading.temperature.toFixed(1)}°C air temperature · ` +
      `${reading.humidity.toFixed(1)}% humidity`;

    const date = document.createElement("p");
    date.className = "saved-reading-meta";
    date.textContent = formatReadingDate(reading.measuredAt);

    item.append(title, room, conditions, date);
    historyList.append(item);
  });

  exportButton.disabled = savedReadings.length === 0;
  deleteHistoryButton.disabled = savedReadings.length === 0;
  historyStatus.textContent =
    message ||
    (savedReadings.length === 0
      ? "No saved readings yet."
      : `${savedReadings.length} saved reading${savedReadings.length === 1 ? "" : "s"}.`);
}

function loadHistory() {
  try {
    const storedReadings = window.localStorage.getItem(STORAGE_KEY);
    if (storedReadings) {
      const parsedReadings = JSON.parse(storedReadings);
      if (
        !Array.isArray(parsedReadings) ||
        !parsedReadings.every(
          (reading) =>
            reading &&
            typeof reading.measuredAt === "string" &&
            Number.isFinite(Date.parse(reading.measuredAt)) &&
            typeof reading.roomName === "string" &&
            Number.isFinite(reading.temperature) &&
            Number.isFinite(reading.humidity) &&
            Number.isFinite(reading.heatIndex) &&
            typeof reading.level === "string"
        )
      ) {
        throw new Error("Saved readings are not in the expected format.");
      }

      savedReadings = parsedReadings;
    }

    renderHistory();
  } catch (error) {
    console.error("Could not load saved readings:", error);
    historyStorageAvailable = false;
    renderHistory(
      "Saved readings could not be loaded. They may be unavailable or browser storage may be disabled."
    );
    saveButton.disabled = true;
    exportButton.disabled = true;
    deleteHistoryButton.disabled = true;
  }
}

function persistHistory() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedReadings));
    return true;
  } catch (error) {
    console.error("Could not save reading history:", error);
    historyStatus.textContent =
      "Could not save this reading. Check available device storage and browser privacy settings.";
    return false;
  }
}

function saveCurrentReading() {
  if (!currentReading || !historyStorageAvailable) {
    return;
  }

  savedReadings.unshift(currentReading);
  if (!persistHistory()) {
    savedReadings.shift();
    return;
  }

  renderHistory("Reading saved on this device.");
  saveButton.disabled = true;
  saveButton.textContent = "Reading saved";
}

function escapeCsvValue(value) {
  const text = String(value);
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

function exportHistory() {
  if (savedReadings.length === 0) {
    return;
  }

  const rows = [
    ["Date and time", "Room", "Temperature (°C)", "Humidity (%)", "Heat index (°C)", "4H level"],
    ...savedReadings.map((reading) => [
      formatReadingDate(reading.measuredAt),
      reading.roomName || "Room not named",
      reading.temperature.toFixed(1),
      reading.humidity.toFixed(1),
      reading.heatIndex.toFixed(1),
      reading.level
    ])
  ];
  const csv = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
  const file = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(file);
  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  downloadLink.download = `4h-readings-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

function deleteHistory() {
  if (savedReadings.length === 0) {
    return;
  }

  if (!window.confirm("Delete all saved readings from this device? This cannot be undone.")) {
    return;
  }

  const previousReadings = savedReadings;
  savedReadings = [];
  if (!persistHistory()) {
    savedReadings = previousReadings;
    renderHistory("Could not delete saved readings from this device.");
    return;
  }

  renderHistory("All saved readings were deleted from this device.");
}

function getReaderVoice() {
  const localVoices = window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.localService);
  const femaleVoices = localVoices.filter((voice) =>
    FEMALE_VOICE_PATTERN.test(voice.name)
  );
  const englishVoices = (voices) =>
    voices.find((voice) => /^en(?:-|$)/i.test(voice.lang));

  return (
    femaleVoices.find((voice) => /^en-ph(?:-|$)/i.test(voice.lang)) ||
    englishVoices(femaleVoices) ||
    femaleVoices[0] ||
    englishVoices(localVoices) ||
    localVoices[0] ||
    null
  );
}

function updateSpeechButton() {
  const readerVoice =
    "speechSynthesis" in window ? getReaderVoice() : null;
  speakButton.hidden = !readerVoice || decision.hidden;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearMessage();

  const temperature = temperatureInput.valueAsNumber;
  const humidity = humidityInput.valueAsNumber;

  if (!Number.isFinite(temperature) || !Number.isFinite(humidity)) {
    showError("Enter a temperature and humidity number.");
    return;
  }

  if (humidity < 0 || humidity > 100) {
    showError("Humidity must be from 0 to 100%.");
    return;
  }

  if (temperature < 27 || humidity < 40) {
    showError(
      "Heat index is not shown below 27°C or below 40% humidity. Check the readings and use local guidance."
    );
    return;
  }

  const heatIndex = calculateHeatIndexCelsius(temperature, humidity);
  if (!Number.isFinite(heatIndex)) {
    showError("These readings cannot be used. Check the numbers and try again.");
    return;
  }

  const level = getDecisionLevel(heatIndex);
  currentLevel = level;
  heatIndexOutput.textContent = `${heatIndex.toFixed(1)}°C`;
  levelCard.dataset.level = level.id;
  levelName.textContent = level.name;
  levelDetail.textContent = level.description;
  currentReading = {
    measuredAt: new Date().toISOString(),
    roomName: roomNameInput.value.trim(),
    temperature,
    humidity,
    heatIndex,
    level: level.name
  };
  saveButton.disabled = !historyStorageAvailable;
  saveButton.textContent = "Save reading";
  saveButton.hidden = false;
  decision.hidden = false;
  updateSpeechButton();
});

clearButton.addEventListener("click", () => {
  clearReadings();
  temperatureInput.focus();
});

window.addEventListener("pagehide", clearReadings);

speakButton.addEventListener("click", () => {
  if (!("speechSynthesis" in window)) {
    return;
  }
  const readerVoice = getReaderVoice();
  if (!readerVoice) {
    updateSpeechButton();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(
    `${currentLevel.name}. Heat index ${heatIndexOutput.textContent.replace("°C", " degrees Celsius")}. ${currentLevel.announcement}`
  );
  utterance.voice = readerVoice;
  utterance.rate = 1;
  utterance.pitch = 1.05;
  window.speechSynthesis.speak(utterance);
});

saveButton.addEventListener("click", saveCurrentReading);
exportButton.addEventListener("click", exportHistory);
deleteHistoryButton.addEventListener("click", deleteHistory);

async function enableOfflineSupport() {
  if (!window.isSecureContext) {
    offlineStatus.textContent =
      "Open this app over HTTPS to use it securely.";
    showError("This app needs a secure connection. Ask your app provider for the HTTPS link.");
    Array.from(form.elements).forEach((control) => {
      control.disabled = true;
    });
    return;
  }

  if (!("serviceWorker" in navigator)) {
    offlineStatus.textContent =
      "This browser does not support offline app install.";
    return;
  }

  try {
    const appScope = new URL("./", window.location.href).href;
    const registration = await navigator.serviceWorker.register("./sw.js", {
      scope: "./"
    });

    if (registration.scope !== appScope) {
      await registration.unregister();
      throw new Error("Service worker scope is wider than this app directory.");
    }

    const activeRegistration = await navigator.serviceWorker.ready;
    if (activeRegistration.scope !== appScope) {
      throw new Error("Active service worker scope differs from the app directory.");
    }

    offlineStatus.textContent = "Offline support is ready.";
  } catch (error) {
    console.error("Could not enable offline support:", error);
    offlineStatus.textContent =
      "Offline support could not start. Reopen this app while online.";
  }
}

if ("speechSynthesis" in window) {
  window.speechSynthesis.addEventListener("voiceschanged", updateSpeechButton);
}

loadHistory();
enableOfflineSupport();

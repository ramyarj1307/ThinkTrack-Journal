// ======================================================
// THINKTRACK JOURNAL - MAIN SCRIPT
// Backend: Flask (http://127.0.0.1:5000)
// ======================================================

const API_URL = "http://127.0.0.1:5000";


// ======================================================
// COMMON HELPERS
// ======================================================

function showMessage(element, message, success = false) {
    if (!element) return;

    element.textContent = message;
    element.style.color = success ? "#23845b" : "#c94d5b";
}


function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatDate(dateValue) {
    if (!dateValue) return "";

    const date = new Date(dateValue + "T00:00:00");

    if (isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}


function getTodayDate() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


// ======================================================
// CHECK CURRENT LOGIN SESSION
// ======================================================

async function getCurrentUser() {
    try {
        const response = await fetch(`${API_URL}/me`, {
            method: "GET",
            credentials: "include"
        });

        const result = await response.json();

        if (result.success) {
            return result;
        }

        return null;

    } catch (error) {
        console.error("User session error:", error);
        return null;
    }
}


// ======================================================
// PAGE INITIALIZATION
// ======================================================

document.addEventListener("DOMContentLoaded", function () {

    setupRegisterForm();
    setupLoginForm();

    setupJournalForm();
    setupEntriesPage();

    setupHomePage();

    setupWeatherButtons();

    setTodayDate();
    
    setupAIInsightPage();

    setupLogout();


});


// ======================================================
// REGISTER
// ======================================================

function setupRegisterForm() {

    const registerForm =
        document.getElementById("registerForm");

    if (!registerForm) {
        return;
    }

    registerForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const name =
            document.getElementById("user_name").value.trim();

        const email =
            document.getElementById("registerEmail").value.trim();

        const password =
            document.getElementById("registerPassword").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        const message =
            document.getElementById("registerMessage");


        if (!name || !email || !password || !confirmPassword) {

            showMessage(
                message,
                "Please fill in all fields."
            );

            return;
        }


        if (password.length < 6) {

            showMessage(
                message,
                "Password must contain at least 6 characters."
            );

            return;
        }


        if (password !== confirmPassword) {

            showMessage(
                message,
                "Passwords do not match."
            );

            return;
        }


        try {

            const response =
                await fetch(`${API_URL}/register`, {

                    method: "POST",

                    credentials: "include",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        name: name,
                        email: email,
                        password: password
                    })

                });


            const result =
                await response.json();


            if (result.success) {

                showMessage(
                    message,
                    "Account created successfully! ✓",
                    true
                );

                registerForm.reset();


                setTimeout(function () {

                    window.location.href = "login.html";

                }, 1200);

            } else {

                showMessage(
                    message,
                    result.message || "Registration failed."
                );

            }

        } catch (error) {

            console.error(
                "Registration error:",
                error
            );

            showMessage(
                message,
                "Unable to connect to the server."
            );

        }

    });

}


// ======================================================
// LOGIN
// ======================================================

function setupLoginForm() {

    const loginForm =
        document.getElementById("loginForm");

    if (!loginForm) {
        return;
    }


    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();


        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const message =
            document.getElementById("loginMessage");


        if (!email || !password) {

            showMessage(
                message,
                "Please enter your email and password."
            );

            return;
        }


        try {

            const response =
                await fetch(`${API_URL}/login`, {

                    method: "POST",

                    credentials: "include",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        email: email,
                        password: password
                    })

                });


            const result =
                await response.json();


            if (result.success) {

                showMessage(
                    message,
                    "Login successful! ✓",
                    true
                );


                // Keep email only for frontend convenience.
                // Actual authentication is handled by Flask session.
                localStorage.setItem(
                    "thinkTrackUserEmail",
                    email
                );


                setTimeout(function () {

                    window.location.href = "home.html";

                }, 700);

            } else {

                showMessage(
                    message,
                    result.message || "Invalid email or password."
                );

            }

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            showMessage(
                message,
                "Unable to connect to the server."
            );

        }

    });

}


// ======================================================
// LOGOUT
// ======================================================

async function logout() {

    try {

        await fetch(`${API_URL}/logout`, {

            method: "POST",

            credentials: "include"

        });

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }


    localStorage.removeItem(
        "thinkTrackUserEmail"
    );

    localStorage.removeItem(
        "thinkTrackUser"
    );


    window.location.href = "login.html";
}


// ======================================================
// JOURNAL FORM
// ======================================================

function setupJournalForm() {

    const journalForm =
        document.getElementById("journalForm");

    if (!journalForm) {
        return;
    }


    journalForm.addEventListener("submit", async function (event) {

        event.preventDefault();


        const date =
            document.getElementById("entryDate").value;

        const title =
            document.getElementById("entryTitle").value.trim();

        const text =
            document.getElementById("entryText").value.trim();

        const selectedMood =
            document.querySelector(
                'input[name="mood"]:checked'
            );

        const message =
            document.getElementById("journalMessage");


        if (!date || !title || !text || !selectedMood) {

            showMessage(
                message,
                "Please complete all fields before saving."
            );

            return;
        }


        try {

            const response =
                await fetch(`${API_URL}/journal`, {

                    method: "POST",

                    credentials: "include",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({

                        title: title,

                        content: text,

                        mood: selectedMood.value,

                        entry_date: date

                    })

                });


            const result =
                await response.json();


            if (result.success) {

                showMessage(
                    message,
                    "Your journal entry was saved successfully! ✓",
                    true
                );


                journalForm.reset();

                setTodayDate();


                setTimeout(function () {

                    window.location.href =
                        "entries.html";

                }, 900);

            } else {

                showMessage(
                    message,
                    result.message ||
                    "Unable to save journal entry."
                );

            }

        } catch (error) {

            console.error(
                "Journal save error:",
                error
            );

            showMessage(
                message,
                "Unable to connect to the server."
            );

        }

    });

}


// ======================================================
// SET TODAY DATE
// ======================================================

function setTodayDate() {

    const dateInput =
        document.getElementById("entryDate");

    if (!dateInput) {
        return;
    }


    if (!dateInput.value) {

        dateInput.value =
            getTodayDate();

    }

}


// ======================================================
// LOAD JOURNAL ENTRIES FROM DATABASE
// ======================================================

async function loadJournalEntries() {

    try {

        const response =
            await fetch(`${API_URL}/journal`, {

                method: "GET",

                credentials: "include"

            });


        const result =
            await response.json();


        if (!response.ok || !result.success) {

            console.error(
                "Journal loading failed:",
                result.message
            );

            return [];

        }


        return result.entries || [];

    } catch (error) {

        console.error(
            "Journal loading error:",
            error
        );

        return [];

    }

}


// ======================================================
// ENTRIES PAGE
// ======================================================

let allJournalEntries = [];


async function setupEntriesPage() {

    const entryList =
        document.getElementById("entryList");

    if (!entryList) {
        return;
    }


    allJournalEntries =
        await loadJournalEntries();


    displayEntries();


    const searchBox =
        document.getElementById("searchEntries");

    const moodFilter =
        document.getElementById("filterMood");


    if (searchBox) {

        searchBox.addEventListener(
            "input",
            displayEntries
        );

    }


    if (moodFilter) {

        moodFilter.addEventListener(
            "change",
            displayEntries
        );

    }

}


// ======================================================
// DISPLAY ENTRIES
// ======================================================

function displayEntries() {

    const entryList =
        document.getElementById("entryList");

    if (!entryList) {
        return;
    }


    const searchBox =
        document.getElementById("searchEntries");

    const moodFilter =
        document.getElementById("filterMood");


    const searchText =
        searchBox
            ? searchBox.value.toLowerCase().trim()
            : "";


    const selectedMood =
        moodFilter
            ? moodFilter.value
            : "all";


    const filteredEntries =
        allJournalEntries.filter(function (entry) {

            const title =
                String(
                    entry.title || ""
                ).toLowerCase();

            const text =
                String(
                    entry.content ||
                    entry.text ||
                    ""
                ).toLowerCase();

            const date =
                String(
                    entry.entry_date ||
                    entry.date ||
                    ""
                );


            const mood =
                String(
                    entry.mood || ""
                );


            const matchesSearch =
                title.includes(searchText) ||
                text.includes(searchText) ||
                date.includes(searchText);


            const matchesMood =
                selectedMood === "all" ||
                mood === selectedMood;


            return matchesSearch &&
                   matchesMood;

        });


    if (filteredEntries.length === 0) {

        entryList.innerHTML = `
            <p class="empty-message">
                No journal entries found.
            </p>
        `;

        return;
    }


    entryList.innerHTML =
        filteredEntries.map(function (entry) {

            const id =
                entry.id;

            const title =
                entry.title || "Untitled";

            const text =
                entry.content ||
                entry.text ||
                "";

            const date =
                entry.entry_date ||
                entry.date ||
                "";

            const createdAt =
                entry.created_at ||
                entry.createdAt ||
                "";


            return `

                <article class="entry-card">

                    <h3>
                        ${escapeHTML(title)}
                    </h3>

                    <span class="mood-tag">
                        ${escapeHTML(entry.mood || "")}
                    </span>

                    <p>
                        ${escapeHTML(text)}
                    </p>

                    <p class="entry-date">

                        📅
                        ${escapeHTML(
                            formatDate(date)
                        )}

                        ${
                            createdAt
                            ? `<br>
                               Saved:
                               ${escapeHTML(
                                   createdAt
                               )}`
                            : ""
                        }

                    </p>

                    <button
                        class="delete-button"
                        onclick="deleteEntry(${id})">

                        Delete

                    </button>

                </article>

            `;

        }).join("");

}


// ======================================================
// DELETE JOURNAL ENTRY
// ======================================================

async function deleteEntry(entryId) {

    const shouldDelete =
        confirm(
            "Are you sure you want to delete this entry?"
        );


    if (!shouldDelete) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_URL}/journal/${entryId}`,
                {

                    method: "DELETE",

                    credentials: "include"

                }
            );


        const result =
            await response.json();


        if (result.success) {

            allJournalEntries =
                allJournalEntries.filter(
                    function (entry) {
                        return entry.id !== entryId;
                    }
                );


            displayEntries();

        } else {

            alert(
                result.message ||
                "Unable to delete entry."
            );

        }

    } catch (error) {

        console.error(
            "Delete entry error:",
            error
        );

        alert(
            "Unable to connect to the server."
        );

    }

}


// ======================================================
// HOME PAGE
// ======================================================

async function setupHomePage() {

    const userNameElement =
        document.getElementById("user_name");


    const totalEntries =
        document.getElementById("totalEntries");

    const latestMood =
        document.getElementById("latestMood");


    // Not a home page
    if (
        !userNameElement &&
        !totalEntries &&
        !latestMood
    ) {
        return;
    }


    const user =
        await getCurrentUser();


    if (user && userNameElement) {

        userNameElement.textContent =
            user.name || "Friend";

    }


    const entries =
        await loadJournalEntries();


    if (totalEntries) {

        totalEntries.textContent =
            entries.length;

    }


    if (latestMood) {

        if (entries.length > 0) {

            latestMood.textContent =
                entries[0].mood || "-";

        } else {

            latestMood.textContent =
                "-";

        }

    }

}


// ======================================================
// WEATHER BUTTONS
// ======================================================

function setupWeatherButtons() {

    const weatherButtons =
        document.querySelectorAll(
            ".weather-btn"
        );

    const weatherResult =
        document.getElementById(
            "weatherResult"
        );


    if (!weatherButtons.length) {
        return;
    }


    weatherButtons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const selectedWeather =
                        button.getAttribute(
                            "data-weather"
                        );


                    if (weatherResult) {

                        weatherResult.textContent =
                            "Today's weather: " +
                            selectedWeather;

                    }


                    weatherButtons.forEach(
                        function (btn) {

                            btn.classList.remove(
                                "selected"
                            );

                        }
                    );


                    button.classList.add(
                        "selected"
                    );

                }
            );

        }
    );

}


// =====================================
// THINKTRACK PLANNER - FULL FUNCTIONALITY
// =====================================

let selectedPlannerWeather = "";
let plannerWaterCount = 0;


// -------------------------------------
// PLANNER PAGE SETUP
// -------------------------------------

function setupPlannerPage() {

    const plannerDate = document.getElementById("plannerDate");

    // This code should run only on Planner page
    if (!plannerDate) {
        return;
    }

    // Set today's date
    if (!plannerDate.value) {
        plannerDate.value = getTodayDate();
    }

    // Weather buttons
    document.querySelectorAll(".weather-btn").forEach(button => {

        button.addEventListener("click", function () {

            selectedPlannerWeather = this.dataset.weather || "";

            document.querySelectorAll(".weather-btn").forEach(btn => {
                btn.classList.remove("selected");
            });

            this.classList.add("selected");

            const weatherResult = document.getElementById("weatherResult");

            if (weatherResult) {
                weatherResult.textContent =
                    "Today's weather: " + selectedPlannerWeather;
            }
        });
    });


    // Water buttons
    document.querySelectorAll(".water-btn").forEach(button => {

        button.addEventListener("click", function () {

            plannerWaterCount = Number(this.dataset.glass) || 0;

            updateWaterTracker();
        });
    });


    // Date change
    plannerDate.addEventListener("change", async function () {

        if (!this.value) {
            return;
        }

        await loadPlannerForDate(this.value);
    });


    // Save button
    const saveButton = document.getElementById("savePlannerBtn");

    if (saveButton) {

        saveButton.addEventListener("click", async function () {

            await savePlanner();
        });
    }


    // Load today's planner
    loadPlannerForDate(plannerDate.value);
}


// -------------------------------------
// WATER TRACKER
// -------------------------------------

function updateWaterTracker() {

    const waterButtons = document.querySelectorAll(".water-btn");

    waterButtons.forEach(button => {

        const glassNumber = Number(button.dataset.glass);

        if (glassNumber <= plannerWaterCount) {
            button.classList.add("filled");
        } else {
            button.classList.remove("filled");
        }
    });


    const waterResult = document.getElementById("waterResult");

    if (waterResult) {

        waterResult.textContent =
            plannerWaterCount + " / 8 glasses";
    }
}


// -------------------------------------
// GET PREVIOUS DATE
// -------------------------------------

function getPreviousDate(dateString) {

    const date = new Date(dateString + "T00:00:00");

    date.setDate(date.getDate() - 1);

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


// -------------------------------------
// CLEAR PLANNER
// -------------------------------------

function clearPlannerFields() {

    selectedPlannerWeather = "";
    plannerWaterCount = 0;


    // Weather
    document.querySelectorAll(".weather-btn").forEach(button => {
        button.classList.remove("selected");
    });

    const weatherResult = document.getElementById("weatherResult");

    if (weatherResult) {
        weatherResult.textContent = "Select today's weather";
    }


    // Priority + Things
    document.querySelectorAll(".planner-input").forEach(row => {

        const textInput = row.querySelector(
            'input[type="text"], input:not([type="checkbox"])'
        );

        const checkbox = row.querySelector(
            'input[type="checkbox"]'
        );

        if (textInput) {
            textInput.value = "";
        }

        if (checkbox) {
            checkbox.checked = false;
        }
    });


    // Todo
    document.querySelectorAll(".todo-row").forEach(row => {

        const textInput = row.querySelector("input[type='text']");

        const checkbox = row.querySelector(
            'input[type="checkbox"]'
        );

        if (textInput) {
            textInput.value = "";
        }

        if (checkbox) {
            checkbox.checked = false;
        }
    });


    // Schedule
    document.querySelectorAll(".schedule-row").forEach(row => {

        const input = row.querySelector("input");

        if (input) {
            input.value = "";
        }
    });


    // Money
    const moneyIn = document.getElementById("moneyIn");
    const moneyOut = document.getElementById("moneyOut");

    if (moneyIn) {
        moneyIn.value = "";
    }

    if (moneyOut) {
        moneyOut.value = "";
    }


    // Comment
    const comment = document.getElementById("comment");

    if (comment) {
        comment.value = "";
    }


    updateWaterTracker();
}


// -------------------------------------
// LOAD SCHEDULE ONLY
// -------------------------------------

function loadSchedule(schedule) {

    const rows = document.querySelectorAll(".schedule-row");

    rows.forEach((row, index) => {

        const input = row.querySelector("input");

        if (!input) {
            return;
        }

        const item = schedule[index];

        if (!item) {
            input.value = "";
            return;
        }


        // New format
        if (typeof item === "object") {

            input.value =
                item.task ??
                item.text ??
                item.value ??
                "";
        }

        // Old/simple string format
        else {

            input.value = item;
        }
    });
}


// -------------------------------------
// LOAD FULL PLANNER
// -------------------------------------

async function loadPlannerForDate(date, allowScheduleCopy = true) {

    if (!date) {
        return;
    }


    clearPlannerFields();


    try {

        const response = await fetch(
            `${API_URL}/planner?date=${encodeURIComponent(date)}`,
            {
                method: "GET",
                credentials: "include"
            }
        );


        const result = await response.json();


        // ---------------------------------
        // EXISTING PLANNER FOUND
        // ---------------------------------

        if (response.ok && result.success && result.planner) {

            const planner = result.planner;


            // Weather
            selectedPlannerWeather = planner.weather || "";

            document.querySelectorAll(".weather-btn").forEach(button => {

                if (
                    button.dataset.weather === selectedPlannerWeather
                ) {
                    button.classList.add("selected");
                }
            });


            const weatherResult =
                document.getElementById("weatherResult");

            if (weatherResult && selectedPlannerWeather) {

                weatherResult.textContent =
                    "Today's weather: " +
                    selectedPlannerWeather;
            }


            // Priorities
            const plannerInputs =
                Array.from(
                    document.querySelectorAll(".planner-input")
                );

            const priorityRows =
                plannerInputs.slice(0, 3);

            const thingRows =
                plannerInputs.slice(3, 6);


            loadChecklist(
                priorityRows,
                planner.priorities || []
            );


            // Todos
            const todoRows =
                Array.from(
                    document.querySelectorAll(".todo-row")
                );

            loadChecklist(
                todoRows,
                planner.todos || []
            );


            // Things
            loadChecklist(
                thingRows,
                planner.things || []
            );


            // Schedule
            loadSchedule(
                planner.schedule || []
            );


            // Money
            const moneyIn =
                document.getElementById("moneyIn");

            const moneyOut =
                document.getElementById("moneyOut");

            if (moneyIn) {
                moneyIn.value = planner.money_in ?? "";
            }

            if (moneyOut) {
                moneyOut.value = planner.money_out ?? "";
            }


            // Comment
            const comment =
                document.getElementById("comment");

            if (comment) {
                comment.value = planner.comment || "";
            }


            // Water
            plannerWaterCount =
                Number(planner.water || 0);

            updateWaterTracker();


            return;
        }


        // ---------------------------------
        // NEW DATE
        // ---------------------------------

        if (allowScheduleCopy) {

            const previousDate =
                getPreviousDate(date);


            try {

                const previousResponse = await fetch(
                    `${API_URL}/planner?date=${encodeURIComponent(previousDate)}`,
                    {
                        method: "GET",
                        credentials: "include"
                    }
                );


                const previousResult =
                    await previousResponse.json();


                if (
                    previousResponse.ok &&
                    previousResult.success &&
                    previousResult.planner
                ) {

                    // ONLY COPY SCHEDULE
                    loadSchedule(
                        previousResult.planner.schedule || []
                    );
                }

            } catch (error) {

                console.log(
                    "Previous schedule could not be loaded:",
                    error
                );
            }
        }


    } catch (error) {

        console.error(
            "Planner loading error:",
            error
        );
    }
}


// -------------------------------------
// LOAD CHECKBOX LIST
// -------------------------------------

function loadChecklist(rows, items) {

    rows.forEach((row, index) => {

        const item = items[index];

        const textInput =
            row.querySelector(
                'input[type="text"], input:not([type="checkbox"])'
            );

        const checkbox =
            row.querySelector(
                'input[type="checkbox"]'
            );


        if (!item) {

            if (textInput) {
                textInput.value = "";
            }

            if (checkbox) {
                checkbox.checked = false;
            }

            return;
        }


        if (typeof item === "object") {

            if (textInput) {

                textInput.value =
                    item.text ??
                    item.value ??
                    item.task ??
                    "";
            }

            if (checkbox) {

                checkbox.checked =
                    Boolean(item.checked);
            }
        }

        else {

            if (textInput) {
                textInput.value = item;
            }

            if (checkbox) {
                checkbox.checked = false;
            }
        }
    });
}


// -------------------------------------
// COLLECT CHECKLIST DATA
// -------------------------------------

function collectChecklist(rows) {

    return rows.map(row => {

        const textInput =
            row.querySelector(
                'input[type="text"], input:not([type="checkbox"])'
            );

        const checkbox =
            row.querySelector(
                'input[type="checkbox"]'
            );


        return {
            text: textInput
                ? textInput.value.trim()
                : "",

            checked: checkbox
                ? checkbox.checked
                : false
        };
    });
}


// -------------------------------------
// COLLECT SCHEDULE
// -------------------------------------

function collectSchedule() {

    const rows =
        document.querySelectorAll(".schedule-row");


    return Array.from(rows).map(row => {

        const timeElement =
            row.querySelector("span");

        const input =
            row.querySelector("input");


        return {

            time: timeElement
                ? timeElement.textContent.trim()
                : "",

            task: input
                ? input.value.trim()
                : ""
        };
    });
}


// -------------------------------------
// SAVE PLANNER
// -------------------------------------

async function savePlanner() {

    const plannerDate =
        document.getElementById("plannerDate");

    const saveMessage =
        document.getElementById("saveMessage");


    if (!plannerDate || !plannerDate.value) {

        if (saveMessage) {

            saveMessage.textContent =
                "Please select a date.";
        }

        return;
    }


    const plannerInputs =
        Array.from(
            document.querySelectorAll(".planner-input")
        );


    const priorityRows =
        plannerInputs.slice(0, 3);


    const thingRows =
        plannerInputs.slice(3, 6);


    const todoRows =
        Array.from(
            document.querySelectorAll(".todo-row")
        );


    const moneyIn =
        document.getElementById("moneyIn");

    const moneyOut =
        document.getElementById("moneyOut");

    const comment =
        document.getElementById("comment");


    const plannerData = {

        plan_date: plannerDate.value,

        weather: selectedPlannerWeather,

        priorities:
            collectChecklist(priorityRows),

        todos:
            collectChecklist(todoRows),

        things:
            collectChecklist(thingRows),

        schedule:
            collectSchedule(),

        money_in:
            moneyIn
                ? Number(moneyIn.value || 0)
                : 0,

        money_out:
            moneyOut
                ? Number(moneyOut.value || 0)
                : 0,

        comment:
            comment
                ? comment.value.trim()
                : "",

        water:
            plannerWaterCount
    };


    try {

        const response = await fetch(
            `${API_URL}/planner`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                credentials: "include",

                body:
                    JSON.stringify(plannerData)
            }
        );


        const result =
            await response.json();


        if (response.ok && result.success) {

            if (saveMessage) {

                saveMessage.textContent =
                    "✓ Today's plan saved successfully!";
            }

            // Keep message visible
            setTimeout(() => {

                if (saveMessage) {
                    saveMessage.textContent = "";
                }

            }, 3000);

        } else {

            if (saveMessage) {

                saveMessage.textContent =
                    result.message ||
                    "Unable to save planner.";
            }
        }


    } catch (error) {

        console.error(
            "Planner save error:",
            error
        );


        if (saveMessage) {

            saveMessage.textContent =
                "Unable to connect to the server.";
        }
    }
}


// -------------------------------------
// START PLANNER
// -------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupPlannerPage();

    }
);

// ======================================================
// AI MOOD INSIGHT PAGE
// ======================================================

function setupAIInsightPage() {
    const moodButtons = document.querySelectorAll(".ai-mood-btn");
    const analyzeButton = document.getElementById("analyzeMoodBtn");
    const selectedMoodText = document.getElementById("selectedMoodText");
    const aiResult = document.getElementById("aiResult");
    const aiStatus = document.getElementById("aiStatus");
    const aiRecommendation = document.getElementById("aiRecommendation");
    const aiMessage = document.getElementById("aiMessage");

    if (!moodButtons.length || !analyzeButton) {
        return;
    }

    let selectedMood = null;

    moodButtons.forEach(button => {
        button.addEventListener("click", function () {
            moodButtons.forEach(btn => {
                btn.classList.remove("selected");
            });

            this.classList.add("selected");

            selectedMood = Number(this.dataset.mood);

            selectedMoodText.textContent =
                "Selected mood: " + this.textContent.trim();

            aiMessage.textContent = "";
        });
    });

    analyzeButton.addEventListener("click", async function () {

        if (!selectedMood) {
            aiMessage.textContent = "Please select your mood first.";
            return;
        }

        aiMessage.textContent = "Analyzing your mood...";

        try {
            const response = await fetch(`${API_URL}/predict`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    mood: selectedMood
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                aiMessage.textContent =
                    result.message || "AI prediction failed.";
                return;
            }

            aiResult.style.display = "block";

            aiStatus.textContent = result.status;
            aiRecommendation.textContent = result.recommendation;

            aiMessage.textContent = "";

        } catch (error) {
            console.error("AI Insight error:", error);
            aiMessage.textContent =
                "Unable to connect to the AI server.";
        }
    });
}
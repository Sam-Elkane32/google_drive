// ============================================
// CONFIGURATION
// ============================================
// NOTE: Console warnings like "m=_b,_tp:401" and Self-XSS warnings are NORMAL
// and expected from Google Identity Services. They are security notices, not errors.
const CLIENT_ID = "678643124832-ps6abirgac8b1pqubql8o52nsk9fm50i.apps.googleusercontent.com";
const BASE_URL = "https://www.googleapis.com/drive/v3";
const SCOPE = "https://www.googleapis.com/auth/drive.readonly";

// Store access token in memory only
let accessToken = null;
let tokenClient = null;

// State for filters and queries
let currentFilter = "all";
let currentQuery = "";
let currentFileWebViewLink = null;

// ============================================
// UTILITY FUNCTIONS
// ============================================
function showLoading() {
    const loading = document.getElementById("loading");
    if (loading) {
        loading.classList.remove("hidden");
    }
}

function hideLoading() {
    const loading = document.getElementById("loading");
    if (loading) {
        loading.classList.add("hidden");
    }
}

function showError(message) {
    const errorDiv = document.getElementById("error-message");
    if (!errorDiv) return;
    errorDiv.textContent = message;
    errorDiv.classList.remove("hidden");
}

function clearError() {
    const errorDiv = document.getElementById("error-message");
    if (!errorDiv) return;
    errorDiv.textContent = "";
    errorDiv.classList.add("hidden");
}

// ============================================
// API FUNCTIONS
// ============================================
function buildQueryString(query, filter) {
    const parts = [];

    const sanitizedQuery = (query || "").trim();
    if (sanitizedQuery) {
        const escaped = sanitizedQuery.replace(/'/g, "\\'");
        parts.push(`name contains '${escaped}'`);
    }

    switch (filter) {
        case "folders":
            parts.push(`mimeType = 'application/vnd.google-apps.folder'`);
            break;
        case "pdfs":
            parts.push(`mimeType = 'application/pdf'`);
            break;
        case "images":
            parts.push(`mimeType contains 'image/'`);
            break;
        default:
            break;
    }

    if (parts.length === 0) {
        return "";
    }

    return encodeURIComponent(parts.join(" and "));
}

async function fetchFiles(token, query, filter = "all") {
    let url = `${BASE_URL}/files?pageSize=50&orderBy=modifiedTime desc&fields=files(id,name,mimeType,modifiedTime,size,webViewLink)`;

    const q = buildQueryString(query, filter);
    if (q) {
        url += `&q=${q}`;
    }

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

async function fetchFileDetails(token, fileId) {
    const url = `${BASE_URL}/files/${fileId}?fields=id,name,mimeType,modifiedTime,size,webViewLink`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch file details: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

async function fetchDriveInfo(token) {
    const url = `${BASE_URL}/about?fields=user,storageQuota`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch drive info: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

// ============================================
// DOM RENDERING FUNCTIONS
// ============================================
function getIconClassForMime(mimeType) {
    if (!mimeType) return "icon-generic";
    if (mimeType === "application/vnd.google-apps.folder") return "icon-folder";
    if (mimeType === "application/pdf") return "icon-pdf";
    if (mimeType.startsWith("image/")) return "icon-image";
    if (
        mimeType === "application/vnd.google-apps.document" ||
        mimeType === "application/msword" ||
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
        return "icon-doc";
    }
    return "icon-generic";
}

function displayFiles(files) {
    const container = document.getElementById("results-container");
    if (!container) return;

    container.innerHTML = "";

    if (!files || files.length === 0) {
        container.innerHTML = '<div class="no-results">No results found</div>';
        return;
    }

    files.forEach((file) => {
        const card = document.createElement("div");
        card.className = "file-card";
        card.dataset.fileId = file.id;

        const modifiedDate = file.modifiedTime
            ? new Date(file.modifiedTime).toLocaleString()
            : "Unknown";
        const sizeFormatted =
            file.size && !isNaN(parseInt(file.size, 10))
                ? formatBytes(parseInt(file.size, 10))
                : "Unknown";
        const iconClass = getIconClassForMime(file.mimeType);

        card.innerHTML = `
            <div class="file-header">
                <div class="file-icon ${iconClass}">
                    ${iconClass === "icon-folder" ? "📁" :
                      iconClass === "icon-pdf" ? "📄" :
                      iconClass === "icon-image" ? "🖼️" :
                      iconClass === "icon-doc" ? "📃" : "📦"}
                </div>
                <div class="file-title-group">
                    <h3>${escapeHtml(file.name || "Untitled")}</h3>
                    <span>${escapeHtml(file.mimeType || "Unknown type")}</span>
                </div>
            </div>
            <div class="file-meta">
                <strong>Modified:</strong> ${modifiedDate}
            </div>
            <div class="file-meta">
                <strong>Size:</strong> ${sizeFormatted}
            </div>
        `;

        card.addEventListener("click", () => handleFileClick(file.id));
        container.appendChild(card);
    });
}

function displayDriveInfo(info) {
    const container = document.getElementById("drive-info");
    if (!container) return;

    if (!info) {
        container.innerHTML = "";
        return;
    }

    const user = info.user || {};
    const quota = info.storageQuota || {};

    const used = quota.usage ? formatBytes(parseInt(quota.usage, 10)) : "Unknown";
    const limit = quota.limit ? formatBytes(parseInt(quota.limit, 10)) : "Unknown";

    container.innerHTML = `
        <h3>Drive Information</h3>
        <p><strong>User:</strong> ${escapeHtml(user.emailAddress || "Unknown")}</p>
        <p><strong>Storage Used:</strong> ${used} / ${limit}</p>
    `;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text == null ? "" : String(text);
    return div.innerHTML;
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// ============================================
// OAUTH LOGIC
// ============================================
function initializeTokenClient() {
    if (typeof google === "undefined" || !google.accounts || !google.accounts.oauth2) {
        return false;
    }

    if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPE,
            callback: async (response) => {
                const signinBtn = document.getElementById("signin-btn");

                if (response.error) {
                    let errorMsg = "Authentication failed. ";
                    if (response.error === "popup_closed_by_user") {
                        errorMsg += "Sign-in popup was closed.";
                    } else if (response.error === "access_denied") {
                        errorMsg += "Access was denied.";
                    } else if (response.error === "invalid_client") {
                        errorMsg +=
                            "Invalid client ID. Please check your CLIENT_ID configuration in Google Cloud Console.";
                    } else if (response.error === "invalid_request") {
                        errorMsg +=
                            "Invalid request. Ensure your OAuth client is configured correctly and the authorized JavaScript origins include your current URL.";
                    } else {
                        errorMsg += response.error;
                    }
                    showError(errorMsg);
                    if (signinBtn) signinBtn.disabled = false;
                    return;
                }

                if (response.access_token) {
                    accessToken = response.access_token;

                    const authSection = document.getElementById("auth-section");
                    const appSection = document.getElementById("app-section");
                    const logoutBtn = document.getElementById("logout-btn");

                    if (authSection) authSection.classList.add("hidden");
                    if (appSection) appSection.classList.remove("hidden");
                    if (logoutBtn) logoutBtn.classList.remove("hidden");

                    clearError();

                    try {
                        await Promise.all([loadDriveInfo(), loadInitialFiles()]);
                    } finally {
                        if (signinBtn) signinBtn.disabled = false;
                    }
                } else {
                    showError("No access token received from Google.");
                    if (signinBtn) signinBtn.disabled = false;
                }
            },
        });
    }

    return true;
}

// ============================================
// EVENT HANDLERS
// ============================================
function handleGoogleLogin() {
    console.log("Sign-in button clicked");
    const signinBtn = document.getElementById("signin-btn");

    if (!signinBtn) {
        console.error("Sign-in button element not found!");
        return;
    }

    // Disable button during processing
    signinBtn.disabled = true;
    clearError();

    // Wait for Google Identity Services to load
    if (typeof google === "undefined" || !google.accounts || !google.accounts.oauth2) {
        showError("Google Sign-In library is still loading. Please wait a moment and try again.");

        // Retry after a short delay
        setTimeout(() => {
            if (typeof google !== "undefined" && google.accounts && google.accounts.oauth2) {
                handleGoogleLogin();
            } else {
                showError(
                    "Google Sign-In library failed to load. Please refresh the page and ensure you are running from a web server (not file://)."
                );
                signinBtn.disabled = false;
            }
        }, 1000);
        return;
    }

    // Initialize token client if not already done
    if (!initializeTokenClient()) {
        showError("Failed to initialize Google Sign-In. Please refresh the page.");
        signinBtn.disabled = false;
        return;
    }

    // Request access token
    try {
        if (!tokenClient) {
            showError("Token client not initialized. Please refresh the page.");
            signinBtn.disabled = false;
            return;
        }
        tokenClient.requestAccessToken();
        // Button is re-enabled in the callback
    } catch (error) {
        showError("Error requesting access token: " + error.message);
        signinBtn.disabled = false;
    }
}

async function handleSearch() {
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");
    if (!searchInput || !searchBtn) return;

    const query = searchInput.value.trim();
    currentQuery = query;

    if (!query) {
        showError("Please enter a search term");
        return;
    }

    if (!accessToken) {
        showError("Please sign in first");
        return;
    }

    clearError();
    showLoading();
    searchBtn.disabled = true;

    try {
        const data = await fetchFiles(accessToken, query, currentFilter);
        displayFiles(data.files || []);
    } catch (error) {
        if (error.message.includes("401") || error.message.includes("403")) {
            showError("Authentication error. Please sign in again.");
            accessToken = null;
            resetToLoginState();
        } else if (error.message.includes("429")) {
            showError("Too many requests. Please wait a moment and try again.");
        } else {
            showError("Error: " + error.message);
        }
    } finally {
        hideLoading();
        searchBtn.disabled = false;
    }
}

async function handleFileClick(fileId) {
    if (!accessToken) {
        showError("Please sign in first");
        return;
    }

    clearError();
    showLoading();

    try {
        const fileDetails = await fetchFileDetails(accessToken, fileId);
        openFileModal(fileDetails);
    } catch (error) {
        if (error.message.includes("401") || error.message.includes("403")) {
            showError("Authentication error. Please sign in again.");
            accessToken = null;
            resetToLoginState();
        } else if (error.message.includes("429")) {
            showError("Too many requests. Please wait a moment and try again.");
        } else {
            showError("Error: " + error.message);
        }
    } finally {
        hideLoading();
    }
}

async function loadDriveInfo() {
    if (!accessToken) return;

    try {
        const info = await fetchDriveInfo(accessToken);
        displayDriveInfo(info);
    } catch (error) {
        if (error.message && !error.message.includes("401")) {
            console.error("Failed to load drive info:", error);
        }
    }
}

async function loadInitialFiles() {
    if (!accessToken) return;

    const searchBtn = document.getElementById("search-btn");

    clearError();
    showLoading();
    if (searchBtn) searchBtn.disabled = true;

    // Reset query for initial load
    currentQuery = "";

    try {
        const data = await fetchFiles(accessToken, "", currentFilter);
        displayFiles(data.files || []);
    } catch (error) {
        if (error.message.includes("401") || error.message.includes("403")) {
            showError("Authentication error. Please sign in again.");
            accessToken = null;
            resetToLoginState();
        } else if (error.message.includes("429")) {
            showError("Too many requests. Please wait a moment and try again.");
        } else {
            showError("Error: " + error.message);
        }
    } finally {
        hideLoading();
        if (searchBtn) searchBtn.disabled = false;
    }
}

function handleFilterClick(filter) {
    if (filter === currentFilter) return;
    currentFilter = filter;

    const buttons = document.querySelectorAll(".filter-btn");
    buttons.forEach((btn) => {
        if (btn.dataset.filter === filter) {
            btn.classList.add("filter-active");
        } else {
            btn.classList.remove("filter-active");
        }
    });

    if (!accessToken) {
        return;
    }

    // Re-run search with current query or initial load if query empty
    if (currentQuery && currentQuery.trim()) {
        handleSearch();
    } else {
        loadInitialFiles();
    }
}

function handleLogout() {
    accessToken = null;
    currentQuery = "";
    currentFileWebViewLink = null;

    closeFileModal();
    displayFiles([]);
    displayDriveInfo(null);
    clearError();

    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.value = "";
    }

    resetToLoginState();
}

function resetToLoginState() {
    const authSection = document.getElementById("auth-section");
    const appSection = document.getElementById("app-section");
    const logoutBtn = document.getElementById("logout-btn");

    if (authSection) authSection.classList.remove("hidden");
    if (appSection) appSection.classList.add("hidden");
    if (logoutBtn) logoutBtn.classList.add("hidden");
}

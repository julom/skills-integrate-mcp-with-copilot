document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const userIcon = document.getElementById("user-icon");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeModalBtn = document.getElementById("close-modal");
  const loginError = document.getElementById("login-error");
  const studentMessage = document.getElementById("student-message");

  // Check if user is logged in
  const sessionToken = localStorage.getItem("session_token");
  const username = localStorage.getItem("username");

  // Helper function to show/hide signup form based on auth status
  function updateUIForAuthStatus() {
    const isLoggedIn = !!sessionToken;
    
    if (isLoggedIn) {
      signupForm.classList.remove("hidden");
      studentMessage.classList.add("hidden");
      userIcon.classList.add("logged-in");
      userIcon.textContent = "👤";
      userIcon.title = `Logged in as ${username} - Click to logout`;
    } else {
      signupForm.classList.add("hidden");
      studentMessage.classList.remove("hidden");
      userIcon.classList.remove("logged-in");
      userIcon.textContent = "👤";
      userIcon.title = "Login";
    }
  }

  // Modal functions
  function openModal() {
    if (sessionToken) {
      // User is logged in, logout instead
      logout();
    } else {
      // Show login modal
      loginModal.classList.remove("hidden");
      loginForm.reset();
      loginError.classList.add("hidden");
    }
  }

  function closeModal() {
    loginModal.classList.add("hidden");
    loginForm.reset();
    loginError.classList.add("hidden");
  }

  // Login function
  async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(
        `/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );

      if (response.ok) {
        const result = await response.json();
        localStorage.setItem("session_token", result.session_token);
        localStorage.setItem("username", result.username);
        closeModal();
        updateUIForAuthStatus();
        messageDiv.textContent = "Logged in successfully!";
        messageDiv.className = "message success";
        messageDiv.classList.remove("hidden");
        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 3000);
      } else {
        const result = await response.json();
        loginError.textContent = result.detail || "Login failed";
        loginError.classList.remove("hidden");
      }
    } catch (error) {
      loginError.textContent = "Error logging in. Please try again.";
      loginError.classList.remove("hidden");
      console.error("Error logging in:", error);
    }
  }

  // Logout function
  async function logout() {
    const token = localStorage.getItem("session_token");
    
    try {
      await fetch(`/logout?session_token=${encodeURIComponent(token)}`, {
        method: "POST"
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }

    localStorage.removeItem("session_token");
    localStorage.removeItem("username");
    updateUIForAuthStatus();
    messageDiv.textContent = "Logged out successfully!";
    messageDiv.className = "message info";
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 3000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        sessionToken
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons (only if logged in)
      if (sessionToken) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");
    const token = localStorage.getItem("session_token");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}&session_token=${encodeURIComponent(token)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;
    const token = localStorage.getItem("session_token");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}&session_token=${encodeURIComponent(token)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Event listeners for modal
  userIcon.addEventListener("click", openModal);
  closeModalBtn.addEventListener("click", closeModal);
  loginForm.addEventListener("submit", handleLogin);

  // Close modal when clicking outside of it
  loginModal.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeModal();
    }
  });

  // Initialize app
  updateUIForAuthStatus();
  fetchActivities();
});


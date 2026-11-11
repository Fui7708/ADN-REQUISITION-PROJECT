const firebaseConfig = {
  apiKey: "AIzaSyDShK5Ok52ICdELn-ijK8wocFEhqf5EqqY",
  authDomain: "school-project-database-76d30.firebaseapp.com",
  projectId: "school-project-database-76d30",
  storageBucket: "school-project-database-76d30.firebasestorage.app",
  messagingSenderId: "347617755623",
  appId: "1:347617755623:web:024963318cc55acb7b3d42",
  measurementId: "G-SM1KJ07P08",
};

const cloudinaryConfig = {
  cloudName: "oflxyvij",
  uploadPreset: "requisition_portal_unsigned",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

const appState = {
  authMode: "signup",
};

const authView = document.getElementById("authView");
const dashboardView = document.getElementById("dashboardView");
const toast = document.getElementById("toast");
const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");
const tabs = document.querySelectorAll(".auth-tab");
const uploadButton = document.getElementById("profileUploadBtn");
const logoutButtons = [
  document.getElementById("logoutButton"),
  document.getElementById("headerLogoutButton"),
];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

async function saveDocument(collectionName, payload, documentId = null) {
  if (!window.firebase || !db) {
    throw new Error("Firebase Firestore is not available. Check the Firebase SDK script tags and config.");
  }

  const collectionRef = db.collection(collectionName);

  if (documentId) {
    return collectionRef.doc(documentId).set(payload, { merge: true });
  }

  return collectionRef.add(payload);
}

function setAuthMode(mode) {
  appState.authMode = mode;
  tabs.forEach((tab) => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle("active", isActive);
  });

  signupForm.classList.toggle("active", mode === "signup");
  loginForm.classList.toggle("active", mode === "login");
}

function resetProfilePhotoPreview() {
  const preview = document.getElementById("uploadPreview");
  preview.innerHTML = "";
  preview.classList.add("hidden");
  document.getElementById("profilePhotoUrl").value = "";
}

function openCloudinaryUpload() {
  if (!window.cloudinary) {
    showToast("Cloudinary widget did not load. Check your internet connection or run the app from localhost.");
    console.error("Cloudinary widget failed to initialize. Check the script URL and browser certificate/network access.");
    return;
  }

  const widget = cloudinary.createUploadWidget(
    {
      cloudName: cloudinaryConfig.cloudName,
      uploadPreset: cloudinaryConfig.uploadPreset,
      sources: ["local", "url", "camera"],
      multiple: false,
      folder: "requisition-portal",
      resourceType: "image",
      clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "gif"],
    },
    (error, result) => {
      if (!error && result.event === "success") {
        const photoUrl = result.info.secure_url;
        document.getElementById("profilePhotoUrl").value = photoUrl;

        const preview = document.getElementById("uploadPreview");
        preview.innerHTML = `<img src="${photoUrl}" alt="Profile preview" />`;
        preview.classList.remove("hidden");
        showToast("Profile photo uploaded");
      }

      if (error) {
        console.error(error);
        showToast("Please check your Cloudinary setup.");
      }
    }
  );

  widget.open();
}

function getTimePeriod() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "Morning";
  }

  if (hour >= 12 && hour < 17) {
    return "Afternoon";
  }

  return "Evening";
}

function updateDashboardHeader() {
  const dateText = document.getElementById("dashboardDate");
  const greetingText = document.getElementById("dashboardGreeting");

  if (!dateText || !greetingText) {
    return;
  }

  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now).toUpperCase();

  dateText.textContent = formattedDate;
  greetingText.childNodes[0].nodeValue = `Good ${getTimePeriod()}, `;
}

function updateDashboardProfile(userData, currentUser) {
  const profileName = document.getElementById("profileName");
  const greetingName = document.getElementById("greetingName");
  const avatar = document.getElementById("profileAvatar");
  const role = userData.role || "Finance Officer";
  const fullName = userData.fullName || currentUser.displayName || "User";
  const firstName = fullName.split(" ")[0] || "User";

  document.querySelector(".profile small").textContent = role;
  profileName.textContent = fullName;
  greetingName.textContent = firstName;
  updateDashboardHeader();

  if (userData.profilePhotoUrl) {
    avatar.textContent = "";
    avatar.style.backgroundImage = `url("${userData.profilePhotoUrl}")`;
    avatar.style.backgroundSize = "cover";
    avatar.style.backgroundPosition = "center";
    avatar.style.color = "transparent";
  } else {
    avatar.style.backgroundImage = "none";
    avatar.textContent = firstName.charAt(0).toUpperCase();
    avatar.style.color = "#503e1f";
  }
}

async function createNewAccount(event) {
  event.preventDefault();

  const fullName = document.getElementById("signupFullName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const institution = document.getElementById("signupInstitution").value.trim();
  const role = document.getElementById("signupRole").value.trim();
  const profilePhotoUrl = document.getElementById("profilePhotoUrl").value.trim();

  if (!fullName || !email || !password || !institution || !role) {
    showToast("Please complete all fields to create your account.");
    return;
  }

  if (password.length < 6) {
    showToast("Password must contain at least 6 characters.");
    return;
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName: fullName });

    await saveDocument(
      "users",
      {
        uid: userCredential.user.uid,
        fullName,
        email,
        institution,
        role,
        profilePhotoUrl,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      userCredential.user.uid
    );

    signupForm.reset();
    resetProfilePhotoPreview();
    showToast("Account created successfully");
  } catch (error) {
    console.error(error);
    const message = error && error.code === "auth/invalid-credential"
      ? "The email or password is incorrect. Please try again."
      : error && error.code === "auth/email-already-in-use"
        ? "An account with this email already exists. Please use a different email address or login instead."
        : "We couldn’t complete your request right now. Please check your details and try again.";
    showToast(message);
  }
}

async function loginToDashboard(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    showToast("Enter your email and password to log in.");
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
    loginForm.reset();
    showToast("Welcome back");
  } catch (error) {
    console.error(error);
    const message = error && error.code === "auth/invalid-credential"
      ? "Your email or password is incorrect. Please review your details and try again."
      : "We couldn’t sign you in right now. Please try again in a moment.";
    showToast(message);
  }
}

async function signOutUser() {
  try {
    await auth.signOut();
    showToast("Signed out successfully");
  } catch (error) {
    console.error(error);
    showToast("Unable to sign out right now.");
  }
}

function handleAuthenticationState(currentUser) {
  if (currentUser) {
    authView.classList.add("hidden");
    dashboardView.classList.remove("hidden");

    db.collection("users")
      .doc(currentUser.uid)
      .get()
      .then((snapshot) => {
        const userData = snapshot.exists ? snapshot.data() : {};
        updateDashboardProfile(userData, currentUser);
      })
      .catch(() => {
        updateDashboardProfile({}, currentUser);
      });
  } else {
    dashboardView.classList.add("hidden");
    authView.classList.remove("hidden");
    setAuthMode("signup");
  }
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setAuthMode(tab.dataset.mode));
});

const passwordToggleButtons = document.querySelectorAll(".password-toggle");

passwordToggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.dataset.target;
    const targetInput = document.getElementById(targetId);

    if (!targetInput) {
      return;
    }

    const isPasswordVisible = targetInput.type === "text";
    targetInput.type = isPasswordVisible ? "password" : "text";

    button.innerHTML = isPasswordVisible
      ? '<i class="bi bi-eye-slash"></i>'
      : '<i class="bi bi-eye"></i>';
    button.setAttribute("aria-label", isPasswordVisible ? "Show password" : "Hide password");
    button.setAttribute("title", isPasswordVisible ? "Show password" : "Hide password");
  });
});

signupForm.addEventListener("submit", createNewAccount);
loginForm.addEventListener("submit", loginToDashboard);
uploadButton.addEventListener("click", openCloudinaryUpload);
logoutButtons.forEach((button) => {
  if (button) {
    button.addEventListener("click", signOutUser);
  }
});

async function saveRequisitionDraft(requisitionData) {
  if (!auth.currentUser) {
    showToast("Please log in to submit a requisition.");
    return;
  }

  try {
    const payload = {
      ...requisitionData,
      userId: auth.currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: "draft",
    };

    const result = await saveDocument("requisitions", payload);
    showToast("Requisition saved to Firestore");
    return result;
  } catch (error) {
    console.error(error);
    showToast(error.message || "Unable to save requisition.");
    return null;
  }
}

const newRequestButton = document.getElementById("newRequest");
if (newRequestButton) {
  newRequestButton.addEventListener("click", async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      showToast("Please log in first.");
      return;
    }

    await saveRequisitionDraft({
      title: "New requisition",
      description: "General requisition request",
      amount: 0,
      institution: "Archdiocese of Nyeri",
    });
  });
}

auth.onAuthStateChanged(handleAuthenticationState);

if (!window.cloudinary && cloudinaryConfig.cloudName === "YOUR_CLOUD_NAME") {
  console.warn("Cloudinary is not configured. Replace the placeholder values inside Script.js.");
}

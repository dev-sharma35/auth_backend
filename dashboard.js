import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import {
  getDoc,
  doc,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const dataDisplay = document.getElementById("data-display");
const welcomeText = document.getElementById("welcome-text");
const teacherControls = document.getElementById("teacher-controls");

const courseInput = document.getElementById("course-input");
const sectionInput = document.getElementById("section-input");
const semesterInput = document.getElementById("semester-input");
const classroomInput = document.getElementById("classroom-input");

const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const uid = user.uid;
  const userDoc = await getDoc(doc(db, "users", uid));
  const userData = userDoc.data();
  const role = userData.role;
  const name = userData.name;

  welcomeText.textContent = `Welcome ${name}${role === "teacher" ? " Sir" : ""}`;

  // ------------------- Student View -------------------
  if (role === "student") {
    const studentData = await getDoc(doc(db, "studentsData", uid));
    if (studentData.exists()) {
      const d = studentData.data();
      dataDisplay.innerHTML = `
        <p><strong>Your Data:</strong><br>
        Attendance: ${d.attendance ?? "Not recorded"}<br>
        Focus Score: ${d.focusScore ?? "Not recorded"}</p>`;
    } else {
      dataDisplay.innerHTML = `<p>No data found yet for your behavior analysis.</p>`;
    }

  // ------------------- Teacher View -------------------
  } else if (role === "teacher") {
    teacherControls.style.display = "block";

    startBtn.addEventListener("click", () => {
      const course = courseInput.value.trim();
      const section = sectionInput.value.trim();
      const semester = semesterInput.value.trim();
      const classroom = classroomInput.value.trim();

      if (!course || !section || !semester || !classroom) {
        alert("Please fill in all fields before starting analysis.");
        return;
      }

      // You can send this info to Firestore or trigger Python backend
      console.log("📷 Starting Analysis for:");
      console.log({ course, section, semester, classroom });

      alert(`Started analysis for ${course} (Section ${section}, Sem ${semester}) in ${classroom}`);
    });

    stopBtn.addEventListener("click", () => {
      console.log("🛑 Stopped camera analysis.");
      alert("Camera analysis stopped.");
    });

    dataDisplay.innerHTML = `<h3>Your Students:</h3>`;
    const q = query(collection(db, "studentsData"), where("teacherId", "==", uid));
    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      const d = docSnap.data();
      const studentId = docSnap.id;

      const studentDoc = await getDoc(doc(db, "users", studentId));
      const studentName = studentDoc.exists() ? studentDoc.data().name : "Unknown Student";

      dataDisplay.innerHTML += `
        <p><strong>${studentName}</strong>: 
        Attendance: ${d.attendance ?? "undefined"}, 
        Focus Score: ${d.focusScore ?? "undefined"}</p>`;
    }

  // ------------------- Admin / Org View -------------------
  } else if (role === "organization" || role === "admin") {
    dataDisplay.innerHTML = `<h3>All Teachers:</h3>`;

    try {
      const teacherQuery = query(collection(db, "users"), where("role", "==", "teacher"));
      const teacherSnapshot = await getDocs(teacherQuery);

      if (teacherSnapshot.empty) {
        dataDisplay.innerHTML += `<p>No teachers found.</p>`;
      } else {
        teacherSnapshot.forEach(docSnap => {
          const t = docSnap.data();
          dataDisplay.innerHTML += `<p><strong>${t.name} Sir</strong> (Teacher)</p>`;
        });
      }

      dataDisplay.innerHTML += `<h3>All Students:</h3>`;
      const studentSnapshot = await getDocs(collection(db, "studentsData"));

      if (studentSnapshot.empty) {
        dataDisplay.innerHTML += `<p>No students found.</p>`;
      } else {
        for (const docSnap of studentSnapshot.docs) {
          const s = docSnap.data();
          const studentId = docSnap.id;

          const studentUserDoc = await getDoc(doc(db, "users", studentId));
          const studentName = studentUserDoc.exists() ? studentUserDoc.data().name : "Unnamed";

          dataDisplay.innerHTML += `
            <p><strong>${studentName}</strong>: 
            Attendance: ${s.attendance || "N/A"}, 
            Focus Score: ${s.focusScore || "N/A"}</p>`;
        }
      }
    } catch (error) {
      console.error("Error fetching org data:", error);
      dataDisplay.innerHTML += `<p>Error loading data.</p>`;
    }
  }
});

// ------------------- Logout -------------------
window.logout = async () => {
  await signOut(auth);
  window.location.href = "login.html";
};

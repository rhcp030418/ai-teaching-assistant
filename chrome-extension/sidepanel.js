const contentEl = document.getElementById("content");
const userSection = document.getElementById("user-section");
const userAvatar = document.getElementById("user-avatar");
const userName = document.getElementById("user-name");
const userDept = document.getElementById("user-dept");
const serverUrlInput = document.getElementById("server-url");

// 저장된 서버 URL 불러오기
chrome.storage?.local?.get("serverUrl", (data) => {
  if (data.serverUrl) serverUrlInput.value = data.serverUrl;
});

serverUrlInput.addEventListener("change", () => {
  chrome.storage?.local?.set({ serverUrl: serverUrlInput.value });
});

function getServerUrl() {
  return serverUrlInput.value.replace(/\/+$/, "");
}

// e-class 탭을 찾아서 Content Script에 메시지 전송
async function getEclassTab() {
  const tabs = await chrome.tabs.query({ url: "https://learn.hansung.ac.kr/*" });
  return tabs[0] ?? null;
}

function showLoading() {
  contentEl.innerHTML = `
    <div class="status loading">
      <div class="icon">...</div>
      <div class="message">e-class에서 정보를 불러오는 중</div>
    </div>
  `;
}

function showError(message) {
  contentEl.innerHTML = `
    <div class="status error">
      <div class="icon">!</div>
      <div class="message">${message}</div>
      <button class="retry-btn" id="retry-btn">다시 시도</button>
    </div>
  `;
  document.getElementById("retry-btn").addEventListener("click", loadData);
}

function showUserInfo(info) {
  if (!info?.name) return;
  userSection.style.display = "flex";
  userAvatar.textContent = info.name.charAt(0);
  userName.textContent = info.name;
  userDept.textContent = info.studentNo || "";
}

function showCourses(courses, tokenMap) {
  if (courses.length === 0) {
    contentEl.innerHTML = `
      <div class="status">
        <div class="icon">-</div>
        <div class="message">등록된 강의가 없습니다</div>
      </div>
    `;
    return;
  }

  contentEl.innerHTML = `
    <div class="section-title">수강 강의 (${courses.length})</div>
    <div class="course-list">
      ${courses.map((c) => {
        const roundLabel = c.activeRound
          ? c.activeRound.label || `${c.activeRound.week}주차`
          : null;

        const statusHtml = c.submitted
          ? `<div class="course-status submitted">제출 완료</div>`
          : roundLabel
            ? `<div class="course-status active">${roundLabel} 평가 진행 중</div>`
            : `<div class="course-status inactive">평가 기간 아님</div>`;

        const token = tokenMap[c.courseId] || "";
        const disabled = c.submitted || !c.activeRound || !token;

        return `
          <button class="course-item ${disabled ? "disabled" : ""}"
            data-course-id="${c.courseId}"
            data-token="${token}"
            ${disabled ? "disabled" : ""}>
            <div class="course-name">${c.courseName}</div>
            <div class="course-meta">${c.professorName} · ${c.semester}</div>
            ${statusHtml}
          </button>
        `;
      }).join("")}
    </div>
  `;

  for (const btn of document.querySelectorAll(".course-item:not(.disabled)")) {
    btn.addEventListener("click", () => {
      const courseId = btn.dataset.courseId;
      const token = btn.dataset.token;
      const serverUrl = getServerUrl();
      chrome.tabs.create({ url: `${serverUrl}/feedback/${courseId}?token=${token}` });
    });
  }
}

async function loadData() {
  showLoading();

  const tab = await getEclassTab();
  if (!tab) {
    showError("e-class 탭을 찾을 수 없습니다.<br/>learn.hansung.ac.kr에 로그인해주세요.");
    return;
  }

  try {
    // 1. e-class에서 학생 정보 수집
    const eclassData = await chrome.tabs.sendMessage(tab.id, { type: "GET_ALL" });
    if (!eclassData) {
      showError("e-class에서 정보를 가져올 수 없습니다.<br/>로그인 상태를 확인해주세요.");
      return;
    }

    const serverUrl = getServerUrl();

    // 2. 서버에 동기화 (Student upsert + 수강 등록 + 토큰 발급)
    const syncRes = await fetch(`${serverUrl}/api/eclass-sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eclassData),
    });

    if (!syncRes.ok) {
      showError("서버 동기화에 실패했습니다.<br/>서버가 실행 중인지 확인해주세요.");
      return;
    }

    // eclass-sync 응답에서 토큰을 추출해 courseId → token 맵 생성
    // (student-courses는 보안상 토큰을 반환하지 않음)
    const syncData = await syncRes.json();
    const tokenMap = {};
    if (Array.isArray(syncData.enrolledCourses)) {
      for (const ec of syncData.enrolledCourses) {
        if (ec.courseId && ec.token) tokenMap[ec.courseId] = ec.token;
      }
    }

    // 3. 서버에서 과목 + 라운드 상태 + 제출 여부 조회
    const coursesRes = await fetch(
      `${serverUrl}/api/student-courses?studentNo=${eclassData.userInfo.studentId}`
    );

    if (!coursesRes.ok) {
      showError("강의 정보를 불러올 수 없습니다.");
      return;
    }

    const data = await coursesRes.json();
    showUserInfo(data.student);
    showCourses(data.courses, tokenMap);
  } catch (err) {
    showError("연결에 실패했습니다.<br/>서버와 e-class 상태를 확인해주세요.");
  }
}

// 시작
loadData();

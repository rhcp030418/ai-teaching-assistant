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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

function renderUnmatchedWarning(unmatched) {
  if (!Array.isArray(unmatched) || unmatched.length === 0) return "";

  const visible = unmatched.slice(0, 5);
  const remaining = unmatched.length - visible.length;

  return `
    <div class="sync-warning">
      <strong>일부 과목을 찾지 못했습니다</strong>
      <p>e-class 과목 ID가 서버 DB의 Course.eclassId와 매칭되지 않았습니다.</p>
      <ul>
        ${visible.map((c) => `
          <li>${escapeHtml(c.title || "제목 없음")} (${escapeHtml(c.eclassId)})</li>
        `).join("")}
        ${remaining > 0 ? `<li>외 ${remaining}개</li>` : ""}
      </ul>
    </div>
  `;
}

function showCourses(courses, tokenMap, unmatched = []) {
  const warningHtml = renderUnmatchedWarning(unmatched);

  if (courses.length === 0) {
    contentEl.innerHTML = `
      ${warningHtml}
      <div class="status">
        <div class="icon">-</div>
        <div class="message">등록된 강의가 없습니다</div>
      </div>
    `;
    return;
  }

  contentEl.innerHTML = `
    ${warningHtml}
    <div class="section-title">수강 강의 (${courses.length})</div>
    <div class="course-list">
      ${courses.map((c) => {
        const roundLabel = c.activeRound
          ? c.activeRound.label || `${c.activeRound.week}주차`
          : null;
        const safeRoundLabel = escapeHtml(roundLabel);

        const statusHtml = c.submitted
          ? `<div class="course-status submitted">제출 완료</div>`
          : roundLabel
            ? `<div class="course-status active">${safeRoundLabel} 평가 진행 중</div>`
            : `<div class="course-status inactive">평가 기간 아님</div>`;

        const token = tokenMap[c.courseId] || "";
        const disabled = c.submitted || !c.activeRound || !token;

        return `
          <button class="course-item ${disabled ? "disabled" : ""}"
            data-course-id="${escapeHtml(c.courseId)}"
            data-token="${escapeHtml(token)}"
            ${disabled ? "disabled" : ""}>
            <div class="course-name">${escapeHtml(c.courseName)}</div>
            <div class="course-meta">${escapeHtml(c.professorName)} · ${escapeHtml(c.semester)}</div>
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
    let eclassData;
    try {
      eclassData = await chrome.tabs.sendMessage(tab.id, { type: "GET_ALL" });
    } catch (err) {
      if (err.message?.includes("Could not establish connection")) {
        // content script 미주입 → 직접 주입 후 재시도
        try {
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
          await new Promise((r) => setTimeout(r, 500));
          eclassData = await chrome.tabs.sendMessage(tab.id, { type: "GET_ALL" });
        } catch (retryErr) {
          showError(`[1단계 실패] content script 주입 실패<br/>${retryErr.message}`);
          return;
        }
      } else {
        showError(`[1단계 실패] content script 연결 오류<br/>${err.message}`);
        return;
      }
    }

    if (!eclassData) {
      showError("[1단계 실패] e-class에서 정보를 가져올 수 없습니다.<br/>로그인 상태를 확인해주세요.");
      return;
    }

    if (!eclassData.userInfo?.studentId) {
      showError(`[1단계 실패] 학번을 읽지 못했습니다.<br/>학번: "${eclassData.userInfo?.studentId}"<br/>e-class 프로필 페이지 DOM이 변경되었을 수 있습니다.`);
      return;
    }

    const serverUrl = getServerUrl();

    // 2. 서버에 동기화 (Student upsert + 수강 등록 + 토큰 발급)
    let syncRes;
    try {
      syncRes = await fetch(`${serverUrl}/api/eclass-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eclassData),
      });
    } catch (err) {
      showError(`[2단계 실패] 서버 연결 오류<br/>${err.message}<br/>localhost:3000 서버가 실행 중인지 확인해주세요.`);
      return;
    }

    if (!syncRes.ok) {
      const text = await syncRes.text();
      showError(`[2단계 실패] 서버 동기화 오류 (${syncRes.status})<br/>${text}`);
      return;
    }

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
      showError(`[3단계 실패] 강의 정보 조회 오류 (${coursesRes.status})`);
      return;
    }

    const data = await coursesRes.json();
    showUserInfo(data.student);
    showCourses(data.courses, tokenMap, syncData.unmatched);
  } catch (err) {
    showError(`[알 수 없는 오류]<br/>${err.message}`);
  }
}

// 시작
loadData();

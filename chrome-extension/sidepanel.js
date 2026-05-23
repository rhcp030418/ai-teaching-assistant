const contentEl = document.getElementById("content");
const userSection = document.getElementById("user-section");
const userAvatar = document.getElementById("user-avatar");
const userName = document.getElementById("user-name");
const userDept = document.getElementById("user-dept");
const serverUrlInput = document.getElementById("server-url");
const serverConfig = document.getElementById("server-config");
const refreshBtn = document.getElementById("refresh-btn");
const settingsBtn = document.getElementById("settings-btn");

// 저장된 서버 URL 불러오기
chrome.storage?.local?.get("serverUrl", (data) => {
  if (data.serverUrl) serverUrlInput.value = data.serverUrl;
});

serverUrlInput.addEventListener("change", () => {
  chrome.storage?.local?.set({ serverUrl: serverUrlInput.value });
});

// 설정(서버 주소) 패널 토글 — 평소엔 숨겨두고 고급 사용자만 노출
settingsBtn.addEventListener("click", () => {
  serverConfig.classList.toggle("hidden");
});

// 새로고침 — 패널 재시작 없이 강의 목록 갱신
let isLoading = false;
refreshBtn.addEventListener("click", () => {
  if (!isLoading) loadData();
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

function formatRoundStatus(round) {
  if (!round) return null;
  const label = round.label || `${round.week}주차`;
  return /평가$/.test(label) ? `${label} 진행 중` : `${label} 평가 진행 중`;
}

// e-class 탭을 찾아서 Content Script에 메시지 전송
async function getEclassTab() {
  const tabs = await chrome.tabs.query({ url: "https://learn.hansung.ac.kr/*" });
  return tabs[0] ?? null;
}

function showLoading() {
  contentEl.innerHTML = `
    <div class="status loading">
      <div class="spinner"></div>
      <div class="message">e-class에서 정보를 불러오는 중</div>
    </div>
  `;
}

// message: 학생에게 보여줄 친화적 안내 / detail: 접어둔 기술적 원인(선택)
function showError(message, detail = "") {
  const detailHtml = detail
    ? `<details class="error-detail">
         <summary>자세한 오류 정보</summary>
         <pre>${escapeHtml(detail)}</pre>
       </details>`
    : "";

  contentEl.innerHTML = `
    <div class="status error">
      <div class="icon">!</div>
      <div class="message">${message}</div>
      ${detailHtml}
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
      <strong>평가 대상에서 제외된 항목이 있어요</strong>
      <p>커뮤니티처럼 강의가 아닌 항목이거나, 아직 평가 대상으로 연결되지 않은 항목입니다.</p>
      <ul>
        ${visible.map((c) => `
          <li>${escapeHtml(c.title || "제목 없음")}</li>
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
        const roundStatus = formatRoundStatus(c.activeRound);
        const safeRoundStatus = escapeHtml(roundStatus);

        const statusHtml = c.submitted
          ? `<div class="course-status submitted">제출 완료</div>`
          : roundStatus
            ? `<div class="course-status active">${safeRoundStatus}</div>`
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

function setLoadingState(loading) {
  isLoading = loading;
  refreshBtn.classList.toggle("spinning", loading);
  refreshBtn.disabled = loading;
}

async function loadData() {
  setLoadingState(true);
  showLoading();

  try {
    const tab = await getEclassTab();
    if (!tab) {
      showError(
        "e-class에 로그인되어 있는지 확인해주세요.<br/>learn.hansung.ac.kr 탭을 연 뒤 다시 시도해주세요.",
        "열려 있는 learn.hansung.ac.kr 탭을 찾지 못했습니다."
      );
      return;
    }

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
          showError(
            "e-class 정보를 불러오지 못했습니다.<br/>e-class 페이지를 새로고침한 뒤 다시 시도해주세요.",
            `content script 주입 실패: ${retryErr.message}`
          );
          return;
        }
      } else {
        showError(
          "e-class 정보를 불러오지 못했습니다.<br/>e-class 페이지를 새로고침한 뒤 다시 시도해주세요.",
          `content script 연결 오류: ${err.message}`
        );
        return;
      }
    }

    if (!eclassData) {
      showError(
        "e-class 로그인 상태를 확인해주세요.<br/>로그인 후 다시 시도해주세요.",
        "e-class에서 응답을 받지 못했습니다 (null)."
      );
      return;
    }

    if (!eclassData.userInfo?.studentId) {
      showError(
        "학생 정보를 읽지 못했습니다.<br/>e-class에 로그인되어 있는지 확인해주세요.",
        `학번을 찾지 못했습니다. 받은 값: "${eclassData.userInfo?.studentId}". e-class 프로필 페이지 구조가 변경되었을 수 있습니다.`
      );
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
      showError(
        "서버에 연결하지 못했습니다.<br/>인터넷 연결을 확인한 뒤 다시 시도해주세요.",
        `서버 연결 오류 (${serverUrl}): ${err.message}`
      );
      return;
    }

    if (!syncRes.ok) {
      const text = await syncRes.text();
      showError(
        "정보 동기화에 실패했습니다.<br/>잠시 후 다시 시도해주세요.",
        `eclass-sync 오류 (${syncRes.status}): ${text}`
      );
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
      showError(
        "강의 정보를 불러오지 못했습니다.<br/>잠시 후 다시 시도해주세요.",
        `student-courses 오류 (${coursesRes.status})`
      );
      return;
    }

    const data = await coursesRes.json();
    showUserInfo(data.student);
    showCourses(data.courses, tokenMap, syncData.unmatched);
  } catch (err) {
    showError(
      "문제가 발생했습니다.<br/>잠시 후 다시 시도해주세요.",
      err?.message || String(err)
    );
  } finally {
    setLoadingState(false);
  }
}

// 시작
loadData();

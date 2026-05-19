// e-class (learn.hansung.ac.kr) 도메인에서 실행되는 Content Script
// 로그인된 세션 쿠키를 그대로 사용하므로 CORS 없이 fetch 가능

const parser = new DOMParser();

async function fetchParse(url) {
  const res = await fetch(url);
  const html = await res.text();
  return parser.parseFromString(html, "text/html");
}

// 학생 프로필 정보 추출
async function fetchUserInfo() {
  const doc = await fetchParse("/user/edit.php");
  return {
    name:
      doc.querySelector("#id_firstname")?.getAttribute("value") ?? "",
    studentId:
      doc.querySelector("#fitem_id_idnumber .fstatic")?.textContent?.trim() ??
      "",
    email: doc.querySelector("#id_email")?.getAttribute("value") ?? "",
    department:
      doc.querySelector("#id_department")?.getAttribute("value") ?? "",
  };
}

// 수강 과목 목록 추출
async function fetchCourseList() {
  const doc = await fetchParse("/local/ubion/user/");
  const rows = doc.querySelectorAll(
    "div.course_lists table > tbody > tr"
  );

  const courses = [];
  for (const row of rows) {
    const tds = row.children;
    if (tds.length < 2) continue;

    const a = tds[1].querySelector("a");
    if (!a) continue;

    const id = Number(new URL(a.href).searchParams.get("id"));
    const title = a.textContent.trim();
    courses.push({ id, title });
  }
  return courses;
}

// ─── [DEMO ONLY - REMOVE FOR PRODUCTION] ──────────────────────────
// 시연용: 커뮤니티를 강의처럼 가져옴 (실제 교수 강의를 사용하지 않기 위함)
// 제거 시: 이 함수와 GET_ALL 핸들러의 [DEMO ONLY] 마커 블록만 삭제하면 됨
async function fetchCommunityList() {
  const doc = await fetchParse("/");
  const items = [];
  const seen = new Set();

  // 홈 페이지의 모든 course/view.php 링크 중 "커뮤니티" 뱃지가 있는 것만 추출
  const links = doc.querySelectorAll('a[href*="course/view.php?id="]');
  for (const link of links) {
    const url = new URL(link.href, location.origin);
    const id = Number(url.searchParams.get("id"));
    if (!id || seen.has(id)) continue;

    const title = link.textContent?.trim();
    if (!title) continue;

    // 상위 컨테이너에서 "커뮤니티" 뱃지 텍스트 확인
    const row = link.closest("li") || link.closest("tr") || link.closest("div");
    const text = row?.textContent ?? "";
    if (!text.includes("커뮤니티")) continue;

    seen.add(id);
    items.push({ id, title });
  }
  return items;
}
// ─── [/DEMO ONLY] ─────────────────────────────────────────────────

// Background/Side Panel에서 오는 메시지 처리
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_USER_INFO") {
    fetchUserInfo().then(sendResponse).catch(() => sendResponse(null));
    return true; // 비동기 응답
  }

  if (message.type === "GET_COURSES") {
    fetchCourseList().then(sendResponse).catch(() => sendResponse([]));
    return true;
  }

  if (message.type === "GET_ALL") {
    Promise.all([
      fetchUserInfo(),
      fetchCourseList(),
      // ─── [DEMO ONLY - REMOVE FOR PRODUCTION] ───
      fetchCommunityList().catch(() => []),
      // ─── [/DEMO ONLY] ───
    ])
      .then(([userInfo, courses, communities]) => {
        // ─── [DEMO ONLY - REMOVE FOR PRODUCTION] ───
        // 커뮤니티를 강의 목록에 합쳐서 전송 (실제 교수 강의 노출 방지용)
        const allCourses = [...courses, ...communities];
        sendResponse({ userInfo, courses: allCourses });
        // ─── [/DEMO ONLY] ───
        // 프로덕션 코드: sendResponse({ userInfo, courses });
      })
      .catch(() => sendResponse(null));
    return true;
  }
});

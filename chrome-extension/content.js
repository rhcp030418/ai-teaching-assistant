// e-class (learn.hansung.ac.kr) 도메인에서 실행되는 Content Script
// 로그인된 세션 쿠키를 그대로 사용하므로 CORS 없이 fetch 가능

const parser = new DOMParser();

async function fetchParse(url) {
  const res = await fetch(url);
  const html = await res.text();
  return parser.parseFromString(html, "text/html");
}

function normalizeText(value) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function getValue(doc, selectors) {
  for (const selector of selectors) {
    const el = doc.querySelector(selector);
    if (!el) continue;

    const value = "value" in el ? el.value : el.getAttribute("value");
    const text = normalizeText(value || el.textContent);
    if (text) return text;
  }
  return "";
}

function getCourseFromLink(link) {
  const href = link.getAttribute("href");
  if (!href) return null;

  let url;
  try {
    url = new URL(href, location.origin);
  } catch {
    return null;
  }

  const id = Number(url.searchParams.get("id"));
  if (!id) return null;

  const row = link.closest("tr") || link.closest("li") || link.closest(".coursebox") || link.closest("div");
  const title = [
    link.textContent,
    link.getAttribute("title"),
    row?.querySelector(".coursename")?.textContent,
    row?.textContent,
  ].map(normalizeText).find(Boolean) || "";

  if (!title) return null;
  return { id, title, sourceType: "course" };
}

function collectCoursesFromLinks(doc, selectors) {
  const courses = [];
  const seen = new Set();

  for (const selector of selectors) {
    for (const link of doc.querySelectorAll(selector)) {
      const course = getCourseFromLink(link);
      if (!course || seen.has(course.id)) continue;
      seen.add(course.id);
      courses.push(course);
    }
  }

  return courses;
}

// 학생 프로필 정보 추출
async function fetchUserInfo() {
  const doc = await fetchParse("/user/edit.php");
  return {
    name: getValue(doc, [
      "#id_firstname",
      "input[name='firstname']",
      "input[name='name']",
    ]) || getValue(document, [
      "li.user_department",
      ".usermenu .usertext",
      ".logininfo a",
    ]),
    studentId: getValue(doc, [
      "#fitem_id_idnumber .fstatic",
      "#fitem_id_idnumber .form-control-static",
      "#id_idnumber",
      "input[name='idnumber']",
      "[name='idnumber']",
    ]),
    email: getValue(doc, [
      "#id_email",
      "input[name='email']",
    ]),
    department: getValue(doc, [
      "#id_department",
      "input[name='department']",
      "[name='department']",
    ]) || getValue(document, [
      ".user-info-picture .department",
      "li.user_department",
    ]),
  };
}

// 수강 과목 목록 추출
async function fetchCourseList() {
  const doc = await fetchParse("/local/ubion/user/");
  return collectCoursesFromLinks(doc, [
    "div.course_lists table > tbody > tr a[href*='course/view.php?id=']",
    "table a[href*='course/view.php?id=']",
    ".course_lists a[href*='course/view.php?id=']",
    "a[href*='/course/view.php?id=']",
    "a[href*='course/view.php?id=']",
  ]);
}

// 커뮤니티 링크는 강의 목록에 섞일 수 있어 서버로 보내되, 서버에서 비강의 항목으로 제외한다.
// 이렇게 해야 "강의가 아닌 항목은 평가 대상에서 제외됨" 케이스도 사이드패널에서 확인할 수 있다.
async function fetchCommunityList() {
  const doc = await fetchParse("/");
  const items = [];
  const seen = new Set();

  // 홈 페이지의 모든 course/view.php 링크 중 "커뮤니티" 뱃지가 있는 것만 추출
  const links = doc.querySelectorAll('a[href*="course/view.php?id="]');
  for (const link of links) {
    const course = getCourseFromLink(link);
    if (!course || seen.has(course.id)) continue;

    // 상위 컨테이너에서 "커뮤니티" 뱃지 텍스트 확인
    const row = link.closest("li") || link.closest("tr") || link.closest("div");
    const text = row?.textContent ?? "";
    if (!text.includes("커뮤니티")) continue;

    seen.add(course.id);
    items.push({ ...course, sourceType: "community" });
  }
  return items;
}

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
      fetchCommunityList().catch(() => []),
    ])
      .then(([userInfo, courses, communities]) => {
        // 서버가 course/community를 구분해 강의는 평가 대상으로, 커뮤니티는 제외 안내로 처리한다.
        const allCourses = [...courses, ...communities];
        sendResponse({ userInfo, courses: allCourses });
      })
      .catch(() => sendResponse(null));
    return true;
  }
});

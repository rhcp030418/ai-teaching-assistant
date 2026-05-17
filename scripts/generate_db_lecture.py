"""
데이터베이스 3주차 강의자료 PDF 생성 스크립트
fpdf2 사용, 맑은 고딕 폰트로 한글 지원
"""
import os
import sys
from fpdf import FPDF
from fpdf.enums import XPos, YPos, Align

FONT_R = "C:/Windows/Fonts/malgun.ttf"
FONT_B = "C:/Windows/Fonts/malgunbd.ttf"
OUTPUT = os.path.join(os.path.dirname(__file__), "..", "uploads", "데이터베이스_3주차_강의자료.pdf")
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

# ── 색상 ─────────────────────────────────────────────────────────────────────
NAVY  = (26,  58,  92)
BLUE  = (44, 111, 173)
LBLUE = (232, 241, 248)
GRAY  = (85,  85,  85)
LGRAY = (244, 244, 244)
DKGRAY= (51,  51,  51)
WHITE = (255, 255, 255)
GREEN = (30, 126,  52)
AMBER = (230, 126,  34)

class Lecture(FPDF):
    def __init__(self):
        super().__init__("P", "mm", "A4")
        self.add_font("Malgun",  "", FONT_R)
        self.add_font("Malgun",  "B", FONT_B)
        self.set_auto_page_break(True, margin=18)
        self.page_num = 0

    # ── 헤더 / 푸터 ────────────────────────────────────────────────────────
    def header(self):
        if self.page_no() == 1:
            return
        self.set_fill_color(*NAVY)
        self.rect(0, 0, 210, 10, "F")
        self.set_font("Malgun", "B", 8)
        self.set_text_color(*WHITE)
        self.set_xy(10, 1.5)
        self.cell(0, 7, "데이터베이스 — 3주차: SQL 기초", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*DKGRAY)

    def footer(self):
        if self.page_no() == 1:
            return
        self.set_y(-12)
        self.set_font("Malgun", "", 8)
        self.set_text_color(*GRAY)
        self.cell(0, 8, f"한성대학교 컴퓨터공학부  |  {self.page_no()-1}",
                  align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*DKGRAY)

    # ── 헬퍼 ────────────────────────────────────────────────────────────────
    def section_box(self, title):
        self.set_fill_color(*NAVY)
        self.set_text_color(*WHITE)
        self.set_font("Malgun", "B", 13)
        self.cell(0, 9, f"  {title}", fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*DKGRAY)
        self.ln(3)

    def h2(self, text):
        self.set_font("Malgun", "B", 11)
        self.set_text_color(*BLUE)
        self.cell(0, 7, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*DKGRAY)

    def body(self, text, indent=0, color=None):
        self.set_font("Malgun", "", 9.5)
        self.set_text_color(*(color or DKGRAY))
        self.set_x(self.l_margin + indent)
        self.multi_cell(0, 5.5, text)
        self.set_text_color(*DKGRAY)

    def bullet(self, text, indent=6):
        self.set_font("Malgun", "", 9.5)
        self.set_text_color(*DKGRAY)
        x0 = self.l_margin + indent
        self.set_x(x0)
        self.cell(5, 5.5, "•")
        self.set_x(x0 + 5)
        self.multi_cell(0, 5.5, text)

    def note(self, text):
        self.set_font("Malgun", "", 8.5)
        self.set_text_color(*GREEN)
        self.set_x(self.l_margin + 4)
        self.multi_cell(0, 5, f"※ {text}")
        self.set_text_color(*DKGRAY)

    def warn(self, text):
        self.set_font("Malgun", "", 8.5)
        self.set_text_color(*AMBER)
        self.set_x(self.l_margin + 4)
        self.multi_cell(0, 5, f"[주의] {text}")
        self.set_text_color(*DKGRAY)

    def sp(self, h=4):
        self.ln(h)

    def hr(self):
        self.set_draw_color(*BLUE)
        self.set_line_width(0.3)
        self.line(self.l_margin, self.get_y(), 210 - self.r_margin, self.get_y())
        self.ln(3)

    def code_block(self, lines):
        self.set_fill_color(*LGRAY)
        self.set_draw_color(*BLUE)
        self.set_line_width(0.4)
        self.set_text_color(*DKGRAY)
        x0 = self.l_margin
        w  = 210 - self.l_margin - self.r_margin
        total_h = len(lines) * 4.8 + 4
        self.rect(x0, self.get_y(), w, total_h, "FD")
        for line in lines:
            # 한글 포함 여부에 따라 폰트 선택
            has_korean = any('가' <= c <= '힣' or '㄰' <= c <= '㆏' for c in line)
            if has_korean:
                self.set_font("Malgun", "", 8.5)
            else:
                self.set_font("Courier", "", 8.5)
            self.set_x(x0 + 4)
            self.cell(w - 8, 4.8, line, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(2)
        self.set_text_color(*DKGRAY)

    def table(self, headers, rows, col_ws):
        """headers: list[str], rows: list[list[str]], col_ws: list[mm]"""
        # header row
        self.set_fill_color(*NAVY)
        self.set_text_color(*WHITE)
        self.set_font("Malgun", "B", 8.5)
        x0 = self.l_margin
        self.set_x(x0)
        for i, (h, w) in enumerate(zip(headers, col_ws)):
            self.cell(w, 7, f" {h}", border=1, fill=True)
        self.ln()
        # data rows
        self.set_font("Malgun", "", 8.5)
        toggle = False
        for row in rows:
            toggle = not toggle
            self.set_fill_color(*(LGRAY if toggle else WHITE))
            self.set_text_color(*DKGRAY)
            self.set_x(x0)
            max_h = 7
            # measure height (approx — use multi_cell trick)
            for cell, w in zip(row, col_ws):
                lines_n = max(1, len(cell) // max(1, int(w / 2.5)))
                max_h = max(max_h, lines_n * 5)
            for cell, w in zip(row, col_ws):
                xi = self.get_x()
                yi = self.get_y()
                self.multi_cell(w, 5, f" {cell}", border=1, fill=True, max_line_height=5)
                self.set_xy(xi + w, yi)
            self.ln(max_h)
        self.set_text_color(*DKGRAY)
        self.ln(2)


# ══════════════════════════════════════════════════════════════════════════════
pdf = Lecture()

# ── 표지 ─────────────────────────────────────────────────────────────────────
pdf.add_page()
# 배경 상단 블록
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, 210, 160, "F")
pdf.set_fill_color(*BLUE)
pdf.rect(0, 155, 210, 6, "F")

# 로고/소속
pdf.set_xy(20, 38)
pdf.set_font("Malgun", "", 11)
pdf.set_text_color(*LBLUE)
pdf.cell(0, 7, "한성대학교 컴퓨터공학부", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_x(20)
pdf.cell(0, 7, "2025학년도 1학기", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

# 강의명
pdf.set_xy(20, 70)
pdf.set_font("Malgun", "B", 30)
pdf.set_text_color(*WHITE)
pdf.cell(0, 14, "데이터베이스", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_x(20)
pdf.set_font("Malgun", "", 14)
pdf.set_text_color(*LBLUE)
pdf.cell(0, 9, "Database Systems", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

pdf.set_xy(20, 108)
pdf.set_font("Malgun", "B", 13)
pdf.set_text_color(*WHITE)
pdf.cell(0, 8, "3주차: SQL 기초 — SELECT, JOIN, 집계함수", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

pdf.set_xy(20, 140)
pdf.set_font("Malgun", "", 10)
pdf.set_text_color(*LBLUE)
pdf.cell(0, 6, "담당교수: 김데이터  |  화 3~4교시  |  미래관 201호", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

# 하단 흰 영역
pdf.set_fill_color(*WHITE)
pdf.rect(0, 161, 210, 136, "F")

# ── 1. 강의 개요 ─────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_top_margin(14)
pdf.set_y(14)
pdf.section_box("1. 강의 개요 및 학습목표")
pdf.h2("■ 강의 정보")
pdf.table(
    ["항목", "내용"],
    [
        ["강의명",   "데이터베이스 (Database Systems)"],
        ["주차",     "3주차  (2025. 3. 25.)"],
        ["주제",     "SQL 기초 — SELECT, 조건절, 집계, JOIN"],
        ["선수내용", "1주차: DBMS 개요  /  2주차: 관계형 모델 & ER 다이어그램"],
        ["참고교재", "Database System Concepts, 7th Ed. (Silberschatz 외), 4~6장"],
    ],
    [40, 130],
)
pdf.sp(2)
pdf.h2("■ 학습 목표")
objectives = [
    "SQL의 역할과 표준(SQL-92 / SQL:2016)을 설명할 수 있다.",
    "SELECT 문의 6가지 절(SELECT·FROM·WHERE·GROUP BY·HAVING·ORDER BY) 구조와 실행 순서를 이해한다.",
    "비교·논리·LIKE·IN·BETWEEN 연산자를 활용하여 복합 조건을 작성할 수 있다.",
    "COUNT / SUM / AVG / MAX / MIN 집계 함수와 GROUP BY / HAVING 절을 조합한다.",
    "INNER JOIN, LEFT OUTER JOIN, NATURAL JOIN 의 차이를 이해하고 올바르게 적용한다.",
    "서브쿼리(Subquery)와 NULL 처리(IS NULL / COALESCE) 기법을 실습 예제에서 적용한다.",
]
for o in objectives:
    pdf.bullet(o)

# ── 2. SQL 개요 ──────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_y(14)
pdf.section_box("2. SQL 개요")
pdf.h2("■ SQL이란?")
pdf.body(
    "SQL(Structured Query Language)은 관계형 데이터베이스에서 데이터를 정의·조작·제어하기 위한 "
    "표준 질의 언어이다. 1986년 ANSI, 1987년 ISO 표준으로 채택되었으며, 현재는 SQL:2016까지 "
    "개정되었다. 선언적(declarative) 언어로, '무엇'을 원하는지만 명시하면 DBMS 옵티마이저가 "
    "실행 계획을 결정한다."
)
pdf.sp(3)
pdf.h2("■ SQL 구성 요소")
pdf.table(
    ["구분", "약어", "주요 명령어", "역할"],
    [
        ["데이터 정의어", "DDL", "CREATE / ALTER / DROP / TRUNCATE", "테이블·스키마 구조 정의"],
        ["데이터 조작어", "DML", "SELECT / INSERT / UPDATE / DELETE", "데이터 조회 및 변경"],
        ["데이터 제어어", "DCL", "GRANT / REVOKE",                    "접근 권한 관리"],
        ["트랜잭션 제어", "TCL", "COMMIT / ROLLBACK / SAVEPOINT",      "트랜잭션 단위 관리"],
    ],
    [35, 15, 72, 48],
)
pdf.sp(2)
pdf.h2("■ SELECT 문 실행 순서 (논리적 처리 순서)")
pdf.body(
    "SQL 절이 작성된 순서와 실제 엔진이 처리하는 순서는 다르다. "
    "이 차이를 이해하면 오류를 예방하고 최적화에 도움이 된다."
)
pdf.sp(2)
pdf.table(
    ["순서", "절 (Clause)", "동작"],
    [
        ["①", "FROM / JOIN",  "처리할 테이블(또는 조인 결과)을 결정"],
        ["②", "WHERE",        "행(row) 단위 조건 필터링 — 집계 함수 사용 불가"],
        ["③", "GROUP BY",     "지정 컬럼 기준으로 행을 그룹화"],
        ["④", "HAVING",       "그룹 단위 조건 필터링 — 집계 함수 사용 가능"],
        ["⑤", "SELECT",       "출력할 컬럼·수식·별칭 결정"],
        ["⑥", "DISTINCT",     "중복 행 제거"],
        ["⑦", "ORDER BY",     "결과 정렬 (SELECT 별칭 사용 가능)"],
        ["⑧", "LIMIT / TOP",  "반환할 행 수 제한"],
    ],
    [14, 34, 122],
)
pdf.note("WHERE에서 SELECT 별칭(alias)을 참조하면 오류 — SELECT가 WHERE보다 나중에 처리되기 때문")

# ── 3. 기본 SELECT ────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_y(14)
pdf.section_box("3. 기본 SELECT 문")
pdf.h2("■ 실습용 스키마")
pdf.body("이번 주차 실습은 대학 정보시스템을 단순화한 다음 4개 테이블을 사용한다.")
pdf.sp(2)
pdf.table(
    ["테이블", "주요 컬럼", "설명"],
    [
        ["Student",    "sid(PK), sname, dept, grade, email",          "재학생 정보"],
        ["Course",     "cid(PK), cname, credit, dept, prof_id(FK)",   "개설 강좌"],
        ["Enrollment", "eid(PK), sid(FK), cid(FK), semester, score",  "수강 내역"],
        ["Professor",  "pid(PK), pname, dept, hire_year",             "교수 정보"],
    ],
    [28, 82, 60],
)
pdf.sp(2)
pdf.h2("■ 전체 컬럼 / 특정 컬럼 조회")
pdf.code_block([
    "-- 전체 컬럼 조회 (실무에서는 지양)",
    "SELECT * FROM Student;",
    "",
    "-- 특정 컬럼만 조회 + 별칭(alias) 부여",
    "SELECT sid AS 학번, sname AS 이름, dept AS 학과",
    "  FROM Student;",
])
pdf.sp(3)
pdf.h2("■ WHERE 절 — 조건 연산자")
pdf.table(
    ["연산자 종류", "예시", "설명"],
    [
        ["비교",     "score >= 80",                "수치 비교"],
        ["논리",     "dept = 'CS' AND grade >= 3", "AND / OR / NOT 조합"],
        ["범위",     "score BETWEEN 70 AND 89",    "양 끝값 포함"],
        ["목록",     "dept IN ('CS','EE','ME')",    "여러 값 중 하나"],
        ["패턴",     "sname LIKE '김%'",            "% = 0개 이상, _ = 정확히 1개"],
        ["NULL 검사","email IS NULL",               "= NULL 은 항상 UNKNOWN → IS NULL 사용"],
    ],
    [24, 70, 76],
)
pdf.sp(2)
pdf.code_block([
    "-- 복합 조건: CS학과 3학년 이상이거나, EE학과이면서 email 있는 학생",
    "SELECT sid, sname, dept, grade",
    "  FROM Student",
    " WHERE (dept = 'CS' AND grade >= 3)",
    "    OR  (dept = 'EE' AND email IS NOT NULL);",
])

# ── 4. 집계 함수 ──────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_y(14)
pdf.section_box("4. 집계 함수 & GROUP BY / HAVING")
pdf.h2("■ 주요 집계 함수")
pdf.table(
    ["함수", "반환값", "NULL 처리"],
    [
        ["COUNT(*)",    "전체 행 수",            "NULL 행도 포함"],
        ["COUNT(col)",  "col이 NULL이 아닌 행 수","NULL 제외"],
        ["SUM(col)",    "합계",                  "NULL 제외"],
        ["AVG(col)",    "평균",                  "NULL 제외 (분모도 줄어듦에 주의)"],
        ["MAX(col)",    "최댓값",                "NULL 제외"],
        ["MIN(col)",    "최솟값",                "NULL 제외"],
    ],
    [30, 60, 80],
)
pdf.sp(3)
pdf.h2("■ GROUP BY + HAVING 예시")
pdf.code_block([
    "-- 학과별 평균 점수, 수강자 3명 이상인 학과만",
    "SELECT c.dept                AS 학과,",
    "       COUNT(*)              AS 수강자수,",
    "       ROUND(AVG(e.score),1) AS 평균점수,",
    "       MAX(e.score)          AS 최고점수",
    "  FROM Enrollment e",
    "  JOIN Course c ON e.cid = c.cid",
    " WHERE e.semester = '2025-1'",
    " GROUP BY c.dept",
    "HAVING COUNT(*) >= 3",
    " ORDER BY 평균점수 DESC;",
])
pdf.sp(2)
pdf.warn("WHERE와 HAVING 혼동 주의: WHERE는 그룹화 이전, HAVING은 그룹화 이후 필터. 집계 조건은 반드시 HAVING에.")
pdf.sp(4)
pdf.h2("■ DISTINCT — 중복 제거")
pdf.code_block([
    "-- 수강 신청이 있는 학생 수 (중복 학번 제거)",
    "SELECT COUNT(DISTINCT sid) AS 수강학생수 FROM Enrollment;",
])

# ── 5. JOIN ───────────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_y(14)
pdf.section_box("5. JOIN — 테이블 연결")
pdf.h2("■ JOIN 종류 비교")
pdf.table(
    ["JOIN 종류", "반환 행", "용도"],
    [
        ["INNER JOIN",       "양쪽 모두 매칭되는 행만",              "공통 데이터 추출"],
        ["LEFT OUTER JOIN",  "왼쪽 전체 + 오른쪽 매칭(없으면 NULL)","왼쪽 기준 전체 보존"],
        ["RIGHT OUTER JOIN", "오른쪽 전체 + 왼쪽 매칭(없으면 NULL)","오른쪽 기준 전체 보존"],
        ["FULL OUTER JOIN",  "양쪽 전체, 없으면 NULL",              "누락 데이터 검출"],
        ["CROSS JOIN",       "카테시안 곱 (m × n 행)",              "경우의 수 생성"],
        ["SELF JOIN",        "같은 테이블끼리 JOIN",                "계층·비교 구조"],
    ],
    [44, 70, 56],
)
pdf.sp(3)
pdf.h2("■ INNER JOIN 예시 — 수강 학생 목록")
pdf.code_block([
    "SELECT s.sid, s.sname, c.cname, e.score",
    "  FROM Enrollment e",
    "  JOIN Student s ON e.sid = s.sid",
    "  JOIN Course  c ON e.cid = c.cid",
    " WHERE e.semester = '2025-1'",
    "   AND c.dept = 'CS'",
    " ORDER BY e.score DESC;",
])
pdf.sp(4)
pdf.h2("■ LEFT JOIN 예시 — 미수강 학생 포함")
pdf.code_block([
    "-- 모든 학생 + 수강 여부 (수강 안 한 학생: score = NULL)",
    "SELECT s.sid, s.sname,",
    "       COALESCE(c.cname, '미수강') AS 강좌명,",
    "       e.score",
    "  FROM Student s",
    "  LEFT JOIN Enrollment e ON s.sid = e.sid",
    "  LEFT JOIN Course     c ON e.cid = c.cid;",
])
pdf.sp(2)
pdf.note("COALESCE(expr, fallback): expr이 NULL이면 fallback 반환 — NULL을 사용자 친화적 값으로 대체할 때 활용")

# ── 6. 서브쿼리 ───────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_y(14)
pdf.section_box("6. 서브쿼리 (Subquery)")
pdf.h2("■ 서브쿼리 위치에 따른 분류")
pdf.table(
    ["위치", "명칭", "예시"],
    [
        ["WHERE 절",  "스칼라·조건 서브쿼리",      "WHERE score > (SELECT AVG(score) FROM ...)"],
        ["FROM 절",   "인라인 뷰 (Derived Table)", "FROM (SELECT ...) AS tmp"],
        ["SELECT 절", "스칼라 서브쿼리",            "SELECT (SELECT COUNT(*) FROM ...) AS cnt"],
        ["EXISTS",    "존재 확인 서브쿼리",          "WHERE EXISTS (SELECT 1 FROM ...)"],
    ],
    [24, 44, 102],
)
pdf.sp(4)
pdf.h2("■ 예시 1: 평균 이상 점수 학생 조회")
pdf.code_block([
    "SELECT s.sname, e.score",
    "  FROM Enrollment e",
    "  JOIN Student s ON e.sid = s.sid",
    " WHERE e.score > (",
    "         SELECT AVG(score) FROM Enrollment",
    "          WHERE semester = '2025-1'",
    "       )",
    " ORDER BY e.score DESC;",
])
pdf.sp(4)
pdf.h2("■ 예시 2: 수강 학생이 없는 강좌 찾기 (NOT EXISTS)")
pdf.code_block([
    "SELECT cid, cname",
    "  FROM Course c",
    " WHERE NOT EXISTS (",
    "         SELECT 1 FROM Enrollment e",
    "          WHERE e.cid = c.cid",
    "            AND e.semester = '2025-1'",
    "       );",
])

# ── 7. 실습 과제 ──────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_y(14)
pdf.section_box("7. 실습 과제")
pdf.body(
    "다음 SQL을 위에서 정의한 4개 테이블(Student, Course, Enrollment, Professor)을 기반으로 작성하시오. "
    "실습 환경: MySQL 8.x / SQLite 3 (강의 포털 → DB Lab 접속)"
)
pdf.sp(4)

pdf.h2("▶ 기초 (10점)")
pdf.bullet("Q1. 2025학년도 1학기에 'CS' 학과 강좌를 수강한 학생의 학번, 이름, 강좌명, 점수를 조회하시오. 점수 내림차순 정렬.")
pdf.bullet("Q2. 학과별 개설 강좌 수를 조회하시오. 단, 강좌가 3개 이상인 학과만 표시.")
pdf.sp(3)

pdf.h2("▶ 응용 (15점)")
pdf.bullet("Q3. 각 학생의 전체 평균 점수를 계산하고, 전체 학생 평균 점수보다 높은 학생의 이름과 평균 점수를 조회하시오.")
pdf.bullet("Q4. 수강 신청은 했지만 점수가 아직 입력되지 않은(NULL) 학생 목록을 조회하시오.")
pdf.sp(3)

pdf.h2("▶ 심화 (25점)")
pdf.bullet("Q5. 교수별로 담당 강좌의 평균 점수가 가장 높은 교수 3명을 조회하시오. (담당 강좌 없는 교수 제외)")
pdf.bullet("Q6. 같은 학과 학생끼리 점수 차이가 10점 이상 나는 쌍(pair)을 SELF JOIN으로 구하시오. (A-B와 B-A 중복 제거)")
pdf.sp(4)
pdf.warn("제출: 다음 주 강의 시작 전까지 강의 포털 과제 게시판에 .sql 파일로 제출")

# ── 8. 핵심 개념 요약 ─────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_y(14)
pdf.section_box("8. 핵심 개념 요약 & 자주 하는 실수")
pdf.h2("■ 이번 주 핵심 포인트")
summary_points = [
    "SELECT 문은 작성 순서와 실행 순서가 다르다 → FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY",
    "집계 함수는 WHERE에 쓸 수 없다 → HAVING 사용",
    "COUNT(*) vs COUNT(col): NULL 포함 여부 차이 반드시 확인",
    "JOIN은 INNER가 기본 → 누락 데이터가 필요하면 OUTER JOIN",
    "NULL 비교는 = 불가 → IS NULL / IS NOT NULL 사용",
    "서브쿼리는 메인 쿼리보다 먼저 실행된다 (상관 서브쿼리 제외)",
]
for p in summary_points:
    pdf.bullet(p)
pdf.sp(5)

pdf.h2("■ 자주 하는 실수 Top 5")
pdf.table(
    ["#", "실수 패턴", "올바른 방법"],
    [
        ["1", "WHERE score = NULL",              "WHERE score IS NULL"],
        ["2", "WHERE AVG(score) > 80",           "HAVING AVG(score) > 80"],
        ["3", "GROUP BY 없이 집계 + 일반 컬럼 혼용", "집계할 컬럼 외 모두 GROUP BY에 포함"],
        ["4", "SELECT 별칭을 WHERE에서 참조",    "WHERE에는 원래 컬럼명 사용"],
        ["5", "OUTER JOIN 조건을 WHERE에 작성",  "ON 절에 조인 조건 / WHERE는 추가 필터만"],
    ],
    [8, 74, 88],
)
pdf.sp(5)

pdf.h2("■ 다음 주 예고 (4주차)")
for item in ["뷰(View)와 인덱스(Index) — 성능 최적화의 시작",
             "트랜잭션(Transaction) & ACID 속성",
             "잠금(Lock)과 동시성 제어 기초"]:
    pdf.bullet(item)

pdf.sp(5)
pdf.hr()
pdf.set_font("Malgun", "", 7.5)
pdf.set_text_color(*GRAY)
pdf.set_x(pdf.l_margin)
pdf.multi_cell(0, 4.5,
    "참고문헌: Silberschatz, A., Korth, H., & Sudarshan, S. (2019). "
    "Database System Concepts (7th ed.). McGraw-Hill. ISBN 978-0-07-802215-9."
)

# ── 출력 ─────────────────────────────────────────────────────────────────────
pdf.output(OUTPUT)
print(f"PDF 생성 완료: {os.path.abspath(OUTPUT)}")

"""
데이터베이스 2주차 강의자료 PDF 생성 스크립트
주제: JOIN 기초 · GROUP BY/HAVING · 서브쿼리 · 트랜잭션 & ACID
fpdf2 사용, 맑은 고딕 폰트
"""
import os
from fpdf import FPDF
from fpdf.enums import XPos, YPos

FONT_R = "C:/Windows/Fonts/malgun.ttf"
FONT_B = "C:/Windows/Fonts/malgunbd.ttf"
OUTPUT = os.path.join(os.path.dirname(__file__), "..", "uploads", "데이터베이스_2주차_강의자료.pdf")
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

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
        self.add_font("Malgun", "",  FONT_R)
        self.add_font("Malgun", "B", FONT_B)
        self.set_auto_page_break(True, margin=18)

    def header(self):
        if self.page_no() == 1:
            return
        self.set_fill_color(*NAVY); self.rect(0, 0, 210, 10, "F")
        self.set_font("Malgun", "B", 8); self.set_text_color(*WHITE)
        self.set_xy(10, 1.5)
        self.cell(0, 7, "데이터베이스 — 2주차: JOIN · GROUP BY · 서브쿼리 · 트랜잭션 & ACID", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*DKGRAY)

    def footer(self):
        if self.page_no() == 1:
            return
        self.set_y(-12); self.set_font("Malgun", "", 8); self.set_text_color(*GRAY)
        self.cell(0, 8, f"한성대학교 컴퓨터공학부  |  {self.page_no()-1}", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*DKGRAY)

    def section_box(self, title):
        self.set_fill_color(*NAVY); self.set_text_color(*WHITE)
        self.set_font("Malgun", "B", 13)
        self.cell(0, 9, f"  {title}", fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*DKGRAY); self.ln(3)

    def h2(self, text):
        self.set_font("Malgun", "B", 11); self.set_text_color(*BLUE)
        self.cell(0, 7, text, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*DKGRAY)

    def body(self, text, indent=0):
        self.set_font("Malgun", "", 9.5); self.set_text_color(*DKGRAY)
        self.set_x(self.l_margin + indent); self.multi_cell(0, 5.5, text)

    def bullet(self, text, indent=6):
        self.set_font("Malgun", "", 9.5); self.set_text_color(*DKGRAY)
        x0 = self.l_margin + indent
        self.set_x(x0); self.cell(5, 5.5, "-")
        self.set_x(x0 + 5); self.multi_cell(0, 5.5, text)

    def note(self, text):
        self.set_font("Malgun", "", 8.5); self.set_text_color(*GREEN)
        self.set_x(self.l_margin + 4); self.multi_cell(0, 5, f"[참고] {text}")
        self.set_text_color(*DKGRAY)

    def warn(self, text):
        self.set_font("Malgun", "", 8.5); self.set_text_color(*AMBER)
        self.set_x(self.l_margin + 4); self.multi_cell(0, 5, f"[주의] {text}")
        self.set_text_color(*DKGRAY)

    def sp(self, h=4): self.ln(h)
    def hr(self):
        self.set_draw_color(*BLUE); self.set_line_width(0.3)
        self.line(self.l_margin, self.get_y(), 210 - self.r_margin, self.get_y()); self.ln(3)

    def code_block(self, lines):
        self.set_fill_color(*LGRAY); self.set_draw_color(*BLUE); self.set_line_width(0.4)
        self.set_text_color(*DKGRAY)
        x0 = self.l_margin; w = 210 - self.l_margin - self.r_margin
        self.rect(x0, self.get_y(), w, len(lines) * 4.8 + 4, "FD")
        for line in lines:
            has_kr = any('가' <= c <= '힣' for c in line)
            self.set_font("Malgun" if has_kr else "Courier", "", 8.5)
            self.set_x(x0 + 4)
            self.cell(w - 8, 4.8, line, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(2); self.set_text_color(*DKGRAY)

    def table(self, headers, rows, col_ws):
        self.set_fill_color(*NAVY); self.set_text_color(*WHITE)
        self.set_font("Malgun", "B", 8.5); x0 = self.l_margin; self.set_x(x0)
        for h, w in zip(headers, col_ws):
            self.cell(w, 7, f" {h}", border=1, fill=True)
        self.ln()
        toggle = False
        for row in rows:
            toggle = not toggle
            self.set_fill_color(*(LGRAY if toggle else WHITE))
            self.set_text_color(*DKGRAY); self.set_font("Malgun", "", 8.5); self.set_x(x0)
            max_h = 7
            for cell, w in zip(row, col_ws):
                max_h = max(max_h, max(1, len(cell) // max(1, int(w / 2.5))) * 5)
            for cell, w in zip(row, col_ws):
                xi = self.get_x(); yi = self.get_y()
                self.multi_cell(w, 5, f" {cell}", border=1, fill=True, max_line_height=5)
                self.set_xy(xi + w, yi)
            self.ln(max_h)
        self.set_text_color(*DKGRAY); self.ln(2)


pdf = Lecture()

# ── 표지
pdf.add_page()
pdf.set_fill_color(*NAVY); pdf.rect(0, 0, 210, 160, "F")
pdf.set_fill_color(*BLUE);  pdf.rect(0, 155, 210, 6, "F")
pdf.set_xy(20, 38); pdf.set_font("Malgun", "", 11); pdf.set_text_color(*LBLUE)
pdf.cell(0, 7, "한성대학교 컴퓨터공학부", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_x(20); pdf.cell(0, 7, "2025학년도 1학기", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_xy(20, 70); pdf.set_font("Malgun", "B", 30); pdf.set_text_color(*WHITE)
pdf.cell(0, 14, "데이터베이스", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_x(20); pdf.set_font("Malgun", "", 14); pdf.set_text_color(*LBLUE)
pdf.cell(0, 9, "Database Systems", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_xy(20, 108); pdf.set_font("Malgun", "B", 13); pdf.set_text_color(*WHITE)
pdf.cell(0, 8, "2주차: JOIN · GROUP BY/HAVING · 서브쿼리 · 트랜잭션 & ACID", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_xy(20, 140); pdf.set_font("Malgun", "", 10); pdf.set_text_color(*LBLUE)
pdf.cell(0, 6, "담당교수: 김데이터  |  화 3~4교시  |  미래관 201호", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_fill_color(*WHITE); pdf.rect(0, 161, 210, 136, "F")

# ── 1. 강의 개요
pdf.add_page(); pdf.set_top_margin(14); pdf.set_y(14)
pdf.section_box("1. 강의 개요 및 학습목표")
pdf.h2("■ 강의 정보")
pdf.table(["항목", "내용"], [
    ["강의명",   "데이터베이스 (Database Systems)"],
    ["주차",     "2주차  (2025. 3. 11.)"],
    ["주제",     "JOIN · GROUP BY/HAVING · 서브쿼리 · 트랜잭션 & ACID"],
    ["선수내용", "1주차: 관계형 모델 / ERD / CREATE TABLE / 1NF"],
    ["실습 도구", "MySQL Workbench 8.x (강의 포털 DB Lab)"],
], [40, 130])
pdf.sp(2)
pdf.h2("■ 학습 목표")
for o in [
    "INNER JOIN · LEFT/RIGHT OUTER JOIN · SELF JOIN의 차이를 이해하고 올바르게 작성한다.",
    "GROUP BY · HAVING · 집계 함수(COUNT·SUM·AVG·MAX·MIN)를 조합해 그룹 통계를 계산한다.",
    "서브쿼리를 WHERE · FROM · SELECT 절에서 활용하고 JOIN과의 선택 기준을 설명한다.",
    "트랜잭션(Transaction)의 개념과 ACID 속성(원자성·일관성·고립성·영속성)을 정의한다.",
    "격리 수준(Isolation Level) 4단계와 각 수준에서 발생 가능한 현상을 설명한다.",
    "MySQL Workbench에서 직접 쿼리를 작성·실행하고 결과를 해석할 수 있다.",
]:
    pdf.bullet(o)

# ── 2. JOIN 기초
pdf.add_page(); pdf.set_y(14)
pdf.section_box("2. JOIN — 테이블 연결")
pdf.h2("■ JOIN이란?")
pdf.body(
    "JOIN은 외래키 관계로 연결된 두 개 이상의 테이블을 가로 방향으로 결합하는 연산이다. "
    "1주차에서 ERD로 표현한 관계를 실제 SQL 질의로 실현하는 핵심 도구이다."
)
pdf.sp(3)
pdf.h2("■ INNER JOIN — 교집합")
pdf.code_block([
    "-- 수강 중인 학생과 강좌 정보 결합 (매칭되는 행만)",
    "SELECT s.sid, s.sname, c.cname, e.score",
    "  FROM Enrollment e",
    "  JOIN Student s ON e.sid = s.sid   -- INNER JOIN 생략 가능",
    "  JOIN Course  c ON e.cid = c.cid",
    " WHERE e.semester = '2025-1'",
    " ORDER BY e.score DESC;",
])
pdf.sp(3)
pdf.h2("■ LEFT OUTER JOIN — 왼쪽 전체 보존")
pdf.code_block([
    "-- 수강 여부와 무관하게 모든 학생 표시 (미수강 시 score = NULL)",
    "SELECT s.sid, s.sname, c.cname, e.score",
    "  FROM Student s",
    "  LEFT JOIN Enrollment e ON s.sid = e.sid",
    "  LEFT JOIN Course     c ON e.cid = c.cid",
    " WHERE e.semester = '2025-1' OR e.semester IS NULL;",
])
pdf.sp(3)
pdf.h2("■ SELF JOIN — 같은 테이블끼리")
pdf.code_block([
    "-- 같은 학과 학생 쌍 (자기 자신 제외, 중복 방지)",
    "SELECT a.sname AS 학생A, b.sname AS 학생B, a.dept",
    "  FROM Student a",
    "  JOIN Student b ON a.dept = b.dept AND a.sid < b.sid",
    " ORDER BY a.dept, a.sname;",
])
pdf.sp(3)
pdf.h2("■ JOIN 종류 비교")
pdf.table(["JOIN 종류", "반환 행", "NULL 발생"],
[
    ["INNER JOIN",       "양쪽 모두 매칭 행만",            "없음"],
    ["LEFT OUTER JOIN",  "왼쪽 전체 + 오른쪽 매칭(없으면 NULL)", "오른쪽 컬럼에 NULL"],
    ["RIGHT OUTER JOIN", "오른쪽 전체 + 왼쪽 매칭(없으면 NULL)", "왼쪽 컬럼에 NULL"],
    ["SELF JOIN",        "같은 테이블 내 행 간 비교",       "조건에 따라 다름"],
], [38, 92, 40])

# ── 3. GROUP BY & HAVING
pdf.add_page(); pdf.set_y(14)
pdf.section_box("3. GROUP BY & HAVING — 그룹 통계")
pdf.h2("■ GROUP BY 기본")
pdf.body("GROUP BY는 지정 컬럼의 같은 값끼리 행을 묶어 집계 함수를 적용한다.")
pdf.sp(2)
pdf.code_block([
    "-- 학과별 학생 수와 평균 학년",
    "SELECT dept,",
    "       COUNT(*)       AS 학생수,",
    "       AVG(grade)     AS 평균학년,",
    "       MAX(grade)     AS 최고학년",
    "  FROM Student",
    " GROUP BY dept",
    " ORDER BY 학생수 DESC;",
])
pdf.sp(3)
pdf.h2("■ HAVING — 그룹 조건 필터")
pdf.code_block([
    "-- 2025-1학기, 수강자 5명 이상 강좌의 학과별 평균 점수",
    "SELECT c.dept,",
    "       c.cname,",
    "       COUNT(*)              AS 수강자수,",
    "       ROUND(AVG(e.score),1) AS 평균점수",
    "  FROM Enrollment e",
    "  JOIN Course c ON e.cid = c.cid",
    " WHERE e.semester = '2025-1'       -- 행 단위 필터 (집계 전)",
    " GROUP BY c.dept, c.cname",
    "HAVING COUNT(*) >= 5               -- 그룹 단위 필터 (집계 후)",
    " ORDER BY 평균점수 DESC;",
])
pdf.sp(2)
pdf.warn("WHERE는 GROUP BY 이전, HAVING은 GROUP BY 이후 실행 — 집계 조건은 반드시 HAVING에 작성.")
pdf.sp(3)
pdf.h2("■ MySQL Workbench 실습 흐름")
for step in [
    "상단 메뉴 File → New Query Tab (단축키 Ctrl+T)",
    "쿼리 작성 후 번개 아이콘(Execute) 또는 Ctrl+Shift+Enter 로 실행",
    "하단 Result Grid에서 결과 확인, Output 탭에서 실행 시간 확인",
    "쿼리 저장: File → Save SQL Script (Ctrl+S)",
]:
    pdf.bullet(step)

# ── 4. 서브쿼리
pdf.add_page(); pdf.set_y(14)
pdf.section_box("4. 서브쿼리 (Subquery)")
pdf.h2("■ WHERE 절 서브쿼리")
pdf.code_block([
    "-- 전체 평균 점수보다 높은 학생 조회",
    "SELECT s.sname, e.score",
    "  FROM Enrollment e",
    "  JOIN Student s ON e.sid = s.sid",
    " WHERE e.score > (",
    "         SELECT AVG(score)",
    "           FROM Enrollment",
    "          WHERE semester = '2025-1'",
    "       )",
    " ORDER BY e.score DESC;",
])
pdf.sp(3)
pdf.h2("■ FROM 절 서브쿼리 (인라인 뷰)")
pdf.code_block([
    "-- 학과별 평균 점수를 계산 후 80점 이상만 조회",
    "SELECT dept, avg_score",
    "  FROM (",
    "    SELECT c.dept, ROUND(AVG(e.score), 1) AS avg_score",
    "      FROM Enrollment e",
    "      JOIN Course c ON e.cid = c.cid",
    "     WHERE e.semester = '2025-1'",
    "     GROUP BY c.dept",
    "  ) AS dept_avg",
    " WHERE avg_score >= 80",
    " ORDER BY avg_score DESC;",
])
pdf.sp(3)
pdf.h2("■ JOIN vs 서브쿼리 선택 가이드라인")
pdf.table(["상황", "권장 방식", "이유"],
[
    ["여러 테이블의 컬럼을 함께 출력",     "JOIN",      "JOIN이 SELECT 절에서 다양한 컬럼 참조 용이"],
    ["집계 결과와 원본 행 비교",           "서브쿼리",  "스칼라 서브쿼리로 집계값을 단순 비교"],
    ["존재 여부만 확인 (출력 불필요)",      "EXISTS",    "EXISTS는 행 존재 확인 후 즉시 중단, 효율적"],
    ["같은 테이블 내 자기 참조",           "SELF JOIN", "서브쿼리로 가능하나 JOIN이 직관적"],
    ["복잡한 중간 집계가 필요한 경우",      "인라인 뷰","FROM 절 서브쿼리로 단계적 처리"],
], [52, 28, 90])
pdf.sp(2)
pdf.note("일반적으로 JOIN이 최적화가 잘 되어 있어 성능상 유리. 단, 쿼리 가독성·유지보수성도 중요한 선택 기준이다.")

# ── 5. 트랜잭션 & ACID
pdf.add_page(); pdf.set_y(14)
pdf.section_box("5. 트랜잭션 & ACID 속성")
pdf.h2("■ 트랜잭션이란?")
pdf.body(
    "트랜잭션(Transaction)은 데이터베이스에서 하나의 논리적 작업 단위로 처리되어야 하는 "
    "SQL 연산의 집합이다. '모두 성공하거나, 모두 실패'해야 하는 원자성이 핵심이다."
)
pdf.sp(2)
pdf.code_block([
    "-- 계좌 이체 트랜잭션 예시",
    "START TRANSACTION;",
    "",
    "UPDATE Account SET balance = balance - 100000 WHERE aid = 'A001';",
    "UPDATE Account SET balance = balance + 100000 WHERE aid = 'A002';",
    "",
    "-- 오류 없으면 확정",
    "COMMIT;",
    "",
    "-- 오류 발생 시 취소",
    "-- ROLLBACK;",
])
pdf.sp(3)
pdf.h2("■ ACID 속성")
pdf.table(["속성", "영문", "설명", "예시"],
[
    ["원자성", "Atomicity",   "트랜잭션 내 모든 연산이 전부 완료되거나 전혀 실행되지 않아야 함", "이체 중 오류 → 출금·입금 모두 취소"],
    ["일관성", "Consistency", "트랜잭션 전·후 데이터베이스가 정의된 무결성 제약을 만족해야 함", "잔액이 음수가 되는 이체는 허용 안 됨"],
    ["고립성", "Isolation",   "동시 실행 트랜잭션이 서로 영향을 주지 않아야 함 (격리 수준에 따라 정도 다름)", "다른 사용자의 미확정 변경이 보이지 않음"],
    ["영속성", "Durability",  "COMMIT된 트랜잭션 결과는 장애 발생 시에도 영구 보존됨", "시스템 크래시 후에도 COMMIT 데이터 복구"],
], [16, 22, 82, 50])

# ── 6. 격리 수준
pdf.add_page(); pdf.set_y(14)
pdf.section_box("6. 격리 수준 (Isolation Level)")
pdf.h2("■ 동시성 문제 유형")
pdf.table(["문제", "설명", "발생 시나리오"],
[
    ["Dirty Read",          "커밋되지 않은 데이터를 다른 트랜잭션이 읽음",                "T1이 수정 후 롤백, T2는 이미 수정된 값을 읽음"],
    ["Non-Repeatable Read", "같은 쿼리를 두 번 실행했을 때 결과가 다름",                 "T2가 COMMIT하는 사이 T1이 같은 행을 다시 읽으면 값 변경"],
    ["Phantom Read",        "범위 조회 시 처음과 두 번째 실행에서 행 수가 다름",          "T2가 INSERT/DELETE하는 사이 T1이 COUNT를 두 번 실행"],
], [36, 72, 62])
pdf.sp(3)
pdf.h2("■ 격리 수준 4단계")
pdf.table(["격리 수준", "Dirty Read", "Non-Repeatable", "Phantom Read", "성능(동시성)"],
[
    ["READ UNCOMMITTED", "발생",  "발생", "발생", "가장 높음"],
    ["READ COMMITTED",   "방지",  "발생", "발생", "높음"],
    ["REPEATABLE READ",  "방지",  "방지", "발생*","중간 (MySQL InnoDB 기본)"],
    ["SERIALIZABLE",     "방지",  "방지", "방지", "가장 낮음"],
], [38, 22, 28, 24, 28])
pdf.sp(2)
pdf.note("MySQL InnoDB의 REPEATABLE READ는 MVCC(다중 버전 동시성 제어)로 Phantom Read 대부분 방지. SERIALIZABLE과 사실상 유사.")
pdf.sp(3)
pdf.h2("■ 격리 수준 설정")
pdf.code_block([
    "-- 세션 수준으로 설정",
    "SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;",
    "",
    "-- 현재 격리 수준 확인",
    "SELECT @@transaction_isolation;",
])
pdf.sp(3)
pdf.h2("■ 격리 수준 선택 가이드")
pdf.table(["상황", "권장 격리 수준"],
[
    ["금융·은행 이체, 재고 관리 등 정확성이 최우선",   "SERIALIZABLE 또는 REPEATABLE READ"],
    ["일반 웹 서비스 — 약간의 불일치 허용, 성능 중요", "READ COMMITTED (MySQL 외 RDBMS 기본)"],
    ["읽기 전용 분석 쿼리, 성능 최우선",               "READ UNCOMMITTED (실무 희귀)"],
    ["MySQL InnoDB 일반 용도",                       "REPEATABLE READ (기본값 유지)"],
], [80, 90])

# ── 7. 실습 과제
pdf.add_page(); pdf.set_y(14)
pdf.section_box("7. 실습 과제")
pdf.body("MySQL Workbench에서 1주차에 생성한 4개 테이블(Student·Course·Enrollment·Professor)에 샘플 데이터를 INSERT 후 아래 쿼리를 작성하시오.")
pdf.sp(4)

pdf.h2("▶ JOIN (15점)")
for q in [
    "Q1. 2025-1학기에 'CS' 학과 강좌를 수강한 학생의 학번·이름·강좌명·점수를 점수 내림차순으로 조회하시오. (INNER JOIN)",
    "Q2. 수강 여부와 무관하게 모든 학생 목록과 수강한 강좌명·점수를 조회하시오. 수강하지 않은 학생은 강좌명과 점수를 NULL로 표시하시오. (LEFT JOIN)",
    "Q3. 같은 학과이면서 학년 차이가 2 이상인 학생 쌍(학생A, 학생B, 학과, 학년 차이)을 조회하시오. (SELF JOIN, 중복 쌍 제외)",
]:
    pdf.bullet(q)
pdf.sp(3)

pdf.h2("▶ GROUP BY & 서브쿼리 (20점)")
for q in [
    "Q4. 학과별 수강자 수와 평균 점수를 구하고, 수강자가 3명 이상인 학과만 평균 점수 내림차순으로 출력하시오. (GROUP BY + HAVING)",
    "Q5. 전체 수강생 평균 점수보다 높은 점수를 받은 학생의 이름·점수를 조회하시오. (서브쿼리)",
    "Q6. 각 강좌별 최고 점수와 최저 점수 차이(점수 범위)가 20점 이상인 강좌명을 조회하시오. (GROUP BY + HAVING + 집계 함수)",
]:
    pdf.bullet(q)
pdf.sp(4)
pdf.warn("제출: 다음 주 강의 시작 전까지 강의 포털 과제 게시판에 .sql 파일로 제출")

# ── 8. 핵심 요약
pdf.add_page(); pdf.set_y(14)
pdf.section_box("8. 핵심 개념 요약 & 자주 하는 실수")
pdf.h2("■ 이번 주 핵심 포인트")
for p in [
    "INNER JOIN: 매칭 행만. LEFT JOIN: 왼쪽 전체 + 오른쪽 NULL 가능",
    "GROUP BY 없이 집계 함수 + 일반 컬럼 혼용 → 오류 (또는 무작위 행)",
    "WHERE는 집계 전 필터, HAVING은 집계 후 필터 — WHERE에 집계 함수 불가",
    "서브쿼리 vs JOIN: 다중 컬럼 출력은 JOIN, 단순 비교는 서브쿼리·EXISTS",
    "ACID 원자성: COMMIT 전 오류 → ROLLBACK으로 원상 복구",
    "격리 수준이 낮을수록 동시성 높고, 높을수록 정확성 높음 (성능 trade-off)",
]:
    pdf.bullet(p)
pdf.sp(5)
pdf.h2("■ 자주 하는 실수 Top 5")
pdf.table(["#", "실수 패턴", "올바른 방법"],
[
    ["1", "LEFT JOIN을 INNER JOIN으로 잘못 작성 → NULL 행 누락",     "미수강 학생 포함 시 반드시 LEFT JOIN"],
    ["2", "GROUP BY 없이 SELECT sname, COUNT(*) 작성",              "SELECT 절 비집계 컬럼은 GROUP BY에 포함"],
    ["3", "WHERE COUNT(*) > 3 작성",                                "HAVING COUNT(*) > 3 — 집계 조건은 HAVING"],
    ["4", "서브쿼리 결과가 여러 행인데 = 사용",                       "= 대신 IN 사용. 단일 행 확신 시만 = 허용"],
    ["5", "START TRANSACTION 없이 실수로 UPDATE/DELETE",            "중요 DML 전 반드시 BEGIN/START TRANSACTION"],
], [8, 82, 80])
pdf.sp(5)
pdf.h2("■ 다음 주 예고 (3주차)")
for item in [
    "SELECT 논리적 실행 순서 — FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY",
    "WHERE 절 연산자 심화 — BETWEEN · IN · LIKE · IS NULL",
    "JOIN 심화 — FULL OUTER · CROSS · 복수 조인",
    "서브쿼리 심화 — NOT EXISTS · 상관 서브쿼리",
]:
    pdf.bullet(item)

pdf.sp(5); pdf.hr()
pdf.set_font("Malgun", "", 7.5); pdf.set_text_color(*GRAY); pdf.set_x(pdf.l_margin)
pdf.multi_cell(0, 4.5,
    "참고문헌: Silberschatz, A., Korth, H., & Sudarshan, S. (2019). "
    "Database System Concepts (7th ed.). McGraw-Hill. ISBN 978-0-07-802215-9.")

pdf.output(OUTPUT)
print(f"PDF 생성 완료: {os.path.abspath(OUTPUT)}")

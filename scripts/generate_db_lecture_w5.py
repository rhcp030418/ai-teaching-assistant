"""
데이터베이스 5주차 강의자료 PDF 생성 스크립트
주제: 트리거(Trigger)·인덱스(Index)·성능 최적화(EXPLAIN)
fpdf2 사용, 맑은 고딕 폰트
"""
import os
from fpdf import FPDF
from fpdf.enums import XPos, YPos

FONT_R = "C:/Windows/Fonts/malgun.ttf"
FONT_B = "C:/Windows/Fonts/malgunbd.ttf"
OUTPUT = os.path.join(os.path.dirname(__file__), "..", "uploads", "데이터베이스_5주차_강의자료.pdf")
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
        self.set_fill_color(*NAVY)
        self.rect(0, 0, 210, 10, "F")
        self.set_font("Malgun", "B", 8)
        self.set_text_color(*WHITE)
        self.set_xy(10, 1.5)
        self.cell(0, 7, "데이터베이스 — 5주차: 트리거(Trigger) · 인덱스(Index) · EXPLAIN", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*DKGRAY)

    def footer(self):
        if self.page_no() == 1:
            return
        self.set_y(-12)
        self.set_font("Malgun", "", 8)
        self.set_text_color(*GRAY)
        self.cell(0, 8, f"한성대학교 컴퓨터공학부  |  {self.page_no()-1}", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*DKGRAY)

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

    def body(self, text, indent=0):
        self.set_font("Malgun", "", 9.5)
        self.set_text_color(*DKGRAY)
        self.set_x(self.l_margin + indent)
        self.multi_cell(0, 5.5, text)

    def bullet(self, text, indent=6):
        self.set_font("Malgun", "", 9.5)
        self.set_text_color(*DKGRAY)
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
        self.line(self.l_margin, self.get_y(), 210 - self.r_margin, self.get_y())
        self.ln(3)

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

# ── 표지 ─────────────────────────────────────────────────────────────────────
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
pdf.cell(0, 8, "5주차: 트리거(Trigger) · 인덱스(Index) · 성능 최적화(EXPLAIN)", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

pdf.set_xy(20, 140); pdf.set_font("Malgun", "", 10); pdf.set_text_color(*LBLUE)
pdf.cell(0, 6, "담당교수: 김데이터  |  화 3~4교시  |  미래관 201호", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_fill_color(*WHITE); pdf.rect(0, 161, 210, 136, "F")

# ── 1. 강의 개요 ─────────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_top_margin(14); pdf.set_y(14)
pdf.section_box("1. 강의 개요 및 학습목표")
pdf.h2("■ 강의 정보")
pdf.table(["항목", "내용"], [
    ["강의명",   "데이터베이스 (Database Systems)"],
    ["주차",     "5주차  (2025. 4. 8.)"],
    ["주제",     "트리거(Trigger) · 인덱스(Index) · 성능 최적화(EXPLAIN)"],
    ["선수내용", "4주차: 뷰(View) / 저장 프로시저 / 저장 함수 / 커서"],
    ["참고교재", "Database System Concepts, 7th Ed. (Silberschatz 외), 5·9·11장"],
], [40, 130])
pdf.sp(2)
pdf.h2("■ 학습 목표")
for o in [
    "트리거의 정의와 용도를 설명하고 BEFORE/AFTER × INSERT/UPDATE/DELETE 조합을 구분한다.",
    "OLD/NEW 의사 레코드(pseudo-record)를 활용해 변경 전·후 값을 비교·기록하는 트리거를 작성한다.",
    "인덱스(Index)의 B-Tree 구조와 풀 테이블 스캔 vs 인덱스 스캔의 차이를 설명한다.",
    "CREATE INDEX / UNIQUE INDEX / 복합 인덱스를 상황에 맞게 생성하고 관리한다.",
    "EXPLAIN 실행 계획의 주요 컬럼(type · key · rows · Extra)을 해석하고 쿼리를 개선한다.",
    "인덱스가 사용되지 않는 패턴(함수 래핑 · LIKE '%...' · 암묵적 형 변환)을 이해하고 회피한다.",
]:
    pdf.bullet(o)

# ── 2. 트리거 개요 ────────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("2. 트리거 (Trigger) 개요")
pdf.h2("■ 트리거란?")
pdf.body(
    "트리거(Trigger)는 테이블에 DML 이벤트(INSERT·UPDATE·DELETE)가 발생할 때 "
    "DBMS가 자동으로 실행하는 저장 프로시저이다. 애플리케이션 코드 없이 DB 레벨에서 "
    "무결성 유지·감사 로그·파생 값 자동 계산 등을 처리할 수 있다."
)
pdf.sp(3)
pdf.h2("■ 트리거 타이밍 × 이벤트 조합")
pdf.table(["타이밍", "이벤트", "설명", "주요 용도"],
[
    ["BEFORE", "INSERT", "행 삽입 직전 실행",  "입력값 검증·변환, 기본값 설정"],
    ["BEFORE", "UPDATE", "행 수정 직전 실행",  "변경 허용 여부 검사"],
    ["BEFORE", "DELETE", "행 삭제 직전 실행",  "삭제 방어 로직 (소프트 삭제 전환)"],
    ["AFTER",  "INSERT", "행 삽입 완료 후 실행","감사 로그 기록, 집계 테이블 갱신"],
    ["AFTER",  "UPDATE", "행 수정 완료 후 실행","변경 이력 저장, 캐시 무효화"],
    ["AFTER",  "DELETE", "행 삭제 완료 후 실행","삭제 이력 보관, 참조 정리"],
], [18, 16, 46, 90])
pdf.sp(2)
pdf.note("MySQL 8.x은 FOR EACH STATEMENT 수준 트리거를 지원하지 않는다. 모든 트리거는 FOR EACH ROW(행 단위) 실행이다.")
pdf.sp(3)
pdf.h2("■ OLD / NEW 의사 레코드")
pdf.table(["상황", "OLD", "NEW"],
[
    ["INSERT", "없음 (NULL)", "삽입될 새 행의 값"],
    ["UPDATE", "수정 전 값",   "수정 후 값"],
    ["DELETE", "삭제된 행의 값", "없음 (NULL)"],
], [30, 74, 66])
pdf.sp(2)
pdf.body("BEFORE 트리거에서 NEW.컬럼 = 값 을 SET하면 실제로 저장되는 값을 바꿀 수 있다 (값 정규화에 활용).", indent=2)

# ── 3. 트리거 실전 예시 ───────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("3. 트리거 실전 예시")
pdf.h2("■ 예시 1: 점수 범위 검증 (BEFORE INSERT/UPDATE)")
pdf.code_block([
    "DELIMITER $$",
    "CREATE TRIGGER trg_score_check",
    "BEFORE INSERT ON Enrollment",
    "FOR EACH ROW",
    "BEGIN",
    "    IF NEW.score < 0 OR NEW.score > 100 THEN",
    "        SIGNAL SQLSTATE '45000'",
    "            SET MESSAGE_TEXT = '점수는 0~100 사이여야 합니다.';",
    "    END IF;",
    "END $$",
    "DELIMITER ;",
])
pdf.sp(2)
pdf.note("SIGNAL SQLSTATE '45000': 사용자 정의 오류를 발생시켜 INSERT를 중단. 호출 측에서 SQLEXCEPTION 핸들러로 처리 가능.")
pdf.sp(4)
pdf.h2("■ 예시 2: 감사 로그 자동 기록 (AFTER UPDATE)")
pdf.body("Enrollment 테이블의 점수가 변경될 때마다 변경 이력을 ScoreAudit 테이블에 자동 저장한다.", indent=2)
pdf.sp(2)
pdf.code_block([
    "-- 감사 테이블 (미리 생성 필요)",
    "CREATE TABLE ScoreAudit (",
    "    id         INT AUTO_INCREMENT PRIMARY KEY,",
    "    eid        INT,",
    "    old_score  INT,",
    "    new_score  INT,",
    "    changed_at DATETIME DEFAULT NOW()",
    ");",
    "",
    "DELIMITER $$",
    "CREATE TRIGGER trg_score_audit",
    "AFTER UPDATE ON Enrollment",
    "FOR EACH ROW",
    "BEGIN",
    "    IF OLD.score <> NEW.score THEN",
    "        INSERT INTO ScoreAudit(eid, old_score, new_score)",
    "        VALUES (NEW.eid, OLD.score, NEW.score);",
    "    END IF;",
    "END $$",
    "DELIMITER ;",
])
pdf.sp(4)
pdf.h2("■ 예시 3: 소프트 삭제 전환 (BEFORE DELETE)")
pdf.code_block([
    "-- Student 테이블에 is_deleted TINYINT DEFAULT 0 컬럼이 있다고 가정",
    "DELIMITER $$",
    "CREATE TRIGGER trg_soft_delete",
    "BEFORE DELETE ON Student",
    "FOR EACH ROW",
    "BEGIN",
    "    -- 실제 삭제 대신 플래그만 세우고 오류로 DELETE 중단",
    "    UPDATE Student SET is_deleted = 1 WHERE sid = OLD.sid;",
    "    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'soft-delete completed';",
    "END $$",
    "DELIMITER ;",
])
pdf.sp(2)
pdf.warn("트리거 내부에서 트리거가 걸린 테이블을 직접 수정하면 무한 재귀 위험 — 조건 분기로 반드시 탈출 보장 필요.")

# ── 4. 인덱스 개요 ────────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("4. 인덱스 (Index) 개요")
pdf.h2("■ 인덱스란?")
pdf.body(
    "인덱스(Index)는 테이블의 특정 컬럼 값을 정렬·구조화하여 빠르게 탐색할 수 있도록 "
    "별도로 관리하는 자료구조이다. MySQL InnoDB는 B-Tree 구조를 기본으로 사용하며, "
    "책의 '색인'처럼 원하는 행을 O(log n)에 찾아낸다."
)
pdf.sp(3)
pdf.h2("■ 풀 테이블 스캔 vs 인덱스 스캔")
pdf.table(["구분", "풀 테이블 스캔", "인덱스 스캔"],
[
    ["탐색 범위", "모든 행 순차 검색",      "B-Tree 경로로 해당 행만 접근"],
    ["시간복잡도","O(n)",                 "O(log n)"],
    ["유리한 경우","전체 행의 20% 이상 조회","선택도(selectivity) 높은 컬럼 조건"],
    ["불리한 경우","데이터 수 수백만 이상",  "카디널리티 낮은 컬럼(예: 성별)"],
    ["디스크 I/O", "많음",               "적음 (페이지 몇 개만 읽음)"],
], [30, 72, 68])
pdf.sp(3)
pdf.h2("■ CREATE INDEX 구문")
pdf.code_block([
    "-- 기본 인덱스",
    "CREATE INDEX idx_student_dept ON Student(dept);",
    "",
    "-- 유일 인덱스 (중복 값 불허 — UNIQUE 제약과 동일 효과)",
    "CREATE UNIQUE INDEX idx_student_email ON Student(email);",
    "",
    "-- 복합 인덱스: (dept, grade) 순서가 중요",
    "CREATE INDEX idx_dept_grade ON Student(dept, grade);",
    "",
    "-- 인덱스 삭제",
    "DROP INDEX idx_student_dept ON Student;",
    "",
    "-- 현재 테이블 인덱스 목록 확인",
    "SHOW INDEX FROM Student;",
])

# ── 5. 복합 인덱스 & 인덱스 미사용 패턴 ──────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("5. 복합 인덱스 & 인덱스가 사용되지 않는 패턴")
pdf.h2("■ 복합 인덱스 (Composite Index)")
pdf.body(
    "복합 인덱스는 여러 컬럼을 묶어 하나의 인덱스로 만든다. "
    "선두 컬럼(leftmost prefix)부터 순서대로 사용되어야 인덱스 효과가 있다."
)
pdf.sp(2)
pdf.table(["WHERE 조건", "idx_dept_grade(dept, grade) 사용 여부"],
[
    ["WHERE dept = 'CS'",                   "사용 (선두 컬럼)"],
    ["WHERE dept = 'CS' AND grade = 3",     "사용 (두 컬럼 모두)"],
    ["WHERE grade = 3",                     "미사용 (선두 컬럼 dept 빠짐)"],
    ["WHERE grade = 3 AND dept = 'CS'",     "사용 (옵티마이저가 순서 재배치)"],
], [80, 90])
pdf.sp(4)
pdf.h2("■ 인덱스가 사용되지 않는 대표 패턴")
pdf.table(["패턴", "예시", "해결책"],
[
    ["컬럼에 함수 적용",   "WHERE YEAR(created_at) = 2025",     "WHERE created_at BETWEEN '2025-01-01' AND '2025-12-31'"],
    ["앞쪽 와일드카드",    "WHERE name LIKE '%김'",              "LIKE '김%' 로 변경 또는 FULLTEXT 인덱스"],
    ["암묵적 형 변환",     "WHERE sid = 1001 (sid가 VARCHAR)", "WHERE sid = '1001' 로 타입 일치"],
    ["OR 조건 남용",       "WHERE dept='CS' OR dept='EE'",       "WHERE dept IN ('CS','EE')"],
    ["IS NULL 조건",       "WHERE email IS NULL",               "NULL 허용 컬럼은 인덱스 효율 낮음, 별도 컬럼 고려"],
], [34, 64, 72])
pdf.sp(2)
pdf.note("EXPLAIN으로 type 컬럼이 ALL이면 풀 스캔 — 인덱스 추가 또는 쿼리 재작성 필요.")

# ── 6. EXPLAIN 실행 계획 ─────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("6. EXPLAIN으로 실행 계획 분석")
pdf.h2("■ EXPLAIN 기본 사용법")
pdf.code_block([
    "EXPLAIN SELECT s.sname, e.score",
    "  FROM Enrollment e",
    "  JOIN Student s ON e.sid = s.sid",
    " WHERE s.dept = 'CS'",
    "   AND e.score >= 80;",
])
pdf.sp(3)
pdf.h2("■ EXPLAIN 주요 컬럼 해석")
pdf.table(["컬럼", "의미", "좋은 값 / 나쁜 값"],
[
    ["id",      "실행 순서 (높을수록 먼저 실행)",         "-"],
    ["type",    "접근 방식",                            "const/ref/range 좋음 | ALL/index 나쁨"],
    ["key",     "실제 사용된 인덱스 이름",               "NULL이면 인덱스 미사용"],
    ["key_len", "사용된 인덱스 바이트 수",               "복합 인덱스에서 일부만 사용되면 낮음"],
    ["rows",    "옵티마이저 예상 읽기 행 수",             "낮을수록 효율적"],
    ["Extra",   "추가 정보",                            "Using index 좋음 | Using filesort/temporary 나쁨"],
], [22, 54, 94])
pdf.sp(3)
pdf.h2("■ type 컬럼 값 해석 (빠른 순서)")
pdf.table(["type 값", "설명"],
[
    ["const",   "PK 또는 UNIQUE 키로 정확히 1행 접근 (가장 빠름)"],
    ["ref",     "인덱스를 사용해 동등 조건으로 여러 행 접근"],
    ["range",   "인덱스 범위 스캔 (BETWEEN·>·<·IN 등)"],
    ["index",   "인덱스 전체 스캔 (풀 스캔보다는 빠르지만 비효율)"],
    ["ALL",     "풀 테이블 스캔 (모든 행 읽음, 최악)"],
], [22, 148])
pdf.sp(3)
pdf.h2("■ 개선 전/후 비교 예시")
pdf.code_block([
    "-- 개선 전: dept에 함수 적용 → 풀 스캔 (type: ALL)",
    "SELECT * FROM Student WHERE UPPER(dept) = 'CS';",
    "",
    "-- 개선 후: 함수 제거 + 인덱스 생성 → ref 스캔",
    "CREATE INDEX idx_dept ON Student(dept);",
    "SELECT * FROM Student WHERE dept = 'CS';",
    "",
    "-- EXPLAIN으로 rows 차이 확인 (실습에서 직접 비교)",
    "EXPLAIN SELECT * FROM Student WHERE UPPER(dept) = 'CS';",
    "EXPLAIN SELECT * FROM Student WHERE dept = 'CS';",
])

# ── 7. 인덱스 관리 & ANALYZE ──────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("7. 인덱스 관리 & ANALYZE TABLE")
pdf.h2("■ 인덱스 관리 명령어")
pdf.table(["명령어", "설명"],
[
    ["SHOW INDEX FROM 테이블;",          "테이블의 인덱스 목록과 카디널리티 확인"],
    ["ANALYZE TABLE 테이블;",            "통계 정보 갱신 (옵티마이저 판단 정확도 향상)"],
    ["OPTIMIZE TABLE 테이블;",           "테이블 단편화 해소 및 인덱스 재구성"],
    ["ALTER TABLE 테이블 ADD INDEX ...", "기존 테이블에 인덱스 추가 (ALTER 방식)"],
    ["DROP INDEX 인덱스명 ON 테이블;",   "인덱스 삭제"],
    ["EXPLAIN ANALYZE 쿼리;",           "실제 실행 후 실측치 포함한 상세 계획 출력 (8.0.18+)"],
], [68, 102])
pdf.sp(3)
pdf.h2("■ 인덱스 설계 원칙")
for p in [
    "선택도(Selectivity)가 높은 컬럼 — 고유 값이 많을수록 인덱스 효과 큼 (예: email > gender)",
    "자주 WHERE·JOIN ON·ORDER BY에 쓰이는 컬럼 우선 고려",
    "복합 인덱스는 등호(=) 조건 컬럼을 앞에, 범위(BETWEEN·>) 조건 컬럼을 뒤에 배치",
    "인덱스가 많을수록 INSERT/UPDATE/DELETE 성능 저하 — 필요한 인덱스만 유지",
    "불필요한 인덱스는 EXPLAIN으로 미사용 확인 후 삭제",
]:
    pdf.bullet(p)
pdf.sp(3)
pdf.h2("■ 인덱스 유무 성능 비교 (실습 시연 재현)")
pdf.table(["조건", "rows(EXPLAIN 예상)", "실행 시간(100만 행 기준)"],
[
    ["인덱스 없음 — WHERE dept = 'CS'", "~1,000,000 (전체)", "약 0.8 ~ 1.2초"],
    ["인덱스 있음 — WHERE dept = 'CS'", "~120,000 (dept 비율)", "약 0.05 ~ 0.1초"],
    ["PK 조건   — WHERE sid = 'S0001'", "1 (const)",           "< 1ms"],
], [60, 56, 54])
pdf.sp(2)
pdf.note("실제 시간은 데이터 분포·하드웨어·버퍼 풀 크기에 따라 다름. EXPLAIN ANALYZE로 실측치 확인 권장.")

# ── 8. 실습 과제 ──────────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("8. 실습 과제")
pdf.body("3주차 실습 스키마(Student, Course, Enrollment, Professor)를 계속 사용한다. 실습 환경: MySQL 8.x (강의 포털 → DB Lab)")
pdf.sp(4)

pdf.h2("▶ 트리거 (20점)")
for q in [
    "Q1. Enrollment 테이블에 점수(score)가 0 미만이거나 100 초과인 값이 INSERT 또는 UPDATE될 때 SIGNAL로 오류를 발생시키는 BEFORE 트리거를 작성하시오.",
    "Q2. Enrollment 테이블의 score가 변경될 때만 변경 이력(eid, old_score, new_score, changed_at)을 ScoreAudit 테이블에 자동으로 기록하는 AFTER UPDATE 트리거를 작성하시오.",
    "Q3. Professor 테이블에서 행이 DELETE될 때, 해당 교수가 담당하는 Course 행의 prof_id를 NULL로 업데이트(고아 방지)하는 BEFORE DELETE 트리거를 작성하시오.",
]:
    pdf.bullet(q)
pdf.sp(3)

pdf.h2("▶ 인덱스 & EXPLAIN (15점)")
for q in [
    "Q4. Student 테이블의 dept 컬럼에 인덱스를 추가하고, 인덱스 추가 전/후의 EXPLAIN 결과(type, key, rows)를 비교하여 차이점을 설명하시오.",
    "Q5. Enrollment 테이블에서 WHERE score BETWEEN 80 AND 100 조건 쿼리의 EXPLAIN type이 ALL이 되는 이유를 설명하고, 인덱스를 추가해 range로 개선하시오.",
    "Q6. EXPLAIN 결과에서 Extra 컬럼에 'Using filesort'가 출력되는 쿼리를 하나 작성하고, ORDER BY에 맞는 인덱스를 추가해 filesort를 제거하시오.",
]:
    pdf.bullet(q)
pdf.sp(4)
pdf.warn("제출: 다음 주 강의 시작 전까지 강의 포털 과제 게시판에 .sql 파일로 제출")

# ── 9. 핵심 요약 ─────────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("9. 핵심 개념 요약 & 자주 하는 실수")
pdf.h2("■ 이번 주 핵심 포인트")
for p in [
    "트리거는 애플리케이션 코드 없이 DB 레벨에서 자동 실행 — 남용하면 디버깅 어려움",
    "BEFORE 트리거에서 NEW.컬럼 SET → 실제 저장 값 변경 가능",
    "OLD는 UPDATE/DELETE에만, NEW는 INSERT/UPDATE에만 존재",
    "인덱스는 탐색 속도를 높이지만 INSERT/UPDATE/DELETE 비용 증가",
    "EXPLAIN type: const > ref > range > index > ALL — ALL이면 인덱스 검토",
    "복합 인덱스는 선두 컬럼부터 순서대로 사용 (leftmost prefix 규칙)",
    "컬럼에 함수 적용 · 앞쪽 LIKE % · 형 변환은 인덱스 무력화",
]:
    pdf.bullet(p)
pdf.sp(5)

pdf.h2("■ 자주 하는 실수 Top 5")
pdf.table(["#", "실수 패턴", "올바른 방법"],
[
    ["1", "BEFORE INSERT에서 OLD 참조",          "INSERT에는 OLD 없음 — NEW만 사용"],
    ["2", "트리거 재귀 (트리거 내 같은 테이블 수정)", "조건 분기로 종료 보장 또는 설계 재검토"],
    ["3", "WHERE YEAR(col)=2025로 인덱스 기대",   "범위 조건 BETWEEN으로 변경"],
    ["4", "복합 인덱스 선두 컬럼 빠진 조건",       "WHERE 조건에 선두 컬럼 포함 또는 단독 인덱스 추가"],
    ["5", "ANALYZE TABLE 없이 통계 오래 방치",    "대량 데이터 변경 후 ANALYZE TABLE 실행"],
], [8, 82, 80])
pdf.sp(5)

pdf.h2("■ 다음 주 예고 (6주차)")
for item in [
    "NoSQL 개요 — 관계형 DB와 비교, CAP 정리",
    "MongoDB 기초 — 도큐먼트 모델, CRUD, 집계 파이프라인",
    "MongoDB Compass 실습",
]:
    pdf.bullet(item)

pdf.sp(5); pdf.hr()
pdf.set_font("Malgun", "", 7.5); pdf.set_text_color(*GRAY); pdf.set_x(pdf.l_margin)
pdf.multi_cell(0, 4.5,
    "참고문헌: Silberschatz, A., Korth, H., & Sudarshan, S. (2019). "
    "Database System Concepts (7th ed.). McGraw-Hill. ISBN 978-0-07-802215-9.")

pdf.output(OUTPUT)
print(f"PDF 생성 완료: {os.path.abspath(OUTPUT)}")

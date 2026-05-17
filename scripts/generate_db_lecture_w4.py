"""
데이터베이스 4주차 강의자료 PDF 생성 스크립트
주제: 뷰(View)와 저장 프로시저(Stored Procedure)
fpdf2 사용, 맑은 고딕 폰트
"""
import os
from fpdf import FPDF
from fpdf.enums import XPos, YPos, Align

FONT_R = "C:/Windows/Fonts/malgun.ttf"
FONT_B = "C:/Windows/Fonts/malgunbd.ttf"
OUTPUT = os.path.join(os.path.dirname(__file__), "..", "uploads", "데이터베이스_4주차_강의자료.pdf")
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
        self.cell(0, 7, "데이터베이스 — 4주차: 뷰(View)와 저장 프로시저(Stored Procedure)", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
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
        self.set_x(x0)
        self.cell(5, 5.5, "\x95" if False else "-")
        self.set_x(x0 + 5)
        self.multi_cell(0, 5.5, text)

    def note(self, text):
        self.set_font("Malgun", "", 8.5)
        self.set_text_color(*GREEN)
        self.set_x(self.l_margin + 4)
        self.multi_cell(0, 5, f"[참고] {text}")
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
            has_korean = any('가' <= c <= '힣' for c in line)
            self.set_font("Malgun" if has_korean else "Courier", "", 8.5)
            self.set_x(x0 + 4)
            self.cell(w - 8, 4.8, line, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(2)
        self.set_text_color(*DKGRAY)

    def table(self, headers, rows, col_ws):
        self.set_fill_color(*NAVY)
        self.set_text_color(*WHITE)
        self.set_font("Malgun", "B", 8.5)
        x0 = self.l_margin
        self.set_x(x0)
        for h, w in zip(headers, col_ws):
            self.cell(w, 7, f" {h}", border=1, fill=True)
        self.ln()
        toggle = False
        for row in rows:
            toggle = not toggle
            self.set_fill_color(*(LGRAY if toggle else WHITE))
            self.set_text_color(*DKGRAY)
            self.set_font("Malgun", "", 8.5)
            self.set_x(x0)
            max_h = 7
            for cell, w in zip(row, col_ws):
                lines_n = max(1, len(cell) // max(1, int(w / 2.5)))
                max_h = max(max_h, lines_n * 5)
            for cell, w in zip(row, col_ws):
                xi = self.get_x(); yi = self.get_y()
                self.multi_cell(w, 5, f" {cell}", border=1, fill=True, max_line_height=5)
                self.set_xy(xi + w, yi)
            self.ln(max_h)
        self.set_text_color(*DKGRAY)
        self.ln(2)


pdf = Lecture()

# ── 표지 ─────────────────────────────────────────────────────────────────────
pdf.add_page()
pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, 210, 160, "F")
pdf.set_fill_color(*BLUE)
pdf.rect(0, 155, 210, 6, "F")

pdf.set_xy(20, 38)
pdf.set_font("Malgun", "", 11)
pdf.set_text_color(*LBLUE)
pdf.cell(0, 7, "한성대학교 컴퓨터공학부", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_x(20); pdf.cell(0, 7, "2025학년도 1학기", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

pdf.set_xy(20, 70)
pdf.set_font("Malgun", "B", 30)
pdf.set_text_color(*WHITE)
pdf.cell(0, 14, "데이터베이스", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_x(20); pdf.set_font("Malgun", "", 14); pdf.set_text_color(*LBLUE)
pdf.cell(0, 9, "Database Systems", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

pdf.set_xy(20, 108)
pdf.set_font("Malgun", "B", 13); pdf.set_text_color(*WHITE)
pdf.cell(0, 8, "4주차: 뷰(View)와 저장 프로시저(Stored Procedure)", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

pdf.set_xy(20, 140)
pdf.set_font("Malgun", "", 10); pdf.set_text_color(*LBLUE)
pdf.cell(0, 6, "담당교수: 김데이터  |  화 3~4교시  |  미래관 201호", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

pdf.set_fill_color(*WHITE)
pdf.rect(0, 161, 210, 136, "F")

# ── 1. 강의 개요 ─────────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_top_margin(14); pdf.set_y(14)
pdf.section_box("1. 강의 개요 및 학습목표")
pdf.h2("■ 강의 정보")
pdf.table(
    ["항목", "내용"],
    [
        ["강의명",   "데이터베이스 (Database Systems)"],
        ["주차",     "4주차  (2025. 4. 1.)"],
        ["주제",     "뷰(View)와 저장 프로시저(Stored Procedure)"],
        ["선수내용", "3주차: SELECT 기초 / GROUP BY / JOIN / 서브쿼리"],
        ["참고교재", "Database System Concepts, 7th Ed. (Silberschatz 외), 5·9장"],
    ],
    [40, 130],
)
pdf.sp(2)
pdf.h2("■ 학습 목표")
for o in [
    "VIEW의 정의·장점·한계를 설명하고 CREATE/DROP/REPLACE VIEW 구문을 작성할 수 있다.",
    "업데이트 가능 뷰(Updatable View)와 읽기 전용 뷰의 차이를 이해하고 적절히 활용한다.",
    "VIEW와 서브쿼리(인라인 뷰)의 차이를 설명하고 상황에 맞게 선택할 수 있다.",
    "저장 프로시저(Stored Procedure)의 구조(DELIMITER·BEGIN·END·IN/OUT 매개변수)를 이해한다.",
    "IF/ELSEIF/ELSE, WHILE, LEAVE 등 흐름 제어 구문을 프로시저 내에서 활용한다.",
    "저장 함수(Stored Function)와 프로시저의 차이를 설명하고, 커서(CURSOR)의 기본 사용법을 익힌다.",
]:
    pdf.bullet(o)

# ── 2. 뷰(VIEW) 개요 ─────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("2. 뷰 (VIEW) 개요")
pdf.h2("■ 뷰란?")
pdf.body(
    "뷰(View)는 하나 이상의 테이블에서 SELECT 결과를 가상 테이블로 저장한 객체이다. "
    "실제 데이터를 복사하지 않고 쿼리 정의만 저장하므로, 매번 복잡한 JOIN·서브쿼리를 "
    "반복 작성하는 대신 뷰 이름 하나로 참조할 수 있다."
)
pdf.sp(3)
pdf.h2("■ 뷰의 장점과 한계")
pdf.table(
    ["구분", "내용"],
    [
        ["장점 — 단순성",    "복잡한 쿼리를 이름 하나로 추상화 → 가독성·재사용성 향상"],
        ["장점 — 보안",      "민감 컬럼(급여, 주민번호 등) 숨기고 필요 컬럼만 노출"],
        ["장점 — 독립성",    "테이블 구조가 바뀌어도 뷰 정의만 수정하면 클라이언트 코드 불변"],
        ["한계 — 성능",      "뷰는 매 조회 시 정의 쿼리를 실행 → 인덱스 활용 어려운 경우 있음"],
        ["한계 — 업데이트",  "집계·DISTINCT·JOIN 포함 뷰는 대부분 수정(INSERT/UPDATE) 불가"],
        ["한계 — 중첩",      "뷰 위에 뷰를 쌓으면 디버깅과 성능 추적이 복잡해짐"],
    ],
    [38, 132],
)
pdf.sp(3)
pdf.h2("■ CREATE / DROP / REPLACE VIEW")
pdf.code_block([
    "-- 기본 생성",
    "CREATE VIEW v_cs_students AS",
    "  SELECT s.sid, s.sname, s.grade, c.cname, e.score",
    "    FROM Student s",
    "    JOIN Enrollment e ON s.sid = e.sid",
    "    JOIN Course    c ON e.cid = c.cid",
    "   WHERE c.dept = 'CS' AND e.semester = '2025-1';",
    "",
    "-- 조회 (일반 테이블과 동일)",
    "SELECT * FROM v_cs_students WHERE grade >= 3 ORDER BY score DESC;",
    "",
    "-- 재정의 (DROP 없이 덮어쓰기)",
    "CREATE OR REPLACE VIEW v_cs_students AS ...",
    "",
    "-- 삭제",
    "DROP VIEW IF EXISTS v_cs_students;",
])
pdf.sp(2)
pdf.note("MySQL 8.x 기준: INFORMATION_SCHEMA.VIEWS 테이블에서 등록된 뷰 목록을 확인할 수 있다.")

# ── 3. 업데이트 가능 뷰 ───────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("3. 업데이트 가능 뷰 vs 읽기 전용 뷰")
pdf.h2("■ 업데이트 가능 조건")
pdf.body(
    "뷰를 통해 INSERT/UPDATE/DELETE가 가능하려면 뷰 정의가 아래 조건을 모두 만족해야 한다. "
    "조건 위반 시 DBMS는 오류를 반환한다."
)
pdf.sp(2)
pdf.table(
    ["조건", "설명"],
    [
        ["단일 기반 테이블",     "FROM 절에 테이블 하나만 사용 (JOIN 금지)"],
        ["집계 없음",            "GROUP BY, HAVING, DISTINCT, SUM/COUNT 등 집계 함수 금지"],
        ["서브쿼리 없음",        "SELECT 목록·WHERE 절에 서브쿼리 포함 금지"],
        ["UNION 없음",           "UNION / UNION ALL 금지"],
        ["모든 NOT NULL 컬럼 포함", "INSERT 시 NOT NULL 컬럼이 뷰에 있어야 함"],
    ],
    [44, 126],
)
pdf.sp(3)
pdf.h2("■ WITH CHECK OPTION")
pdf.body(
    "WITH CHECK OPTION을 추가하면 뷰를 통한 INSERT/UPDATE가 WHERE 조건을 위반할 경우 거부된다. "
    "뷰가 정의한 범위 밖의 데이터가 삽입되는 것을 방지하는 무결성 장치이다."
)
pdf.code_block([
    "CREATE VIEW v_high_scorers AS",
    "  SELECT sid, score FROM Enrollment",
    "   WHERE score >= 80",
    "  WITH CHECK OPTION;",
    "",
    "-- 아래 UPDATE는 score가 79가 되어 WHERE 조건 위반 → 오류 발생",
    "UPDATE v_high_scorers SET score = 79 WHERE sid = 'S001';",
])
pdf.sp(3)
pdf.h2("■ 뷰 vs 인라인 뷰(서브쿼리) 선택 기준")
pdf.table(
    ["기준", "VIEW 선택", "인라인 뷰(서브쿼리) 선택"],
    [
        ["재사용 빈도",   "여러 쿼리에서 반복 사용",      "해당 쿼리에서만 일회성 사용"],
        ["공유 범위",     "팀 전체가 공유",               "단일 개발자·단일 쿼리"],
        ["네이밍",        "의미 있는 이름 부여 가능",      "이름 불필요"],
        ["보안",          "민감 컬럼 숨기기 필요",         "보안 관리 불필요"],
        ["수정 용이성",   "별도로 관리/수정 가능",         "쿼리와 함께 수정"],
    ],
    [30, 64, 76],
)

# ── 4. 저장 프로시저 ──────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("4. 저장 프로시저 (Stored Procedure)")
pdf.h2("■ 저장 프로시저란?")
pdf.body(
    "저장 프로시저(Stored Procedure)는 데이터베이스 서버에 미리 컴파일하여 저장한 SQL 코드 블록이다. "
    "클라이언트는 이름과 매개변수만 전달하면 서버에서 실행되므로, "
    "네트워크 트래픽 감소·보안 강화·로직 재사용이 가능하다."
)
pdf.sp(3)
pdf.h2("■ 기본 구조")
pdf.code_block([
    "DELIMITER $$                    -- ; 대신 $$를 구문 종료자로 변경",
    "CREATE PROCEDURE 프로시저명 (",
    "    IN  param1  자료형,          -- 입력 매개변수",
    "    OUT param2  자료형,          -- 출력 매개변수",
    "    INOUT param3 자료형          -- 입출력 겸용",
    ")",
    "BEGIN",
    "    -- 지역 변수 선언 (반드시 BEGIN 직후)",
    "    DECLARE 변수명  자료형  DEFAULT 기본값;",
    "",
    "    -- SQL 로직",
    "    SELECT ...;",
    "    SET 변수명 = 값;",
    "END $$",
    "DELIMITER ;",
])
pdf.sp(3)
pdf.h2("■ 실전 예시: 학과별 평균 점수 계산 프로시저")
pdf.code_block([
    "DELIMITER $$",
    "CREATE PROCEDURE sp_dept_avg (",
    "    IN  p_dept    VARCHAR(20),",
    "    IN  p_sem     VARCHAR(10),",
    "    OUT p_avg     DECIMAL(5,2),",
    "    OUT p_cnt     INT",
    ")",
    "BEGIN",
    "    SELECT AVG(e.score), COUNT(*)",
    "      INTO p_avg, p_cnt",
    "      FROM Enrollment e",
    "      JOIN Course c ON e.cid = c.cid",
    "     WHERE c.dept = p_dept",
    "       AND e.semester = p_sem;",
    "END $$",
    "DELIMITER ;",
    "",
    "-- 호출",
    "CALL sp_dept_avg('CS', '2025-1', @avg, @cnt);",
    "SELECT @avg AS 평균점수, @cnt AS 수강자수;",
])

# ── 5. 흐름 제어 ─────────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("5. 흐름 제어 구문")
pdf.h2("■ IF / ELSEIF / ELSE")
pdf.code_block([
    "DELIMITER $$",
    "CREATE PROCEDURE sp_grade_label (IN p_score INT, OUT p_label VARCHAR(10))",
    "BEGIN",
    "    IF    p_score >= 90 THEN SET p_label = 'A';",
    "    ELSEIF p_score >= 80 THEN SET p_label = 'B';",
    "    ELSEIF p_score >= 70 THEN SET p_label = 'C';",
    "    ELSEIF p_score >= 60 THEN SET p_label = 'D';",
    "    ELSE                      SET p_label = 'F';",
    "    END IF;",
    "END $$",
    "DELIMITER ;",
])
pdf.sp(3)
pdf.h2("■ WHILE 루프")
pdf.code_block([
    "DELIMITER $$",
    "CREATE PROCEDURE sp_insert_dummy (IN p_count INT)",
    "BEGIN",
    "    DECLARE i INT DEFAULT 1;",
    "    WHILE i <= p_count DO",
    "        INSERT INTO TestLog(msg) VALUES (CONCAT('row-', i));",
    "        SET i = i + 1;",
    "    END WHILE;",
    "END $$",
    "DELIMITER ;",
])
pdf.sp(2)
pdf.warn("루프 내에서 INSERT/UPDATE가 많으면 트랜잭션으로 묶어 COMMIT 주기를 제어해야 성능 저하를 막을 수 있다.")
pdf.sp(3)
pdf.h2("■ LEAVE — 루프 조기 탈출")
pdf.code_block([
    "outer_loop: LOOP",
    "    IF 조건 THEN",
    "        LEAVE outer_loop;   -- 라벨을 붙여 중첩 루프도 탈출 가능",
    "    END IF;",
    "    -- ...",
    "END LOOP outer_loop;",
])
pdf.sp(3)
pdf.h2("■ 흐름 제어 구문 비교")
pdf.table(
    ["구문", "용도", "비고"],
    [
        ["IF / ELSEIF / ELSE", "조건 분기",               "CASE 문으로 대체 가능"],
        ["WHILE ... DO",       "조건 참인 동안 반복",      "ITERATE로 다음 반복으로 건너뜀"],
        ["REPEAT ... UNTIL",   "최소 1회 실행 후 조건 확인", "do-while 패턴"],
        ["LOOP ... LEAVE",     "무한 루프 + 명시적 탈출",   "LEAVE로만 빠져나옴"],
        ["LEAVE label",        "라벨 붙은 블록 탈출",       "중첩 루프 탈출에 유용"],
    ],
    [38, 54, 78],
)

# ── 6. 저장 함수 & 커서 ──────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("6. 저장 함수 & 커서 (Stored Function & CURSOR)")
pdf.h2("■ 저장 함수 vs 저장 프로시저")
pdf.table(
    ["구분", "저장 프로시저", "저장 함수"],
    [
        ["호출 방법",    "CALL sp_name()",       "SELECT fn_name() 또는 표현식 내"],
        ["반환값",       "OUT/INOUT 매개변수",   "RETURNS 선언으로 단일 값 반환"],
        ["DML 사용",     "INSERT/UPDATE/DELETE 가능", "읽기 전용 권장 (제한적)"],
        ["트랜잭션 제어","COMMIT/ROLLBACK 가능", "불가"],
        ["SELECT 사용",  "독립 실행",            "SELECT 절·WHERE 절에 삽입 가능"],
    ],
    [34, 66, 70],
)
pdf.sp(3)
pdf.h2("■ 저장 함수 예시: 학점 변환")
pdf.code_block([
    "DELIMITER $$",
    "CREATE FUNCTION fn_score_to_grade (p_score INT)",
    "RETURNS VARCHAR(2)",
    "DETERMINISTIC",
    "BEGIN",
    "    RETURN CASE",
    "        WHEN p_score >= 90 THEN 'A+'",
    "        WHEN p_score >= 85 THEN 'A0'",
    "        WHEN p_score >= 80 THEN 'B+'",
    "        WHEN p_score >= 75 THEN 'B0'",
    "        WHEN p_score >= 70 THEN 'C+'",
    "        ELSE 'F'",
    "    END;",
    "END $$",
    "DELIMITER ;",
    "",
    "-- SELECT 절에서 바로 사용",
    "SELECT sname, score, fn_score_to_grade(score) AS 학점",
    "  FROM Enrollment JOIN Student USING(sid);",
])
pdf.sp(4)
pdf.h2("■ 커서(CURSOR) 기초")
pdf.body(
    "커서는 SELECT 결과 집합을 행 단위로 순회할 때 사용한다. "
    "집합 연산으로 처리할 수 없는 행별 로직이 필요할 때만 사용을 권장한다."
)
pdf.sp(2)
pdf.code_block([
    "DELIMITER $$",
    "CREATE PROCEDURE sp_cursor_demo()",
    "BEGIN",
    "    DECLARE v_done  INT DEFAULT FALSE;",
    "    DECLARE v_sid   VARCHAR(20);",
    "    DECLARE v_score INT;",
    "",
    "    -- 1. 커서 선언",
    "    DECLARE cur CURSOR FOR",
    "        SELECT sid, score FROM Enrollment WHERE semester = '2025-1';",
    "",
    "    -- 2. NOT FOUND 핸들러 (행 소진 시 종료 플래그)",
    "    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;",
    "",
    "    OPEN cur;                           -- 3. 열기",
    "    read_loop: LOOP",
    "        FETCH cur INTO v_sid, v_score;  -- 4. 한 행씩 가져오기",
    "        IF v_done THEN LEAVE read_loop; END IF;",
    "        -- 행별 처리 로직",
    "    END LOOP;",
    "    CLOSE cur;                          -- 5. 닫기",
    "END $$",
    "DELIMITER ;",
])
pdf.sp(2)
pdf.warn("커서는 행 단위 처리라 집합 연산보다 느리다. GROUP BY·JOIN으로 해결 가능한 경우 커서 대신 집합 연산을 사용한다.")

# ── 7. 디버깅 & 관리 ─────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("7. 프로시저/뷰 디버깅 & 관리")
pdf.h2("■ 오류 확인 명령어")
pdf.table(
    ["명령어", "설명"],
    [
        ["SHOW ERRORS;",            "가장 최근 오류 목록 확인"],
        ["SHOW WARNINGS;",          "경고 포함 메시지 목록 확인"],
        ["SHOW CREATE PROCEDURE sp_name;", "프로시저 정의 SQL 출력"],
        ["SHOW CREATE VIEW v_name;",       "뷰 정의 SQL 출력"],
        ["SHOW PROCEDURE STATUS LIKE 'sp_%';", "이름 패턴으로 프로시저 목록 조회"],
        ["DROP PROCEDURE IF EXISTS sp_name;",  "안전하게 삭제 (존재 여부 무관)"],
    ],
    [78, 92],
)
pdf.sp(3)
pdf.h2("■ 트랜잭션과 프로시저 조합")
pdf.code_block([
    "DELIMITER $$",
    "CREATE PROCEDURE sp_transfer (",
    "    IN p_from VARCHAR(20),",
    "    IN p_to   VARCHAR(20),",
    "    IN p_amt  DECIMAL(10,2)",
    ")",
    "BEGIN",
    "    DECLARE EXIT HANDLER FOR SQLEXCEPTION",
    "    BEGIN",
    "        ROLLBACK;",
    "        RESIGNAL;          -- 오류를 호출자에게 재전파",
    "    END;",
    "",
    "    START TRANSACTION;",
    "    UPDATE Account SET balance = balance - p_amt WHERE aid = p_from;",
    "    UPDATE Account SET balance = balance + p_amt WHERE aid = p_to;",
    "    COMMIT;",
    "END $$",
    "DELIMITER ;",
])
pdf.sp(2)
pdf.note("DECLARE EXIT HANDLER FOR SQLEXCEPTION: 런타임 오류 발생 시 자동으로 ROLLBACK하는 패턴 — 실무 필수")

# ── 8. 실습 과제 ──────────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("8. 실습 과제")
pdf.body(
    "3주차 실습 스키마(Student, Course, Enrollment, Professor)를 계속 사용한다. "
    "실습 환경: MySQL 8.x (강의 포털 → DB Lab 접속)"
)
pdf.sp(4)

pdf.h2("▶ 뷰 실습 (15점)")
for q in [
    "Q1. CS 학과 수강 학생의 학번·이름·강좌명·점수를 보여주는 v_cs_enrollment 뷰를 만드시오. (3주차 스키마 기준)",
    "Q2. Q1 뷰에 WITH CHECK OPTION을 추가하고, CS가 아닌 학과 데이터를 뷰로 INSERT 시도했을 때 어떤 오류가 발생하는지 확인하시오.",
    "Q3. 교수별 담당 강좌 수와 담당 학생 수(중복 제거)를 보여주는 v_prof_summary 뷰를 만드시오. 이 뷰가 업데이트 가능한지 이유를 설명하시오.",
]:
    pdf.bullet(q)
pdf.sp(3)

pdf.h2("▶ 저장 프로시저 실습 (20점)")
for q in [
    "Q4. 학번(IN)과 학기(IN)를 입력받아, 해당 학생의 수강 과목 수(OUT)와 평균 점수(OUT)를 반환하는 sp_student_summary 프로시저를 작성하시오.",
    "Q5. 점수를 입력받아 'A+/A0/B+/B0/C+/C0/D/F' 학점 문자열을 반환하는 fn_grade 저장 함수를 작성하고, Enrollment 테이블 조회 시 SELECT 절에서 호출하시오.",
    "Q6. 커서를 사용해 CS 학과 수강생 전체를 순회하면서, 점수가 60 미만인 학생을 FailLog 테이블(sid, score, logged_at)에 INSERT하는 sp_log_failures 프로시저를 작성하시오.",
]:
    pdf.bullet(q)
pdf.sp(4)
pdf.warn("제출: 다음 주 강의 시작 전까지 강의 포털 과제 게시판에 .sql 파일로 제출")

# ── 9. 핵심 요약 ─────────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("9. 핵심 개념 요약 & 자주 하는 실수")
pdf.h2("■ 이번 주 핵심 포인트")
for p in [
    "뷰는 실제 데이터를 복사하지 않는다 — 매 조회마다 정의 쿼리를 실행",
    "JOIN·집계 포함 뷰는 읽기 전용 → INSERT/UPDATE 시도 시 오류",
    "WITH CHECK OPTION은 뷰 조건 범위 밖 INSERT/UPDATE를 차단하는 무결성 장치",
    "DELIMITER 변경은 프로시저 안의 ;와 종료 ;를 구분하기 위한 필수 절차",
    "IN/OUT/INOUT 매개변수 방향을 정확히 선언해야 호출 결과가 올바르게 반환됨",
    "커서는 행 단위 처리 — 집합 연산으로 해결 가능하면 커서보다 JOIN/GROUP BY가 빠름",
    "프로시저 내 SQLEXCEPTION 핸들러 + ROLLBACK 패턴은 실무 트랜잭션의 기본",
]:
    pdf.bullet(p)
pdf.sp(5)

pdf.h2("■ 자주 하는 실수 Top 5")
pdf.table(
    ["#", "실수 패턴", "올바른 방법"],
    [
        ["1", "JOIN 뷰에 UPDATE/INSERT 시도",          "집계·JOIN 없는 단일 테이블 뷰에서만 DML"],
        ["2", "DELIMITER 변경 없이 프로시저 작성",     "BEGIN~END 안에 ;가 있으면 반드시 DELIMITER $$ 사용"],
        ["3", "DECLARE를 BEGIN 중간에 선언",            "DECLARE는 반드시 BEGIN 블록의 맨 앞에 위치"],
        ["4", "커서 닫기(CLOSE) 누락",                 "사용 후 반드시 CLOSE cur 호출"],
        ["5", "OUT 매개변수에 값 넣지 않고 반환",       "프로시저에서 SET p_out = 값 으로 명시 할당 필요"],
    ],
    [8, 82, 80],
)
pdf.sp(5)

pdf.h2("■ 다음 주 예고 (5주차)")
for item in [
    "트리거(Trigger) — BEFORE/AFTER × INSERT/UPDATE/DELETE 조합",
    "인덱스(Index) 심화 — B-Tree 구조, EXPLAIN으로 실행 계획 분석",
    "성능 최적화 — 쿼리 튜닝 기초, ANALYZE TABLE",
]:
    pdf.bullet(item)

pdf.sp(5); pdf.hr()
pdf.set_font("Malgun", "", 7.5)
pdf.set_text_color(*GRAY)
pdf.set_x(pdf.l_margin)
pdf.multi_cell(0, 4.5,
    "참고문헌: Silberschatz, A., Korth, H., & Sudarshan, S. (2019). "
    "Database System Concepts (7th ed.). McGraw-Hill. ISBN 978-0-07-802215-9.")

pdf.output(OUTPUT)
print(f"PDF 생성 완료: {os.path.abspath(OUTPUT)}")

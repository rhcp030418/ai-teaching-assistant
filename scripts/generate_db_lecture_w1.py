"""
데이터베이스 1주차 강의자료 PDF 생성 스크립트
주제: 관계형 DB 개요 · 관계형 데이터 모델 · ER 다이어그램 · 기초 DDL
fpdf2 사용, 맑은 고딕 폰트
"""
import os
from fpdf import FPDF
from fpdf.enums import XPos, YPos

FONT_R = "C:/Windows/Fonts/malgun.ttf"
FONT_B = "C:/Windows/Fonts/malgunbd.ttf"
OUTPUT = os.path.join(os.path.dirname(__file__), "..", "uploads", "데이터베이스_1주차_강의자료.pdf")
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
        self.cell(0, 7, "데이터베이스 — 1주차: 관계형 DB 개요 · ER 다이어그램 · 기초 DDL", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
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
pdf.cell(0, 8, "1주차: 관계형 DB 개요 · ER 다이어그램 · 기초 DDL", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_xy(20, 140); pdf.set_font("Malgun", "", 10); pdf.set_text_color(*LBLUE)
pdf.cell(0, 6, "담당교수: 김데이터  |  화 3~4교시  |  미래관 201호", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_fill_color(*WHITE); pdf.rect(0, 161, 210, 136, "F")

# ── 1. 강의 개요
pdf.add_page(); pdf.set_top_margin(14); pdf.set_y(14)
pdf.section_box("1. 강의 개요 및 학습목표")
pdf.h2("■ 강의 정보")
pdf.table(["항목", "내용"], [
    ["강의명",   "데이터베이스 (Database Systems)"],
    ["주차",     "1주차  (2025. 3. 4.) — 오리엔테이션 + 기초 개념"],
    ["주제",     "관계형 DB 개요 · 관계형 데이터 모델 · ER 다이어그램 · 기초 DDL"],
    ["참고교재", "Database System Concepts, 7th Ed. (Silberschatz 외), 1·2·6장"],
    ["실습 환경", "MySQL 8.x — 강의 포털 DB Lab 또는 로컬 설치"],
], [40, 130])
pdf.sp(2)
pdf.h2("■ 학습 목표")
for o in [
    "데이터베이스와 DBMS의 역할을 파일 시스템과 비교해 설명할 수 있다.",
    "관계형 데이터 모델의 핵심 개념(릴레이션, 속성, 튜플, 도메인, 키)을 정의한다.",
    "ER 다이어그램의 엔티티·속성·관계·카디널리티를 표기하고 읽을 수 있다.",
    "ERD를 관계형 스키마(테이블)로 변환하는 규칙을 적용한다.",
    "CREATE TABLE·PRIMARY KEY·FOREIGN KEY·NOT NULL 등 기초 DDL을 작성한다.",
    "제1정규형(1NF)의 조건을 이해하고 비정규 테이블을 1NF로 변환한다.",
]:
    pdf.bullet(o)

# ── 2. DBMS 개요
pdf.add_page(); pdf.set_y(14)
pdf.section_box("2. 데이터베이스와 DBMS 개요")
pdf.h2("■ 파일 시스템 vs DBMS")
pdf.table(["비교 항목", "파일 시스템", "DBMS"],
[
    ["데이터 중복",   "파일마다 독립 저장 → 중복 심함",    "중앙 관리 → 중복 최소화"],
    ["데이터 일관성", "수정 시 모든 파일 수동 동기화",      "트랜잭션으로 자동 보장"],
    ["동시 접근",     "충돌·손상 위험",                   "잠금(Lock) 메커니즘 내장"],
    ["보안·권한",     "OS 파일 권한에 의존",               "사용자/역할 기반 접근 제어"],
    ["질의 언어",     "직접 파싱 코드 작성",               "SQL로 선언적 질의"],
    ["장애 복구",     "직접 구현 필요",                   "로그·체크포인트 자동 복구"],
], [34, 76, 60])
pdf.sp(3)
pdf.h2("■ 주요 RDBMS 비교")
pdf.table(["제품", "라이선스", "특징", "주요 사용처"],
[
    ["MySQL 8.x",     "오픈소스(GPL)",  "웹 서비스에 최적화, InnoDB 엔진",    "웹 애플리케이션, WordPress"],
    ["PostgreSQL 16", "오픈소스(MIT)",  "표준 SQL 준수, 확장성, JSON 지원",   "데이터 분석, 복잡한 쿼리"],
    ["Oracle 21c",    "상용",          "엔터프라이즈급 성능·보안·가용성",     "금융, 대기업 ERP"],
    ["SQL Server",    "상용",          "Windows 생태계 최적화, BI 통합",     "MS 환경 기업 시스템"],
    ["SQLite 3",      "퍼블릭 도메인", "파일 기반, 설치 불필요, 경량",        "모바일, 임베디드, 프로토타입"],
], [28, 28, 54, 60])
pdf.sp(3)
pdf.h2("■ 3단계 스키마 구조")
for item in [
    "외부 스키마 (External Schema): 사용자·애플리케이션이 보는 뷰(View) 수준",
    "개념 스키마 (Conceptual Schema): 전체 데이터 구조의 논리적 정의 — DBA가 관리",
    "내부 스키마 (Internal Schema): 실제 저장 방식 (파일·인덱스·블록) — DBMS가 관리",
]:
    pdf.bullet(item)
pdf.sp(2)
pdf.note("데이터 독립성: 내부 스키마 변경 시 개념 스키마·외부 스키마 불변 (물리적 독립성), 개념 스키마 변경 시 외부 스키마 불변 (논리적 독립성)")

# ── 3. 관계형 데이터 모델
pdf.add_page(); pdf.set_y(14)
pdf.section_box("3. 관계형 데이터 모델")
pdf.h2("■ 핵심 용어")
pdf.table(["용어", "관계형 모델 명칭", "SQL 대응", "설명"],
[
    ["Relation(릴레이션)", "Relation",  "Table",  "행과 열로 구성된 2차원 구조"],
    ["Tuple(튜플)",       "Tuple",     "Row(행)", "릴레이션의 한 레코드"],
    ["Attribute(속성)",   "Attribute", "Column(열)", "튜플의 각 구성 요소"],
    ["Domain(도메인)",    "Domain",    "Data Type", "속성이 가질 수 있는 값의 집합"],
    ["Degree(차수)",      "Degree",    "Column 수", "속성의 개수"],
    ["Cardinality(기수)", "Cardinality","Row 수",   "튜플의 개수"],
], [34, 26, 24, 86])
pdf.sp(3)
pdf.h2("■ 키(Key)의 종류")
pdf.table(["키 종류", "정의", "예시"],
[
    ["슈퍼키 (Super Key)",      "튜플을 유일하게 식별하는 속성 집합 (중복 가능)",        "{학번}, {학번, 이름}"],
    ["후보키 (Candidate Key)",  "슈퍼키 중 최소 속성만 포함 (중복 없음)",               "{학번}, {이메일}"],
    ["기본키 (Primary Key)",    "후보키 중 DBA가 선택한 키 — NULL 불허·유일",           "학번"],
    ["대리키 (Surrogate Key)",  "의미 없는 일련번호 — 자연키 대신 사용",                "AUTO_INCREMENT id"],
    ["외래키 (Foreign Key)",    "다른 릴레이션의 기본키를 참조하는 속성",                "수강.학번 → 학생.학번"],
    ["복합키 (Composite Key)",  "두 개 이상 속성의 조합으로 기본키 역할",               "(학번, 강좌코드)"],
], [34, 74, 62])
pdf.sp(3)
pdf.h2("■ 무결성 제약조건")
for c in [
    "개체 무결성 (Entity Integrity): 기본키는 NULL이 될 수 없다.",
    "참조 무결성 (Referential Integrity): 외래키 값은 참조 테이블의 기본키에 존재하거나 NULL이어야 한다.",
    "도메인 무결성 (Domain Integrity): 속성 값은 정해진 도메인(자료형·범위·형식) 안에 있어야 한다.",
]:
    pdf.bullet(c)

# ── 4. ER 다이어그램
pdf.add_page(); pdf.set_y(14)
pdf.section_box("4. ER 다이어그램 (Entity-Relationship Diagram)")
pdf.h2("■ ERD 표기 요소")
pdf.table(["요소", "표기법(Chen)", "설명"],
[
    ["엔티티 (Entity)",       "사각형",              "독립적으로 존재하는 현실 세계의 객체 (예: 학생, 강좌)"],
    ["약한 엔티티 (Weak)",    "이중 사각형",          "기본키가 없고 오너 엔티티에 의존 (예: 가족구성원)"],
    ["속성 (Attribute)",      "타원",                "엔티티의 특성 (예: 학번, 이름)"],
    ["기본키 속성",           "밑줄 타원",            "타원 안 텍스트에 밑줄"],
    ["다중값 속성",           "이중 타원",            "하나의 인스턴스가 여러 값 가능 (예: 전화번호)"],
    ["관계 (Relationship)",   "마름모",              "엔티티 간의 연관 (예: 수강)"],
    ["카디널리티",            "1, N, M 표기",        "관계의 참여 수 (1:1, 1:N, M:N)"],
], [32, 28, 110])
pdf.sp(3)
pdf.h2("■ 카디널리티 유형")
pdf.table(["유형", "예시", "의미"],
[
    ["1 : 1", "사원 — 주차 공간",       "한 사원은 하나의 주차 공간만, 역도 동일"],
    ["1 : N", "교수 — 강좌",           "한 교수는 여러 강좌 담당, 강좌는 교수 한 명"],
    ["M : N", "학생 — 강좌 (수강)",    "학생은 여러 강좌, 강좌도 여러 학생 — 교차 테이블 필요"],
], [16, 40, 114])
pdf.sp(3)
pdf.h2("■ ERD → 릴레이션 스키마 변환 규칙")
for r in [
    "강한 엔티티 → 테이블 (모든 속성을 컬럼으로, 기본키 지정)",
    "1:N 관계 → N쪽 테이블에 1쪽 기본키를 외래키로 추가",
    "M:N 관계 → 교차 테이블(Association Table) 별도 생성, 양쪽 기본키를 복합 기본키로",
    "1:1 관계 → 한쪽 테이블에 외래키 추가 (필수 참여 쪽에 배치 권장)",
    "다중값 속성 → 별도 테이블로 분리 (원래 엔티티 기본키를 외래키로)",
]:
    pdf.bullet(r)

# ── 5. 기초 DDL
pdf.add_page(); pdf.set_y(14)
pdf.section_box("5. 기초 DDL (Data Definition Language)")
pdf.h2("■ MySQL 주요 자료형")
pdf.table(["분류", "자료형", "설명"],
[
    ["정수",   "INT, BIGINT, TINYINT",       "4B / 8B / 1B 정수. 학번·나이·플래그에 사용"],
    ["실수",   "DECIMAL(p,s), FLOAT, DOUBLE","DECIMAL: 정밀 고정소수 (금액). FLOAT/DOUBLE: 부동소수"],
    ["문자",   "CHAR(n), VARCHAR(n)",         "CHAR: 고정 길이. VARCHAR: 가변 길이 (최대 65535B)"],
    ["날짜",   "DATE, DATETIME, TIMESTAMP",   "DATE: YYYY-MM-DD. DATETIME: 날짜+시간. TIMESTAMP: UTC 저장"],
    ["불리언", "TINYINT(1) / BOOLEAN",        "MySQL에서 BOOLEAN은 TINYINT(1)의 별칭"],
    ["텍스트", "TEXT, MEDIUMTEXT, LONGTEXT",  "긴 문자열 — 인덱스 제한 있음"],
], [16, 42, 112])
pdf.sp(3)
pdf.h2("■ CREATE TABLE — 학생·강좌·수강 스키마")
pdf.code_block([
    "CREATE TABLE Professor (",
    "    pid       VARCHAR(10)  NOT NULL,",
    "    pname     VARCHAR(30)  NOT NULL,",
    "    dept      VARCHAR(20)  NOT NULL,",
    "    hire_year YEAR,",
    "    PRIMARY KEY (pid)",
    ");",
    "",
    "CREATE TABLE Course (",
    "    cid     VARCHAR(10)  NOT NULL,",
    "    cname   VARCHAR(50)  NOT NULL,",
    "    credit  TINYINT      NOT NULL DEFAULT 3,",
    "    dept    VARCHAR(20)  NOT NULL,",
    "    prof_id VARCHAR(10),",
    "    PRIMARY KEY (cid),",
    "    FOREIGN KEY (prof_id) REFERENCES Professor(pid)",
    "        ON DELETE SET NULL",
    "        ON UPDATE CASCADE",
    ");",
    "",
    "CREATE TABLE Student (",
    "    sid    VARCHAR(10)  NOT NULL,",
    "    sname  VARCHAR(30)  NOT NULL,",
    "    dept   VARCHAR(20)  NOT NULL,",
    "    grade  TINYINT      NOT NULL CHECK (grade BETWEEN 1 AND 4),",
    "    email  VARCHAR(100) UNIQUE,",
    "    PRIMARY KEY (sid)",
    ");",
    "",
    "CREATE TABLE Enrollment (",
    "    eid      INT          NOT NULL AUTO_INCREMENT,",
    "    sid      VARCHAR(10)  NOT NULL,",
    "    cid      VARCHAR(10)  NOT NULL,",
    "    semester VARCHAR(10)  NOT NULL,",
    "    score    TINYINT      CHECK (score BETWEEN 0 AND 100),",
    "    PRIMARY KEY (eid),",
    "    FOREIGN KEY (sid) REFERENCES Student(sid) ON DELETE CASCADE,",
    "    FOREIGN KEY (cid) REFERENCES Course(cid)  ON DELETE CASCADE",
    ");",
])
pdf.sp(2)
pdf.note("ON DELETE CASCADE: 부모 행 삭제 시 자식 행 자동 삭제. ON DELETE SET NULL: 자식 외래키를 NULL로 설정.")

# ── 6. 제1정규형(1NF)
pdf.add_page(); pdf.set_y(14)
pdf.section_box("6. 정규화 입문 — 제1정규형 (1NF)")
pdf.h2("■ 정규화란?")
pdf.body(
    "정규화(Normalization)는 데이터 중복과 이상(Anomaly)을 줄이기 위해 "
    "릴레이션을 분해하는 과정이다. 이상에는 삽입 이상·삭제 이상·갱신 이상이 있다."
)
pdf.sp(3)
pdf.h2("■ 제1정규형 조건")
for c in [
    "모든 속성의 도메인이 원자값(Atomic Value)이어야 한다.",
    "반복 그룹(Repeating Group)이 없어야 한다 — 다중값 속성 금지.",
    "각 행을 유일하게 식별하는 기본키가 존재해야 한다.",
]:
    pdf.bullet(c)
pdf.sp(3)
pdf.h2("■ 비정규 → 1NF 변환 예시")
pdf.body("비정규 테이블: 수강 과목이 하나의 셀에 여러 값으로 저장된 경우", indent=2)
pdf.sp(2)
pdf.table(["학번", "이름", "수강과목 (비정규)"],
[
    ["S001", "홍길동", "데이터베이스, 알고리즘, 운영체제"],
    ["S002", "김철수", "데이터베이스, 자료구조"],
], [20, 24, 126])
pdf.sp(2)
pdf.body("1NF 변환: 다중값 속성을 행으로 분리 + 복합 기본키 설정", indent=2)
pdf.sp(2)
pdf.table(["학번 (PK)", "이름", "수강과목 (PK)"],
[
    ["S001", "홍길동", "데이터베이스"],
    ["S001", "홍길동", "알고리즘"],
    ["S001", "홍길동", "운영체제"],
    ["S002", "김철수", "데이터베이스"],
    ["S002", "김철수", "자료구조"],
], [24, 24, 122])
pdf.sp(2)
pdf.warn("1NF는 필요조건이지 충분조건이 아니다. 이름 중복(갱신 이상) 문제는 2NF·3NF까지 진행해야 해결된다.")

# ── 7. 실습 과제
pdf.add_page(); pdf.set_y(14)
pdf.section_box("7. 실습 과제")
pdf.body("실습 환경: MySQL 8.x (강의 포털 → DB Lab 접속). 위에서 정의한 4개 테이블 스키마를 직접 생성한다.")
pdf.sp(4)

pdf.h2("▶ ERD (10점)")
for q in [
    "Q1. 아래 요구사항을 ER 다이어그램으로 표현하시오 (Chen 표기법). 엔티티·속성·관계·카디널리티 모두 명시할 것.\n      요구사항: 학생(학번·이름·학과·학년)은 여러 강좌를 수강(학기·점수)할 수 있고, 강좌(강좌코드·강좌명·학점)는 교수(교번·이름·학과)가 담당한다.",
    "Q2. Q1의 ERD를 관계형 스키마(테이블 이름과 컬럼 목록)로 변환하시오. 기본키·외래키를 명시하고 M:N 관계 처리 방식을 설명하시오.",
]:
    pdf.bullet(q)
pdf.sp(3)

pdf.h2("▶ DDL (15점)")
for q in [
    "Q3. 위에서 정의한 Professor·Course·Student·Enrollment 테이블을 MySQL에서 직접 생성하시오. 의존성 순서(부모 테이블 먼저)에 주의할 것.",
    "Q4. Enrollment 테이블에 grade_letter VARCHAR(2) 컬럼을 ALTER TABLE로 추가하시오.",
    "Q5. 비정규 테이블 StudentCourse(학번, 이름, 수강과목목록)를 1NF를 만족하도록 분리된 테이블로 재설계하고 CREATE TABLE 구문을 작성하시오.",
]:
    pdf.bullet(q)
pdf.sp(4)
pdf.warn("제출: 다음 주 강의 시작 전까지 강의 포털 과제 게시판에 .sql 파일로 제출")

# ── 8. 핵심 요약
pdf.add_page(); pdf.set_y(14)
pdf.section_box("8. 핵심 개념 요약 & 자주 하는 실수")
pdf.h2("■ 이번 주 핵심 포인트")
for p in [
    "DBMS는 파일 시스템 대비 중복 제거·일관성·동시성·보안·복구를 자동 처리",
    "기본키: 유일 + NOT NULL. 외래키: 참조 테이블 기본키 값이거나 NULL",
    "ERD는 현실 → 개념 모델. M:N 관계는 반드시 교차 테이블로 변환",
    "CREATE TABLE 시 외래키 참조 테이블을 먼저 생성해야 오류 없음",
    "1NF: 원자값 + 기본키 존재. 다중값 속성은 행으로 분리",
    "ON DELETE CASCADE vs SET NULL — 비즈니스 규칙에 맞게 선택",
]:
    pdf.bullet(p)
pdf.sp(5)
pdf.h2("■ 자주 하는 실수 Top 5")
pdf.table(["#", "실수 패턴", "올바른 방법"],
[
    ["1", "외래키 테이블보다 자식 테이블 먼저 생성",      "부모(참조 대상) 테이블 먼저 CREATE TABLE"],
    ["2", "M:N 관계에서 교차 테이블 생성 누락",           "수강(Enrollment) 같은 교차 테이블 반드시 생성"],
    ["3", "기본키에 NULL 삽입 시도",                    "PRIMARY KEY는 암묵적 NOT NULL — 절대 NULL 불가"],
    ["4", "CHAR vs VARCHAR 혼동",                      "고정 길이(코드·전화번호)는 CHAR, 가변 길이는 VARCHAR"],
    ["5", "비정규 테이블 그대로 사용",                   "1NF 이상 만족하도록 분리 후 외래키로 연결"],
], [8, 82, 80])
pdf.sp(5)
pdf.h2("■ 다음 주 예고 (2주차)")
for item in [
    "JOIN 심화 — INNER / LEFT / RIGHT / SELF JOIN 비교",
    "GROUP BY · HAVING · MySQL Workbench 실습",
    "트랜잭션과 ACID 속성 · Isolation Level",
]:
    pdf.bullet(item)

pdf.sp(5); pdf.hr()
pdf.set_font("Malgun", "", 7.5); pdf.set_text_color(*GRAY); pdf.set_x(pdf.l_margin)
pdf.multi_cell(0, 4.5,
    "참고문헌: Silberschatz, A., Korth, H., & Sudarshan, S. (2019). "
    "Database System Concepts (7th ed.). McGraw-Hill. ISBN 978-0-07-802215-9.")

pdf.output(OUTPUT)
print(f"PDF 생성 완료: {os.path.abspath(OUTPUT)}")

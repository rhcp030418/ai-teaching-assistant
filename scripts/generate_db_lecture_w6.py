"""
데이터베이스 6주차 강의자료 PDF 생성 스크립트
주제: NoSQL 개요 & MongoDB 기초 (CRUD · 집계 파이프라인 · Compass)
fpdf2 사용, 맑은 고딕 폰트
"""
import os
from fpdf import FPDF
from fpdf.enums import XPos, YPos

FONT_R = "C:/Windows/Fonts/malgun.ttf"
FONT_B = "C:/Windows/Fonts/malgunbd.ttf"
OUTPUT = os.path.join(os.path.dirname(__file__), "..", "uploads", "데이터베이스_6주차_강의자료.pdf")
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
        self.cell(0, 7, "데이터베이스 — 6주차: NoSQL 개요 & MongoDB 기초", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
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
pdf.cell(0, 8, "6주차: NoSQL 개요 & MongoDB 기초 (CRUD · 집계 파이프라인 · Compass)", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_xy(20, 140); pdf.set_font("Malgun", "", 10); pdf.set_text_color(*LBLUE)
pdf.cell(0, 6, "담당교수: 김데이터  |  화 3~4교시  |  미래관 201호", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
pdf.set_fill_color(*WHITE); pdf.rect(0, 161, 210, 136, "F")

# ── 1. 강의 개요 ─────────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_top_margin(14); pdf.set_y(14)
pdf.section_box("1. 강의 개요 및 학습목표")
pdf.h2("■ 강의 정보")
pdf.table(["항목", "내용"], [
    ["강의명",   "데이터베이스 (Database Systems)"],
    ["주차",     "6주차  (2025. 4. 15.) — 마지막 주차"],
    ["주제",     "NoSQL 개요 · MongoDB CRUD · 집계 파이프라인 · Compass 실습"],
    ["선수내용", "1~5주차: 관계형 DB, SQL, 뷰, 프로시저, 트리거, 인덱스"],
    ["참고교재", "MongoDB 공식 문서(docs.mongodb.com) + 교재 부록 B (NoSQL 개요)"],
], [40, 130])
pdf.sp(2)
pdf.h2("■ 학습 목표")
for o in [
    "NoSQL의 등장 배경과 관계형 DB와의 차이를 CAP 이론 관점에서 설명할 수 있다.",
    "MongoDB의 도큐먼트 모델(BSON, 컬렉션, 데이터베이스) 구조를 이해하고 관계형 모델과 대응시킨다.",
    "insertOne/insertMany · find/findOne · updateOne/updateMany · deleteOne/deleteMany CRUD를 작성한다.",
    "$eq · $gt · $lt · $in · $and · $or · $exists 쿼리 연산자를 활용해 복합 조건을 표현한다.",
    "집계 파이프라인($match · $group · $project · $sort · $limit · $lookup)을 SQL과 대응시켜 이해한다.",
    "MongoDB Compass에서 컬렉션 탐색·쿼리 실행·집계 빌더를 활용할 수 있다.",
]:
    pdf.bullet(o)

# ── 2. NoSQL 개요 ─────────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("2. NoSQL 개요")
pdf.h2("■ NoSQL의 등장 배경")
pdf.body(
    "2000년대 중반 이후 웹 서비스의 폭발적 성장으로 단일 RDBMS가 처리하기 어려운 "
    "대규모 데이터·트래픽·비정형 데이터 요구가 생겼다. "
    "NoSQL(Not Only SQL)은 수평 확장(Scale-Out), 유연한 스키마, 고가용성을 목표로 "
    "Google Bigtable(2006), Amazon Dynamo(2007) 논문에서 시작됐다."
)
pdf.sp(3)
pdf.h2("■ NoSQL 주요 유형")
pdf.table(["유형", "대표 제품", "데이터 모델", "주요 용도"],
[
    ["도큐먼트",  "MongoDB, CouchDB",    "JSON/BSON 도큐먼트",    "콘텐츠 관리, 카탈로그"],
    ["키-값",    "Redis, DynamoDB",     "Key → Value 쌍",       "세션, 캐시, 실시간 리더보드"],
    ["컬럼 패밀리","Cassandra, HBase",   "행·컬럼 패밀리 구조",   "시계열, IoT, 로그"],
    ["그래프",   "Neo4j, Amazon Neptune","노드·엣지·속성",        "SNS, 추천, 사기 탐지"],
], [24, 36, 40, 70])
pdf.sp(3)
pdf.h2("■ CAP 이론")
pdf.body(
    "분산 시스템은 Consistency(일관성), Availability(가용성), "
    "Partition Tolerance(분할 허용성) 세 가지를 동시에 모두 보장할 수 없다 (Brewer, 2000)."
)
pdf.sp(2)
pdf.table(["조합", "설명", "대표 시스템"],
[
    ["CP (Consistency + Partition)", "네트워크 분할 시 일관성 우선, 일부 요청 실패 허용", "HBase, Zookeeper, MongoDB(기본 설정)"],
    ["AP (Availability + Partition)", "항상 응답하되 데이터 일시적 불일치 허용",          "Cassandra, CouchDB, DynamoDB"],
    ["CA (Consistency + Availability)", "분할 없는 환경 — 실제 분산 시스템에서 사실상 불가", "단일 노드 RDBMS"],
], [40, 72, 58])
pdf.sp(3)
pdf.h2("■ ACID vs BASE")
pdf.table(["속성", "ACID (관계형 DB)", "BASE (NoSQL)"],
[
    ["일관성",  "강한 일관성 (즉시 반영)",    "최종적 일관성 (Eventually Consistent)"],
    ["가용성",  "트랜잭션 중 일부 불가",      "항상 응답 가능"],
    ["확장성",  "수직 확장 (Scale-Up) 중심", "수평 확장 (Scale-Out) 용이"],
    ["트랜잭션","복잡한 멀티 테이블 트랜잭션", "단일 도큐먼트 원자성 보장"],
], [24, 82, 64])

# ── 3. MongoDB 도큐먼트 모델 ──────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("3. MongoDB 도큐먼트 모델")
pdf.h2("■ 관계형 DB vs MongoDB 구조 대응")
pdf.table(["관계형 DB", "MongoDB", "설명"],
[
    ["Database",  "Database",   "논리적 데이터 저장 단위 (동일)"],
    ["Table",     "Collection", "도큐먼트의 묶음 — 고정 스키마 없음"],
    ["Row (행)",  "Document",   "BSON 형식의 JSON 유사 객체"],
    ["Column (열)","Field",     "키-값 쌍 — 도큐먼트마다 다를 수 있음"],
    ["Primary Key","_id",       "자동 생성 ObjectId 또는 사용자 지정"],
    ["JOIN",      "$lookup",    "집계 파이프라인에서 컬렉션 간 결합"],
    ["Index",     "Index",      "createIndex()로 생성 (동일 개념)"],
], [34, 28, 108])
pdf.sp(3)
pdf.h2("■ 도큐먼트 구조 예시")
pdf.body("MongoDB 도큐먼트는 유연한 중첩 구조(Nested Document)와 배열(Array)을 지원한다.", indent=2)
pdf.sp(2)
pdf.code_block([
    "{",
    '  "_id":      ObjectId("507f1f77bcf86cd799439011"),',
    '  "sid":      "S2025001",',
    '  "sname":    "홍길동",',
    '  "dept":     "CS",',
    '  "grade":    3,',
    '  "contact":  {                    // 중첩 도큐먼트',
    '    "email":  "hong@hansung.ac.kr",',
    '    "phone":  "010-1234-5678"',
    "  },",
    '  "courses":  [                    // 배열',
    '    { "cid": "CS301", "cname": "데이터베이스", "score": 88 },',
    '    { "cid": "CS201", "cname": "알고리즘",   "score": 92 }',
    "  ]",
    "}",
])
pdf.sp(2)
pdf.note("BSON(Binary JSON)은 JSON의 이진 인코딩 — Date, ObjectId, Int32/Int64 등 추가 타입을 지원한다.")

# ── 4. CRUD 연산 ──────────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("4. CRUD 연산")
pdf.h2("■ Create — 삽입")
pdf.code_block([
    "// 단건 삽입",
    'db.students.insertOne({',
    '  sid: "S2025002", sname: "김철수", dept: "EE", grade: 2',
    "});",
    "",
    "// 다건 삽입 (배열)",
    "db.students.insertMany([",
    '  { sid: "S2025003", sname: "이영희", dept: "CS", grade: 4 },',
    '  { sid: "S2025004", sname: "박민수", dept: "ME", grade: 1 }',
    "]);",
])
pdf.sp(4)
pdf.h2("■ Read — 조회 & 쿼리 연산자")
pdf.code_block([
    "// 전체 조회",
    "db.students.find();",
    "",
    "// 조건 조회: dept가 CS이고 grade >= 3",
    'db.students.find({ dept: "CS", grade: { $gte: 3 } });',
    "",
    "// 특정 필드만 반환 (1=포함, 0=제외)",
    'db.students.find({ dept: "CS" }, { sname: 1, grade: 1, _id: 0 });',
    "",
    "// 정렬·제한",
    "db.students.find().sort({ grade: -1 }).limit(5);",
    "",
    "// OR 조건: CS 또는 EE",
    'db.students.find({ $or: [{ dept: "CS" }, { dept: "EE" }] });',
    "",
    "// 배열 필드 내 조건: courses 배열 안에 CS301 수강 학생",
    'db.students.find({ "courses.cid": "CS301" });',
])
pdf.sp(3)
pdf.h2("■ 주요 쿼리 연산자")
pdf.table(["연산자", "의미", "예시"],
[
    ["$eq / $ne",   "같음 / 다름",          '{ grade: { $eq: 3 } }'],
    ["$gt / $gte",  "초과 / 이상",          '{ score: { $gte: 80 } }'],
    ["$lt / $lte",  "미만 / 이하",          '{ score: { $lt: 60 } }'],
    ["$in / $nin",  "목록 내 / 목록 외",     '{ dept: { $in: ["CS","EE"] } }'],
    ["$and / $or",  "AND / OR",            '{ $and: [{dept:"CS"},{grade:{$gte:3}}] }'],
    ["$exists",     "필드 존재 여부",        '{ phone: { $exists: true } }'],
    ["$regex",      "정규식 패턴 매칭",      '{ sname: { $regex: "^김" } }'],
], [24, 26, 120])

# ── 5. Update & Delete ────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("5. Update & Delete")
pdf.h2("■ Update — 수정")
pdf.code_block([
    "// 단건 수정: $set으로 특정 필드만 변경",
    'db.students.updateOne(',
    '  { sid: "S2025001" },',
    '  { $set: { grade: 4, "contact.email": "new@hansung.ac.kr" } }',
    ");",
    "",
    "// 다건 수정: CS 학과 전체 grade +1",
    'db.students.updateMany(',
    '  { dept: "CS" },',
    "  { $inc: { grade: 1 } }",
    ");",
    "",
    "// upsert: 없으면 삽입, 있으면 수정",
    'db.students.updateOne(',
    '  { sid: "S2025999" },',
    '  { $set: { sname: "신입생", dept: "CS" } },',
    "  { upsert: true }",
    ");",
])
pdf.sp(3)
pdf.h2("■ 주요 Update 연산자")
pdf.table(["연산자", "설명", "예시"],
[
    ["$set",    "필드 값 설정 (없으면 추가)",  '{ $set: { grade: 3 } }'],
    ["$unset",  "필드 제거",                 '{ $unset: { phone: "" } }'],
    ["$inc",    "숫자 필드 증감",             '{ $inc: { score: 5 } }'],
    ["$push",   "배열에 요소 추가",           '{ $push: { courses: {...} } }'],
    ["$pull",   "배열에서 조건 일치 요소 제거",'{ $pull: { courses: {cid:"CS101"} } }'],
    ["$rename", "필드 이름 변경",             '{ $rename: { "old": "new" } }'],
], [18, 50, 102])
pdf.sp(4)
pdf.h2("■ Delete — 삭제")
pdf.code_block([
    "// 단건 삭제 (조건에 맞는 첫 번째 도큐먼트)",
    'db.students.deleteOne({ sid: "S2025999" });',
    "",
    "// 다건 삭제",
    'db.students.deleteMany({ dept: "ME" });',
    "",
    "// 컬렉션 전체 비우기 (주의)",
    "db.students.deleteMany({});",
])
pdf.sp(2)
pdf.warn("deleteMany({})는 컬렉션 전체를 삭제한다. 실수 방지를 위해 항상 find()로 대상을 먼저 확인한 뒤 실행한다.")

# ── 6. 집계 파이프라인 ────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("6. 집계 파이프라인 (Aggregation Pipeline)")
pdf.h2("■ 파이프라인 개념")
pdf.body(
    "집계 파이프라인은 여러 스테이지(Stage)를 순서대로 통과시키며 데이터를 변환·집계한다. "
    "각 스테이지의 출력이 다음 스테이지의 입력이 되는 Unix 파이프와 동일한 구조이다."
)
pdf.sp(3)
pdf.h2("■ SQL vs 집계 파이프라인 대응")
pdf.table(["SQL 절", "MongoDB 스테이지", "설명"],
[
    ["WHERE",    "$match",   "도큐먼트 필터링 — 파이프라인 앞쪽에 배치할수록 성능 향상"],
    ["GROUP BY", "$group",   "지정 필드 기준 그룹화 + 집계 (_id 필드에 기준 지정)"],
    ["SELECT",   "$project", "출력 필드 선택·계산·이름 변경 (1=포함, 0=제외)"],
    ["ORDER BY", "$sort",    "정렬 (1=오름차순, -1=내림차순)"],
    ["LIMIT",    "$limit",   "결과 수 제한"],
    ["JOIN",     "$lookup",  "다른 컬렉션과 좌측 외부 조인"],
    ["HAVING",   "$match (group 이후)", "그룹화 이후 조건 필터"],
], [24, 28, 118])
pdf.sp(3)
pdf.h2("■ 예시: 학과별 평균 점수 Top 3")
pdf.code_block([
    "db.students.aggregate([",
    "  { $unwind: '$courses' },              // 배열을 개별 도큐먼트로 펼침",
    "  { $match:  { 'courses.score': { $gte: 0 } } },",
    "  { $group:  {",
    "      _id:      '$dept',",
    "      avgScore: { $avg: '$courses.score' },",
    "      count:    { $sum: 1 }",
    "    }",
    "  },",
    "  { $match:  { count: { $gte: 5 } } }, // HAVING count >= 5",
    "  { $sort:   { avgScore: -1 } },",
    "  { $limit:  3 },",
    "  { $project: { _id: 0, dept: '$_id', avgScore: 1, count: 1 } }",
    "]);",
])

# ── 7. $lookup (컬렉션 조인) ──────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("7. $lookup — 컬렉션 간 조인")
pdf.h2("■ $lookup 구조")
pdf.code_block([
    "{",
    "  $lookup: {",
    "    from:         '조인 대상 컬렉션',",
    "    localField:   '현재 컬렉션의 키 필드',",
    "    foreignField: '대상 컬렉션의 매칭 필드',",
    "    as:           '결과를 담을 배열 필드명'",
    "  }",
    "}",
])
pdf.sp(3)
pdf.h2("■ 예시: 수강 정보와 강좌 정보 결합")
pdf.code_block([
    "// enrollments 컬렉션 + courses 컬렉션 조인",
    "db.enrollments.aggregate([",
    "  { $match: { semester: '2025-1' } },",
    "  { $lookup: {",
    "      from:         'courses',",
    "      localField:   'cid',",
    "      foreignField: 'cid',",
    "      as:           'courseInfo'",
    "    }",
    "  },",
    "  { $unwind: '$courseInfo' },           // 배열 → 단일 도큐먼트",
    "  { $project: {",
    "      sid:    1,",
    "      score:  1,",
    "      cname:  '$courseInfo.cname',",
    "      dept:   '$courseInfo.dept'",
    "    }",
    "  }",
    "]);",
])
pdf.sp(3)
pdf.note("$lookup은 LEFT OUTER JOIN과 동일. 매칭 도큐먼트가 없으면 as 배열이 빈 배열([])로 반환된다.")
pdf.sp(3)
pdf.h2("■ 집계 연산자 ($group 내부)")
pdf.table(["연산자", "설명", "예시"],
[
    ["$sum",   "합계 (숫자 필드 또는 1로 카운트)", '{ total: { $sum: "$score" } }'],
    ["$avg",   "평균",                           '{ avg: { $avg: "$score" } }'],
    ["$max",   "최댓값",                         '{ max: { $max: "$score" } }'],
    ["$min",   "최솟값",                         '{ min: { $min: "$score" } }'],
    ["$count", "그룹 내 도큐먼트 수 (5.0+)",      '{ n: { $count: {} } }'],
    ["$push",  "그룹 내 값을 배열로 수집",         '{ names: { $push: "$sname" } }'],
    ["$addToSet","중복 제거 후 배열 수집",         '{ depts: { $addToSet: "$dept" } }'],
], [24, 54, 92])

# ── 8. MongoDB Compass ────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("8. MongoDB Compass 실습 가이드")
pdf.h2("■ Compass란?")
pdf.body(
    "MongoDB Compass는 MongoDB 공식 GUI 툴이다. "
    "쿼리·집계 파이프라인 빌더·인덱스 관리·스키마 분석을 "
    "시각적으로 수행할 수 있어 초보자도 빠르게 DB를 탐색할 수 있다."
)
pdf.sp(3)
pdf.h2("■ 주요 기능 안내")
pdf.table(["탭", "기능"],
[
    ["Documents",   "컬렉션 내 도큐먼트 조회·필터·편집·삭제. Filter 창에 MQL 입력."],
    ["Aggregations","파이프라인 스테이지를 블록 형태로 추가·테스트. 내보내기 가능."],
    ["Schema",      "필드별 타입·분포를 자동 분석해 시각화. 데이터 품질 파악에 유용."],
    ["Indexes",     "현재 인덱스 목록 확인 + 새 인덱스 생성 UI 제공."],
    ["Explain Plan","쿼리 실행 계획을 트리 형태로 시각화 (RDBMS의 EXPLAIN과 유사)."],
    ["Shell",       "내장 MongoDB Shell — mongosh 명령어 직접 실행 가능."],
], [30, 140])
pdf.sp(3)
pdf.h2("■ 접속 방법 (실습 서버)")
pdf.code_block([
    "// 연결 문자열 (강의 포털 DB Lab 페이지에서 확인)",
    "mongodb://db-lab.hansung.ac.kr:27017",
    "",
    "// 또는 로컬 MongoDB 설치 후",
    "mongodb://localhost:27017",
])
pdf.sp(3)
pdf.h2("■ 인덱스 생성 (Compass Shell 또는 mongosh)")
pdf.code_block([
    "// 단일 필드 인덱스",
    'db.students.createIndex({ dept: 1 });',
    "",
    "// 복합 인덱스",
    'db.students.createIndex({ dept: 1, grade: -1 });',
    "",
    "// 텍스트 인덱스 (전문 검색)",
    'db.students.createIndex({ sname: "text" });',
    "",
    "// 인덱스 목록 확인",
    "db.students.getIndexes();",
])

# ── 9. 실습 과제 ──────────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("9. 실습 과제")
pdf.body(
    "실습 환경: MongoDB 8.x (강의 포털 → DB Lab, 또는 로컬 설치). "
    "students · courses · enrollments 컬렉션을 제공된 초기 데이터로 사용한다."
)
pdf.sp(4)
pdf.h2("▶ CRUD (15점)")
for q in [
    "Q1. sname이 '김'으로 시작하는 CS 학과 3학년 이상 학생을 grade 내림차순으로 조회하시오. ($regex, $gte 활용)",
    "Q2. S2025001 학번 학생의 courses 배열에 { cid: 'CS401', cname: '소프트웨어공학', score: 85 }를 추가하시오. ($push)",
    "Q3. 수강 점수(courses.score)가 60 미만인 항목을 courses 배열에서 모두 제거하시오. ($pull)",
]:
    pdf.bullet(q)
pdf.sp(3)
pdf.h2("▶ 집계 파이프라인 (20점)")
for q in [
    "Q4. 학과별 학생 수와 평균 학년을 구하고, 학생 수 내림차순으로 정렬하시오. ($group, $sort)",
    "Q5. enrollments 컬렉션과 courses 컬렉션을 $lookup으로 조인해 2025-1학기 수강 목록(학번·강좌명·점수)을 조회하고, 점수 80점 이상만 필터링하시오.",
    "Q6. 전체 학생 중 courses 배열 내 score 평균이 전체 평균보다 높은 학생의 학번과 개인 평균 점수를 출력하시오. ($unwind, $group, $match 조합)",
]:
    pdf.bullet(q)
pdf.sp(4)
pdf.warn("제출: 다음 주(기말 주간) 전까지 강의 포털 과제 게시판에 .js 또는 .txt 파일로 제출")

# ── 10. 핵심 요약 ─────────────────────────────────────────────────────────────
pdf.add_page(); pdf.set_y(14)
pdf.section_box("10. 핵심 개념 요약 & 자주 하는 실수")
pdf.h2("■ 이번 주 핵심 포인트")
for p in [
    "NoSQL은 RDBMS의 대체가 아닌 보완 — 유연한 스키마·수평 확장이 필요할 때 선택",
    "MongoDB 도큐먼트는 중첩 구조와 배열을 포함 — 관계형 DB의 JOIN 없이도 연관 데이터를 한 도큐먼트에 저장 가능",
    "find()의 두 번째 인자는 projection — 필요한 필드만 반환해 네트워크 비용 절감",
    "$match를 파이프라인 앞에 배치 → 처리 도큐먼트 수 최소화 (성능 핵심)",
    "$unwind는 배열을 개별 도큐먼트로 펼침 — $group 전에 배열 필드를 집계할 때 필수",
    "$lookup은 LEFT OUTER JOIN — 매칭 없으면 빈 배열, $unwind 후 $match로 INNER JOIN 효과 가능",
    "deleteMany({})는 컬렉션 전체 삭제 — 반드시 find()로 대상 먼저 확인",
]:
    pdf.bullet(p)
pdf.sp(5)
pdf.h2("■ 자주 하는 실수 Top 5")
pdf.table(["#", "실수 패턴", "올바른 방법"],
[
    ["1", "find() 결과에 $gte 직접 쓰기: { score: $gte: 80 }",  "{ score: { $gte: 80 } } — 연산자는 중첩 객체"],
    ["2", "$group의 _id를 null로 설정 시 전체 집계라는 것 모름", "_id: null → 전체 컬렉션을 하나의 그룹으로 집계"],
    ["3", "$lookup 후 as 배열을 바로 필드처럼 사용",            "$unwind로 배열 → 단일 도큐먼트 변환 후 접근"],
    ["4", "$project에서 필드 제외 시 0 대신 false 혼용",        "0과 false 모두 가능하지만 숫자 1/0 통일 권장"],
    ["5", "updateOne에서 $set 없이 전체 객체 전달",             "$set 없이 객체 전달 시 도큐먼트 전체 교체 발생"],
], [8, 88, 74])
pdf.sp(5)
pdf.h2("■ 학기 마무리 — 전체 흐름 회고")
for item in [
    "1주차: 관계형 모델 · ERD    |  2주차: JOIN · 서브쿼리 · 트랜잭션",
    "3주차: SELECT 기초 (PDF)    |  4주차: 뷰 · 저장 프로시저 (PDF)",
    "5주차: 트리거 · 인덱스 (PDF)|  6주차: NoSQL · MongoDB (PDF)",
]:
    pdf.bullet(item)
pdf.sp(5); pdf.hr()
pdf.set_font("Malgun", "", 7.5); pdf.set_text_color(*GRAY); pdf.set_x(pdf.l_margin)
pdf.multi_cell(0, 4.5,
    "참고문헌: MongoDB, Inc. (2024). MongoDB Manual 8.0. https://www.mongodb.com/docs/manual/  |  "
    "Silberschatz, A., Korth, H., & Sudarshan, S. (2019). Database System Concepts (7th ed.). McGraw-Hill.")

pdf.output(OUTPUT)
print(f"PDF 생성 완료: {os.path.abspath(OUTPUT)}")

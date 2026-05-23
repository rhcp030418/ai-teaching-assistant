# 검증된 교수법 레퍼런스 (Evidence-based Teaching Methods)

이 문서는 AI 분석 기능이 개선 제안을 생성할 때 근거로 삼는 교수법들을 정리한 것입니다.
실제 코드는 [src/lib/teaching-methods.ts](src/lib/teaching-methods.ts)의 `TEACHING_TOOLBOX` 상수이며,
이 상수는 다음 6개 AI 프롬프트의 system 메시지에 주입됩니다.

- 강의자료 분석 — [src/app/actions/analyze-material.ts](src/app/actions/analyze-material.ts)
- 원인 연결 분석 — [src/app/actions/cause-analysis.ts](src/app/actions/cause-analysis.ts)
- 개선 로드맵 — [src/app/actions/improvement-roadmap.ts](src/app/actions/improvement-roadmap.ts)
- 수업 체크리스트 — [src/app/actions/class-checklist.ts](src/app/actions/class-checklist.ts)
- 개선 사례 AI 인사이트 — [src/app/actions/improvement-cases.ts](src/app/actions/improvement-cases.ts)
- AI 채팅 — [src/app/api/ai-chat/[courseId]/route.ts](src/app/api/ai-chat/[courseId]/route.ts)

## 설계 원칙

이 플랫폼은 학생 피드백에서 **5개 지표(수업 속도 / 자료 이해도 / 소통 만족도 / 강의 흥미도 / 과제·실습 충분도)**
를 측정한다. 도구상자는 각 기법을 "어떤 지표가 문제일 때 쓰는가"로 그룹화하여, AI가 막연한 조언
("더 잘 가르치세요") 대신 **감지된 문제 → 검증된 기법의 구체적 실천 행동**으로 개선안을 쓰도록 유도한다.

- 출력 시 행동 문장 끝에 기법 이름을 괄호로 병기한다. 예: `...하세요 (동료 교수법/peer instruction)`
- 한 번에 실천 가능한 1~2개 기법만 권한다.
- 도구상자 텍스트에는 마크다운 기호(-, *, #, **)를 쓰지 않는다 — AI 출력이 이를 흉내내지 않도록.

---

## 1. 이해도가 낮거나 자료가 어려울 때

| 기법 | 핵심 실천 | 연구 근거 |
|---|---|---|
| 워크드 예제 (worked example) | 새 개념은 풀이 전 과정을 끝까지 시연한 뒤 비슷한 문제를 풀게 한다. 백지 문제부터 주지 않는다. | John Sweller, 인지부하 이론 (Cognitive Load Theory) |
| 구체적 예시 우선 (concrete examples) | 추상적 정의보다 실생활·전공 사례를 먼저 제시하고 거기서 개념을 끌어낸다. | 인지과학 6대 학습전략; Dunlosky et al., 2013 |
| 파인만 기법 (Feynman technique) | 전문용어를 일상 언어로 바꿔 "처음 듣는 사람도 이해할 수준"으로 다시 설명한다. | Richard Feynman |
| 개념점검질문 (ConcepTest) | 핵심 개념마다 객관식 질문으로 거수·손가락 즉답을 받아 이해도를 즉석 확인한다. | Eric Mazur (Harvard) |
| 정교화 질문 (elaboration) | "왜 그런가?", "아는 것과 어떻게 연결되나?"를 학생이 직접 답하게 한다. | Dunlosky et al., 2013 (효용 중상) |
| 자기 설명 (self-explanation) | 예제 각 단계마다 "이 단계가 왜 필요한지"를 학생이 말로 설명하게 한다. | Chi et al.; Dunlosky et al., 2013 |
| 사전 안내자 (advance organizer) | 새 단원 전, 전체 구조·개념 지도를 먼저 보여줘 세부 내용을 걸 틀을 만든다. | David Ausubel |
| 생성·예측 효과 (generation/prediction) | 정답을 알려주기 전에 먼저 추측·생성하게 한다. 틀려도 직후 정답을 들을 때 더 각인된다. | Robert Bjork (desirable difficulties); Kornell & Son |
| 오개념 직면 (confronting misconceptions) | 흔한 오개념을 먼저 드러내 "왜 틀렸는지" 따진 뒤 교정한다. 맞는 설명만 반복하면 오개념이 남는다. | Posner et al., 1982 (개념 변화); 반박 텍스트 Tippett, 2010 |
| 개념도 작성 (concept mapping) | 단원 후 핵심 개념을 화살표로 잇는 지도를 직접 그리게 해 관계를 드러낸다. | Novak & Gowin, 1984 |

## 2. 수업 속도가 빠르거나 진도가 부적절할 때

| 기법 | 핵심 실천 | 연구 근거 |
|---|---|---|
| 청킹 (chunking) | 정보량을 줄여 10~15분 단위로 끊고 각 덩어리 끝에 1분 정리를 넣는다. | 작업기억 한계 연구 (Miller) |
| 인출 연습 휴식 (retrieval practice) | 15분마다 멈춰 방금 배운 내용을 백지에 적거나 옆 사람에게 말하게 한다. | Dunlosky et al., 2013 (효용 최상위); Roediger & Karpicke |
| 형성평가로 속도 보정 (formative assessment) | 거수·짧은 퀴즈 결과가 나쁘면 다음 개념으로 넘어가지 않는다. | Dylan Wiliam (Assessment for Learning) |
| 분산 학습 (spaced practice) | 한 개념을 몰아 끝내지 말고 여러 주차에 걸쳐 간격을 두고 재등장시킨다. | Dunlosky et al., 2013 (효용 최상위) |
| 가이드 노트 (guided notes) | 골격만 적힌 빈칸 노트를 미리 주고 채우게 해 받아쓰기 부담과 체감 속도를 낮춘다. | Heward et al. |
| 거꾸로 수업 (flipped classroom) | 개념 전달은 사전 영상·읽기로 돌리고 수업 시간은 문제풀이·토론에 쓴다. | Bishop & Verleger, 2013 |

## 3. 소통·참여·질문이 적을 때

| 기법 | 핵심 실천 | 연구 근거 |
|---|---|---|
| 동료 교수법 (peer instruction) | 개념 질문 후 1)개인 응답 2)짝 토론·설득 3)재응답 순으로 진행한다. | Eric Mazur (Harvard) — 학습 효과 약 2배 |
| 생각-짝-공유 (think-pair-share) | 질문 후 30초 개인 생각 → 짝 토론 → 전체 공유. 소수만 말하는 구조를 깬다. | 협동학습 연구 (Lyman) |
| 대기 시간 (wait time) | 질문 뒤 답을 바로 받지 말고 5~7초 침묵으로 기다린다. | Mary Budd Rowe |
| 1분 페이퍼·머디스트 포인트 (minute paper / muddiest point) | 수업 끝 1~2분간 "가장 헷갈린 점"을 익명으로 적어 내게 하고 다음 시간 도입부에 답한다. | Angelo & Cross, 1993 (Classroom Assessment Techniques) |
| 직소 (jigsaw) | 내용을 조각으로 나눠 조별 전문가가 된 뒤 서로 가르치게 한다. 모두가 말하는 구조. | Aronson et al., 1978 |
| 소크라테스식 발문 (Socratic questioning) | 답을 바로 주지 말고 "근거는?", "반례는?" 식 꼬리 질문으로 스스로 결론에 닿게 한다. | Paul & Elder (critical thinking) |

## 4. 흥미·동기가 낮을 때

| 기법 | 핵심 실천 | 연구 근거 |
|---|---|---|
| 스토리텔링 (storytelling) | 개념을 도입-전개-결말 구조의 이야기·실제 사례로 감싼다. 데이터만 나열하지 않는다. | 서사 기억 연구 |
| 유추·은유 (analogy) | 어려운 개념을 학생에게 친숙한 대상에 빗댄다. | 유추적 추론 연구 (Gentner) |
| 전달 변화 (delivery variation) | 강조 지점에서 목소리 톤과 속도를 바꿔 주의를 환기한다. | 주의·각성 연구 |
| 자율성 지지 (autonomy support) | 주제·예시·과제 형식에 선택지를 줘 직접 고르게 한다. 통제보다 선택이 내적 동기를 높인다. | 자기결정성 이론 (Deci & Ryan) |
| 관련성 부여 (relevance) | 개념이 진로·일상과 어떻게 연결되는지 한 문장으로 짚어 "왜 배우나"에 먼저 답한다. | 자기결정성 이론; ARCS 모형 (Keller) |
| 생산적 실패 (productive failure) | 정식 설명 전 까다로운 문제를 먼저 씨름하게 둔 뒤 정답으로 정리한다. 헤맨 경험이 흡수력을 높인다. | Manu Kapur, 2008/2016 |

## 5. 과제·실습이 부적절할 때

| 기법 | 핵심 실천 | 연구 근거 |
|---|---|---|
| 점진적 책임 이양 (scaffolding) | 함께 풀기 → 일부만 비워 풀기 → 혼자 풀기 순으로 난이도를 단계화한다. | Wood, Bruner & Ross; Vygotsky (ZPD) |
| 채점 기준 사전 공유 (success criteria) | 좋은 결과물 예시와 평가 기준을 과제 전에 보여준다. | Dylan Wiliam (Assessment for Learning) |
| 인터리빙 (interleaving) | 한 주제만 반복하지 말고 이전 주차 내용을 섞어 출제해 장기 기억을 강화한다. | Dunlosky et al., 2013; Rohrer & Taylor |
| 즉각적 피드백 (timely feedback) | 과제·퀴즈는 채점을 미루지 말고 빠르게 돌려준다. 늦을수록 효과가 급감한다. | John Hattie (Visible Learning) |
| 두 단계 협동 시험 (two-stage / collaborative test) | 개인 풀이 직후 같은 문제를 조별로 다시 풀게 해 즉석 토론으로 오답을 교정한다. | Gilley & Clarkston, 2014 |
| 동료 평가 (peer assessment) | 채점 기준표로 서로의 결과물을 평가하게 한다. 기준 적용 경험이 자기 작업을 보는 눈을 키운다. | Topping, 1998 |

## 6. 모든 영역 공통

| 기법 | 핵심 실천 | 연구 근거 |
|---|---|---|
| 학습목표 명시 (Bloom's taxonomy) | 수업 시작 시 "오늘이 끝나면 무엇을 할 수 있는지"를 한 문장으로 제시한다. | Benjamin Bloom |
| 이중 부호화 (dual coding) | 말로만 설명하지 말고 도식·그림과 함께 제시한다. | Allan Paivio; Dunlosky et al., 2013 |
| 능동학습 (active learning) | 듣기만 하는 시간을 줄이고 직접 풀고 말하는 활동을 끼워 넣는다. | Freeman et al., 2014 — 시험 점수 평균 6%↑, 낙제율↓ |
| 메타인지·자기조절 (self-regulated learning) | 수업 시작에 "오늘 목표", 끝에 "이해/막힌 것"을 적게 해 계획-점검-성찰 루틴을 만든다. | Zimmerman, 2002; Flavell, 1979 (metacognition) |

---

## 주요 참고 문헌

- Freeman, S. et al. (2014). *Active learning increases student performance in science, engineering, and mathematics.* PNAS.
- Dunlosky, J. et al. (2013). *Improving Students' Learning With Effective Learning Techniques.* Psychological Science in the Public Interest.
- Mazur, E. (1997). *Peer Instruction: A User's Manual.*
- Wiliam, D. (2011). *Embedded Formative Assessment.*
- Sweller, J. (1988). *Cognitive Load During Problem Solving.*
- Ausubel, D. (1960). *The use of advance organizers in the learning and retention of meaningful verbal material.*
- Bjork, R. A. — Desirable Difficulties framework.
- Posner, G. et al. (1982). *Accommodation of a scientific conception: Toward a theory of conceptual change.*
- Novak, J. & Gowin, D. (1984). *Learning How to Learn.*
- Bishop, J. & Verleger, M. (2013). *The Flipped Classroom: A Survey of the Research.*
- Angelo, T. & Cross, K. P. (1993). *Classroom Assessment Techniques.*
- Aronson, E. et al. (1978). *The Jigsaw Classroom.*
- Kapur, M. (2008, 2016). *Productive Failure.*
- Gilley, B. & Clarkston, B. (2014). *Collaborative Testing: Evidence of Learning in a Controlled In-Class Study.*
- Topping, K. (1998). *Peer Assessment Between Students in Colleges and Universities.*
- Zimmerman, B. (2002). *Becoming a Self-Regulated Learner: An Overview.*
- Deci, E. & Ryan, R. — Self-Determination Theory.
- Hattie, J. (2008). *Visible Learning.*

import sqlite3, os

db = os.path.join(os.environ["USERPROFILE"], r"Desktop\여기다 만들거임\ai-teaching-assistant\dev.db")
conn = sqlite3.connect(db)

sql_dist = """
SELECT fr.week, COUNT(f.id) as cnt,
       SUM(CASE WHEN COALESCE(f.commentHasProfanity,0)=1 THEN 1 ELSE 0 END) as pf
FROM FeedbackRound fr
JOIN Course c ON fr.courseId = c.id
JOIN Feedback f ON f.roundId = fr.id
WHERE c.name = ?
GROUP BY fr.week
ORDER BY fr.week
"""

# 데이터베이스 course name in UTF-8
name = "데이터베이스"
rows = conn.execute(sql_dist, (name,)).fetchall()
print("week  feedbacks  profanity_filtered")
for r in rows:
    print(f"  {r[0]}      {r[1]:3d}         {r[2]}")

sql_mats = "SELECT lm.fileName FROM LectureMaterial lm JOIN Course c ON lm.courseId = c.id WHERE c.name = ?"
mats = conn.execute(sql_mats, (name,)).fetchall()
print(f"\nRegistered materials ({len(mats)}):")
for m in mats:
    print(" -", m[0])

conn.close()

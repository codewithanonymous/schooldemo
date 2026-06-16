
## [15/6/2026, 10:53:23 pm]
- **Status**: Success ✔
- **Applied SQL**:
```sql
ALTER TABLE "public"."Teacher" ALTER COLUMN "sex" TYPE text USING "sex"::text;
ALTER TABLE "public"."Student" ALTER COLUMN "sex" TYPE text USING "sex"::text;
ALTER TABLE "public"."Lesson" ALTER COLUMN "day" TYPE text USING "day"::text;
```

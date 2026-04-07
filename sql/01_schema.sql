-- ============================================================
-- 01_schema.sql — Schema changes for PYTHON_BASIC_COURSE seed
-- ============================================================

-- Шаг 1: Добавить колонки test_type и module_id в таблицу diagnostic_tests
-- test_type: 'entry' (входной тест), 'module' (тест по модулю), 'micro' (быстрая проверка)
-- module_id: NULL для входных тестов, FK на таблицу modules для module/micro тестов

ALTER TABLE diagnostic_tests
  ADD COLUMN IF NOT EXISTS test_type VARCHAR(20) NOT NULL DEFAULT 'entry',
  ADD COLUMN IF NOT EXISTS module_id INTEGER REFERENCES modules(id);

-- Шаг 2: Очистка всех таблиц с контентом — порядок от дочерних к родительским по FK

TRUNCATE TABLE
  skill_mapping,
  diagnostic_answers,
  diagnostic_questions,
  diagnostic_tests,
  user_skills,
  module_progress,
  progress,
  submissions,
  test_cases,
  exercises,
  theory_blocks,
  topics,
  lessons,
  modules,
  courses
RESTART IDENTITY CASCADE;

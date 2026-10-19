'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const course = require('../course.js');

const projectRoot = path.resolve(__dirname, '..');
const expected = new Map([
  ['section-3-lesson-5', { source: 40, edited: 36, graded: 18, slides: 18 }],
  ['section-2-lesson-10', { source: 62, edited: 27, graded: 27, slides: 20 }],
  ['a1.2-section-2-lesson-7', { source: 44, edited: 34, graded: 18, slides: 21 }],
  ['a1.3-section-4-lesson-10', { source: 32, edited: 29, graded: 29, slides: 24 }],
]);
const scored = (list) => list.reduce((total, slide) =>
  total + course.scoredOpportunitiesOnSlide(slide), 0);

function buildReport() {
  const lessons = [];
  for (const stage of course.COURSE_STAGES) {
    for (const filename of stage.sectionUrls) {
      const source = JSON.parse(fs.readFileSync(path.join(projectRoot, filename), 'utf8'));
      const section = course.validateSection(source);
      for (const lesson of section.lessons) {
        const historical = course.lessonEditionActivities(lesson, 'legacy');
        const edited = course.lessonEditionActivities(lesson, 'editorial');
        const historicalSlides = course.lessonEditionSlides(lesson, 'legacy');
        const editedSlides = course.lessonEditionSlides(lesson, 'editorial');
        const preserved = course.flattenLessonSlides(editedSlides);
        assert.deepEqual(preserved, edited);
        const selectedIndices = new Set(lesson.editorial_revision?.activity_indices || []);
        const deferredReviewedTargets = [...new Set(historical.flatMap((activity, index) => {
          if (selectedIndices.has(index) || !activity.item) return [];
          const objective = lesson.learning_objectives?.lexical?.find((goal) =>
            goal.target_id === activity.item);
          return objective?.status === 'reviewed' ? [activity.item] : [];
        }))];
        const historicalGraded = scored(historical);
        const editedGraded = scored(edited);
        lessons.push({
          section_id: section.id,
          lesson_id: lesson.id,
          title_fa: lesson.title_fa,
          revised: Boolean(lesson.editorial_revision),
          revision_id: lesson.editorial_revision?.id || null,
          original_activities: historical.length,
          learner_activities: edited.length,
          original_graded_answers: historicalGraded,
          learner_graded_answers: editedGraded,
          original_visible_slides: historicalSlides.length,
          learner_visible_slides: editedSlides.length,
          checkpoint_target_count: (lesson.checkpoint_targets || []).length,
          deferred_review_target_ids: deferredReviewedTargets,
          original_grammar_evidence_count: (lesson.learning_objectives?.grammar || [])
            .reduce((count, goal) => count + (goal.evidence || []).length, 0),
        });
      }
    }
  }
  return {
    schema_version: 1,
    caveat: 'Static curricular opportunities, not learning-time observations or fatigue telemetry.',
    summary: {
      shipped_lessons: lessons.length,
      editorially_revised_lessons: lessons.filter((lesson) => lesson.revised).length,
      original_grading_opportunities: lessons.reduce((n, lesson) => n + lesson.original_graded_answers, 0),
      learner_grading_opportunities: lessons.reduce((n, lesson) => n + lesson.learner_graded_answers, 0),
      removed_grading_opportunities: lessons.reduce(
        (n, lesson) => n + lesson.original_graded_answers - lesson.learner_graded_answers, 0
      ),
      learner_lessons_exceeding_30_slides: lessons.filter((lesson) => lesson.learner_visible_slides > 30).length,
    },
    lessons,
  };
}

function markdown(report) {
  const lines = [
    '# Editorial lesson-load reduction audit',
    '',
    'Generated with `npm run lesson:editorial:report`. Counts are authored opportunities, **not** learner time, fatigue, or CEFR evidence.',
    '',
    '| Lesson | Original activities | Edited activities | Original graded answers | Edited graded answers | Original slides | Edited slides |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];
  for (const entry of report.lessons.filter((lesson) => lesson.revised)) {
    lines.push(`| ${entry.section_id}/${entry.lesson_id} | ${entry.original_activities} | ${entry.learner_activities} | ${entry.original_graded_answers} | ${entry.learner_graded_answers} | ${entry.original_visible_slides} | ${entry.learner_visible_slides} |`);
  }
  lines.push('', `Total graded opportunities removed across all shipped lessons: **${report.summary.removed_grading_opportunities}**.`);
  lines.push(
    '',
    'Original activity objects and IDs remain in the manifests for incomplete pre-release lesson drafts. Fresh attempts use the selected editorial edition. The selection is reviewed against all checkpoint IDs, introducing teaching cards, listening/productive evidence and explicit grammar references. Reviewed-only targets removed from these specific lessons remain in earlier course contexts, and any further reinforcement belongs in regular Word Practice or subsequent lessons.',
    '',
    'Only the four priority lessons were editorially shortened. Other grouped long lessons, manual screen-reader/mobile QA and any privacy-appropriate duration or dropout analytics remain in parent #189.',
    ''
  );
  return lines.join('\n');
}

function check(report) {
  assert.equal(report.summary.shipped_lessons, 140);
  assert.equal(report.summary.editorially_revised_lessons, 4);
  assert.equal(report.summary.learner_lessons_exceeding_30_slides, 0);
  assert.equal(report.summary.removed_grading_opportunities, 52);
  for (const row of report.lessons) {
    if (!row.revised) {
      assert.equal(row.original_activities, row.learner_activities);
      assert.equal(row.original_graded_answers, row.learner_graded_answers);
      assert.equal(row.original_visible_slides, row.learner_visible_slides);
      continue;
    }
    const baseline = expected.get(row.lesson_id);
    assert.ok(baseline, row.lesson_id);
    assert.equal(row.original_activities, baseline.source);
    assert.equal(row.learner_activities, baseline.edited);
    assert.equal(row.learner_graded_answers, baseline.graded);
    assert.equal(row.learner_visible_slides, baseline.slides);
    assert.ok(row.learner_graded_answers < row.original_graded_answers);
    assert.ok(row.learner_visible_slides >= 12 && row.learner_visible_slides <= 25);
  }
  console.log('Editorial reductions: 4 shorter lessons, 52 fewer graded answers, 140 stable lesson IDs.');
}
const mode = process.argv[2] || '--check';
const report = buildReport();
if (mode === '--check') check(report);
else if (mode === '--json') process.stdout.write(JSON.stringify(report, null, 2) + '\n');
else if (mode === '--markdown') process.stdout.write(markdown(report));
else throw new Error('Usage: --check|--markdown|--json');

module.exports = { buildReport, markdown, check };

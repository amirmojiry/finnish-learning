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
  ['section-3-lesson-9', { source: 48, edited: 32, graded: 28, slides: 21 }],
  ['section-4-lesson-9', { source: 48, edited: 31, graded: 27, slides: 20 }],
  ['a1.2-section-1-lesson-9', { source: 31, edited: 22, graded: 17, slides: 13 }],
  ['a1.2-section-4-lesson-2', { source: 34, edited: 33, graded: 20, slides: 19 }],
  ['a1.2-section-4-lesson-3', { source: 35, edited: 33, graded: 22, slides: 14 }],
  ['a1.2-section-4-lesson-4', { source: 34, edited: 33, graded: 22, slides: 16 }],
  ['a1.2-section-4-lesson-5', { source: 35, edited: 34, graded: 22, slides: 18 }],
  ['a1.2-section-4-lesson-6', { source: 36, edited: 34, graded: 22, slides: 19 }],
  ['a1.2-section-4-lesson-7', { source: 36, edited: 33, graded: 21, slides: 17 }],
  ['a1.2-section-4-lesson-8', { source: 34, edited: 32, graded: 20, slides: 16 }],
  ['a1.2-section-4-lesson-9', { source: 38, edited: 35, graded: 32, slides: 24 }],
  ['a1.2-section-3-lesson-2', { source: 30, edited: 29, graded: 19, slides: 14 }],
  ['a1.2-section-3-lesson-3', { source: 31, edited: 30, graded: 19, slides: 14 }],
  ['a1.2-section-3-lesson-4', { source: 36, edited: 35, graded: 23, slides: 17 }],
  ['a1.2-section-3-lesson-5', { source: 33, edited: 30, graded: 20, slides: 15 }],
  ['a1.2-section-3-lesson-6', { source: 39, edited: 37, graded: 23, slides: 19 }],
  ['a1.2-section-3-lesson-7', { source: 35, edited: 30, graded: 19, slides: 15 }],
  ['a1.2-section-3-lesson-8', { source: 33, edited: 30, graded: 19, slides: 15 }],
  ['a1.2-section-3-lesson-9', { source: 40, edited: 36, graded: 33, slides: 23 }],
  ['a1.3-section-2-lesson-2', { source: 25, edited: 24, graded: 15, slides: 18 }],
  ['a1.3-section-2-lesson-3', { source: 30, edited: 28, graded: 18, slides: 19 }],
  ['a1.3-section-2-lesson-4', { source: 33, edited: 30, graded: 20, slides: 20 }],
  ['a1.3-section-2-lesson-5', { source: 35, edited: 31, graded: 20, slides: 22 }],
  ['a1.3-section-2-lesson-6', { source: 34, edited: 32, graded: 22, slides: 21 }],
  ['a1.3-section-2-lesson-7', { source: 37, edited: 34, graded: 23, slides: 24 }],
  ['a1.3-section-2-lesson-8', { source: 31, edited: 27, graded: 17, slides: 19 }],
  ['a1.3-section-2-lesson-9', { source: 34, edited: 33, graded: 31, slides: 21 }],
  ['a1.3-section-3-lesson-2', { source: 29, edited: 26, graded: 16, slides: 19 }],
  ['a1.3-section-3-lesson-3', { source: 32, edited: 30, graded: 21, slides: 20 }],
  ['a1.3-section-3-lesson-4', { source: 29, edited: 27, graded: 19, slides: 17 }],
  ['a1.3-section-3-lesson-5', { source: 32, edited: 29, graded: 19, slides: 20 }],
  ['a1.3-section-3-lesson-6', { source: 31, edited: 28, graded: 17, slides: 20 }],
  ['a1.3-section-3-lesson-7', { source: 32, edited: 29, graded: 20, slides: 20 }],
  ['a1.3-section-3-lesson-8', { source: 31, edited: 27, graded: 19, slides: 18 }],
  ['a1.3-section-3-lesson-9', { source: 34, edited: 33, graded: 31, slides: 19 }],
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
        // A target is deferred only if its final graded opportunity was removed.
        // Removing one repeated activity does not remove an otherwise retained target.
        const selectedIndices = new Set(lesson.editorial_revision?.activity_indices || []);
        const editedAssessedTargets = new Set(edited.flatMap((activity) => {
          if (scored([activity]) === 0) return [];
          return [course.activityPrimaryTargetId(activity), activity.item].filter(Boolean);
        }));
        const reviewedIds = new Set((lesson.learning_objectives?.lexical || [])
          .filter((goal) => goal.status === 'reviewed').map((goal) => goal.target_id));
        const deferredReviewedTargets = lesson.editorial_revision
          ? [...new Set(historical.flatMap((activity, index) => {
            if (selectedIndices.has(index) || scored([activity]) === 0) return [];
            const id = course.activityPrimaryTargetId(activity) || activity.item;
            return id && reviewedIds.has(id) && !editedAssessedTargets.has(id) ? [id] : [];
          }))]
          : [];
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
          // validateSection enforces the final-lesson checkpoint contract,
          // including the one supported legacy checkpoint without targets.
          is_checkpoint: lesson === section.lessons[section.lessons.length - 1],
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
    `To date, ${report.summary.editorially_revised_lessons} priority lessons have been editorially shortened. Other grouped long lessons, manual screen-reader/mobile QA and any privacy-appropriate duration or dropout analytics remain in parent #189.`,
    ''
  );
  return lines.join('\n');
}


// Ranking is based on the edition a *new learner* will receive, never the
// retained historical array used to resume earlier drafts.
function priorityRows(report) {
  return report.lessons.filter((row) => !row.revised)
    .map((row) => ({
      section_id: row.section_id,
      lesson_id: row.lesson_id,
      title_fa: row.title_fa,
      graded_answers: row.learner_graded_answers,
      visible_slides: row.learner_visible_slides,
      activities: row.learner_activities,
      checkpoint: row.is_checkpoint,
      grammar_evidence: row.original_grammar_evidence_count,
    }))
    .sort((a, b) =>
      b.graded_answers - a.graded_answers ||
      b.visible_slides - a.visible_slides ||
      b.activities - a.activities ||
      a.section_id.localeCompare(b.section_id, 'en') ||
      a.lesson_id.localeCompare(b.lesson_id, 'en'));
}

function priorityMarkdown(report) {
  const rows = priorityRows(report);
  const lines = [
    '# Next R2 editorial-review candidates',
    '',
    'Derived from the effective fresh-learner editions across all 140 shipped lessons; already revised lessons are excluded. Rank is deterministic by graded answers, then learner-visible slides and activities. This is a static curricular load proxy, **not** fatigue, duration or learner attainment data.',
    '',
    '| Rank | Lesson | Title (fa) | Graded answers | Visible slides | Activities | Checkpoint | Grammar evidence |',
    '| ---: | --- | --- | ---: | ---: | ---: | --- | ---: |',
  ];
  for (const [index, row] of rows.slice(0, 25).entries()) {
    lines.push(`| ${index + 1} | ${row.section_id}/${row.lesson_id} | ${row.title_fa.replace(/[|]/g, '\\|')} | ${row.graded_answers} | ${row.visible_slides} | ${row.activities} | ${row.checkpoint ? 'yes' : 'no'} | ${row.grammar_evidence} |`);
  }
  lines.push('', `Remaining uncurated lessons: **${rows.length}**; all **${report.summary.editorially_revised_lessons}** previously curated lessons are excluded.`, '',
    'Review each candidate in its section context before selecting activity indices. Protect grammar evidence, first introductions, independently graded retrieval, listening/production and existing drafts. Rank alone does not authorize automatically deleting activities.', '');
  return lines.join('\n');
}

function check(report) {
  assert.equal(report.summary.shipped_lessons, 140);
  const priorities = priorityRows(report);
  assert.equal(priorities.length, 101);
  assert.equal(new Set(priorities.map(row => row.lesson_id)).size, 101);
  const legacyFinal = priorities.find(row => row.section_id === 'a1.1-section-4' && row.lesson_id === 'section-4-lesson-10');
  assert.ok(legacyFinal?.checkpoint, 'Legacy A1.1 S4 final lesson must be recognized as checkpoint');
  assert.equal(priorities.filter(row => row.checkpoint).length, 12);
  for (let i = 1; i < priorities.length; i++) {
    assert.ok(priorities[i - 1].graded_answers >= priorities[i].graded_answers);
  }
  assert.equal(report.summary.editorially_revised_lessons, 39);
  assert.equal(report.summary.learner_lessons_exceeding_30_slides, 0);
  assert.equal(report.summary.removed_grading_opportunities, 170);
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
    assert.equal(row.learner_visible_slides, baseline.slides, row.lesson_id);
    assert.ok(row.learner_graded_answers < row.original_graded_answers);
    assert.ok(row.learner_visible_slides >= 12 && row.learner_visible_slides <= 25);
  }
  console.log('Editorial reductions: 39 shorter lessons, 170 fewer graded answers, 140 stable lesson IDs.');
}
if (require.main === module) {
  const mode = process.argv[2] || '--check';
  const report = buildReport();
  if (mode === '--check') check(report);
  else if (mode === '--json') process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  else if (mode === '--markdown') process.stdout.write(markdown(report));
  else if (mode === '--priority') process.stdout.write(priorityMarkdown(report));
  else throw new Error('Usage: --check|--markdown|--json|--priority');
}

module.exports = { buildReport, markdown, check, priorityRows, priorityMarkdown };

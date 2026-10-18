#!/usr/bin/env node
'use strict';
// Describes authored and playable opportunities; these are not user sessions.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const course = require('../course.js');
const ROOT = path.resolve(__dirname, '..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, name), 'utf8'));

function audit() {
  const rows = [];
  for (const stage of course.COURSE_STAGES) {
    for (const file of stage.sectionUrls) {
      const raw = read(file.replace(/^\.\//, ''));
      const section = course.validateSection(raw);
      for (const lesson of section.lessons) {
        const authored = raw.lessons.find((entry) => entry.id === lesson.id);
        const slides = course.compactLessonActivities(lesson.activities);
        assert.deepEqual(course.flattenLessonSlides(slides), lesson.activities,
          'Compaction changed the authored answer sequence in ' + lesson.id);
        const assessed = (activities) => activities.filter(
          (a) => a.type !== 'teach' && a.type !== 'number-grid'
        ).length;
        rows.push({
          section_id: section.id, lesson_id: lesson.id,
          authored_activity_count: authored.activities?.length ?? lesson.activities.length,
          prepared_activity_count: lesson.activities.length,
          rendered_slide_count: slides.length,
          graded_answer_opportunities: assessed(lesson.activities),
          grouped_slides: slides.filter((slide) => slide.type === 'activity-group').length,
          activity_order_preserved: true,
          exceeds_30_visible_slides: slides.length > 30,
        });
      }
    }
  }
  const long = rows.filter((row) => row.authored_activity_count > 30);
  return {
    schema_version: 1,
    disclaimer: 'Static authored content, not telemetry, session time, proficiency or CEFR certification.',
    summary: {
      shipped_lessons: rows.length,
      authored_over_30: long.length,
      authored_over_40: rows.filter((row) => row.authored_activity_count > 40).length,
      remaining_over_30_rendered: rows.filter((row) => row.exceeds_30_visible_slides).length,
      authored_activities: rows.reduce((sum, row) => sum + row.prepared_activity_count, 0),
      rendered_slides: rows.reduce((sum, row) => sum + row.rendered_slide_count, 0),
      graded_answer_opportunities: rows.reduce((sum, row) => sum + row.graded_answer_opportunities, 0),
    },
    lessons: rows.sort((a,b) => b.authored_activity_count-a.authored_activity_count
      || a.section_id.localeCompare(b.section_id) || a.lesson_id.localeCompare(b.lesson_id)),
  };
}

function markdown(report) {
  const s = report.summary;
  const lines = [
    '# Course lesson slide-budget audit',
    '',
    'Generated on demand with `npm run lesson:slides:report`. Static prepared authored opportunities only; no learner telemetry.',
    '',
    '| Measure | Count |', '| --- | ---: |',
    '| Shipped lessons | ' + s.shipped_lessons + ' |',
    '| Authored lessons >30 activities | ' + s.authored_over_30 + ' |',
    '| Authored lessons >40 activities | ' + s.authored_over_40 + ' |',
    '| Rendered lessons >30 slides | ' + s.remaining_over_30_rendered + ' |',
    '| Prepared authored activities | ' + s.authored_activities + ' |',
    '| Rendered slides | ' + s.rendered_slides + ' |',
    '| Graded answer opportunities | ' + s.graded_answer_opportunities + ' |',
    '',
    '## Originally over-budget lessons (descending)',
    '', '| Section | Lesson | Original activities | Visible slides | Independent graded answers |',
    '| --- | --- | ---: | ---: | ---: |',
  ];
  for (const row of report.lessons.filter((r) => r.authored_activity_count > 30)) {
    lines.push('| ' + row.section_id + ' | ' + row.lesson_id + ' | '
      + row.authored_activity_count + ' | ' + row.rendered_slide_count
      + ' | ' + row.graded_answer_opportunities + ' |');
  }
  lines.push('', 'Screen compaction preserves the exact ordered teaching and question objects, including production, morphology, listening, dictation and checkpoint activities. Retry screens are additional, not part of the initial visible-slide budget. Original stored lesson IDs and SRS ledgers remain unchanged.', '');
  return lines.join('\n');
}

function main(mode = process.argv[2] || '--check') {
  if (!['--check','--json','--markdown'].includes(mode)) throw Error('Use --check|--json|--markdown');
  const report = audit();
  if (mode === '--json') process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (mode === '--markdown') process.stdout.write(markdown(report));
  if (mode === '--check') {
    assert.equal(report.summary.shipped_lessons, 140, 'Shipped lesson count unexpectedly changed');
    assert.equal(report.summary.remaining_over_30_rendered, 0, 'Rendered lesson exceeds 30 slides');
    console.log('Lesson slide-budget invariant: ' + report.summary.authored_over_30
      + ' originally over budget, 0 above 30 visible screens; authored answer sequence retained.');
  }
}
if (require.main === module) main();
module.exports = { audit, markdown, main };

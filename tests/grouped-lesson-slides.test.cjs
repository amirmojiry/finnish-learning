'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const course = require('../course.js');

function shipped() {
  return course.COURSE_STAGES.flatMap((stage) => stage.sectionUrls.flatMap((url) => {
    const raw = require('../' + url.replace(/^\.\//, ''));
    return course.validateSection(raw).lessons.map((lesson) => ({
      sectionId: raw.id,
      lesson,
    }));
  }));
}

test('every shipped lesson keeps all authored opportunities while staying within 30 visible slides', () => {
  const lessons = shipped();
  assert.equal(lessons.length, 140);
  assert.equal(lessons.filter(({lesson}) => lesson.activities.length > 30).length, 55);
  for (const { sectionId, lesson } of lessons) {
    const before = structuredClone(lesson.activities);
    const slides = course.compactLessonActivities(lesson.activities);
    assert.ok(slides.length <= 30, sectionId + '/' + lesson.id + ': ' + slides.length + ' slides');
    assert.deepEqual(course.flattenLessonSlides(slides), before, lesson.id + ': question/order loss');
    assert.deepEqual(lesson.activities, before, lesson.id + ': source content mutated');
    for (const slide of slides) {
      if (slide.type !== 'activity-group') continue;
      assert.ok(slide.activities.length >= 2 && slide.activities.length <= 4);
      assert.equal(slide.activities.every((sub) => Boolean(sub.item)), true);
    }
  }
});

test('bundling is deterministic and never erases first-attempt target evidence', () => {
  const items = ['a','b','c','d'];
  const activities = [
    ...items.map((item) => ({type:'teach',item})),
    ...items.map((item) => ({type:'type',mode:'finnish',item})),
    ...items.map((item) => ({type:'choice',mode:'meaning',item,options:items})),
    ...items.map((item) => ({type:'controlled-production',item,prompt_fa:item,expected_fi:item,accepted_answers:[item],cues_fi:[item]})),
    ...Array.from({length:19}, (_,i)=>({type:'short-reading',item:'reading-'+i})),
  ];
  const slides = course.compactLessonActivities(activities);
  assert.deepEqual(slides.slice(0,4).map((x)=>x.group_kind),
    ['teach','typed','choice-meaning','controlled']);
  assert.deepEqual(course.flattenLessonSlides(slides),activities);
  assert.deepEqual(course.compactLessonActivities(activities), slides);
  const grouped = slides[1].activities;
  let progress = course.emptyProgress();
  for (const sub of grouped) {
    const item = {surface_form:sub.item,translation_fa:'meaning',accepted_answers:[sub.item]};
    assert.equal(course.gradeActivityAnswer(sub,item,sub.item).accepted,true);
    progress = course.recordTargetAttempt(progress,'fixture',sub.item,true,100,false);
  }
  assert.equal(Object.keys(progress.targetPerformance).length,4);
  for (const id of items) {
    const key=course.targetPerformanceKey('fixture',id);
    assert.equal(progress.targetPerformance[key].attempts,1);
  }
});

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

test('normal-length lessons remain unchanged and grouped answers keep separate evidence modes', () => {
  const normal = [
    { type: 'teach', item: 'one' },
    { type: 'choice', mode: 'meaning', item: 'one', options: ['one','two'] },
    { type: 'type', mode: 'finnish', item: 'two' },
  ];
  assert.deepEqual(course.compactLessonActivities(normal), normal);
  assert.equal(course.isProductiveCourseActivity(normal[1]), false);
  assert.equal(course.isProductiveCourseActivity(normal[2]), true);
  assert.equal(course.courseActivityDirection(normal[1]), 'fi-to-fa');
  assert.equal(course.courseActivityDirection(normal[2]), 'fa-to-fi');
});

test('per-row grouped answer grading preserves independent correct and wrong evidence', () => {
  const items = {
    hei: {surface_form:'hei', translation_fa:'سلام', accepted_answers:['hei']},
    moi: {surface_form:'moi', translation_fa:'درود', accepted_answers:['moi']},
  };
  const group = {type:'activity-group', group_kind:'typed', activities:[
    {type:'type',mode:'finnish',item:'hei'},
    {type:'type',mode:'finnish',item:'moi'},
  ]};
  const rows = course.assessCompactActivityGroup(group,['hei','wrong'],items);
  assert.deepEqual(rows.map(r=>r.correct),[true,false]);
  assert.deepEqual(rows.map(r=>r.activity.item),['hei','moi']);
  assert.equal(rows[1].expected,'moi');
  let progress=course.emptyProgress();
  for(const r of rows)progress=course.recordTargetAttempt(progress,'fixture',r.activity.item,r.correct,200,false);
  assert.equal(progress.targetPerformance[course.targetPerformanceKey('fixture','hei')].correct,1);
  assert.equal(progress.targetPerformance[course.targetPerformanceKey('fixture','moi')].correct,0);

  const choices={type:'activity-group',group_kind:'choice-meaning',activities:[
    {type:'choice',mode:'meaning',item:'hei',options:['hei','moi']},
    {type:'choice',mode:'meaning',item:'moi',options:['hei','moi']},
  ]};
  assert.deepEqual(course.assessCompactActivityGroup(choices,['hei','hei'],items).map(r=>r.correct),[true,false]);
  assert.equal(course.assessCompactActivityGroup(choices,['invalid','moi'],items)[0].correct,false);
  assert.throws(()=>course.assessCompactActivityGroup(choices,['hei'],items),/one response/);
});


test('grouped teaching distinguishes newly introduced from reviewed vocabulary', () => {
  const lesson = {
    learning_objectives: {
      lexical: [
        { target_id: 'new', status: 'introduced' },
        { target_id: 'old', status: 'reviewed' },
      ],
    },
  };
  assert.equal(course.teachingActivityStatus(lesson, { type: 'teach', item: 'new' }), 'introduced');
  assert.equal(course.teachingActivityStatus(lesson, { type: 'teach', item: 'old' }), 'reviewed');
  assert.equal(course.teachingActivityStatus(lesson, { type: 'teach', item: 'unlisted' }), 'introduced');
  assert.match(course.teachingActivityHeading(lesson, { type: 'teach', item: 'new' }), /جدید/);
  assert.match(course.teachingActivityHeading(lesson, { type: 'teach', item: 'old' }), /آشنا/);

  // The visible lesson may contain adjacent teaching cards with both statuses.
  // Grouping must not replace per-target lexical metadata with a generic review label.
  let groupedTeachCards = 0;
  let introducedCards = 0;
  for (const { sectionId, lesson: shippedLesson } of shipped()) {
    const slides = course.compactLessonActivities(shippedLesson.activities);
    for (const slide of slides) {
      if (slide.type !== 'activity-group' || slide.group_kind !== 'teach') continue;
      for (const activity of slide.activities) {
        const lexical = shippedLesson.learning_objectives?.lexical?.find(
          ({ target_id }) => target_id === activity.item
        );
        const expected = lexical?.status === 'reviewed' ? 'reviewed' : 'introduced';
        const actual = course.teachingActivityStatus(shippedLesson, activity);
        assert.equal(actual, expected, sectionId + '/' + shippedLesson.id + '/' + activity.item);
        if (actual === 'introduced') introducedCards++;
        groupedTeachCards++;
      }
    }
  }
  assert.ok(groupedTeachCards > 0, 'Expected grouped teaching content in shipped lessons');
  assert.ok(introducedCards > 0, 'Grouped teaching must include newly introduced words');
});

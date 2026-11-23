import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ASK_AUTO_ANSWER_OFF, ASK_AUTO_ANSWER_OPTIONS, askAutoAnswerValueLabel, askAutoAnswerUiValue, askAutoAnswerPrefValue, askAutoAnswerSelectOptions } from '../src/utils/autoApproveOptions.js';
const t = key => key;
const tp = (key, params) => params ? `${key}:${JSON.stringify(params)}` : key;
describe('ask auto-answer (问答题自动托管) option set', () => {
  it('options: 0/10/20/30 minutes + OFF sentinel', () => {
    assert.equal(ASK_AUTO_ANSWER_OFF, -1);
    assert.deepEqual(ASK_AUTO_ANSWER_OPTIONS, [0, 10, 20, 30, ASK_AUTO_ANSWER_OFF]);
  });

  it('label mapping: OFF → off key, 0 → instant key, N → minutes key with {n}', () => {
    assert.equal(askAutoAnswerValueLabel(ASK_AUTO_ANSWER_OFF, t), 'ui.askAutoAnswer.off');
    assert.equal(askAutoAnswerValueLabel(null, t), 'ui.askAutoAnswer.off');
    assert.equal(askAutoAnswerValueLabel(undefined, t), 'ui.askAutoAnswer.off');
    assert.equal(askAutoAnswerValueLabel(0, t), 'ui.askAutoAnswer.instant');
    assert.equal(askAutoAnswerValueLabel(10, tp), 'ui.askAutoAnswer.minutes:{"n":10}');
  });

  it('select options carry all five tiers', () => {
    assert.deepEqual(askAutoAnswerSelectOptions(t).map(o => o.value), [0, 10, 20, 30, -1]);
  });

  it('pref → UI sentinel: number passes, everything else maps to OFF', () => {
    assert.equal(askAutoAnswerUiValue(10), 10);
    assert.equal(askAutoAnswerUiValue(0), 0);
    assert.equal(askAutoAnswerUiValue(null), -1);
    assert.equal(askAutoAnswerUiValue(undefined), -1);
    assert.equal(askAutoAnswerUiValue('10'), -1, 'dirty legacy values degrade to off');
    assert.equal(askAutoAnswerUiValue(NaN), -1, 'NaN must not render "NaN 分钟"');
    assert.equal(askAutoAnswerUiValue(Infinity), -1, 'Infinity must not render "Infinity 分钟"');
  });

  it('UI sentinel → pref: OFF persists null, finite numbers pass, everything else null', () => {
    assert.equal(askAutoAnswerPrefValue(-1), null);
    assert.equal(askAutoAnswerPrefValue(0), 0, '0 分钟 must persist as 0 (instant), never null');
    assert.equal(askAutoAnswerPrefValue(20), 20);
    // undefined would be dropped by JSON.stringify and leave the server value stale.
    assert.equal(askAutoAnswerPrefValue(undefined), null, 'non-finite/undefined must persist null, not be dropped');
    assert.equal(askAutoAnswerPrefValue(NaN), null);
  });

  it('round-trip: pref → UI → pref preserves the value domain', () => {
    for (const pref of [null, 0, 10, 20, 30]) {
      assert.equal(askAutoAnswerPrefValue(askAutoAnswerUiValue(pref)), pref);
    }
  });
});

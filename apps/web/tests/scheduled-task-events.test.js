import test from 'node:test';
import assert from 'node:assert/strict';
import { publishScheduledTaskEvent, subscribeScheduledTasks } from '../src/utils/scheduledTaskEvents.js';

test('schedule refreshes isolate exact same-name instances and unsubscribe cancels queued work', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const seen = [];
  const stop = subscribeScheduledTasks({ project: 'same', instance: 'a' }, event => seen.push(event.taskId));
  publishScheduledTaskEvent({ project: 'same', instanceKey: 'b', taskId: 'foreign' });
  publishScheduledTaskEvent({ project: 'same', taskId: 'unanchored' });
  t.mock.timers.tick(100); assert.deepEqual(seen, []);
  publishScheduledTaskEvent({ project: 'same', instanceKey: 'a', taskId: 'owned' });
  t.mock.timers.tick(100); assert.deepEqual(seen, ['owned']);
  publishScheduledTaskEvent({ project: 'same', instanceKey: 'a', taskId: 'cancelled' });
  stop(); t.mock.timers.tick(100); assert.deepEqual(seen, ['owned']);
});

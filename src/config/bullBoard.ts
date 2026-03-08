import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { mainQueue } from '../queues/Queue';

// Create Express adapter for Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

// Create Bull Board with all BullMQ queues
createBullBoard({
  queues: [
    new BullMQAdapter(mainQueue) as any // Type assertion due to version compatibility
  ],
  serverAdapter
});

export { serverAdapter };

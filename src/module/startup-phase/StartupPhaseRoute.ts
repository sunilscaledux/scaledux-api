import { Router } from 'express';
import {
  listPhases,
  getProgress,
  getPublicProgress,
  setCurrentPhase,
  toggleActivity,
  uploadDeliverable,
  deleteDeliverable,
} from './StartupPhaseController';
import { authenticateToken, optionalAuth } from '@middleware/auth';
import { FileUpload, handleMulterError } from '@middleware/fileupload';

const phaseRouter = Router();
const progressRouter = Router();

// Public phase listing (anyone can browse phases, even unauthenticated)
phaseRouter.get('/', optionalAuth, listPhases);

// Public progress by founder uniqueId — only founder themselves or investors
phaseRouter.get('/progress/:uniqueId', authenticateToken, getPublicProgress);

// All progress routes require auth
progressRouter.use(authenticateToken);
progressRouter.get('/', getProgress);
progressRouter.patch('/current-phase', setCurrentPhase);
progressRouter.post('/activity', toggleActivity);

progressRouter.post(
  '/deliverable/:id',
  FileUpload({
    uploadPath: 'startup-deliverables',
    fileFilter: 'any',
    maxSize: 25,
    maxFiles: 1,
    fieldName: 'startup_deliverable',
  }).single('document'),
  uploadDeliverable,
  handleMulterError
);

progressRouter.delete('/deliverable/:id', deleteDeliverable);

export { phaseRouter as startupPhaseRouter, progressRouter as startupProgressRouter };

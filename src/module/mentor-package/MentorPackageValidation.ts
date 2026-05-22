import Joi from 'joi'
import { rejectDangerousHtml, dangerousHtmlMessages } from '../../utils/validation'

export const createMentorPackageSchema = Joi.object({
  packageTitle: Joi.string().required().min(1).max(100),
  packageDescription: Joi.string().required().min(1).max(3000).custom(rejectDangerousHtml).messages(dangerousHtmlMessages),
  sessionDetails: Joi.object({
    sessionDuration: Joi.string().required().valid('15m', '30m', '45m'),
    noOfSessions: Joi.string().required().pattern(/^[0-9]+$/),
    sessionPrice: Joi.object({
      currency: Joi.string().required(),
      amount: Joi.string().required()
    }).required()
  }).required(),
  sessionRecording: Joi.object({
    isRecordingEnabled: Joi.boolean().required(),
    recordingType: Joi.string().valid('paid', 'free').optional().allow('', null),
    recordingPrice: Joi.object({
      currency: Joi.string().optional().allow('', null),
      amount: Joi.string().optional().allow('', null)
    }).optional()
  }).required(),
  expertise: Joi.object({
    yourExpertise: Joi.string().required(),
    topics: Joi.array().items(
      Joi.object({ session: Joi.array().items(Joi.string()).min(1) })
    ).required(),
    expectedOutcomes: Joi.array().items(
      Joi.object({ value: Joi.string().required() })
    ).default([]),
    menteesExpections: Joi.array().items(
      Joi.object({ value: Joi.string().required() })
    ).default([])
  }).required(),
  terms: Joi.string().optional().allow('', null),
  status: Joi.string().valid('DRAFT', 'PUBLISHED', 'PAUSED').default('DRAFT')
})

export const updateMentorPackageSchema = Joi.object({
  packageTitle: Joi.string().min(1).max(100),
  packageDescription: Joi.string().min(1).max(3000).custom(rejectDangerousHtml).messages(dangerousHtmlMessages),
  sessionDetails: Joi.object({
    sessionDuration: Joi.string().valid('15m', '30m', '45m'),
    noOfSessions: Joi.string().pattern(/^[0-9]+$/),
    sessionPrice: Joi.object({
      currency: Joi.string().required(),
      amount: Joi.string().required()
    })
  }),
  sessionRecording: Joi.object({
    isRecordingEnabled: Joi.boolean().required(),
    recordingType: Joi.string().valid('paid', 'free').optional().allow('', null),
    recordingPrice: Joi.object({
      currency: Joi.string().optional().allow('', null),
      amount: Joi.string().optional().allow('', null)
    }).optional()
  }),
  expertise: Joi.object({
    yourExpertise: Joi.string().required(),
    topics: Joi.array().items(
      Joi.object({ session: Joi.array().items(Joi.string()).min(1) })
    ),
    expectedOutcomes: Joi.array().items(
      Joi.object({ value: Joi.string().required() })
    ),
    menteesExpections: Joi.array().items(
      Joi.object({ value: Joi.string().required() })
    )
  }),
  terms: Joi.string().optional().allow('', null),
  status: Joi.string().valid('DRAFT', 'PUBLISHED', 'PAUSED')
})

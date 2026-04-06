export interface MentorPackageInput {
  packageTitle: string
  packageDescription: string
  sessionDetails: {
    sessionDuration: string    // "15m" | "30m" | "45m"
    noOfSessions: string
    sessionPrice: {
      currency: string
      amount: string
    }
  }
  sessionRecording: {
    isRecordingEnabled: boolean
    recordingType?: string     // "paid" | "free"
    recordingPrice?: {
      currency?: string
      amount?: string
    }
  }
  expertise: {
    yourExpertise: string      // category id as string
    topics: Array<{ session: string[] }>
    expectedOutcomes: Array<{ value: string }>
    menteesExpections: Array<{ value: string }>
  }
  terms?: string
  status?: 'DRAFT' | 'PUBLISHED' | 'PAUSED'
}

export interface MentorPackageUpdateInput extends Partial<MentorPackageInput> {}

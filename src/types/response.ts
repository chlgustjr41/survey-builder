export interface Answer {
  questionId: string
  value: string | string[] | number   // depends on question type
  score: number                        // points earned
}

export interface Response {
  id: string
  surveyId: string
  respondedAt: number                  // Unix timestamp ms
  identification: Record<string, string>
  answers: Record<string, Answer>
  totalScore: number
  emailSent: boolean
}

export type ResponseInput = Omit<Response, 'id'>

export interface ResponseFilters {
  scoreMin?: number
  scoreMax?: number
  dateFrom?: number
  dateTo?: number
  searchQuery?: string
}

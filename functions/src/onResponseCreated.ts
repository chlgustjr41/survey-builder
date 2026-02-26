import * as functions from 'firebase-functions/v2'
import * as admin from 'firebase-admin'
import { Resend } from 'resend'

admin.initializeApp()

interface ScoreRange {
  id: string
  min: number
  max: number
  message: string
  imageUrl?: string
}

interface EmailConfig {
  enabled: boolean
  subject: string
  bodyHtml: string
  imageUrl?: string
}

interface ResultConfig {
  showScore: boolean
  ranges: ScoreRange[]
}

interface Survey {
  title: string
  emailConfig: EmailConfig
  resultConfig: ResultConfig
}

interface Answer {
  questionId: string
  value: string | string[] | number
  score: number
}

interface Response {
  surveyId: string
  totalScore: number
  identification: Record<string, string>
  answers: Record<string, Answer>
  emailSent: boolean
}

function matchScoreRange(score: number, ranges: ScoreRange[]): ScoreRange | null {
  return ranges.find((r) => score >= r.min && score <= r.max) ?? null
}

function buildEmailHtml(
  survey: Survey,
  response: Response,
  range: ScoreRange | null
): string {
  const { emailConfig, resultConfig, title } = survey
  const baseHtml = emailConfig.bodyHtml || `<p>Thank you for completing <strong>${title}</strong>!</p>`

  const scoreSection = resultConfig.showScore
    ? `<div style="text-align:center;margin:24px 0;">
        <p style="color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:.05em;margin:0 0 4px">Your Score</p>
        <p style="color:#f97316;font-size:48px;font-weight:900;margin:0;line-height:1">${response.totalScore}</p>
       </div>`
    : ''

  const rangeSection = range
    ? `${range.imageUrl ? `<img src="${range.imageUrl}" alt="Result" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin-bottom:16px"/>` : ''}
       ${range.message ? `<p style="text-align:center;color:#374151">${range.message}</p>` : ''}`
    : ''

  const attachmentSection = emailConfig.imageUrl
    ? `<div style="text-align:center;margin-top:24px">
        <img src="${emailConfig.imageUrl}" alt="Coupon" style="max-width:100%;border-radius:8px"/>
       </div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f9fafb;">
  <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:inline-block;width:48px;height:48px;background:#f97316;border-radius:10px;line-height:48px;color:white;font-size:20px;font-weight:bold">S</div>
      <h2 style="color:#111827;margin:12px 0 4px">${title}</h2>
    </div>
    ${baseHtml}
    ${scoreSection}
    ${rangeSection}
    ${attachmentSection}
  </div>
</body>
</html>`
}

export const onResponseCreated = functions.database.onValueCreated(
  '/responses/{surveyId}/{responseId}',
  async (event) => {
    const response = event.data.val() as Response
    const { surveyId } = event.params

    // Fetch the survey
    const surveySnap = await admin.database().ref(`surveys/${surveyId}`).once('value')
    if (!surveySnap.exists()) return

    const survey = surveySnap.val() as Survey
    const { emailConfig, resultConfig } = survey

    // Only send if email automation is enabled
    if (!emailConfig?.enabled) return

    // Find responder's email in identification fields
    const email = response.identification?.email
    if (!email) return

    // Get Resend API key from environment config
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('RESEND_API_KEY environment variable not set')
      return
    }

    const resend = new Resend(apiKey)
    const range = matchScoreRange(response.totalScore, resultConfig?.ranges ?? [])
    const html = buildEmailHtml(survey, response, range)

    try {
      await resend.emails.send({
        from: 'Survey Builder <chlgustjr41@gmail.com>',
        to: email,
        subject: emailConfig.subject || `Your results for "${survey.title}"`,
        html,
      })

      // Mark email as sent on the response
      await event.data.ref.parent!.child('emailSent').set(true)

      console.log(`Email sent to ${email} for survey ${surveyId}`)
    } catch (err) {
      console.error('Failed to send email via Resend:', err)
    }
  }
)

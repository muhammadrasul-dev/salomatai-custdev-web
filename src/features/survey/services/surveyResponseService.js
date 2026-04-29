import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../config/firebase'

const SURVEY_COLLECTION = 'salomatai_survey_responses'
const PROMO_COLLECTION = 'salomatai_promo_codes'

const buildQuestionAwareAnswers = ({ answers, questions }) => {
  const questionMap = Object.fromEntries((questions ?? []).map((question) => [question.id, question]))

  return Object.entries(answers ?? {}).reduce((accumulator, [questionId, answer]) => {
    const question = questionMap[questionId]
    accumulator[questionId] = {
      questionId,
      questionTitle: question?.title ?? questionId,
      section: question?.section ?? null,
      type: question?.type ?? null,
      answer,
    }
    return accumulator
  }, {})
}

export const saveSurveyResponse = async ({ answers, locale, status, questions }) => {
  const payload = {
    locale,
    status,
    answers: buildQuestionAwareAnswers({ answers, questions }),
    createdAt: serverTimestamp(),
  }

  const result = await addDoc(collection(db, SURVEY_COLLECTION), payload)
  return result.id
}

export const saveSurveyPromoCode = async ({
  surveyResponseId,
  promoCode,
  locale,
  status,
  contactPreference,
  contactValue,
}) => {
  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setMonth(expiresAt.getMonth() + 3)

  const payload = {
    surveyResponseId,
    promoCode,
    discountPercent: 25,
    promoType: 'launch_discount',
    locale,
    status,
    contactPreference: contactPreference || null,
    contactValue: contactValue || null,
    isRedeemed: false,
    maxCodesPerUserInWindow: 3,
    redemptionWindowMonths: 3,
    expiresAt,
    source: 'survey_waitlist',
    createdAt: serverTimestamp(),
  }

  const result = await addDoc(collection(db, PROMO_COLLECTION), payload)
  return result.id
}
